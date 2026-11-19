// Checks supabase/jobs.sql (jobs for groups and companies, updates, the reporter's check, and
// notifications) on a local Postgres (PGlite). Run with:  npm run test:db
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
await db.exec(read('jobs.sql')) // running it twice must be harmless

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

const ADMIN = 'bbbbbbbb-0000-4000-8000-000000000001'
const STAFF = 'bbbbbbbb-0000-4000-8000-000000000002'
const OTHER_STAFF = 'bbbbbbbb-0000-4000-8000-000000000003'
const REPORTER = 'bbbbbbbb-0000-4000-8000-000000000004'
const LEAD = 'bbbbbbbb-0000-4000-8000-000000000005'
const MEMBER = 'bbbbbbbb-0000-4000-8000-000000000006'
const STRANGER = 'bbbbbbbb-0000-4000-8000-000000000007'
const FOLLOWER = 'bbbbbbbb-0000-4000-8000-000000000008'
const COUNCIL = 'cccccccc-0000-4000-8000-000000000001'
const OTHER_COUNCIL = 'cccccccc-0000-4000-8000-000000000002'
const users = { ADMIN, STAFF, OTHER_STAFF, REPORTER, LEAD, MEMBER, STRANGER, FOLLOWER }
await db.exec(`insert into auth.users (id, email) values ${Object.entries(users).map(([k, v]) => `('${v}', '${k.toLowerCase()}@example.com')`).join(', ')}`)
await db.exec(`
  insert into public.responsible_bodies (id, name, kind, tier) values
    ('${COUNCIL}', 'Lakeside Council (test data)', 'council', 'unitary'),
    ('${OTHER_COUNCIL}', 'Far Council (test data)', 'council', 'unitary');
  insert into public.staff_profiles (id, body_id, role, display_name) values
    ('${ADMIN}', null, 'resolve_admin', 'Ada Admin'),
    ('${STAFF}', '${COUNCIL}', 'staff', 'Sam Staff'),
    ('${OTHER_STAFF}', '${OTHER_COUNCIL}', 'staff', 'Olly Other');
  insert into public.reporter_profiles (id, display_name) values
    ('${REPORTER}', 'Rae'), ('${LEAD}', 'Lee'), ('${MEMBER}', 'Mo'), ('${STRANGER}', 'Sky'), ('${FOLLOWER}', 'Fen');
`)
const AREA = JSON.stringify({ type: 'Polygon', coordinates: [[[-2.76, 54.33], [-2.73, 54.33], [-2.73, 54.31], [-2.76, 54.31], [-2.76, 54.33]]] })
const group = (await as(LEAD, `select public.register_organisation('community', 'Lakeside Pickers', 'Litter picks', $1::jsonb, 'Lakeside') as id`, [AREA])).rows[0].id
const company = (await as(LEAD, `select public.register_organisation('commercial', 'Clear-It Ltd', 'Clearances', $1::jsonb, 'Lakeside', null, 'hi@clearit.example', 'CBDU1234') as id`, [AREA])).rows[0].id
const pendingGroup = (await as(STRANGER, `select public.register_organisation('community', 'Not Yet Group', 'Waiting', $1::jsonb, 'Lakeside') as id`, [AREA])).rows[0].id
await as(ADMIN, `select public.review_organisation($1, 'approved')`, [group])
await as(ADMIN, `select public.review_organisation($1, 'approved')`, [company])
await as(MEMBER, `select public.apply_to_join($1, '{"why":"I live here","adult":true,"safety":true}'::jsonb)`, [group])
await as(LEAD, `select public.decide_member($1, $2, 'approve')`, [group, MEMBER])

async function newReport(status = 'routed', body = COUNCIL) {
  await db.query(`select set_config('request.jwt.claim.sub', '${REPORTER}', false)`) // a report is linked to whoever sends it
  const r = await db.query(`insert into public.reports (category_code, description, photo_path, lat, lng, device_token, reporter_id, responsible_body_id)
    values ('fly-tipping', 'Bags in the lay-by (test data)', '11111111-2222-4333-8444-555555555555.jpg', 54.32, -2.75, gen_random_uuid(), '${REPORTER}', '${body}') returning id`)
  const id = r.rows[0].id
  await db.query(`select set_config('request.jwt.claim.sub', '', false)`)
  if (status !== 'reported') await db.query(`insert into public.report_events (report_id, status, actor_type, actor_id) values ($1, 'routed', 'staff', '${STAFF}')`, [id])
  return id
}
const statusOf = async (id) => (await db.query(`select current_status from public.reports where id = $1`, [id])).rows[0].current_status
const unread = async (who) => Number((await db.query(`select count(*) as n from public.notifications where user_id = $1 and read_at is null`, [who])).rows[0].n)

// ---- following ----
const R1 = await newReport()
check('someone signed in can follow a report', (await as(FOLLOWER, `insert into public.report_follows (report_id) values ($1)`, [R1])).ok)
check('nobody can follow on someone else\'s behalf', !(await as(STRANGER, `insert into public.report_follows (report_id, user_id) values ($1, $2)`, [R1, FOLLOWER])).ok)
check('a person only sees their own follows', (await as(STRANGER, `select * from public.report_follows`)).rows?.length === 0)

// ---- offering a job ----
check('a resident cannot offer a job', !(await as(REPORTER, `select public.offer_job($1, $2, null, true)`, [R1, group])).ok)
check('staff of another council cannot offer this report', !(await as(OTHER_STAFF, `select public.offer_job($1, $2, null, true)`, [R1, group])).ok)
check('a job cannot go to a group that is not approved', !(await as(STAFF, `select public.offer_job($1, $2, null, true)`, [R1, pendingGroup])).ok)
const unsafe = await as(STAFF, `select public.offer_job($1, $2, 'Bags by the bus stop')`, [R1, group])
check('a community group needs the job confirmed safe', !unsafe.ok && /safe/.test(unsafe.error), unsafe.error)
const R0 = await newReport('reported')
check('a report nobody has taken on cannot be offered', !(await as(STAFF, `select public.offer_job($1, $2, null, true)`, [R0, group])).ok)
const offer = await as(STAFF, `select public.offer_job($1, $2, 'Bags by the bus stop', true) as id`, [R1, group])
check('staff can offer their report to an approved group', offer.ok, offer.error)
const JOB = offer.rows?.[0]?.id
check('only one live job per report', !(await as(STAFF, `select public.offer_job($1, $2, null, true)`, [R1, company])).ok)
check('the lead is told about the offer', (await unread(LEAD)) === 1)
check('the public cannot see an offer not yet accepted', (await as(null, `select * from public.report_jobs where id = $1`, [JOB])).rows?.length === 0)
check('a member sees their group\'s offers', (await as(MEMBER, `select * from public.report_jobs where id = $1`, [JOB])).rows?.length === 1)
check('a stranger does not', (await as(STRANGER, `select * from public.report_jobs where id = $1`, [JOB])).rows?.length === 0)
check('nobody can write jobs directly', !(await as(LEAD, `update public.report_jobs set status = 'accepted' where id = $1`, [JOB])).ok || (await db.query(`select status from public.report_jobs where id = $1`, [JOB])).rows[0].status === 'offered')

// ---- answering ----
check('a member who is not a lead cannot answer', !(await as(MEMBER, `select public.respond_to_job($1, true)`, [JOB])).ok)
const accept = await as(LEAD, `select public.respond_to_job($1, true, 'We can do Saturday')`, [JOB])
check('the lead can accept', accept.ok, accept.error)
check('accepting schedules the report', (await statusOf(R1)) === 'scheduled')
const evs = (await db.query(`select status, actor_type from public.report_events where report_id = $1 order by seq`, [R1])).rows
check('the history shows the group moving it on', evs.map((e) => e.status).join(',') === 'reported,routed,acknowledged,scheduled' && evs[3].actor_type === 'organisation', JSON.stringify(evs))
check('whoever offered it is told it was accepted', (await unread(STAFF)) >= 1)
check('the reporter is told it moved on', (await unread(REPORTER)) >= 2)
check('followers are told too', (await unread(FOLLOWER)) >= 2)
check('once accepted, anyone can see who has the job', (await as(null, `select status from public.report_jobs where id = $1`, [JOB])).rows?.[0]?.status === 'accepted')
check('it cannot be answered twice', !(await as(LEAD, `select public.respond_to_job($1, false)`, [JOB])).ok)

// ---- updates ----
check('a stranger cannot post on the group\'s job', !(await as(STRANGER, `select public.post_job_update($1, 'We are on our way to the site now.')`, [JOB])).ok)
const upd = await as(MEMBER, `select public.post_job_update($1, 'Booked for Saturday morning, bring gloves.') as id`, [JOB])
check('a member can post a progress update', upd.ok, upd.error)
const story = (await db.query(`select * from public.stories where id = $1`, [upd.rows?.[0]?.id])).rows[0]
check('a group update is public straight away, under the group\'s name', story?.status === 'approved' && story?.author_name === 'Lakeside Pickers' && story?.kind === 'progress' && story?.author_role === 'organisation', JSON.stringify(story))
check('the public can read it', (await as(null, `select id from public.stories where id = $1`, [story?.id])).rows?.length === 1)

// residents' stories still wait, and cannot pretend to be a group
const resident = await as(REPORTER, `insert into public.stories (report_id, body, kind) values ($1, 'Saw them out there this morning, brilliant.', 'progress') returning id`, [R1])
check('a resident can post an update', resident.ok, resident.error)
const rs = (await db.query(`select * from public.stories where id = $1`, [resident.rows?.[0]?.id])).rows[0]
check('a resident\'s update waits for an admin and is marked as theirs', rs?.status === 'pending' && rs?.author_role === 'resident' && rs?.kind === 'progress' && rs?.author_name === 'Rae', JSON.stringify(rs))
const fake = await as(REPORTER, `insert into public.stories (report_id, body, kind, author_role) values ($1, 'Pretending to be the council here.', 'progress', 'staff')`, [R1])
check('a resident cannot post as staff or a group', !fake.ok)

// ---- finishing ----
check('a stranger cannot finish the job', !(await as(STRANGER, `select public.complete_job($1, 'All done and dusted, thanks all.')`, [JOB])).ok)
const done = await as(MEMBER, `select public.complete_job($1, 'Six bags and a mattress gone. Thanks to everyone who came.', '22222222-3333-4444-8555-666666666666.jpg')`, [JOB])
check('a member can mark the job done', done.ok, done.error)
check('the report is cleared', (await statusOf(R1)) === 'cleared')
const cleared = (await db.query(`select actor_type, photo_path from public.report_events where report_id = $1 order by seq desc limit 1`, [R1])).rows[0]
check('the clearing carries the after photo', cleared.actor_type === 'organisation' && cleared.photo_path === '22222222-3333-4444-8555-666666666666.jpg')
check('the resolved story is published', (await db.query(`select count(*) as n from public.stories where report_id = $1 and kind = 'resolved' and status = 'approved'`, [R1])).rows[0].n == 1)
check('the job is done', (await db.query(`select status from public.report_jobs where id = $1`, [JOB])).rows[0].status === 'done')

// ---- the reporter checks ----
check('someone else cannot confirm it clear', !(await as(STRANGER, `select public.check_cleared($1, true)`, [R1])).ok)
const ok = await as(REPORTER, `select public.check_cleared($1, true)`, [R1])
check('the reporter can confirm it is clear', ok.ok, ok.error)
check('the report is verified', (await statusOf(R1)) === 'verified')
check('it cannot be checked again', !(await as(REPORTER, `select public.check_cleared($1, false)`, [R1])).ok)

// still there -> reopened, and the body can take it on again
const R2 = await newReport()
const j2 = (await as(STAFF, `select public.offer_job($1, $2, null) as id`, [R2, company])).rows?.[0]?.id
check('a clearance company needs no safety tick', !!j2)
await as(LEAD, `select public.respond_to_job($1, true)`, [j2])
await as(LEAD, `select public.complete_job($1, 'Cleared and taken to the licensed site.')`, [j2])
const no = await as(REPORTER, `select public.check_cleared($1, false, 'Half of it is still there')`, [R2])
check('the reporter can say it is still there', no.ok && (await statusOf(R2)) === 'reopened', no.error)

// ---- withdrawing, declining ----
const R3 = await newReport()
const j3 = (await as(STAFF, `select public.offer_job($1, $2, null, true) as id`, [R3, group])).rows?.[0]?.id
check('staff of another council cannot withdraw it', !(await as(OTHER_STAFF, `select public.withdraw_job($1)`, [j3])).ok)
check('the staff can withdraw it', (await as(STAFF, `select public.withdraw_job($1)`, [j3])).ok)
const j4 = (await as(ADMIN, `select public.offer_job($1, $2, null, true) as id`, [R3, group])).rows?.[0]?.id
check('an admin can offer a job', !!j4)
check('the lead can decline', (await as(LEAD, `select public.respond_to_job($1, false, 'Too far for us')`, [j4])).ok)
check('declining leaves the report where it was', (await statusOf(R3)) === 'routed')

// ---- official updates ----
check('staff of another council cannot post an official update', !(await as(OTHER_STAFF, `select public.post_staff_update($1, 'progress', 'Our crew is booked for Tuesday.')`, [R3])).ok)
const official = await as(STAFF, `select public.post_staff_update($1, 'progress', 'Our crew is booked for Tuesday.') as id`, [R3])
check('staff can post an official update', official.ok, official.error)
check('it appears under the council\'s name', (await db.query(`select author_name, status from public.stories where id = $1`, [official.rows?.[0]?.id])).rows[0]?.author_name === 'Lakeside Council (test data)')
check('a resident cannot post an official update', !(await as(REPORTER, `select public.post_staff_update($1, 'progress', 'Our crew is booked for Tuesday.')`, [R3])).ok)

// ---- notifications ----
check('a person only reads their own notifications', (await as(STRANGER, `select * from public.notifications where user_id <> $1`, [STRANGER])).rows?.length === 0)
check('nobody can write a notification directly', !(await as(STRANGER, `insert into public.notifications (user_id, title) values ($1, 'hi')`, [REPORTER])).ok)
await as(REPORTER, `select public.mark_notifications_read()`)
check('marking read clears the reporter\'s unread', (await unread(REPORTER)) === 0)

console.log(failed ? `\n${failed} job check(s) FAILED` : '\nAll job checks passed')
process.exit(failed ? 1 : 0)
