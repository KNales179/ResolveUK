-- Resolve UK: jobs, updates and notifications (stage 4 of the app).
--
-- Run this AFTER organisations.sql. It is safe to run again.
--
-- What it adds:
--   - Jobs: council or contractor staff (for a report that belongs to their body), or a Resolve
--     admin, can offer a report to an approved community group or clearance company. A community
--     group can only be offered jobs that staff have confirmed are safe for volunteers. A lead of
--     the group or company accepts or declines. Once accepted, the report moves to "Clearance
--     scheduled"; when the group marks it done, the report moves to "Cleared", with an optional
--     after photo.
--   - Updates and resolved stories: a group or company working on a job, and council staff,
--     post progress updates and "resolved" write-ups straight to the public (no approval needed).
--     Residents can now post updates and resolved stories too, but theirs still wait for an admin.
--   - The reporter checks the result: when their report is cleared, the person who reported it can
--     confirm it really is clear (Outcome verified) or say it is still there (Reopened).
--   - Following and notifications: signed-in people can follow a report. The reporter and every
--     follower get a notification each time it moves on; a group's leads are told when they are
--     offered a job, and whoever offered a job is told when it is accepted, declined or done.

-- ------------------------------------------------------------------ who can appear in a report's history
-- Groups and companies now move reports on themselves, so the history records them as such.
alter table public.report_events drop constraint if exists report_events_actor_type_check;
alter table public.report_events add constraint report_events_actor_type_check
  check (actor_type in ('citizen', 'staff', 'reviewer', 'admin', 'ai', 'system', 'organisation'));

-- ------------------------------------------------------------------ jobs
create table if not exists public.report_jobs (
  id            uuid primary key default gen_random_uuid(),
  report_id     uuid not null references public.reports (id) on delete cascade,
  org_id        uuid not null references public.organisations (id) on delete cascade,
  offered_by    uuid not null references auth.users (id) on delete cascade,
  note          text check (note is null or char_length(note) <= 500),
  status        text not null default 'offered' check (status in ('offered', 'accepted', 'declined', 'withdrawn', 'done')),
  reply_note    text check (reply_note is null or char_length(reply_note) <= 500),
  created_at    timestamptz not null default now(),
  responded_at  timestamptz,
  completed_at  timestamptz
);
create index if not exists report_jobs_report_idx on public.report_jobs (report_id);
create index if not exists report_jobs_org_idx on public.report_jobs (org_id, status);
-- At most one live job per report.
create unique index if not exists report_jobs_one_live on public.report_jobs (report_id) where status in ('offered', 'accepted');

alter table public.report_jobs enable row level security;
revoke all on public.report_jobs from anon, authenticated;
grant select on public.report_jobs to anon, authenticated;
-- Every change goes through the functions below.

drop policy if exists "anyone sees accepted and finished jobs" on public.report_jobs;
create policy "anyone sees accepted and finished jobs" on public.report_jobs
  for select using (status in ('accepted', 'done'));

drop policy if exists "members see their group's jobs" on public.report_jobs;
create policy "members see their group's jobs" on public.report_jobs
  for select to authenticated using (exists (
    select 1 from public.organisation_members m
    where m.org_id = report_jobs.org_id and m.user_id = auth.uid() and m.status = 'active'));

drop policy if exists "staff and admins see every job" on public.report_jobs;
create policy "staff and admins see every job" on public.report_jobs
  for select to authenticated using (public.staff_role() is not null);

-- Is the person asking an active member (any role) of this organisation?
create or replace function public.is_org_member(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organisation_members m
                 where m.org_id = p_org and m.user_id = auth.uid() and m.status = 'active')
$$;
revoke all on function public.is_org_member(uuid) from public;
grant execute on function public.is_org_member(uuid) to authenticated;

-- ------------------------------------------------------------------ stories: who posted, and for which group
alter table public.stories add column if not exists org_id uuid references public.organisations (id) on delete set null;
alter table public.stories add column if not exists author_role text not null default 'resident';
alter table public.stories drop constraint if exists stories_author_role_check;
alter table public.stories add constraint stories_author_role_check check (author_role in ('resident', 'organisation', 'staff'));
alter table public.stories add column if not exists photo_path text
  check (photo_path is null or photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$');

-- Residents can now choose what kind of story they post. Everything else is still set for them.
grant insert (report_id, body, kind) on public.stories to authenticated;

drop policy if exists "a signed-in person posts a problem story as themselves" on public.stories;
drop policy if exists "a signed-in person posts a story as themselves" on public.stories;
create policy "a signed-in person posts a story as themselves" on public.stories
  for insert to authenticated
  with check (author_id = auth.uid() and status = 'pending' and author_role = 'resident' and review_note is null and reviewed_at is null);

-- A resident's story: who posted it is filled in, and it always starts as pending. Stories that
-- the functions below post for a group, a company or staff are marked as trusted for that one
-- statement, and are left exactly as those functions wrote them.
create or replace function public.stories_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_setting('resolve.trusted_story', true) = 'on' then
    return new;
  end if;
  new.author_id := auth.uid();
  if new.kind is null or new.kind not in ('problem', 'progress', 'resolved') then new.kind := 'problem'; end if;
  new.status := 'pending';
  new.author_role := 'resident';
  new.org_id := null;
  new.photo_path := null;
  new.review_note := null;
  new.reviewed_at := null;
  new.created_at := now();
  new.body := btrim(new.body);
  new.author_name := coalesce(
    (select nullif(btrim(display_name), '') from public.reporter_profiles where id = auth.uid()),
    'A resident');
  return new;
end $$;

-- Posts a story that goes public straight away (used only by the functions in this file).
create or replace function public.post_trusted_story(p_report uuid, p_kind text, p_body text, p_name text, p_role text, p_org uuid, p_photo text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if char_length(btrim(coalesce(p_body, ''))) < 10 then raise exception 'Write a little more: at least a few words'; end if;
  perform set_config('resolve.trusted_story', 'on', true);
  insert into public.stories (report_id, author_id, author_name, kind, body, status, author_role, org_id, photo_path, reviewed_at)
  values (p_report, auth.uid(), p_name, p_kind, btrim(p_body), 'approved', p_role, p_org, p_photo, now())
  returning id into v_id;
  perform set_config('resolve.trusted_story', 'off', true);
  return v_id;
end $$;
revoke all on function public.post_trusted_story(uuid, text, text, text, text, uuid, text) from public, anon, authenticated;

-- ------------------------------------------------------------------ following and notifications
create table if not exists public.report_follows (
  report_id  uuid not null references public.reports (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (report_id, user_id)
);
alter table public.report_follows enable row level security;
revoke all on public.report_follows from anon, authenticated;
grant select, delete on public.report_follows to authenticated;
grant insert (report_id) on public.report_follows to authenticated;
alter table public.report_follows alter column user_id set default auth.uid();

drop policy if exists "a person sees what they follow" on public.report_follows;
create policy "a person sees what they follow" on public.report_follows
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "a person follows as themselves" on public.report_follows;
create policy "a person follows as themselves" on public.report_follows
  for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "a person unfollows their own" on public.report_follows;
create policy "a person unfollows their own" on public.report_follows
  for delete to authenticated using (user_id = auth.uid());

create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  report_id  uuid references public.reports (id) on delete cascade,
  org_id     uuid references public.organisations (id) on delete cascade,
  title      text not null check (char_length(title) <= 140),
  body       text check (body is null or char_length(body) <= 400),
  created_at timestamptz not null default now(),
  read_at    timestamptz
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;

drop policy if exists "a person reads their own notifications" on public.notifications;
create policy "a person reads their own notifications" on public.notifications
  for select to authenticated using (user_id = auth.uid());

create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;
revoke all on function public.mark_notifications_read() from public;
grant execute on function public.mark_notifications_read() to authenticated;

-- When a report moves on, tell the person who reported it and everyone following it (but not
-- whoever made the move).
create or replace function public.report_events_notify()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_report public.reports;
  v_label text := case new.status
    when 'routed' then 'The responsible council or contractor has it'
    when 'acknowledged' then 'Acknowledged'
    when 'scheduled' then 'Clearance is scheduled'
    when 'cleared' then 'Cleared'
    when 'verified' then 'Confirmed clear'
    when 'reopened' then 'Reopened: it is still there'
    when 'duplicate' then 'Marked as a duplicate'
    when 'rejected' then 'Closed'
    else null end;
begin
  if v_label is null then return new; end if;
  select * into v_report from public.reports where id = new.report_id;
  insert into public.notifications (user_id, report_id, title, body)
  select distinct u, new.report_id, v_label, left(v_report.description, 120)
  from (
    select v_report.reporter_id as u
    union select f.user_id from public.report_follows f where f.report_id = new.report_id
  ) people
  where u is not null and u is distinct from new.actor_id
    and exists (select 1 from auth.users where id = u);
  return new;
end $$;
revoke all on function public.report_events_notify() from public, anon, authenticated;

drop trigger if exists report_events_notify on public.report_events;
create trigger report_events_notify after insert on public.report_events
  for each row execute function public.report_events_notify();

-- ------------------------------------------------------------------ the job functions
-- Moves a report on to "Clearance scheduled" from wherever a body has it, one allowed step at a time.
create or replace function public.move_to_scheduled(p_report uuid, p_org uuid, p_note text)
returns void language plpgsql security definer set search_path = public as $$
declare v_status text;
begin
  select current_status into v_status from public.reports where id = p_report;
  if v_status in ('routed', 'reopened') then
    insert into public.report_events (report_id, status, actor_type, actor_id, note, data)
    values (p_report, 'acknowledged', 'organisation', auth.uid(), null, jsonb_build_object('org_id', p_org));
    v_status := 'acknowledged';
  end if;
  if v_status = 'acknowledged' then
    insert into public.report_events (report_id, status, actor_type, actor_id, note, data)
    values (p_report, 'scheduled', 'organisation', auth.uid(), p_note, jsonb_build_object('org_id', p_org));
  end if;
end $$;
revoke all on function public.move_to_scheduled(uuid, uuid, text) from public, anon, authenticated;

-- Staff (for their own body's report) or a Resolve admin offers a report to a group or company.
-- p_safe: staff confirm the job is safe for volunteers. Required for a community group.
create or replace function public.offer_job(p_report uuid, p_org uuid, p_note text default null, p_safe boolean default false)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.staff_role();
  v_report public.reports;
  v_org public.organisations;
  v_id uuid;
begin
  if v_role is null or v_role = 'reviewer' then raise exception 'Only council staff or a Resolve admin can offer a job'; end if;
  select * into v_report from public.reports where id = p_report;
  if not found then raise exception 'That report no longer exists'; end if;
  if v_role = 'staff' and v_report.responsible_body_id is distinct from public.staff_body() then
    raise exception 'That report does not belong to your council or contractor';
  end if;
  if v_report.current_status not in ('routed', 'acknowledged', 'scheduled', 'reopened') then
    raise exception 'Only a report that a council or contractor has taken on, and that is not yet cleared, can be offered as a job';
  end if;
  select * into v_org from public.organisations where id = p_org;
  if not found or v_org.status <> 'approved' then raise exception 'That group or company is not approved'; end if;
  if v_org.kind = 'community' and not coalesce(p_safe, false) then
    raise exception 'Confirm the job is safe for volunteers before offering it to a community group';
  end if;
  if exists (select 1 from public.report_jobs where report_id = p_report and status in ('offered', 'accepted')) then
    raise exception 'This report already has a job offered or under way';
  end if;
  insert into public.report_jobs (report_id, org_id, offered_by, note)
  values (p_report, p_org, auth.uid(), nullif(btrim(coalesce(p_note, '')), ''))
  returning id into v_id;
  insert into public.notifications (user_id, report_id, org_id, title, body)
  select m.user_id, p_report, p_org, 'New job offered to ' || v_org.name, left(v_report.description, 120)
  from public.organisation_members m where m.org_id = p_org and m.role = 'lead' and m.status = 'active';
  return v_id;
end $$;

-- A lead of the group or company accepts or declines a job offered to it.
create or replace function public.respond_to_job(p_job uuid, p_accept boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_job public.report_jobs; v_org text;
begin
  select * into v_job from public.report_jobs where id = p_job for update;
  if not found then raise exception 'No such job'; end if;
  if not public.is_org_lead(v_job.org_id) then raise exception 'Only a lead of the group or company can answer a job'; end if;
  if v_job.status <> 'offered' then raise exception 'This job has already been answered'; end if;
  select name into v_org from public.organisations where id = v_job.org_id;
  update public.report_jobs
     set status = case when p_accept then 'accepted' else 'declined' end,
         reply_note = nullif(btrim(coalesce(p_note, '')), ''), responded_at = now()
   where id = p_job;
  if p_accept then
    perform public.move_to_scheduled(v_job.report_id, v_job.org_id, v_org || ' will clear this');
  end if;
  insert into public.notifications (user_id, report_id, org_id, title, body)
  values (v_job.offered_by, v_job.report_id, v_job.org_id,
          v_org || case when p_accept then ' accepted the job' else ' declined the job' end,
          nullif(btrim(coalesce(p_note, '')), ''));
end $$;

-- Whoever offered it (or an admin) takes back a job that is offered or under way.
create or replace function public.withdraw_job(p_job uuid)
returns void language plpgsql security definer set search_path = public as $$
declare v_job public.report_jobs; v_role text := public.staff_role();
begin
  select * into v_job from public.report_jobs where id = p_job for update;
  if not found then raise exception 'No such job'; end if;
  if not (v_role = 'resolve_admin' or (v_role = 'staff' and (select responsible_body_id from public.reports where id = v_job.report_id) = public.staff_body())) then
    raise exception 'Only the council staff for this report or a Resolve admin can withdraw a job';
  end if;
  if v_job.status not in ('offered', 'accepted') then raise exception 'This job is already finished'; end if;
  update public.report_jobs set status = 'withdrawn', responded_at = coalesce(responded_at, now()) where id = p_job;
  insert into public.notifications (user_id, report_id, org_id, title)
  select m.user_id, v_job.report_id, v_job.org_id, 'A job was withdrawn'
  from public.organisation_members m where m.org_id = v_job.org_id and m.role = 'lead' and m.status = 'active';
end $$;

-- A member of the group or company working on a job posts a progress update. Public straight away.
create or replace function public.post_job_update(p_job uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_job public.report_jobs; v_org text;
begin
  select * into v_job from public.report_jobs where id = p_job;
  if not found then raise exception 'No such job'; end if;
  if not public.is_org_member(v_job.org_id) then raise exception 'Only a member of the group or company can post an update on its job'; end if;
  if v_job.status <> 'accepted' then raise exception 'Updates can only be posted on a job under way'; end if;
  select name into v_org from public.organisations where id = v_job.org_id;
  return public.post_trusted_story(v_job.report_id, 'progress', p_body, v_org, 'organisation', v_job.org_id, null);
end $$;

-- A member marks the job done: the report is cleared (with an after photo, if they took one) and
-- their write-up is published as the "resolved" story.
create or replace function public.complete_job(p_job uuid, p_body text, p_photo text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_job public.report_jobs; v_org text;
begin
  select * into v_job from public.report_jobs where id = p_job for update;
  if not found then raise exception 'No such job'; end if;
  if not public.is_org_member(v_job.org_id) then raise exception 'Only a member of the group or company can finish its job'; end if;
  if v_job.status <> 'accepted' then raise exception 'Only a job under way can be finished'; end if;
  if p_photo is not null and p_photo !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$' then
    raise exception 'That photo name is not valid';
  end if;
  select name into v_org from public.organisations where id = v_job.org_id;
  perform public.move_to_scheduled(v_job.report_id, v_job.org_id, null);
  insert into public.report_events (report_id, status, actor_type, actor_id, note, photo_path, data)
  values (v_job.report_id, 'cleared', 'organisation', auth.uid(), 'Cleared by ' || v_org, p_photo, jsonb_build_object('org_id', v_job.org_id));
  perform public.post_trusted_story(v_job.report_id, 'resolved', p_body, v_org, 'organisation', v_job.org_id, p_photo);
  update public.report_jobs set status = 'done', completed_at = now() where id = p_job;
  insert into public.notifications (user_id, report_id, org_id, title)
  values (v_job.offered_by, v_job.report_id, v_job.org_id, v_org || ' finished the job');
end $$;

-- Council staff (for their own body's report) or a Resolve admin posts an official update or a
-- resolved write-up. Public straight away, shown with the council or contractor's name.
create or replace function public.post_staff_update(p_report uuid, p_kind text, p_body text)
returns uuid language plpgsql security definer set search_path = public as $$
declare v_role text := public.staff_role(); v_body_id uuid; v_name text;
begin
  if v_role is null or v_role = 'reviewer' then raise exception 'Only council staff or a Resolve admin can post an official update'; end if;
  if p_kind not in ('progress', 'resolved') then raise exception 'An official update is either progress or resolved'; end if;
  select responsible_body_id into v_body_id from public.reports where id = p_report;
  if not found then raise exception 'That report no longer exists'; end if;
  if v_role = 'staff' and v_body_id is distinct from public.staff_body() then
    raise exception 'That report does not belong to your council or contractor';
  end if;
  v_name := case when v_role = 'resolve_admin' then 'Resolve UK'
                 else coalesce((select name from public.responsible_bodies where id = v_body_id), 'The council') end;
  return public.post_trusted_story(p_report, p_kind, p_body, v_name, 'staff', null, null);
end $$;

-- The person who reported it checks the result once it is cleared: really clear, or still there.
create or replace function public.check_cleared(p_report uuid, p_clear boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare v_report public.reports;
begin
  select * into v_report from public.reports where id = p_report;
  if not found then raise exception 'That report no longer exists'; end if;
  if auth.uid() is null or v_report.reporter_id is distinct from auth.uid() then
    raise exception 'Only the person who reported this can check it';
  end if;
  if v_report.current_status <> 'cleared' then raise exception 'This report is not waiting to be checked'; end if;
  insert into public.report_events (report_id, status, actor_type, actor_id, note)
  values (p_report, case when p_clear then 'verified' else 'reopened' end, 'citizen', auth.uid(),
          coalesce(nullif(btrim(coalesce(p_note, '')), ''), case when p_clear then 'Confirmed clear by the person who reported it' else 'Still there, says the person who reported it' end));
end $$;

revoke all on function public.offer_job(uuid, uuid, text, boolean), public.respond_to_job(uuid, boolean, text),
              public.withdraw_job(uuid), public.post_job_update(uuid, text), public.complete_job(uuid, text, text),
              public.post_staff_update(uuid, text, text), public.check_cleared(uuid, boolean, text) from public, anon;
grant execute on function public.offer_job(uuid, uuid, text, boolean), public.respond_to_job(uuid, boolean, text),
              public.withdraw_job(uuid), public.post_job_update(uuid, text), public.complete_job(uuid, text, text),
              public.post_staff_update(uuid, text, text), public.check_cleared(uuid, boolean, text) to authenticated;
