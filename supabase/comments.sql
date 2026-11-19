-- Resolve UK: comments and thanks on stories.
--
-- Run this AFTER jobs.sql. It is safe to run again.
--
-- Rules:
--   - Anyone can read the comments on a published story, and how many thanks it has had.
--   - Signed-in people comment as themselves; their name is filled in by the database. A comment
--     appears straight away (no approval), so the safety net is reporting and hiding:
--   - Anyone signed in can report a comment. A reported comment is hidden from everyone but its
--     author until a Resolve admin keeps or removes it.
--   - A Resolve admin, council staff for the report the story is about, and leads of the group or
--     company that posted the story can hide a comment on that story straight away.
--   - Authors can delete their own comments.
--   - Thanks: one per person per story, and it can be taken back.
--   - The story's author is told when someone comments on it.

create table if not exists public.story_comments (
  id           uuid primary key default gen_random_uuid(),
  story_id     uuid not null references public.stories (id) on delete cascade,
  author_id    uuid not null references auth.users (id) on delete cascade,
  author_name  text not null default 'A resident',
  author_role  text not null default 'resident' check (author_role in ('resident', 'organisation', 'staff')),
  body         text not null check (char_length(btrim(body)) between 2 and 500),
  status       text not null default 'visible' check (status in ('visible', 'reported', 'hidden')),
  hidden_by    uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists story_comments_story_idx on public.story_comments (story_id, created_at);
create index if not exists story_comments_status_idx on public.story_comments (status) where status = 'reported';

create table if not exists public.comment_flags (
  comment_id uuid not null references public.story_comments (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  reason     text check (reason is null or char_length(reason) <= 200),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

create table if not exists public.story_thanks (
  story_id   uuid not null references public.stories (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (story_id, user_id)
);

alter table public.story_comments enable row level security;
alter table public.comment_flags enable row level security;
alter table public.story_thanks enable row level security;
revoke all on public.story_comments, public.comment_flags, public.story_thanks from anon, authenticated;

grant select on public.story_comments to anon, authenticated;
grant insert (story_id, body) on public.story_comments to authenticated;
grant delete on public.story_comments to authenticated;
grant select on public.story_thanks to anon, authenticated;
grant insert (story_id) on public.story_thanks to authenticated;
grant delete on public.story_thanks to authenticated;
alter table public.story_thanks alter column user_id set default auth.uid();
-- comment_flags: written only through report_comment(), read only by admins through the queue.
grant select on public.comment_flags to authenticated;

-- Who may hide comments on a story: admins, staff for the report's council or contractor, and
-- leads of the group or company that posted it.
create or replace function public.can_moderate_story(p_story uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.staff_role() = 'resolve_admin', false)
      or exists (select 1 from public.stories st join public.reports r on r.id = st.report_id
                 where st.id = p_story and public.staff_role() = 'staff' and r.responsible_body_id = public.staff_body())
      or exists (select 1 from public.stories st where st.id = p_story and st.org_id is not null and public.is_org_lead(st.org_id))
$$;
revoke all on function public.can_moderate_story(uuid) from public;
grant execute on function public.can_moderate_story(uuid) to authenticated;

drop policy if exists "anyone reads visible comments on published stories" on public.story_comments;
create policy "anyone reads visible comments on published stories" on public.story_comments
  for select using (status = 'visible' and exists (select 1 from public.stories st where st.id = story_id and st.status = 'approved'));
drop policy if exists "authors read their own comments" on public.story_comments;
create policy "authors read their own comments" on public.story_comments
  for select to authenticated using (author_id = auth.uid());
drop policy if exists "moderators read every comment" on public.story_comments;
create policy "moderators read every comment" on public.story_comments
  for select to authenticated using (public.can_moderate_story(story_id));
drop policy if exists "signed-in people comment as themselves" on public.story_comments;
create policy "signed-in people comment as themselves" on public.story_comments
  for insert to authenticated
  with check (author_id = auth.uid() and status = 'visible' and exists (select 1 from public.stories st where st.id = story_id and st.status = 'approved'));
drop policy if exists "authors delete their own comments" on public.story_comments;
create policy "authors delete their own comments" on public.story_comments
  for delete to authenticated using (author_id = auth.uid());

drop policy if exists "admins read flags" on public.comment_flags;
create policy "admins read flags" on public.comment_flags
  for select to authenticated using (coalesce(public.staff_role() = 'resolve_admin', false));

drop policy if exists "anyone reads thanks" on public.story_thanks;
create policy "anyone reads thanks" on public.story_thanks for select using (true);
drop policy if exists "people thank as themselves" on public.story_thanks;
create policy "people thank as themselves" on public.story_thanks
  for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.stories st where st.id = story_id and st.status = 'approved'));
drop policy if exists "people take back their own thanks" on public.story_thanks;
create policy "people take back their own thanks" on public.story_thanks
  for delete to authenticated using (user_id = auth.uid());

-- Fills in who is commenting, as what, and tells the story's author.
create or replace function public.story_comments_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_staff public.staff_profiles; v_story public.stories;
begin
  new.author_id := auth.uid();
  new.status := 'visible';
  new.hidden_by := null;
  new.created_at := now();
  new.body := btrim(new.body);
  select * into v_staff from public.staff_profiles where id = auth.uid() and active;
  if found then
    new.author_role := 'staff';
    new.author_name := v_staff.display_name;
  else
    new.author_role := 'resident';
    new.author_name := coalesce((select nullif(btrim(display_name), '') from public.reporter_profiles where id = auth.uid()), 'A resident');
  end if;
  return new;
end $$;
drop trigger if exists story_comments_before_insert on public.story_comments;
create trigger story_comments_before_insert before insert on public.story_comments
  for each row execute function public.story_comments_before_insert();

create or replace function public.story_comments_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_story public.stories;
begin
  select * into v_story from public.stories where id = new.story_id;
  if v_story.author_id is distinct from new.author_id then
    insert into public.notifications (user_id, report_id, title, body)
    values (v_story.author_id, v_story.report_id, new.author_name || ' commented on your post', left(new.body, 120));
  end if;
  return new;
end $$;
drop trigger if exists story_comments_notify on public.story_comments;
create trigger story_comments_notify after insert on public.story_comments
  for each row execute function public.story_comments_notify();
revoke all on function public.story_comments_before_insert(), public.story_comments_notify() from public, anon, authenticated;

-- Reporting a comment hides it until an admin looks.
create or replace function public.report_comment(p_comment uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to report a comment'; end if;
  if not exists (select 1 from public.story_comments where id = p_comment and status = 'visible') then
    if exists (select 1 from public.story_comments where id = p_comment) then return; end if;
    raise exception 'No such comment';
  end if;
  insert into public.comment_flags (comment_id, user_id, reason) values (p_comment, auth.uid(), nullif(btrim(coalesce(p_reason, '')), ''))
  on conflict do nothing;
  update public.story_comments set status = 'reported' where id = p_comment and status = 'visible';
end $$;

-- A moderator hides a comment on a story they look after.
create or replace function public.hide_comment(p_comment uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_story uuid;
begin
  select story_id into v_story from public.story_comments where id = p_comment;
  if not found then raise exception 'No such comment'; end if;
  if not public.can_moderate_story(v_story) then raise exception 'Only an admin, the council for this report or the group that posted it can hide comments here'; end if;
  update public.story_comments set status = 'hidden', hidden_by = auth.uid() where id = p_comment;
end $$;

-- An admin decides on a reported comment: keep it (it comes back) or remove it.
create or replace function public.review_comment(p_comment uuid, p_keep boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not coalesce(public.staff_role() = 'resolve_admin', false) then raise exception 'Only a Resolve admin can review reported comments'; end if;
  update public.story_comments set status = case when p_keep then 'visible' else 'hidden' end, hidden_by = case when p_keep then null else auth.uid() end
   where id = p_comment;
  if not found then raise exception 'No such comment'; end if;
  if p_keep then delete from public.comment_flags where comment_id = p_comment; end if;
end $$;

revoke all on function public.report_comment(uuid, text), public.hide_comment(uuid), public.review_comment(uuid, boolean) from public, anon;
grant execute on function public.report_comment(uuid, text), public.hide_comment(uuid), public.review_comment(uuid, boolean) to authenticated;
