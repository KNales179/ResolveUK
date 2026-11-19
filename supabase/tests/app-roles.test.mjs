// Checks supabase/app-roles.sql (the app's "what can this person do?" answer) on a local Postgres
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
for (const f of ['schema.sql', 'community.sql', 'dashboard.sql', 'security-update.sql', 'v2-concept.sql', 'flexible-bodies.sql', 'reporter-profile-fields.sql', 'staff-profile-fields.sql']) {
  await db.exec(read(f))
}
await db.exec(read('app-roles.sql'))
await db.exec(read('app-roles.sql')) // running it twice must be harmless

let failed = 0
const check = (name, ok, extra) => {
  if (!ok) failed++
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra))
}

async function roleOf(who) {
  await db.exec('begin')
  try {
    if (who === null) await db.exec('set local role anon')
    else {
      await db.exec('set local role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who])
    }
    const res = await db.query('select public.app_role() as role')
    await db.exec('rollback')
    return res.rows[0].role
  } catch (e) {
    await db.exec('rollback')
    return 'ERROR: ' + String(e.message || e)
  }
}

const RESIDENT = '88888888-1111-4111-8111-888888888888'
const REVIEWER = '88888888-2222-4222-8222-888888888888'
const ADMIN = '88888888-3333-4333-8333-888888888888'
const FORMER_ADMIN = '88888888-4444-4444-8444-888888888888'
await db.exec(`insert into auth.users (id, email) values
  ('${RESIDENT}', 'resident@example.com'), ('${REVIEWER}', 'reviewer@example.com'),
  ('${ADMIN}', 'admin@example.com'), ('${FORMER_ADMIN}', 'former@example.com')`)
await db.exec(`insert into public.staff_profiles (id, body_id, role, display_name, active) values
  ('${REVIEWER}', null, 'reviewer', 'Rae Reviewer', true),
  ('${ADMIN}', null, 'resolve_admin', 'Ada Admin', true),
  ('${FORMER_ADMIN}', null, 'resolve_admin', 'Former Admin', false)`)

check('someone not signed in is a guest', (await roleOf(null)) === 'guest')
check('a signed-in person with no staff record is a resident', (await roleOf(RESIDENT)) === 'resident')
check('a Resolve reviewer counts as staff', (await roleOf(REVIEWER)) === 'staff')
check('a Resolve admin is an admin', (await roleOf(ADMIN)) === 'admin')
check('a switched-off admin is just a resident', (await roleOf(FORMER_ADMIN)) === 'resident')

// council or contractor staff belong to a body
await db.exec(`insert into public.responsible_bodies (name, kind, tier) values ('Testshire Council (test data)', 'council', 'unitary')`)
const body = await db.query(`select id from public.responsible_bodies limit 1`)
if (body.rows.length) {
  const STAFF = '88888888-5555-4555-8555-888888888888'
  await db.exec(`insert into auth.users (id, email) values ('${STAFF}', 'staff@example.com')`)
  await db.query(`insert into public.staff_profiles (id, body_id, role, display_name) values ($1, $2, 'staff', 'Sam Staff')`, [STAFF, body.rows[0].id])
  check('council or contractor staff count as staff', (await roleOf(STAFF)) === 'staff')
} else {
  check('council or contractor staff count as staff (needs a seeded body)', false, 'no responsible_bodies rows to attach staff to')
}

console.log(failed ? `\n${failed} check(s) failed` : '\nAll app-role checks passed')
process.exit(failed ? 1 : 0)
