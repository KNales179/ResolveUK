-- Resolve UK: database for the reporting app (Foundation stage).
--
-- Run this once in the SQL Editor of the new UK Supabase project. It is safe to run again.
-- It has not been run anywhere until you run it: nothing here touches a real database by itself.
--
-- What it sets up:
--   categories          the types of issue people can report
--   responsible_bodies  councils, and the contractors that work for them
--   reports             what people send in (public can add and read; nobody can change or delete)
--   report_events       a history that only grows: one entry each time a report changes stage
--   interventions       what was done about a problem and what it cost (no access yet; staff come later)
--   report-photos       the photo storage bucket
--
-- A report's current stage is copied from its latest history entry, so history is the source of truth.
-- The public cannot set a stage, a responsible body, or write history. Only the database does that.

-- ------------------------------------------------------------------ issue types
create table if not exists public.categories (
  code     text primary key check (code ~ '^[a-z][a-z-]{1,40}$'),
  label    text not null check (char_length(btrim(label)) between 1 and 60),
  function text not null check (function in ('highways', 'waste', 'streetscene', 'other')),
  position int  not null default 0,
  active   boolean not null default true
);

insert into public.categories (code, label, function, position) values
  ('fly-tipping',           'Fly-tipping',           'waste',       1),
  ('pothole',               'Pothole',               'highways',    2),
  ('graffiti',              'Graffiti',              'streetscene', 3),
  ('abandoned-vehicle',     'Abandoned vehicle',     'streetscene', 4),
  ('damaged-infrastructure','Damaged infrastructure','highways',    5),
  ('other',                 'Other',                 'other',       6)
on conflict (code) do nothing;

-- ------------------------------------------------------------------ councils and contractors
create table if not exists public.responsible_bodies (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  kind        text not null check (kind in ('council', 'contractor')),
  tier        text check (tier in ('unitary', 'county', 'district')),
  works_for_id uuid references public.responsible_bodies (id) on delete restrict,
  functions   text[] not null default '{}',
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  -- a council has a tier and works for nobody; a contractor has no tier and works for a council
  check (
    (kind = 'council'    and tier is not null and works_for_id is null) or
    (kind = 'contractor' and tier is null     and works_for_id is not null)
  )
);

create unique index if not exists responsible_bodies_name_key on public.responsible_bodies (lower(name));

create or replace function public.bodies_contractor_works_for_council()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.kind = 'contractor'
     and not exists (select 1 from public.responsible_bodies b where b.id = new.works_for_id and b.kind = 'council') then
    raise exception 'A contractor must work for a council';
  end if;
  return new;
end $$;

drop trigger if exists bodies_contractor_works_for_council on public.responsible_bodies;
create trigger bodies_contractor_works_for_council
  before insert or update on public.responsible_bodies
  for each row execute function public.bodies_contractor_works_for_council();

-- ------------------------------------------------------------------ reports
create table if not exists public.reports (
  id                  uuid primary key default gen_random_uuid(),
  category_code       text not null references public.categories (code),
  description         text not null check (char_length(btrim(description)) between 1 and 1000),
  -- stored as a path, not a full link, so moving to another project never breaks a photo
  photo_path          text not null check (photo_path ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'),
  lat                 double precision not null check (lat between -90 and 90),
  lng                 double precision not null check (lng between -180 and 180),
  location_accuracy_m real check (location_accuracy_m is null or location_accuracy_m between 0 and 100000),
  location_source     text not null default 'manual' check (location_source in ('gps', 'manual')),
  responsible_body_id uuid references public.responsible_bodies (id),
  current_status      text not null default 'reported' check (current_status in
                        ('reported', 'routed', 'acknowledged', 'scheduled', 'cleared', 'verified', 'reopened', 'duplicate', 'rejected')),
  duplicate_of        uuid references public.reports (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create index if not exists reports_created_idx on public.reports (created_at desc);
create index if not exists reports_status_idx  on public.reports (current_status);
create index if not exists reports_body_idx    on public.reports (responsible_body_id);

-- ------------------------------------------------------------------ history
create table if not exists public.report_events (
  id         uuid primary key default gen_random_uuid(),
  -- a counter that only goes up, so "latest" never depends on two timestamps being different
  seq        bigint generated always as identity,
  report_id  uuid not null references public.reports (id) on delete restrict,
  status     text not null check (status in
               ('reported', 'routed', 'acknowledged', 'scheduled', 'cleared', 'verified', 'reopened', 'duplicate', 'rejected')),
  actor_type text not null check (actor_type in ('citizen', 'staff', 'reviewer', 'admin', 'ai', 'system')),
  actor_id   uuid,
  note       text check (note is null or char_length(note) <= 2000),
  photo_path text,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default clock_timestamp()
);

create index if not exists report_events_report_idx on public.report_events (report_id, seq);

-- Only moves the report diagram allows. The first entry must be "reported".
create or replace function public.report_events_check()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  last_status text;
begin
  perform 1 from public.reports where id = new.report_id for update;  -- one change at a time per report
  select e.status into last_status
  from public.report_events e where e.report_id = new.report_id
  order by e.seq desc limit 1;

  if last_status is null then
    if new.status <> 'reported' then
      raise exception 'The first history entry must be "reported"';
    end if;
  elsif not (
    (last_status = 'reported'     and new.status in ('duplicate', 'rejected', 'routed')) or
    (last_status = 'routed'       and new.status = 'acknowledged') or
    (last_status = 'acknowledged' and new.status in ('scheduled', 'cleared')) or
    (last_status = 'scheduled'    and new.status = 'cleared') or
    (last_status = 'cleared'      and new.status in ('verified', 'reopened')) or
    (last_status = 'reopened'     and new.status = 'acknowledged')
  ) then
    raise exception 'A report cannot move from "%" to "%"', last_status, new.status;
  end if;
  return new;
end $$;

-- After each entry, copy its stage onto the report as a shortcut.
create or replace function public.report_events_sync()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.reports set current_status = new.status, updated_at = now() where id = new.report_id;
  return new;
end $$;

-- Submitting a report writes its first history entry. The person sending it cannot fake or skip this.
create or replace function public.reports_first_event()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.report_events (report_id, status, actor_type) values (new.id, 'reported', 'citizen');
  return new;
end $$;

drop trigger if exists report_events_check on public.report_events;
create trigger report_events_check before insert on public.report_events
  for each row execute function public.report_events_check();

drop trigger if exists report_events_sync on public.report_events;
create trigger report_events_sync after insert on public.report_events
  for each row execute function public.report_events_sync();

drop trigger if exists reports_first_event on public.reports;
create trigger reports_first_event after insert on public.reports
  for each row execute function public.reports_first_event();

revoke all on function public.report_events_check(), public.report_events_sync(), public.reports_first_event() from public, anon, authenticated;

-- ------------------------------------------------------------------ interventions (groundwork)
create table if not exists public.interventions (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references public.reports (id) on delete restrict,
  body_id     uuid references public.responsible_bodies (id),
  type        text not null check (type in ('cleared', 'camera', 'barrier', 'signage', 'enforcement', 'other')),
  description text check (description is null or char_length(description) <= 2000),
  cost_pence  integer check (cost_pence is null or cost_pence >= 0),
  done_at     timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index if not exists interventions_report_idx on public.interventions (report_id);

-- ------------------------------------------------------------------ who can do what
alter table public.categories         enable row level security;
alter table public.responsible_bodies enable row level security;
alter table public.reports            enable row level security;
alter table public.report_events      enable row level security;
alter table public.interventions      enable row level security;

-- Supabase leaves broad rights switched on by default. Remove them all, then grant only what is needed.
revoke all on public.categories, public.responsible_bodies, public.reports,
              public.report_events, public.interventions from anon, authenticated;

grant select on public.categories, public.responsible_bodies, public.reports, public.report_events to anon, authenticated;

-- Adding a report: only these columns can be set. Stage, responsible body and history are set by the database.
grant insert (category_code, description, photo_path, lat, lng, location_accuracy_m, location_source)
  on public.reports to anon, authenticated;

drop policy if exists "anyone can read issue types" on public.categories;
create policy "anyone can read issue types" on public.categories
  for select to anon, authenticated using (true);

drop policy if exists "anyone can read councils and contractors" on public.responsible_bodies;
create policy "anyone can read councils and contractors" on public.responsible_bodies
  for select to anon, authenticated using (active);

drop policy if exists "anyone can read reports" on public.reports;
create policy "anyone can read reports" on public.reports
  for select to anon, authenticated using (true);

drop policy if exists "anyone can add a report" on public.reports;
create policy "anyone can add a report" on public.reports
  for insert to anon, authenticated
  with check (
    current_status = 'reported'
    and responsible_body_id is null
    and duplicate_of is null
    and exists (select 1 from public.categories c where c.code = category_code and c.active)
  );

drop policy if exists "anyone can read report history" on public.report_events;
create policy "anyone can read report history" on public.report_events
  for select to anon, authenticated using (true);

-- No policies and no grants on interventions: nobody can reach it through the API until staff accounts exist.

-- ------------------------------------------------------------------ photo storage
-- A public bucket: photos are viewed by link. People can add a photo but never change or delete one.
-- Files are limited to 5 MB and to JPEG, PNG or WebP. The app also shrinks them before sending.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('report-photos', 'report-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "anyone can add a report photo" on storage.objects;
create policy "anyone can add a report photo" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'report-photos'
    and name ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|jpeg|png|webp)$'
  );
