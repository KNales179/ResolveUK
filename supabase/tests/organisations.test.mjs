// Checks supabase/organisations.sql (community groups and clearance companies) on a local Postgres
// (PGlite). Run with:  npm run test:db
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(join(here, '..', name), 'utf8')

const db = new PGlite()
await db.exec(`
  create schema auth;
  create table auth.users (id uuid primary key, email text unique);
  create function auth.uid() returns uuid language sql stable as $$
    select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create role anon nologin;
  create role authenticated nologin;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, auth, storage to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  grant all on storage.buckets, storage.objects to anon, authenticated;
`)
for (const f of ['schema.sql', 'community.sql', 'dashboard.sql', 'security-update.sql', 'v2-concept.sql', 'flexible-bodies.sql', 'reporter-profile-fields.sql', 'staff-profile-fields.sql', 'app-roles.sql', 'stories.sql']) {
  await db.exec(read(f))
}
await db.exec(read('organisations.sql'))
await db.exec(read('organisations.sql')) // running it twice must be harmless

let failed = 0
const check = (name, ok, extra) => {
  if (!ok) failed++
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra))
}
async function as(who, sql, params) {
  await db.exec('begin')
  try {
    if (who === null) await db.exec('set local role anon')
    else {
      await db.exec('set local role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who])
    }
    const res = await db.query(sql, params)
    await db.exec('commit')
    return { ok: true, rows: res.rows }
  } catch (e) {
    await db.exec('rollback')
    return { ok: false, error: String(e.message || e) }
  }
}

const FOUNDER = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa'
const JOINER = 'aaaaaaaa-2222-4222-8222-aaaaaaaaaaaa'
const STRANGER = 'aaaaaaaa-3333-4333-8333-aaaaaaaaaaaa'
const ADMIN = 'aaaaaaaa-4444-4444-8444-aaaaaaaaaaaa'
await db.exec(`insert into auth.users (id, email) values
  ('${FOUNDER}', 'f@example.com'), ('${JOINER}', 'j@example.com'), ('${STRANGER}', 's@example.com'), ('${ADMIN}', 'a@example.com')`)
await db.exec(`insert into public.reporter_profiles (id, display_name) values ('${FOUNDER}', 'Fran'), ('${JOINER}', 'Jamie'), ('${STRANGER}', 'Sky')`)
await db.exec(`insert into public.staff_profiles (id, body_id, role, display_name) values ('${ADMIN}', null, 'resolve_admin', 'Ada Admin')`)
const AREA = JSON.stringify({ type: 'Polygon', coordinates: [[[-2.76, 54.33], [-2.73, 54.33], [-2.73, 54.31], [-2.76, 54.31], [-2.76, 54.33]]] })
const role = async (who) => (await as(who, 'select public.app_role() as r')).rows?.[0]?.r

// ---- registering ----
check('someone not signed in cannot register', !(await as(null, `select public.register_organisation('community', 'Test group', '', $1::jsonb, 'Kendal')`, [AREA])).ok)
const noNumber = await as(FOUNDER, `select public.register_organisation('commercial', 'Clear-It Ltd', '', $1::jsonb, 'Cumbria')`, [AREA])
check('a clearance company must give its waste carrier number', !noNumber.ok)
const company = await as(FOUNDER, `select public.register_organisation('commercial', 'Clear-It Ltd', 'House and garden clearances', $1::jsonb, 'South Cumbria', null, 'hello@clearit.example', 'cbdu123456') as id`, [AREA])
check('a clearance company can register with its number', company.ok, company.error)
const reg = await as(FOUNDER, `select public.register_organisation('community', 'Kendal Riverside Group', 'Litter picks along the river', $1::jsonb, 'Kendal riverside', 'Weekday evenings') as id`, [AREA])
check('a signed-in person can register a community group', reg.ok, reg.error)
const ORG = reg.rows?.[0]?.id
check('a new group waits for an admin', (await as(FOUNDER, `select status from public.organisations where id = $1`, [ORG])).rows?.[0]?.status === 'pending')
check('the public cannot see a pending group', (await as(null, `select id from public.organisations where id = $1`, [ORG])).rows?.length === 0)
check('the founder is its first lead', (await as(FOUNDER, `select role, status from public.organisation_members where org_id = $1 and user_id = $2`, [ORG, FOUNDER])).rows?.[0]?.role === 'lead')
check("a founder of a group that isn't approved yet is still a resident", (await role(FOUNDER)) === 'resident')

// ---- approving ----
check('only an admin can approve', !(await as(FOUNDER, `select public.review_organisation($1, 'approved')`, [ORG])).ok)
check('an admin can approve', (await as(ADMIN, `select public.review_organisation($1, 'approved')`, [ORG])).ok)
check('once approved, anyone can see the group', (await as(null, `select id from public.organisations where id = $1`, [ORG])).rows?.length === 1)
check('the founder of an approved group counts as community', (await role(FOUNDER)) === 'community')
check('the member count shows 1', (await as(null, `select member_count from public.organisations where id = $1`, [ORG])).rows?.[0]?.member_count === 1)
check('the public cannot see who the members are', (await as(null, `select * from public.organisation_members where org_id = $1`, [ORG])).ok === false || (await as(null, `select * from public.organisation_members where org_id = $1`, [ORG])).rows?.length === 0)

// ---- joining ----
check('joining needs the age and safety confirmations', !(await as(JOINER, `select public.apply_to_join($1, '{"adult": true}'::jsonb)`, [ORG])).ok)
const apply = await as(JOINER, `select public.apply_to_join($1, '{"why": "I walk the river path every day", "adult": true, "safety": true}'::jsonb)`, [ORG])
check('a person can apply to join', apply.ok, apply.error)
check('an applicant is not community yet', (await role(JOINER)) === 'resident')
check('another person cannot see the application', (await as(STRANGER, `select * from public.organisation_members where org_id = $1 and user_id = $2`, [ORG, JOINER])).rows?.length === 0)
check('the lead can see the application and answers', /river path/.test(JSON.stringify((await as(FOUNDER, `select answers from public.organisation_members where org_id = $1 and user_id = $2`, [ORG, JOINER])).rows ?? [])))
check('someone who is not a lead cannot approve', !(await as(STRANGER, `select public.decide_member($1, $2, 'approve')`, [ORG, JOINER])).ok)
check('the lead can approve', (await as(FOUNDER, `select public.decide_member($1, $2, 'approve')`, [ORG, JOINER])).ok)
check('an approved member counts as community', (await role(JOINER)) === 'community')
check('the member count is now 2', (await as(null, `select member_count from public.organisations where id = $1`, [ORG])).rows?.[0]?.member_count === 2)
check('the lead can make a member a lead too', (await as(FOUNDER, `select public.decide_member($1, $2, 'make_lead')`, [ORG, JOINER])).ok)
check('the new lead can now see the members', (await as(JOINER, `select user_id from public.organisation_members where org_id = $1`, [ORG])).rows?.length === 2)
check('a member can leave', (await as(JOINER, `select public.leave_organisation($1)`, [ORG])).ok && (await role(JOINER)) === 'resident')
check("people can't change membership rows directly", !(await as(STRANGER, `insert into public.organisation_members (org_id, user_id, role, status) values ($1, $2, 'lead', 'active')`, [ORG, STRANGER])).ok)

console.log(failed ? `\n${failed} check(s) failed` : '\nAll organisation checks passed')
process.exit(failed ? 1 : 0)
