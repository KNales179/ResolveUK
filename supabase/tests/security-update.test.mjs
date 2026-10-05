// Checks supabase/security-update.sql on a local Postgres (PGlite), the same way the other stages are checked.
// Run with:  npm run test:db
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(here, '..', 'schema.sql'), 'utf8')
const communitySql = readFileSync(join(here, '..', 'community.sql'), 'utf8')
const dashboardSql = readFileSync(join(here, '..', 'dashboard.sql'), 'utf8')
const securitySql = readFileSync(join(here, '..', 'security-update.sql'), 'utf8')

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
// a couple of sample reports exist already, the way a real database would, before the update runs
await db.exec(`insert into public.reports (category_code, description, photo_path, lat, lng) values
  ('graffiti', 'old sample before the update', '11111111-1111-4111-8111-111111111111.jpg', 51.5, -0.1)`)
await db.exec(securitySql)
await db.exec(securitySql) // running it twice must be harmless

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
const uid = () => `66666666-${String(++n).padStart(4, '0')}-4666-8666-666666666666`
const photo = (k) => `${String(k).padStart(8, '0')}-1111-4111-8111-111111111111.jpg`

// Unlike as(), this actually commits, so repeated calls build up real history for the rate
// limit to count against. Still returns {ok:false} on error instead of throwing.
async function insertReport(who, token, k) {
  await db.exec('begin')
  try {
    await db.exec(`set local role ${who}`)
    const res = await db.query(
      `insert into public.reports (category_code, description, photo_path, lat, lng, device_token) values ('graffiti', $1, $2, 51.5, -0.1, $3)`,
      [`report ${k}`, photo(k), token],
    )
    await db.exec('commit')
    return { ok: true, rows: res.rows }
  } catch (e) {
    await db.exec('rollback')
    return { ok: false, error: String(e.message || e) }
  }
}

// ---- the existing sample row survives the update ----
{
  const r = await db.query(`select device_token from public.reports where description = 'old sample before the update'`)
  check('an old report was given a device id so the column could become not-null', r.rows[0].device_token != null)
}

// ---- report rate limiting ----
{
  const DEVICE_A = '11111111-aaaa-4aaa-8aaa-111111111111'
  const DEVICE_B = '22222222-bbbb-4bbb-8bbb-222222222222'

  const noToken = await as('anon', `insert into public.reports (category_code, description, photo_path, lat, lng) values ('graffiti', 'x', $1, 51.5, -0.1)`, [photo('no-token')])
  check('a report with no device id is refused', !noToken.ok)

  for (let i = 1; i <= 5; i++) {
    const r = await insertReport('anon', DEVICE_A, `a${i}`)
    check(`report ${i} from the same device within the hour is allowed`, r.ok, r.error)
  }
  const sixth = await insertReport('anon', DEVICE_A, 'a6')
  check('a 6th report from the same device within the hour is refused', !sixth.ok)
  check('...with a message that explains why', !sixth.ok && /too many/i.test(sixth.error), sixth.error)

  const other = await insertReport('anon', DEVICE_B, 'b1')
  check('a different device is not affected by the first device being over its limit', other.ok, other.error)

  const stored = await db.query(`select device_token from public.reports where description = 'report a1'`)
  check('the stored device id is scrambled, not the raw one the device sent', stored.rows[0].device_token !== DEVICE_A)
}

// ---- forced password change ----
{
  const ADMIN = uid()
  const STAFF = uid()
  const COUNCIL = uid()
  await db.exec(`
    insert into auth.users (id, email) values ('${ADMIN}', 'admin2@example.com'), ('${STAFF}', 'temp-staff@example.com');
    insert into public.responsible_bodies (id, name, kind, tier) values ('${COUNCIL}', 'Temp Council (test data)', 'council', 'unitary');
    insert into public.staff_profiles (id, body_id, role, display_name) values ('${ADMIN}', null, 'resolve_admin', 'Ada Admin');
  `)

  await asKeep(ADMIN, `select public.admin_link_staff('temp-staff@example.com', 'staff', $1, 'Temp Staff')`, [COUNCIL])
  const fresh = await as(ADMIN, `select must_change_password from public.staff_profiles where id = $1`, [STAFF])
  check('a newly linked staff account starts with must_change_password on', fresh.rows[0].must_change_password === true)

  const otherClears = await as(ADMIN, `select public.clear_must_change_password()`)
  const stillOn = await as(ADMIN, `select must_change_password from public.staff_profiles where id = $1`, [STAFF])
  check('one person clearing the flag only clears their own row', otherClears.ok && stillOn.rows[0].must_change_password === true)

  await asKeep(STAFF, `select public.clear_must_change_password()`, [])
  const cleared = await as(ADMIN, `select must_change_password from public.staff_profiles where id = $1`, [STAFF])
  check('the staff member can clear their own flag', cleared.rows[0].must_change_password === false)

  await asKeep(ADMIN, `select public.admin_link_staff('temp-staff@example.com', 'reviewer', null, 'Temp Staff')`, [])
  const afterUpdate = await as(ADMIN, `select must_change_password, role from public.staff_profiles where id = $1`, [STAFF])
  check('changing their role later does not switch the flag back on', afterUpdate.rows[0].must_change_password === false && afterUpdate.rows[0].role === 'reviewer', JSON.stringify(afterUpdate.rows))
}

console.log(failed ? `\n${failed} FAILED` : '\nAll security-update database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
