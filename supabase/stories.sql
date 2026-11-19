-- Resolve UK: stories (stage 2 of the app). A story is a post about a report, shown to the public
-- once it is approved. This first part covers the "problem story": someone who has reported a
-- problem (or seen one) writes a few lines about it so the neighbourhood knows. Progress updates
-- and "resolved" stories with before/after photos come in stage 4, using the same table.
--
-- Run this AFTER schema.sql, community.sql, dashboard.sql, security-update.sql, v2-concept.sql,
-- flexible-bodies.sql, reporter-profile-fields.sql, staff-profile-fields.sql and app-roles.sql.
-- It is safe to run again.
--
-- Rules:
--   - Anyone, signed in or not, can read approved stories.
--   - Only signed-in people can post one, and only as themselves. It always starts as 'pending'.
--   - The author can see their own stories whatever their status (so they know where it stands).
--   - Only a Resolve admin can approve, ask for changes or reject, through review_story().
--   - The author's name is copied onto the story from their own profile when it is posted, by the
--     database, so it cannot be faked and profiles themselves stay private.

create table if not exists public.stories (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports (id) on delete cascade,
  author_id    uuid not null references auth.users (id) on delete cascade,
  author_name  text not null default 'A resident',
  kind         text not null default 'problem' check (kind in ('problem', 'progress', 'resolved')),
  body         text not null check (char_length(btrim(body)) between 10 and 1000),
  status       text not null default 'pending' check (status in ('pending', 'approved', 'changes_requested', 'rejected')),
  review_note  text check (review_note is null or char_length(review_note) <= 500),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists stories_public_idx on public.stories (status, created_at desc);
create index if not exists stories_report_idx on public.stories (report_id);
create index if not exists stories_author_idx on public.stories (author_id);

alter table public.stories enable row level security;
revoke all on public.stories from anon, authenticated;
grant select on public.stories to anon, authenticated;
-- A person only ever supplies which report and what they want to say; everything else is set below.
grant insert (report_id, body) on public.stories to authenticated;

drop policy if exists "anyone reads approved stories" on public.stories;
create policy "anyone reads approved stories" on public.stories
  for select using (status = 'approved');

drop policy if exists "an author reads their own stories" on public.stories;
create policy "an author reads their own stories" on public.stories
  for select to authenticated using (author_id = auth.uid());

drop policy if exists "an admin reads every story" on public.stories;
create policy "an admin reads every story" on public.stories
  for select to authenticated using (public.app_role() = 'admin');

drop policy if exists "a signed-in person posts a problem story as themselves" on public.stories;
create policy "a signed-in person posts a problem story as themselves" on public.stories
  for insert to authenticated
  with check (author_id = auth.uid() and kind = 'problem' and status = 'pending' and review_note is null and reviewed_at is null);

-- Fills in who posted it, and forces a new story to start as a pending problem story, whatever
-- the request tried to send.
create or replace function public.stories_before_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  new.author_id := auth.uid();
  new.kind := 'problem';
  new.status := 'pending';
  new.review_note := null;
  new.reviewed_at := null;
  new.created_at := now();
  new.body := btrim(new.body);
  new.author_name := coalesce(
    (select nullif(btrim(display_name), '') from public.reporter_profiles where id = auth.uid()),
    'A resident'
  );
  return new;
end;
$$;

drop trigger if exists stories_before_insert on public.stories;
create trigger stories_before_insert before insert on public.stories
  for each row execute function public.stories_before_insert();

-- An admin's decision on a story: approve it (it goes public), ask for changes, or reject it.
create or replace function public.review_story(p_story uuid, p_decision text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.app_role() <> 'admin' then
    raise exception 'Only a Resolve admin can review stories';
  end if;
  if p_decision not in ('approved', 'changes_requested', 'rejected') then
    raise exception 'Unknown decision: %', p_decision;
  end if;
  update public.stories
     set status = p_decision,
         review_note = nullif(btrim(coalesce(p_note, '')), ''),
         reviewed_at = now()
   where id = p_story;
  if not found then
    raise exception 'No such story';
  end if;
end;
$$;

revoke all on function public.review_story(uuid, text, text) from public;
grant execute on function public.review_story(uuid, text, text) to authenticated;
