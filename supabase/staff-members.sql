-- Links the very first Resolve admin account. Run this once, in the SQL Editor, after dashboard.sql.
--
-- Before running this:
--   1. In Supabase, go to Authentication > Users > Add user > Create new user. Tick "Auto Confirm User".
--      Use your own email and a long password.
--   2. Replace the email below with that same address.
--   3. Run this in the SQL Editor. It is safe to run again.
--
-- After this, sign in to /staff on the site with that email, and use Manage to add councils,
-- contractors and every other member of staff by email. No further SQL is needed for that.

insert into public.staff_profiles (id, body_id, role, display_name)
select id, null, 'resolve_admin', 'Ivhel'
from auth.users where email = 'REPLACE-WITH-YOUR-EMAIL'
on conflict (id) do update set role = excluded.role, display_name = excluded.display_name, active = true;

-- Check: this should list you as resolve_admin.
select p.display_name, p.role, u.email
from public.staff_profiles p join auth.users u on u.id = p.id
order by p.role;
