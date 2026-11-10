// Checks supabase/reporter-profile-fields.sql (bio + avatar on a reporter's own profile) on a
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
const v2Sql = read('v2-concept.sql')
const profileFieldsSql = read('reporter-profile-fields.sql')

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

const REPORTER_A = '77777777-aaaa-4aaa-8aaa-777777777777'
const REPORTER_B = '77777777-bbbb-4bbb-8bbb-777777777777'
await db.exec(`insert into auth.users (id, email) values
  ('${REPORTER_A}', 'reporter-a@example.com'), ('${REPORTER_B}', 'reporter-b@example.com')`)
await db.exec(`insert into public.reporter_profiles (id, display_name) values
  ('${REPORTER_A}', 'Alex Reporter'), ('${REPORTER_B}', 'Blair Reporter')`)
// schema.sql already seeds the report-photos bucket — no need to insert it again here.

// ---- the new columns exist, with the bio length check working ----
{
  const cols = await db.query(`select column_name from information_schema.columns
    where table_schema = 'public' and table_name = 'reporter_profiles' and column_name in ('bio', 'avatar_path')`)
  check('bio and avatar_path columns exist', cols.rows.length === 2, JSON.stringify(cols.rows))

  const tooLong = await tx(REPORTER_A, `update public.reporter_profiles set bio = repeat('x', 281) where id = $1`, [REPORTER_A])
  check('a bio over 280 characters is rejected', !tooLong.ok)

  const fits = await tx(REPORTER_A, `update public.reporter_profiles set bio = repeat('x', 280) where id = $1`, [REPORTER_A], { commit: true })
  check('a bio of exactly 280 characters is accepted', fits.ok, fits.error)
}

// ---- updating your own bio and avatar ----
{
  const own = await tx(REPORTER_A, `update public.reporter_profiles set bio = 'Likes litter picks.', avatar_path = 'avatars/${REPORTER_A}.jpg' where id = $1`, [REPORTER_A], { commit: true })
  check('a reporter can set their own bio and avatar_path', own.ok, own.error)

  const readBack = await tx(REPORTER_A, `select bio, avatar_path from public.reporter_profiles where id = $1`, [REPORTER_A])
  check('the bio and avatar_path read back correctly', readBack.ok && readBack.rows[0]?.bio === 'Likes litter picks.' && readBack.rows[0]?.avatar_path === `avatars/${REPORTER_A}.jpg`, JSON.stringify(readBack))

  const someoneElses = await tx(REPORTER_A, `update public.reporter_profiles set bio = 'hijacked' where id = $1`, [REPORTER_B])
  const check2 = await tx(REPORTER_B, `select bio from public.reporter_profiles where id = $1`, [REPORTER_B])
  check('a reporter cannot change someone else\'s bio', someoneElses.ok && check2.ok && check2.rows[0]?.bio !== 'hijacked', JSON.stringify(check2))

  const anonTry = await tx('anon', `update public.reporter_profiles set bio = 'x' where id = $1`, [REPORTER_A])
  check('the public cannot set anyone\'s bio', !anonTry.ok)
}

// ---- uploading an avatar ----
{
  const ownAvatar = await tx(REPORTER_A, `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`avatars/${REPORTER_A}.jpg`], { commit: true })
  check('a reporter can upload their own avatar', ownAvatar.ok, ownAvatar.error)

  const badExt = await tx(REPORTER_A, `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`avatars/${REPORTER_A}.gif`])
  check('a disallowed file extension is rejected', !badExt.ok)

  const othersAvatar = await tx(REPORTER_A, `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`avatars/${REPORTER_B}.jpg`])
  check('a reporter cannot upload to someone else\'s avatar path', !othersAvatar.ok)

  const anonSees = await tx('anon', `select name from storage.objects where name = $1`, [`avatars/${REPORTER_A}.jpg`])
  check('anyone can see an avatar exists (public bucket)', anonSees.ok && anonSees.rows.length === 1, JSON.stringify(anonSees))

  const anonUpload = await tx('anon', `insert into storage.objects (bucket_id, name) values ('report-photos', $1)`, [`avatars/${REPORTER_A}.jpg`])
  check('the public cannot upload an avatar', !anonUpload.ok)

  const replace = await tx(REPORTER_A, `update storage.objects set name = name where bucket_id = 'report-photos' and name = $1`, [`avatars/${REPORTER_A}.jpg`], { commit: true })
  check('a reporter can replace their own avatar', replace.ok, replace.error)

  // Seeded directly (bypassing RLS, as the harness's own connection role does outside tx()), since
  // reporter B is never the one logged in during this file — this is purely to have a real row of
  // someone else's to attempt deleting, not something reporter B did themselves.
  await db.exec(`insert into storage.objects (bucket_id, name) values ('report-photos', 'avatars/${REPORTER_B}.jpg')`)

  // A DELETE blocked by RLS is not an error — the USING clause just excludes the row, so it
  // reports success having deleted nothing. The only real check is whether the row survives.
  await tx(REPORTER_A, `delete from storage.objects where bucket_id = 'report-photos' and name = $1`, [`avatars/${REPORTER_B}.jpg`], { commit: true })
  const othersStillThere = await db.query(`select 1 from storage.objects where name = $1`, [`avatars/${REPORTER_B}.jpg`])
  check('a reporter cannot delete someone else\'s avatar', othersStillThere.rows.length === 1, JSON.stringify(othersStillThere.rows))

  const removeOwn = await tx(REPORTER_A, `delete from storage.objects where bucket_id = 'report-photos' and name = $1`, [`avatars/${REPORTER_A}.jpg`], { commit: true })
  const ownGone = await db.query(`select 1 from storage.objects where name = $1`, [`avatars/${REPORTER_A}.jpg`])
  check('a reporter can remove their own avatar', removeOwn.ok && ownGone.rows.length === 0, removeOwn.error || JSON.stringify(ownGone.rows))
}

console.log(failed ? `\n${failed} FAILED` : '\nAll reporter-profile-fields database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
