-- Resolve UK: Community stage. Run this in the SQL Editor AFTER schema.sql. It is safe to run again.
--
-- Adds:
--   "Is this the same problem?"  a search for open reports of the same type close to a new report
--   Backing a report             someone can say they have seen the same problem, once per device
--
-- Nothing here changes what schema.sql set up. It only adds to it.

-- ------------------------------------------------------------------ how close counts as "the same place"
-- Distance in metres. Potholes are small, so their circle is smaller. The Blueprint starts at 10 to 20 m for
-- potholes and 25 to 50 m for everything else, then adjusts once real reports come in. Change it here, no code change.
do $$
begin
  if not exists (select 1 from information_schema.columns
                 where table_schema = 'public' and table_name = 'categories' and column_name = 'match_radius_m') then
    alter table public.categories
      add column match_radius_m integer not null default 50 check (match_radius_m between 5 and 500);
    update public.categories set match_radius_m = 20 where code = 'pothole';
  end if;
end $$;

create index if not exists reports_lat_lng_idx on public.reports (lat, lng);

-- ------------------------------------------------------------------ backing a report
create table if not exists public.report_supports (
  id           uuid primary key default gen_random_uuid(),
  report_id    uuid not null references public.reports (id) on delete restrict,
  -- a random id each phone or browser makes for itself. It is scrambled (hashed) before it is stored, so what
  -- the public can read here cannot be used to pose as anyone's device.
  device_token uuid not null,
  kind         text not null default 'same_issue' check (kind in ('same_issue', 'still_there', 'fixed')),
  created_at   timestamptz not null default now(),
  unique (report_id, device_token, kind)
);

create index if not exists report_supports_report_idx on public.report_supports (report_id);

alter table public.report_supports enable row level security;
revoke all on public.report_supports from anon, authenticated;

-- Store only a one-way scramble of the device id. Nobody, including the database owner, can turn it back into
-- the id the phone holds, so the table can be read (and counted) by everyone without exposing anyone.
create or replace function public.report_supports_scramble_token()
returns trigger language plpgsql set search_path = public as $$
begin
  new.device_token := md5('resolve-uk-device:' || new.device_token::text)::uuid;
  return new;
end $$;

revoke all on function public.report_supports_scramble_token() from public, anon, authenticated;

drop trigger if exists report_supports_scramble on public.report_supports;
create trigger report_supports_scramble before insert on public.report_supports
  for each row execute function public.report_supports_scramble_token();

-- The public can add a "same issue" backing and read the table (the site counts backings through the API,
-- which needs whole-row read rights).
grant insert (report_id, device_token, kind) on public.report_supports to anon, authenticated;
grant select on public.report_supports to anon, authenticated;

drop policy if exists "anyone can read backings" on public.report_supports;
create policy "anyone can read backings" on public.report_supports
  for select to anon, authenticated using (true);

-- "still there" and "fixed" need a photo and a reviewer, so they come with the pilot stage, not now.
-- Only reports that are still open can be backed.
drop policy if exists "anyone can back an open report" on public.report_supports;
create policy "anyone can back an open report" on public.report_supports
  for insert to anon, authenticated
  with check (
    kind = 'same_issue'
    and exists (
      select 1 from public.reports r
      where r.id = report_id
        and r.current_status in ('reported', 'routed', 'acknowledged', 'scheduled', 'reopened')
    )
  );

-- ------------------------------------------------------------------ the "same problem?" search
-- Open reports of the same type within the circle for that type, nearest first (at most 5).
-- The circle grows by the phone's own GPS error (up to 30 m), because a reading can be that far out.
create or replace function public.nearby_reports(
  p_lat        double precision,
  p_lng        double precision,
  p_category   text,
  p_accuracy_m real default null
)
returns table (
  id            uuid,
  category_code text,
  description   text,
  photo_path    text,
  current_status text,
  created_at    timestamptz,
  distance_m    double precision,
  backers       bigint
)
language sql stable set search_path = public as $$
  with target as (
    select c.match_radius_m + least(coalesce(p_accuracy_m, 0), 30)::int as radius_m
    from public.categories c where c.code = p_category and c.active
  ),
  found as (
    select r.id, r.category_code, r.description, r.photo_path, r.current_status, r.created_at,
           -- great-circle distance in metres (haversine)
           2 * 6371000 * asin(sqrt(
             power(sin(radians(r.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(r.lat)) * power(sin(radians(r.lng - p_lng) / 2), 2)
           )) as distance_m
    from public.reports r, target t
    where r.category_code = p_category
      and r.current_status in ('reported', 'routed', 'acknowledged', 'scheduled', 'reopened')
      -- cheap box first so the index can be used, then the exact distance below
      and r.lat between p_lat - (t.radius_m / 111000.0) and p_lat + (t.radius_m / 111000.0)
      and r.lng between p_lng - (t.radius_m / (111000.0 * greatest(cos(radians(p_lat)), 0.01)))
                    and p_lng + (t.radius_m / (111000.0 * greatest(cos(radians(p_lat)), 0.01)))
  )
  select f.id, f.category_code, f.description, f.photo_path, f.current_status, f.created_at, f.distance_m,
         1 + (select count(*) from public.report_supports s where s.report_id = f.id and s.kind = 'same_issue') as backers
  from found f, target t
  where f.distance_m <= t.radius_m
  order by f.distance_m
  limit 5
$$;

revoke all on function public.nearby_reports(double precision, double precision, text, real) from public;
grant execute on function public.nearby_reports(double precision, double precision, text, real) to anon, authenticated;
