-- Resolve UK: one answer to "what can this signed-in person do in the app?" (stage 1 of the app).
-- Run this AFTER schema.sql, community.sql, dashboard.sql, security-update.sql, v2-concept.sql,
-- flexible-bodies.sql, reporter-profile-fields.sql and staff-profile-fields.sql.
-- It is safe to run again.
--
-- The app at /app shows different sections to different people. Rather than the website working
-- that out from several tables (and getting it wrong when one changes), it asks the database once:
--
--   guest     - not signed in
--   resident  - any signed-in person (reporting, following reports, later posting stories)
--   staff     - council or contractor staff, or a Resolve reviewer (active staff_profiles row)
--   admin     - a Resolve admin (active staff_profiles row with role 'resolve_admin')
--
-- 'community' (a member or leader of a community group) is added when community groups arrive in
-- stage 3; until then nobody can be one, so this function never returns it.
--
-- Read-only and only ever about the person asking (auth.uid()), so it is safe to let anyone call.

create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 'guest'
    when exists (
      select 1 from public.staff_profiles s
      where s.id = auth.uid() and s.active and s.role = 'resolve_admin'
    ) then 'admin'
    when exists (
      select 1 from public.staff_profiles s
      where s.id = auth.uid() and s.active and s.role in ('staff', 'reviewer')
    ) then 'staff'
    else 'resident'
  end
$$;

revoke all on function public.app_role() from public;
grant execute on function public.app_role() to anon, authenticated;
