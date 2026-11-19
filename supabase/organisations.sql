-- Resolve UK: organisations (stage 3 of the app). Community groups and clearance companies register,
-- mark the area they cover on a map, and are checked by a Resolve admin before they appear. People
-- apply to join a community group, and the group's leads (there can be several) decide. A group's
-- active members become "community" in the app.
--
-- Run this AFTER schema.sql, community.sql, dashboard.sql, security-update.sql, v2-concept.sql,
-- flexible-bodies.sql, reporter-profile-fields.sql, staff-profile-fields.sql, app-roles.sql and
-- stories.sql. It is safe to run again.
--
-- Rules:
--   - Anyone can see approved organisations (name, area, what they do, member count).
--   - Only a signed-in person can register one; it starts 'pending', with them as its first lead.
--   - A clearance company must give its waste carrier registration number (the admin checks it on
--     the Environment Agency's public register before approving).
--   - Only a Resolve admin approves or rejects an organisation (review_organisation()).
--   - Joining a community group is an application: the person answers a few questions and must
--     confirm they are 18 or over (or have a guardian's agreement) and accept the safety rules.
--   - Only an active lead of that group can approve or decline an application, or make someone a
--     lead. Members' details are visible to the group's leads, the member themselves and admins only.

create table if not exists public.organisations (
  id                   uuid primary key default gen_random_uuid(),
  kind                 text not null check (kind in ('community', 'commercial')),
  name                 text not null check (char_length(btrim(name)) between 2 and 80),
  description          text not null default '' check (char_length(description) <= 600),
  area                 jsonb not null,
  area_label           text not null check (char_length(btrim(area_label)) between 2 and 80),
  meets                text check (meets is null or char_length(meets) <= 120),
  contact_email        text check (contact_email is null or contact_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]+$'),
  waste_carrier_number text check (waste_carrier_number is null or char_length(btrim(waste_carrier_number)) between 4 and 30),
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  review_note          text check (review_note is null or char_length(review_note) <= 500),
  member_count         integer not null default 0,
  created_by           uuid not null references auth.users (id) on delete cascade,
  created_at           timestamptz not null default now(),
  check (kind = 'community' or waste_carrier_number is not null),
  check (jsonb_typeof(area) = 'object' and area ->> 'type' = 'Polygon')
);
create index if not exists organisations_status_idx on public.organisations (status, kind);

create table if not exists public.organisation_members (
  org_id       uuid not null references public.organisations (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  role         text not null default 'member' check (role in ('lead', 'member')),
  status       text not null default 'pending' check (status in ('pending', 'active', 'declined', 'left')),
  display_name text not null default 'A resident',
  answers      jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  decided_at   timestamptz,
  primary key (org_id, user_id)
);
create index if not exists organisation_members_user_idx on public.organisation_members (user_id);

alter table public.organisations enable row level security;
alter table public.organisation_members enable row level security;
revoke all on public.organisations, public.organisation_members from anon, authenticated;
grant select on public.organisations to anon, authenticated;
grant select on public.organisation_members to authenticated;
-- Every change goes through the functions below.

-- Is the person asking an active lead of this organisation?
create or replace function public.is_org_lead(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.organisation_members m
                 where m.org_id = p_org and m.user_id = auth.uid() and m.role = 'lead' and m.status = 'active')
$$;
revoke all on function public.is_org_lead(uuid) from public;
grant execute on function public.is_org_lead(uuid) to authenticated;

-- The app's roles, now including 'community': an active member of an approved community group.
-- (Replaces the version in app-roles.sql, which couldn't mention groups before this table existed.)
-- Defined here, before the policies below that use it, so this file also works on its own.
create or replace function public.app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when auth.uid() is null then 'guest'
    when exists (select 1 from public.staff_profiles s where s.id = auth.uid() and s.active and s.role = 'resolve_admin') then 'admin'
    when exists (select 1 from public.staff_profiles s where s.id = auth.uid() and s.active and s.role in ('staff', 'reviewer')) then 'staff'
    when exists (
      select 1 from public.organisation_members m join public.organisations o on o.id = m.org_id
      where m.user_id = auth.uid() and m.status = 'active' and o.status = 'approved' and o.kind = 'community'
    ) then 'community'
    else 'resident'
  end
$$;
revoke all on function public.app_role() from public;
grant execute on function public.app_role() to anon, authenticated;

drop policy if exists "anyone sees approved organisations" on public.organisations;
create policy "anyone sees approved organisations" on public.organisations
  for select using (status = 'approved');
drop policy if exists "the registrant sees their own organisation" on public.organisations;
create policy "the registrant sees their own organisation" on public.organisations
  for select to authenticated using (created_by = auth.uid());
drop policy if exists "an admin sees every organisation" on public.organisations;
create policy "an admin sees every organisation" on public.organisations
  for select to authenticated using (public.app_role() = 'admin');

drop policy if exists "a person sees their own membership" on public.organisation_members;
create policy "a person sees their own membership" on public.organisation_members
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "a lead sees their group's members" on public.organisation_members;
create policy "a lead sees their group's members" on public.organisation_members
  for select to authenticated using (public.is_org_lead(org_id));
drop policy if exists "an admin sees every membership" on public.organisation_members;
create policy "an admin sees every membership" on public.organisation_members
  for select to authenticated using (public.app_role() = 'admin');

-- Keeps the public member count in step (active members only).
create or replace function public.organisation_members_count()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.organisations o
     set member_count = (select count(*) from public.organisation_members m where m.org_id = o.id and m.status = 'active')
   where o.id = coalesce(new.org_id, old.org_id);
  return null;
end;
$$;
drop trigger if exists organisation_members_count on public.organisation_members;
create trigger organisation_members_count after insert or update or delete on public.organisation_members
  for each row execute function public.organisation_members_count();

create or replace function public.my_display_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select nullif(btrim(display_name), '') from public.reporter_profiles where id = auth.uid()), 'A resident')
$$;

-- Register a community group or a clearance company. It waits for an admin; the person who
-- registers it becomes its first lead straight away (so they can manage it once approved).
create or replace function public.register_organisation(
  p_kind text, p_name text, p_description text, p_area jsonb, p_area_label text,
  p_meets text default null, p_contact_email text default null, p_waste_carrier_number text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Sign in to register an organisation'; end if;
  if p_kind = 'commercial' and nullif(btrim(coalesce(p_waste_carrier_number, '')), '') is null then
    raise exception 'A clearance company needs its waste carrier registration number';
  end if;
  insert into public.organisations (kind, name, description, area, area_label, meets, contact_email, waste_carrier_number, created_by)
  values (p_kind, btrim(p_name), btrim(coalesce(p_description, '')), p_area, btrim(p_area_label),
          nullif(btrim(coalesce(p_meets, '')), ''), nullif(btrim(coalesce(p_contact_email, '')), ''),
          case when p_kind = 'commercial' then upper(btrim(p_waste_carrier_number)) end, auth.uid())
  returning id into v_id;
  insert into public.organisation_members (org_id, user_id, role, status, display_name, decided_at)
  values (v_id, auth.uid(), 'lead', 'active', public.my_display_name(), now());
  return v_id;
end;
$$;

create or replace function public.review_organisation(p_org uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.app_role() <> 'admin' then raise exception 'Only a Resolve admin can review organisations'; end if;
  if p_decision not in ('approved', 'rejected') then raise exception 'Unknown decision: %', p_decision; end if;
  update public.organisations set status = p_decision, review_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_org;
  if not found then raise exception 'No such organisation'; end if;
end;
$$;

-- Apply to join an approved community group.
create or replace function public.apply_to_join(p_org uuid, p_answers jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Sign in to join a group'; end if;
  if not exists (select 1 from public.organisations where id = p_org and status = 'approved' and kind = 'community') then
    raise exception 'That group is not taking members';
  end if;
  if coalesce((p_answers ->> 'adult')::boolean, false) is not true or coalesce((p_answers ->> 'safety')::boolean, false) is not true then
    raise exception 'Please confirm your age and the safety rules';
  end if;
  insert into public.organisation_members (org_id, user_id, role, status, display_name, answers)
  values (p_org, auth.uid(), 'member', 'pending', public.my_display_name(), p_answers)
  on conflict (org_id, user_id) do update
    set status = 'pending', answers = excluded.answers, created_at = now(), decided_at = null
    where public.organisation_members.status in ('declined', 'left');
end;
$$;

-- A group's lead decides on an application, or makes an active member a lead too.
create or replace function public.decide_member(p_org uuid, p_user uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_org_lead(p_org) then raise exception 'Only a lead of this group can do that'; end if;
  if p_decision = 'approve' then
    update public.organisation_members set status = 'active', decided_at = now() where org_id = p_org and user_id = p_user and status = 'pending';
  elsif p_decision = 'decline' then
    update public.organisation_members set status = 'declined', decided_at = now() where org_id = p_org and user_id = p_user and status = 'pending';
  elsif p_decision = 'make_lead' then
    update public.organisation_members set role = 'lead' where org_id = p_org and user_id = p_user and status = 'active';
  else
    raise exception 'Unknown decision: %', p_decision;
  end if;
  if not found then raise exception 'Nothing to change for that person'; end if;
end;
$$;

create or replace function public.leave_organisation(p_org uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.organisation_members set status = 'left', role = 'member', decided_at = now()
   where org_id = p_org and user_id = auth.uid() and status in ('active', 'pending');
end;
$$;

revoke all on function public.register_organisation(text, text, text, jsonb, text, text, text, text) from public;
revoke all on function public.review_organisation(uuid, text, text) from public;
revoke all on function public.apply_to_join(uuid, jsonb) from public;
revoke all on function public.decide_member(uuid, uuid, text) from public;
revoke all on function public.leave_organisation(uuid) from public;
revoke all on function public.my_display_name() from public;
grant execute on function public.register_organisation(text, text, text, jsonb, text, text, text, text) to authenticated;
grant execute on function public.review_organisation(uuid, text, text) to authenticated;
grant execute on function public.apply_to_join(uuid, jsonb) to authenticated;
grant execute on function public.decide_member(uuid, uuid, text) to authenticated;
grant execute on function public.leave_organisation(uuid) to authenticated;
grant execute on function public.my_display_name() to authenticated;
