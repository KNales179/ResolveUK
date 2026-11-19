// Checks supabase/stories.sql (posting, approving and reading stories) on a local Postgres
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
for (const f of ['schema.sql', 'community.sql', 'dashboard.sql', 'security-update.sql', 'v2-concept.sql', 'flexible-bodies.sql', 'reporter-profile-fields.sql', 'staff-profile-fields.sql', 'app-roles.sql']) {
  await db.exec(read(f))
}
await db.exec(read('stories.sql'))
await db.exec(read('stories.sql')) // running it twice must be harmless

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

const AUTHOR = '99999999-1111-4111-8111-999999999999'
const OTHER = '99999999-2222-4222-8222-999999999999'
const ADMIN = '99999999-3333-4333-8333-999999999999'
await db.exec(`insert into auth.users (id, email) values
  ('${AUTHOR}', 'author@example.com'), ('${OTHER}', 'other@example.com'), ('${ADMIN}', 'admin@example.com')`)
await db.exec(`insert into public.reporter_profiles (id, display_name) values ('${AUTHOR}', 'Alex from Kendal'), ('${OTHER}', 'Blair')`)
await db.exec(`insert into public.staff_profiles (id, body_id, role, display_name) values ('${ADMIN}', null, 'resolve_admin', 'Ada Admin')`)
const rep = await db.query(`insert into public.reports (category_code, description, photo_path, lat, lng, device_token)
  values ('fly-tipping', 'Bags dumped in the lay-by (test data)', '11111111-2222-4333-8444-555555555555.jpg', 54.33, -2.75, '0f0f0f0f-0000-4000-8000-0f0f0f0f0f0f') returning id`)
const REPORT = rep.rows[0].id

// ---- posting ----
const anonPost = await as(null, `insert into public.stories (report_id, body) values ($1, 'Someone has dumped a lot of bags here again.')`, [REPORT])
check('someone not signed in cannot post a story', !anonPost.ok)

const sneaky = await as(AUTHOR, `insert into public.stories (report_id, body, status) values ($1, 'Trying to publish my own story straight away.', 'approved')`, [REPORT])
check('an author cannot post a story as already approved', !sneaky.ok, JSON.stringify(sneaky))

const post = await as(AUTHOR, `insert into public.stories (report_id, body) values ($1, '  Someone has dumped about ten black bags in the lay-by again.  ') returning id, status, author_name, kind, body`, [REPORT])
check('a signed-in person can post a story', post.ok, post.error)
const STORY = post.rows?.[0]?.id
check('a new story starts as pending', post.rows?.[0]?.status === 'pending')
check("the author's name is filled in from their own profile", post.rows?.[0]?.author_name === 'Alex from Kendal', post.rows?.[0]?.author_name)
check('it is a problem story, trimmed', post.rows?.[0]?.kind === 'problem' && !post.rows?.[0]?.body.startsWith(' '))

const tooShort = await as(AUTHOR, `insert into public.stories (report_id, body) values ($1, 'Rubbish')`, [REPORT])
check('a story needs at least a few words', !tooShort.ok)

// ---- who can see a pending story ----
check('the public cannot see a pending story', (await as(null, `select id from public.stories where id = $1`, [STORY])).rows?.length === 0)
check('another resident cannot see a pending story', (await as(OTHER, `select id from public.stories where id = $1`, [STORY])).rows?.length === 0)
check('the author can see their own pending story', (await as(AUTHOR, `select id from public.stories where id = $1`, [STORY])).rows?.length === 1)
check('an admin can see a pending story', (await as(ADMIN, `select id from public.stories where id = $1`, [STORY])).rows?.length === 1)

// ---- reviewing ----
const selfApprove = await as(AUTHOR, `select public.review_story($1, 'approved', null)`, [STORY])
check('an author cannot approve their own story', !selfApprove.ok)
const directUpdate = await as(AUTHOR, `update public.stories set status = 'approved' where id = $1`, [STORY])
check('an author cannot change the status directly', !directUpdate.ok || (await db.query(`select status from public.stories where id = $1`, [STORY])).rows[0].status === 'pending')
const badDecision = await as(ADMIN, `select public.review_story($1, 'published', null)`, [STORY])
check('an unknown decision is refused', !badDecision.ok)
const changes = await as(ADMIN, `select public.review_story($1, 'changes_requested', 'Please leave out the house number.')`, [STORY])
check('an admin can ask for changes, with a note', changes.ok, changes.error)
const seenByAuthor = await as(AUTHOR, `select status, review_note from public.stories where id = $1`, [STORY])
check('the author sees the request and the note', seenByAuthor.rows?.[0]?.status === 'changes_requested' && /house number/.test(seenByAuthor.rows?.[0]?.review_note ?? ''))
check('the public still cannot see it', (await as(null, `select id from public.stories where id = $1`, [STORY])).rows?.length === 0)
const approve = await as(ADMIN, `select public.review_story($1, 'approved', null)`, [STORY])
check('an admin can approve a story', approve.ok, approve.error)
check('once approved, anyone can read it', (await as(null, `select id from public.stories where id = $1`, [STORY])).rows?.length === 1)

console.log(failed ? `\n${failed} check(s) failed` : '\nAll story checks passed')
process.exit(failed ? 1 : 0)
