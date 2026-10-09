-- Resolve UK: lets a responsible body be any organisation, not just a council or its contractor.
-- Run this AFTER schema.sql, community.sql, dashboard.sql, security-update.sql and v2-concept.sql.
-- It is safe to run again.
--
-- Why: Ms Kay's own example was a report that turns out to be a supermarket's problem (private
-- land) — Resolve should be able to log that the supermarket is responsible and track what happens,
-- the same way it already does for a council, even though a supermarket is neither a council nor a
-- contractor and will not sign in as staff. For now this is logged by an admin manually, by phone or
-- email, exactly as she described: no automatic lookup, no payment, nothing that costs money.
--
-- A new body kind, 'other', is added for this: no tier, works for nobody, same as a council in
-- shape, but not a council. An admin can assign a report to one and move it through acknowledged,
-- scheduled and cleared on its behalf, which the existing admin functions already allow for any
-- body — the only thing stopping this before was the table's own check, fixed below.

alter table public.responsible_bodies drop constraint if exists responsible_bodies_kind_check;
alter table public.responsible_bodies add constraint responsible_bodies_kind_check check (kind in ('council', 'contractor', 'other'));

alter table public.responsible_bodies drop constraint if exists responsible_bodies_check;
alter table public.responsible_bodies add constraint responsible_bodies_check check (
  (kind = 'council'    and tier is not null and works_for_id is null) or
  (kind = 'contractor' and tier is null     and works_for_id is not null) or
  (kind = 'other'      and tier is null     and works_for_id is null)
);

-- Check: both constraints should now allow 'other'. This proves it without leaving a test row behind.
do $$
begin
  insert into public.responsible_bodies (name, kind) values ('Flexible-bodies self-test (delete me)', 'other');
  delete from public.responsible_bodies where name = 'Flexible-bodies self-test (delete me)';
  raise notice 'other-kind bodies are now allowed';
end $$;
