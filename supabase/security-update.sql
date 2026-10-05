-- Resolve UK: two small security additions. Run this in the SQL Editor AFTER schema.sql,
-- community.sql and dashboard.sql. It is safe to run again.
--
-- 1. Rate limiting on public reports: the same device cannot send more than 5 reports an hour.
--    Uses the same one-way scramble as report_supports, so no raw device id is ever stored.
-- 2. "Must change password": a staff account created by an admin starts with this switched on,
--    and the sign-in screen will not let them past it until they set their own password.

-- ------------------------------------------------------------------ 1. report rate limiting
alter table public.reports add column if not exists device_token uuid;

-- Existing sample reports have no device id. Give them a shared placeholder so the column can
-- become not-null without losing any of that test data.
update public.reports set device_token = md5('resolve-uk-device:legacy')::uuid where device_token is null;

alter table public.reports alter column device_token set not null;

create or replace function public.reports_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_token  uuid := md5('resolve-uk-device:' || new.device_token::text)::uuid;
  v_recent int;
begin
  select count(*) into v_recent from public.reports
    where device_token = v_token and created_at > now() - interval '1 hour';
  if v_recent >= 5 then
    raise exception 'Too many reports from this device in the last hour. Please wait and try again.';
  end if;
  new.device_token := v_token;
  return new;
end $$;

revoke all on function public.reports_rate_limit() from public, anon, authenticated;

drop trigger if exists reports_rate_limit on public.reports;
create trigger reports_rate_limit before insert on public.reports
  for each row execute function public.reports_rate_limit();

grant insert (device_token) on public.reports to anon, authenticated;

-- ------------------------------------------------------------------ 2. forced password change
alter table public.staff_profiles add column if not exists must_change_password boolean not null default true;

-- Existing staff (you, and anyone already set up) should not be forced through this again.
update public.staff_profiles set must_change_password = false;

create or replace function public.clear_must_change_password()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.staff_profiles set must_change_password = false where id = auth.uid();
end $$;

revoke all on function public.clear_must_change_password() from public, anon;
grant execute on function public.clear_must_change_password() to authenticated;

-- Check: device_token should show "not null", and your own row should show false.
select column_name, is_nullable from information_schema.columns
  where table_schema = 'public' and table_name = 'reports' and column_name = 'device_token';
select display_name, must_change_password from public.staff_profiles order by display_name;
