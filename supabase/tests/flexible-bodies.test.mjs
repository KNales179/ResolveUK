// Checks supabase/flexible-bodies.sql on a local Postgres (PGlite).
// Run with:  npm run test:db
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const read = (name) => readFileSync(join(here, '..', name), 'utf8')
const schemaSql = read('schema.sql')
const communitySql = read('community.sql')
const dashboardSql = read('dashboard.sql')
const securitySql = read('security-update.sql')
const flexSql = read('flexible-bodies.sql')

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
await db.exec(schemaSql)
await db.exec(communitySql)
await db.exec(dashboardSql)
await db.exec(securitySql)
await db.exec(flexSql)
await db.exec(flexSql) // running it twice must be harmless

let failed = 0
const check = (name, ok, extra) => {
  if (!ok) failed++
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra))
}

async function as(who, sql, params) {
  await db.exec('begin')
  try {
    if (who === 'anon') await db.exec('set local role anon')
    else {
      await db.exec('set local role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who])
    }
    const res = await db.query(sql, params)
    return { ok: true, rows: res.rows }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  } finally {
    await db.exec('rollback')
  }
}

async function asKeep(who, sql, params) {
  await db.exec('begin')
  await db.exec('set local role authenticated')
  await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who])
  const res = await db.query(sql, params)
  await db.exec('commit')
  return res
}

let n = 0
const uid = () => `88888888-${String(++n).padStart(4, '0')}-4888-8888-888888888888`

// ---- an 'other' body can exist, shaped like a council (no tier, no works_for) ----
{
  const bad = await as('anon', `insert into public.responsible_bodies (name, kind) values ('x', 'other')`)
  check('the public cannot add one', !bad.ok)

  const ADMIN = uid()
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'flex-admin@example.com');
    insert into public.staff_profiles (id, body_id, role, display_name) values ('${ADMIN}', null, 'resolve_admin', 'Flex Admin');
  `)

  const noTier = await as(ADMIN, `insert into public.responsible_bodies (name, kind) values ('Tesco (test data)', 'other') returning id`)
  check('an admin can add an organisation that is neither council nor contractor', noTier.ok, noTier.error)

  const withTier = await as(ADMIN, `insert into public.responsible_bodies (name, kind, tier) values ('x', 'other', 'unitary')`)
  check('it still cannot be given a council tier', !withTier.ok)

  const stillBlocked = await as(ADMIN, `insert into public.responsible_bodies (name, kind) values ('x', 'landlord')`)
  check('a made-up kind is still refused', !stillBlocked.ok)
}

// ---- an admin can route and advance a report to one, with nobody signed in as that organisation ----
{
  const ADMIN2 = uid()
  const TESCO = uid()
  await db.exec(`insert into auth.users (id, email) values ('${ADMIN2}', 'flex-admin-2@example.com')`)
  await asKeep(ADMIN2, `select 1`, []) // just to open a session; profile inserted next as the table owner
  await db.query(`insert into public.staff_profiles (id, body_id, role, display_name) values ($1, null, 'resolve_admin', 'Flex Admin 2')`, [ADMIN2])
  const tescoRow = await db.query(`insert into public.responsible_bodies (name, kind) values ('Tesco Superstore (test data)', 'other') returning id`)
  const TESCO_BODY = tescoRow.rows[0].id

  const r = await db.query(`insert into public.reports (category_code, description, photo_path, lat, lng, device_token) values ('fly-tipping', 'Bags dumped in the car park', '11111111-1111-4111-8111-111111111111.jpg', 51.5, -0.1, '22222222-2222-4222-8222-222222222222') returning id`)
  const REPORT = r.rows[0].id

  const assign = await asKeep(ADMIN2, `select public.admin_reassign_report($1, $2)`, [REPORT, TESCO_BODY])
  check('an admin can assign a report to an organisation with no staff login at all', !!assign)

  const afterAssign = await db.query(`select responsible_body_id, current_status from public.reports where id = $1`, [REPORT])
  check('the report now shows that organisation as responsible', afterAssign.rows[0].responsible_body_id === TESCO_BODY)

  const advance = await as(ADMIN2, `select public.advance_report($1, 'acknowledged', 'Called them, they will sort it')`, [REPORT])
  check('an admin can log that it was acknowledged, on that organisation\'s behalf', advance.ok, advance.error)
}

console.log(failed ? `\n${failed} FAILED` : '\nAll flexible-bodies database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
