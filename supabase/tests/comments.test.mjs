// Checks supabase/comments.sql (comments, reporting, hiding and thanks on stories) on a local
// Postgres (PGlite). Run with:  npm run test:db
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
for (const f of ['schema.sql', 'community.sql', 'dashboard.sql', 'security-update.sql', 'v2-concept.sql', 'flexible-bodies.sql', 'reporter-profile-fields.sql', 'staff-profile-fields.sql', 'app-roles.sql', 'stories.sql', 'organisations.sql']) {
  await db.exec(read(f))
}
await db.exec(read('jobs.sql'))
await db.exec(read('comments.sql'))
await db.exec(read('comments.sql')) // running it twice must be harmless

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

const ADMIN = 'dddddddd-0000-4000-8000-000000000001'
const STAFF = 'dddddddd-0000-4000-8000-000000000002'
const OTHER_STAFF = 'dddddddd-0000-4000-8000-000000000003'
const AUTHOR = 'dddddddd-0000-4000-8000-000000000004'
const LEAD = 'dddddddd-0000-4000-8000-000000000005'
const READER = 'dddddddd-0000-4000-8000-000000000006'
const TROLL = 'dddddddd-0000-4000-8000-000000000007'
const COUNCIL = 'eeeeeeee-0000-4000-8000-000000000001'
const OTHER_COUNCIL = 'eeeeeeee-0000-4000-8000-000000000002'
const users = { ADMIN, STAFF, OTHER_STAFF, AUTHOR, LEAD, READER, TROLL }
await db.exec(`insert into auth.users (id, email) values ${Object.entries(users).map(([k, v]) => `('${v}', '${k.toLowerCase()}@example.com')`).join(', ')}`)
await db.exec(`
  insert into public.responsible_bodies (id, name, kind, tier) values
    ('${COUNCIL}', 'Lakeside Council (test data)', 'council', 'unitary'), ('${OTHER_COUNCIL}', 'Far Council (test data)', 'council', 'unitary');
  insert into public.staff_profiles (id, body_id, role, display_name) values
    ('${ADMIN}', null, 'resolve_admin', 'Ada Admin'), ('${STAFF}', '${COUNCIL}', 'staff', 'Sam Staff'), ('${OTHER_STAFF}', '${OTHER_COUNCIL}', 'staff', 'Olly Other');
  insert into public.reporter_profiles (id, display_name) values ('${AUTHOR}', 'Alex'), ('${LEAD}', 'Lee'), ('${READER}', 'Rae'), ('${TROLL}', 'Tam');
`)
const AREA = JSON.stringify({ type: 'Polygon', coordinates: [[[-2.76, 54.33], [-2.73, 54.33], [-2.73, 54.31], [-2.76, 54.31], [-2.76, 54.33]]] })
const group = (await as(LEAD, `select public.register_organisation('community', 'Lakeside Pickers', 'Litter picks', $1::jsonb, 'Lakeside') as id`, [AREA])).rows[0].id
await as(ADMIN, `select public.review_organisation($1, 'approved')`, [group])

const rep = await db.query(`insert into public.reports (category_code, description, photo_path, lat, lng, device_token, responsible_body_id)
  values ('fly-tipping', 'Bags in the lay-by (test data)', '11111111-2222-4333-8444-555555555555.jpg', 54.32, -2.75, gen_random_uuid(), '${COUNCIL}') returning id`)
const REPORT = rep.rows[0].id
await db.query(`insert into public.report_events (report_id, status, actor_type, actor_id) values ($1, 'routed', 'staff', '${STAFF}')`, [REPORT])
const problem = (await as(AUTHOR, `insert into public.stories (report_id, body) values ($1, 'Someone has dumped a lot of bags here again.') returning id`, [REPORT])).rows[0].id
const pendingStory = (await as(READER, `insert into public.stories (report_id, body) values ($1, 'This one is still waiting for an admin.') returning id`, [REPORT])).rows[0].id
await as(ADMIN, `select public.review_story($1, 'approved')`, [problem])
const offer = (await as(STAFF, `select public.offer_job($1, $2, null, true) as id`, [REPORT, group])).rows[0].id
await as(LEAD, `select public.respond_to_job($1, true)`, [offer])
const groupPost = (await as(LEAD, `select public.post_job_update($1, 'Booked for Saturday morning, all welcome.') as id`, [offer])).rows[0].id

// ---- commenting ----
check('someone not signed in cannot comment', !(await as(null, `insert into public.story_comments (story_id, body) values ($1, 'Hello there')`, [problem])).ok)
check('nobody can comment on a story that is not published', !(await as(READER, `insert into public.story_comments (story_id, body) values ($1, 'Hello there')`, [pendingStory])).ok)
const c1 = await as(READER, `insert into public.story_comments (story_id, body) values ($1, 'The bags are behind the bus shelter, not the wall.') returning id`, [problem])
check('a signed-in person can comment', c1.ok, c1.error)
const C1 = c1.rows?.[0]?.id
const row = (await db.query(`select * from public.story_comments where id = $1`, [C1])).rows[0]
check('their name is filled in by the database', row?.author_name === 'Rae' && row?.author_role === 'resident')
const sneaky = await as(READER, `insert into public.story_comments (story_id, body, author_name, status) values ($1, 'Pretending to be someone else', 'The Council', 'visible')`, [problem])
check('nobody can choose their own name or status', !sneaky.ok)
check('anyone can read visible comments', (await as(null, `select id from public.story_comments where id = $1`, [C1])).rows?.length === 1)
check('the story author is told', (await db.query(`select count(*) as n from public.notifications where user_id = $1 and title like '%commented%'`, [AUTHOR])).rows[0].n == 1)
const staffC = (await as(STAFF, `insert into public.story_comments (story_id, body) values ($1, 'Thanks, a crew is booked for Tuesday.') returning id`, [problem])).rows?.[0]?.id
check('staff comments are marked as official', (await db.query(`select author_role, author_name from public.story_comments where id = $1`, [staffC])).rows[0]?.author_role === 'staff')
check('too short a comment is refused', !(await as(READER, `insert into public.story_comments (story_id, body) values ($1, 'x')`, [problem])).ok)

// ---- reporting ----
const c2 = (await as(TROLL, `insert into public.story_comments (story_id, body) values ($1, 'I know who did this, it is number 12.') returning id`, [problem])).rows[0].id
check('anyone signed in can report a comment', (await as(READER, `select public.report_comment($1, 'Names a house')`, [c2])).ok)
check('a reported comment is hidden from the public', (await as(null, `select id from public.story_comments where id = $1`, [c2])).rows?.length === 0)
check('its author can still see it', (await as(TROLL, `select status from public.story_comments where id = $1`, [c2])).rows?.[0]?.status === 'reported')
check('reporting twice is harmless', (await as(READER, `select public.report_comment($1)`, [c2])).ok)
check('only an admin can review a reported comment', !(await as(STAFF, `select public.review_comment($1, true)`, [c2])).ok)
check('the admin sees who reported it', (await as(ADMIN, `select * from public.comment_flags where comment_id = $1`, [c2])).rows?.length === 1)
check('the admin can remove it', (await as(ADMIN, `select public.review_comment($1, false)`, [c2])).ok && (await db.query(`select status from public.story_comments where id = $1`, [c2])).rows[0].status === 'hidden')
const c3 = (await as(TROLL, `insert into public.story_comments (story_id, body) values ($1, 'Fair enough, sorry about that.') returning id`, [problem])).rows[0].id
await as(READER, `select public.report_comment($1)`, [c3])
check('or keep it, which brings it back', (await as(ADMIN, `select public.review_comment($1, true)`, [c3])).ok && (await as(null, `select id from public.story_comments where id = $1`, [c3])).rows?.length === 1)

// ---- hiding ----
check('a resident cannot hide comments', !(await as(READER, `select public.hide_comment($1)`, [c3])).ok)
check('staff of another council cannot hide comments here', !(await as(OTHER_STAFF, `select public.hide_comment($1)`, [c3])).ok)
check('staff for this report can hide a comment', (await as(STAFF, `select public.hide_comment($1)`, [c3])).ok)
const onGroup = (await as(TROLL, `insert into public.story_comments (story_id, body) values ($1, 'Not this lot again, waste of time.') returning id`, [groupPost])).rows[0].id
check('the lead of the group that posted can hide comments on its post', (await as(LEAD, `select public.hide_comment($1)`, [onGroup])).ok)
check('but not on other people\'s posts', !(await as(LEAD, `select public.hide_comment($1)`, [C1])).ok)
check('authors can delete their own comment', (await as(READER, `delete from public.story_comments where id = $1 returning id`, [C1])).rows?.length === 1)
check('but not someone else\'s', (await as(READER, `delete from public.story_comments where id = $1 returning id`, [staffC])).rows?.length === 0)

// ---- thanks ----
check('someone signed in can thank a post', (await as(READER, `insert into public.story_thanks (story_id) values ($1)`, [groupPost])).ok)
check('only once', !(await as(READER, `insert into public.story_thanks (story_id) values ($1)`, [groupPost])).ok)
check('not on behalf of someone else', !(await as(READER, `insert into public.story_thanks (story_id, user_id) values ($1, $2)`, [groupPost, TROLL])).ok)
await as(TROLL, `insert into public.story_thanks (story_id) values ($1)`, [groupPost])
check('anyone can count thanks', Number((await as(null, `select count(*) as n from public.story_thanks where story_id = $1`, [groupPost])).rows?.[0]?.n) === 2)
check('thanks can be taken back', (await as(READER, `delete from public.story_thanks where story_id = $1 returning story_id`, [groupPost])).rows?.length === 1)
check('not on a story that is not published', !(await as(READER, `insert into public.story_thanks (story_id) values ($1)`, [pendingStory])).ok)

console.log(failed ? `\n${failed} comment check(s) FAILED` : '\nAll comment checks passed')
process.exit(failed ? 1 : 0)
