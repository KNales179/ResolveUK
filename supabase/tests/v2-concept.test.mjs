// Checks supabase/v2-concept.sql (optional reporter accounts) on a local Postgres (PGlite).
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
const v2Sql = read('v2-concept.sql')

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
await db.exec(v2Sql)
await db.exec(v2Sql) // running it twice must be harmless

let failed = 0
const check = (name, ok, extra) => {
  if (!ok) failed++
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra))
}

async function tx(who, sql, params, { commit = false } = {}) {
  await db.exec('begin')
  try {
    if (who === 'anon') await db.exec('set local role anon')
    else {
      await db.exec('set local role authenticated')
      await db.query(`select set_config('request.jwt.claim.sub', $1, true)`, [who])
    }
    const res = await db.query(sql, params)
    await db.exec(commit ? 'commit' : 'rollback')
    return { ok: true, rows: res.rows }
  } catch (e) {
    await db.exec('rollback')
    return { ok: false, error: String(e.message || e) }
  }
}

const REPORTER_A = '77777777-aaaa-4aaa-8aaa-777777777777'
const REPORTER_B = '77777777-bbbb-4bbb-8bbb-777777777777'
await db.exec(`insert into auth.users (id, email) values
  ('${REPORTER_A}', 'reporter-a@example.com'), ('${REPORTER_B}', 'reporter-b@example.com')`)

const DEVICE = '33333333-dddd-4ddd-8ddd-333333333333'
let photoCounter = 0
const photo = () => `${String(++photoCounter).padStart(8, '0')}-1111-4111-8111-111111111111.jpg`
const newReport = (who, label, reporterId) =>
  tx(
    who,
    reporterId
      ? `insert into public.reports (category_code, description, photo_path, lat, lng, device_token, reporter_id) values ('graffiti', $1, $2, 51.5, -0.1, $3, $4)`
      : `insert into public.reports (category_code, description, photo_path, lat, lng, device_token) values ('graffiti', $1, $2, 51.5, -0.1, $3)`,
    reporterId ? [label, photo(), DEVICE, reporterId] : [label, photo(), DEVICE],
    { commit: true },
  )

// ---- creating an account ----
{
  const anonTry = await tx('anon', `insert into public.reporter_profiles (id, display_name) values ($1, 'x')`, [REPORTER_A])
  check('the public cannot create a reporter account', !anonTry.ok)

  const forSomeoneElse = await tx(REPORTER_A, `insert into public.reporter_profiles (id, display_name) values ($1, 'x')`, [REPORTER_B])
  check('a signed-in person cannot create an account for someone else', !forSomeoneElse.ok)

  const own = await tx(REPORTER_A, `insert into public.reporter_profiles (id, display_name) values ($1, $2)`, [REPORTER_A, 'Alex Reporter'], { commit: true })
  check('a signed-in person can create their own account', own.ok, own.error)
  await tx(REPORTER_B, `insert into public.reporter_profiles (id, display_name) values ($1, $2)`, [REPORTER_B, 'Blair Reporter'], { commit: true })
}

// ---- reading and changing it ----
{
  const readOwn = await tx(REPORTER_A, `select display_name from public.reporter_profiles where id = $1`, [REPORTER_A])
  check('a reporter can read their own account', readOwn.ok && readOwn.rows[0]?.display_name === 'Alex Reporter', JSON.stringify(readOwn))

  const readOther = await tx(REPORTER_A, `select display_name from public.reporter_profiles where id = $1`, [REPORTER_B])
  check('a reporter cannot read someone else\'s account', readOther.ok && readOther.rows.length === 0, JSON.stringify(readOther))

  const rename = await tx(REPORTER_A, `update public.reporter_profiles set display_name = 'Alex R.' where id = $1`, [REPORTER_A], { commit: true })
  check('a reporter can rename their own account', rename.ok, rename.error)

  const stealId = await tx(REPORTER_A, `update public.reporter_profiles set id = $2 where id = $1`, [REPORTER_A, REPORTER_B])
  check('a reporter cannot change their own account id', !stealId.ok)
}

// ---- linking a report to an account ----
{
  const anonLinked = await tx('anon', `insert into public.reports (category_code, description, photo_path, lat, lng, device_token, reporter_id) values ('graffiti', 'x', $1, 51.5, -0.1, $2, $3)`, [photo(), DEVICE, REPORTER_A])
  check('the public cannot link a report to any account', !anonLinked.ok)

  const anonPlain = await newReport('anon', 'anon-plain', null)
  check('the public can still report with no account at all', anonPlain.ok, anonPlain.error)

  const ownReport = await newReport(REPORTER_A, 'a1', REPORTER_A)
  check('a reporter can link a report to their own account', ownReport.ok, ownReport.error)

  const otherPeoplesReport = await newReport(REPORTER_A, 'a2', REPORTER_B)
  check('a reporter cannot link a report to someone else\'s account', !otherPeoplesReport.ok)

  const stillAnonymous = await newReport(REPORTER_A, 'a3', null)
  check('a signed-in reporter can still choose to report without linking it', stillAnonymous.ok, stillAnonymous.error)
}

console.log(failed ? `\n${failed} FAILED` : '\nAll v2-concept database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
