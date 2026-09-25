-- OPTIONAL. A few made-up councils and one contractor, for trying things out. Every name says "test data".
-- Run it in the SQL Editor after schema.sql. Do not run it on a database that holds real reports.
-- Real councils are added once the pilot area is decided. Safe to run again.

insert into public.responsible_bodies (name, kind, tier, functions)
select v.name, 'council', v.tier, v.functions
from (values
  ('Sample Unitary Council (test data)',  'unitary',  array['highways', 'waste', 'streetscene']),
  ('Sample County Council (test data)',   'county',   array['highways']),
  ('Sample District Council (test data)', 'district', array['waste', 'streetscene'])
) as v(name, tier, functions)
where not exists (select 1 from public.responsible_bodies b where lower(b.name) = lower(v.name));

insert into public.responsible_bodies (name, kind, works_for_id, functions)
select 'Sample Highways Contractor (test data)', 'contractor', c.id, array['highways']
from public.responsible_bodies c
where c.name = 'Sample County Council (test data)'
  and not exists (select 1 from public.responsible_bodies b where lower(b.name) = lower('Sample Highways Contractor (test data)'));

select name, kind, tier from public.responsible_bodies order by kind, name;
