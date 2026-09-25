-- Resolve UK: Dashboard stage. Run this in the SQL Editor AFTER schema.sql and community.sql.
-- It is safe to run again.
--
-- Adds sign-in for three kinds of staff, matching the Blueprint's "Who can see and change what" table:
--   staff         council or contractor staff. Sees the unassigned queue and their own body's reports.
--                 Can claim an unassigned report, then acknowledge, schedule and clear it.
--   reviewer      a Resolve reviewer. Sees everything. Verifies or reopens a cleared report.
--   resolve_admin a Resolve admin. Everything, plus manages councils, contractors and staff accounts.
--
-- Reports and their history stay readable by everyone, including the public, as they already were:
-- the Blueprint makes that a public feed. What changes here is who may act on a report, not who may
-- read one. Every action goes through a function below, so the rules live in one place.

-- ------------------------------------------------------------------ staff accounts
create table if not exists public.staff_profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  body_id      uuid references public.responsible_bodies (id),
  role         text not null check (role in ('staff', 'reviewer', 'resolve_admin')),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 80),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  -- council or contractor staff belong to a body; a Resolve reviewer or admin does not
  check (
    (role = 'staff' and body_id is not null) or
    (role in ('reviewer', 'resolve_admin') and body_id is null)
  )
);

create or replace function public.staff_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.staff_profiles where id = auth.uid() and active
$$;

create or replace function public.staff_body()
returns uuid language sql stable security definer set search_path = public as $$
  select body_id from public.staff_profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  -- coalesced to false, never null: "if not is_admin()" in plpgsql would otherwise silently
  -- skip the check for anyone with no staff row, since "if not null" is neither true nor false
  select coalesce(public.staff_role() = 'resolve_admin', false)
$$;

revoke all on function public.staff_role(), public.staff_body(), public.is_admin() from public, anon, authenticated;
grant execute on function public.staff_role(), public.staff_body(), public.is_admin() to authenticated;

alter table public.staff_profiles enable row level security;
revoke all on public.staff_profiles from anon, authenticated;
grant select on public.staff_profiles to authenticated;

drop policy if exists "staff can read their own row" on public.staff_profiles;
create policy "staff can read their own row" on public.staff_profiles
  for select to authenticated using (id = auth.uid() or public.is_admin());

-- No insert, update or delete grants here: staff accounts are only ever changed through
-- admin_link_staff() and admin_set_staff_active() below, never written to directly.

-- ------------------------------------------------------------------ bootstrapping and managing staff
-- The very first admin has to be linked by hand in the SQL Editor. See supabase/staff-members.sql.
-- After that, an admin can link, move or retire anyone else from the Manage screen, with no further SQL.
create or replace function public.admin_link_staff(
  p_email        text,
  p_role         text,
  p_body_id      uuid,
  p_display_name text
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only a Resolve admin can add or change a staff account';
  end if;
  select id into v_user_id from auth.users where email = lower(btrim(p_email));
  if v_user_id is null then
    raise exception 'No account with that email has signed up yet. Create it in Authentication > Users first, with Auto Confirm User ticked.';
  end if;
  insert into public.staff_profiles (id, body_id, role, display_name)
  values (v_user_id, p_body_id, p_role, p_display_name)
  on conflict (id) do update set body_id = excluded.body_id, role = excluded.role, display_name = excluded.display_name, active = true;
end $$;

create or replace function public.admin_set_staff_active(p_staff_id uuid, p_active boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then
    raise exception 'Only a Resolve admin can do this';
  end if;
  if p_staff_id = auth.uid() and not p_active then
    raise exception 'You cannot switch off your own account';
  end if;
  update public.staff_profiles set active = p_active where id = p_staff_id;
end $$;

revoke all on function public.admin_link_staff(text, text, uuid, text), public.admin_set_staff_active(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_link_staff(text, text, uuid, text), public.admin_set_staff_active(uuid, boolean) to authenticated;

-- ------------------------------------------------------------------ councils and contractors, managed by an admin
grant insert, update on public.responsible_bodies to authenticated;

drop policy if exists "admin manages councils and contractors" on public.responsible_bodies;
create policy "admin manages councils and contractors" on public.responsible_bodies
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ------------------------------------------------------------------ acting on a report
-- Claiming is how a report gets "Responsible body identified" for now, until real routing by map
-- boundary arrives in the Pilot stage. Any signed-in council or contractor member may claim an
-- unassigned report for their own body; nobody may claim one that already belongs to somebody else.
create or replace function public.claim_report(p_report_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_body uuid := public.staff_body();
  v_report public.reports;
begin
  if v_body is null then
    raise exception 'Only council or contractor staff can claim a report';
  end if;
  select * into v_report from public.reports where id = p_report_id for update;
  if not found then raise exception 'That report no longer exists'; end if;
  if v_report.responsible_body_id is not null then raise exception 'That report has already been claimed'; end if;
  if v_report.current_status <> 'reported' then raise exception 'That report can no longer be claimed'; end if;

  update public.reports set responsible_body_id = v_body where id = p_report_id;
  insert into public.report_events (report_id, status, actor_type, actor_id) values (p_report_id, 'routed', 'staff', auth.uid());
end $$;

-- An admin can move a report to a different body, for example if it was claimed by mistake, or
-- assign an unclaimed one directly instead of waiting for a council to claim it themselves. In that
-- second case this also writes the "routed" history entry that claim_report would otherwise have
-- written, so the report is not left stuck at "reported" with a body but no way to move forward.
create or replace function public.admin_reassign_report(p_report_id uuid, p_body_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_before uuid;
begin
  if not public.is_admin() then raise exception 'Only a Resolve admin can reassign a report'; end if;
  select responsible_body_id into v_before from public.reports where id = p_report_id;
  if not found then raise exception 'That report no longer exists'; end if;

  update public.reports set responsible_body_id = p_body_id where id = p_report_id;
  if v_before is null and p_body_id is not null then
    insert into public.report_events (report_id, status, actor_type, actor_id) values (p_report_id, 'routed', 'admin', auth.uid());
  end if;
end $$;

-- An unassigned report can be turned away before anyone claims it: it is not something any
-- responsible body can act on. Once claimed, the only way forward is to see it through.
create or replace function public.reject_report(p_report_id uuid, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.staff_role();
begin
  if v_role is null then raise exception 'Only staff can do this'; end if;
  if (select current_status from public.reports where id = p_report_id) <> 'reported' then
    raise exception 'Only an unassigned report can be rejected';
  end if;
  insert into public.report_events (report_id, status, actor_type, actor_id, note)
  values (p_report_id, 'rejected', case v_role when 'resolve_admin' then 'admin' else v_role end, auth.uid(), p_note);
end $$;

-- Every other move a report can make: acknowledge, schedule and clear it (the body it belongs to),
-- or verify or reopen it (a reviewer or admin). The database's own report_events_check trigger still
-- enforces which moves follow which, exactly as it does for a resident's report; this only adds who
-- is allowed to make each move.
create or replace function public.advance_report(p_report_id uuid, p_status text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_role text := public.staff_role();
  v_report public.reports;
begin
  if v_role is null then raise exception 'Only staff can do this'; end if;
  select * into v_report from public.reports where id = p_report_id;
  if not found then raise exception 'That report no longer exists'; end if;

  if p_status in ('acknowledged', 'scheduled', 'cleared') then
    if v_role = 'staff' and v_report.responsible_body_id is distinct from public.staff_body() then
      raise exception 'That report does not belong to your council or contractor';
    elsif v_role = 'reviewer' then
      raise exception 'A reviewer cannot do this; it is for the responsible body';
    end if;
  elsif p_status in ('verified', 'reopened') then
    if v_role = 'staff' then raise exception 'Only a reviewer can do this'; end if;
  else
    raise exception 'Use claim_report or reject_report for that move';
  end if;

  insert into public.report_events (report_id, status, actor_type, actor_id, note)
  values (p_report_id, p_status, case v_role when 'resolve_admin' then 'admin' else v_role end, auth.uid(), p_note);
end $$;

revoke all on function public.claim_report(uuid), public.admin_reassign_report(uuid, uuid),
              public.reject_report(uuid, text), public.advance_report(uuid, text, text) from public, anon, authenticated;
grant execute on function public.claim_report(uuid), public.reject_report(uuid, text), public.advance_report(uuid, text, text)
  to authenticated;
grant execute on function public.admin_reassign_report(uuid, uuid) to authenticated;

-- ------------------------------------------------------------------ what was done, and what it cost
-- Was fully closed off in schema.sql. Now open to staff and admins: not to the public, since a cost
-- figure is not something to publish before the plan has been agreed.
grant select on public.interventions to authenticated;
grant insert (report_id, body_id, type, description, cost_pence) on public.interventions to authenticated;

drop policy if exists "staff and admins can read interventions" on public.interventions;
create policy "staff and admins can read interventions" on public.interventions
  for select to authenticated using (public.staff_role() is not null);

drop policy if exists "staff can record what they did, admins record anything" on public.interventions;
create policy "staff can record what they did, admins record anything" on public.interventions
  for insert to authenticated
  with check (
    public.is_admin()
    or (public.staff_role() = 'staff' and body_id = public.staff_body()
        and exists (select 1 from public.reports r where r.id = report_id and r.responsible_body_id = public.staff_body()))
  );
