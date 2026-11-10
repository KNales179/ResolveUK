// Checks supabase/staff-profile-fields.sql (bio + avatar on a staff member's own profile) on a
// local Postgres (PGlite). Run with:  npm run test:db
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
const profileFieldsSql = read('staff-profile-fields.sql')

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
await db.exec(profileFieldsSql)
await db.exec(profileFieldsSql) // running it twice must be harmless

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

const STAFF_A = '88888888-aaaa-4aaa-8aaa-888888888888'
const STAFF_B = '88888888-bbbb-4bbb-8bbb-888888888888'
await db.exec(`insert into auth.users (id, email) values
  ('${STAFF_A}', 'staff-a@example.com'), ('${STAFF_B}', 'staff-b@example.com')`)
// Seeded directly (bypassing RLS), same as every other staff_profiles test fixture — staff_profiles
// has no insert grant for anyone but the admin_link_staff() function.
await db.exec(`insert into public.staff_profiles (id, body_id, role, display_name) values
  ('${STAFF_A}', null, 'reviewer', 'Alex Staff'), ('${STAFF_B}', null, 'reviewer', 'Blair Staff')`)

// ---- the new columns exist, with the bio length check working ----
{
  const cols = await db.query(`select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'staff_profiles' and column_name in ('bio', 'avatar_path')`)
  check('bio and avatar_path columns exist', cols.rows.length === 2, JSON.stringify(cols.rows))

  const tooLong = await tx(STAFF_A, `update public.staff_profiles set bio = repeat('x', 281) where id = $1`, [STAFF_A])
  check('a bio over 280 characters is rejected', !tooLong.ok)

  const fits = await tx(STAFF_A, `update public.staff_profiles set bio = repeat('x', 280) where id = $1`, [STAFF_A], { commit: true })
  check('a bio of exactly 280 characters is accepted', fits.ok, fits.error)
}

// ---- updating your own bio and avatar, but nothing else ----
{
  const own = await tx(STAFF_A, `update public.staff_profiles set bio = 'Keeps the verges tidy.', avatar_path = 'staff-avatars/${STAFF_A}.jpg' where id = $1`, [STAFF_A], { commit: true })
  check('a staff member can set their own bio and avatar_path', own.ok, own.error)

  const readBack = await tx(STAFF_A, `select bio, avatar_path from public.staff_profiles where id = $1`, [STAFF_A])
  check('the bio and avatar_path read back correctly', readBack.ok && readBack.rows[0]?.bio === 'Keeps the verges tidy.' && readBack.rows[0]?.avatar_path === `staff-avatars/${STAFF_A}.jpg`, JSON.stringify(readBack))

  const someoneElses = await tx(STAFF_A, `update public.staff_profiles set bio = 'hijacked' where id = $1`, [STAFF_B])
  const check2 = await tx(STAFF_B, `select bio from public.staff_profiles where id = $1`, [STAFF_B])
  check('a staff member cannot change someone else\'s bio', someoneElses.ok && check2.ok && check2.rows[0]?.bio !== 'hijacked', JSON.stringify(check2))

  const anonTry = await tx('anon', `update public.staff_profiles set bio = 'x' where id = $1`, [STAFF_A])
  check('the public cannot set anyone\'s bio', !anonTry.ok)

  const nameTry = await tx(STAFF_A, `update public.staff_profiles set display_name = 'New Name' where id = $1`, [STAFF_A])
  check('a staff member cannot rename themselves (still admin-only)', !nameTry.ok)
}

// ---- uploading an avatar ----
{
  const ownAvatar = await tx(STAFF_A, `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`staff-avatars/${STAFF_A}.jpg`], { commit: true })
  check('a staff member can upload their own avatar', ownAvatar.ok, ownAvatar.error)

  const badExt = await tx(STAFF_A, `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`staff-avatars/${STAFF_A}.gif`])
  check('a disallowed file extension is rejected', !badExt.ok)

  const othersAvatar = await tx(STAFF_A, `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`staff-avatars/${STAFF_B}.jpg`])
  check('a staff member cannot upload to someone else\'s avatar path', !othersAvatar.ok)

  const anonSees = await tx('anon', `select name from storage.objects where name = $1`, [`staff-avatars/${STAFF_A}.jpg`])
  check('anyone can see a staff avatar exists (public bucket)', anonSees.ok && anonSees.rows.length === 1, JSON.stringify(anonSees))

  const anonUpload = await tx('anon', `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`staff-avatars/${STAFF_A}.jpg`])
  check('the public cannot upload a staff avatar', !anonUpload.ok)

  const replace = await tx(STAFF_A, `update storage.objects set name = name where bucket_id = 'report-photos' and name = $1`, [`staff-avatars/${STAFF_A}.jpg`], { commit: true })
  check('a staff member can replace their own avatar', replace.ok, replace.error)

  // Seeded directly (bypassing RLS, as the harness's own connection role does outside tx()), since
  // staff B is never the one logged in during this file — this is purely to have a real row of
  // someone else's to attempt deleting, not something staff B did themselves.
  await db.exec(`insert into storage.objects (bucket_id, name) values ('report-photos', 'staff-avatars/${STAFF_B}.jpg')`)

  // A DELETE blocked by RLS is not an error — the USING clause just excludes the row, so it
  // reports success having deleted nothing. The only real check is whether the row survives.
  await tx(STAFF_A, `delete from storage.objects where bucket_id = 'report-photos' and name = $1`, [`staff-avatars/${STAFF_B}.jpg`], { commit: true })
  const othersStillThere = await db.query(`select 1 from storage.objects where name = $1`, [`staff-avatars/${STAFF_B}.jpg`])
  check('a staff member cannot delete someone else\'s avatar', othersStillThere.rows.length === 1, JSON.stringify(othersStillThere.rows))

  const removeOwn = await tx(STAFF_A, `delete from storage.objects where bucket_id = 'report-photos' and name = $1`, [`staff-avatars/${STAFF_A}.jpg`], { commit: true })
  const ownGone = await db.query(`select 1 from storage.objects where name = $1`, [`staff-avatars/${STAFF_A}.jpg`])
  check('a staff member can remove their own avatar', removeOwn.ok && ownGone.rows.length === 0, removeOwn.error || JSON.stringify(ownGone.rows))
}

console.log(failed ? `\n${failed} FAILED` : '\nAll staff-profile-fields database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
