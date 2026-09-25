// Checks the Dashboard stage (supabase/dashboard.sql) on a local Postgres (PGlite), the same way the
// earlier stages are checked. Run with:  npm run test:db
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(here, '..', 'schema.sql'), 'utf8')
const communitySql = readFileSync(join(here, '..', 'community.sql'), 'utf8')
const dashboardSql = readFileSync(join(here, '..', 'dashboard.sql'), 'utf8')

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
await db.exec(dashboardSql) // running it twice must be harmless

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

const PHOTO = '11111111-1111-4111-8111-111111111111.jpg'
let n = 0
const uid = () => `55555555-${String(++n).padStart(4, '0')}-4555-8555-555555555555`

// A council with a claimant, an unclaimed council, a contractor, and the four staff accounts
// the Blueprint describes: two staff (one per council), one reviewer, one admin.
const COUNCIL_A = uid()
const COUNCIL_B = uid()
const CONTRACTOR = uid()
const ADMIN = uid()
const STAFF_A = uid()
const STAFF_B = uid()
const REVIEWER = uid()
const NOBODY = uid() // signed in, but never linked to a staff role

await db.exec(`
  insert into auth.users (id, email) values
    ('${ADMIN}', 'admin@example.com'), ('${STAFF_A}', 'staff-a@example.com'), ('${STAFF_B}', 'staff-b@example.com'),
    ('${REVIEWER}', 'reviewer@example.com'), ('${NOBODY}', 'nobody@example.com');
  insert into public.responsible_bodies (id, name, kind, tier) values
    ('${COUNCIL_A}', 'Council A (test data)', 'council', 'unitary'),
    ('${COUNCIL_B}', 'Council B (test data)', 'council', 'unitary');
  insert into public.responsible_bodies (id, name, kind, works_for_id) values
    ('${CONTRACTOR}', 'Contractor for A (test data)', 'contractor', '${COUNCIL_A}');
  -- the very first admin is linked directly, exactly as supabase/staff-members.sql does
  insert into public.staff_profiles (id, body_id, role, display_name) values ('${ADMIN}', null, 'resolve_admin', 'Ada Admin');
`)

// ---- the shape of a staff account ----
{
  const noBody = await as(ADMIN, `insert into public.staff_profiles (id, body_id, role, display_name) values ($1, null, 'staff', 'x')`, [uid()])
  check('staff must belong to a council or contractor', !noBody.ok)
  const withBody = await as(ADMIN, `insert into public.staff_profiles (id, body_id, role, display_name) values ($1, $2, 'reviewer', 'x')`, [uid(), COUNCIL_A])
  check('a reviewer cannot belong to one', !withBody.ok)
  const badRole = await as(ADMIN, `insert into public.staff_profiles (id, role, display_name) values ($1, 'boss', 'x')`, [uid()])
  check('an unknown role is refused', !badRole.ok)
}

// ---- linking staff (the only way in, after the first admin) ----
{
  const notAdmin = await as('anon', `select public.admin_link_staff('staff-a@example.com', 'staff', $1, 'Sam Staff')`, [COUNCIL_A])
  check('the public cannot link a staff account', !notAdmin.ok)
  const notAdmin2 = await as(NOBODY, `select public.admin_link_staff('staff-a@example.com', 'staff', $1, 'Sam Staff')`, [COUNCIL_A])
  check('a signed-in person with no staff role cannot either', !notAdmin2.ok)

  const noSignup = await as(ADMIN, `select public.admin_link_staff('never-signed-up@example.com', 'staff', $1, 'Ghost')`, [COUNCIL_A])
  check('linking an email with no account yet gives a clear message', !noSignup.ok && /sign(ed)? ?up|Auto Confirm/i.test(noSignup.error), noSignup.error)

  await asKeep(ADMIN, `select public.admin_link_staff('staff-a@example.com', 'staff', $1, 'Sam Staff')`, [COUNCIL_A])
  await asKeep(ADMIN, `select public.admin_link_staff('staff-b@example.com', 'staff', $1, 'Bev Staff')`, [COUNCIL_B])
  await asKeep(ADMIN, `select public.admin_link_staff('reviewer@example.com', 'reviewer', null, 'Ravi Reviewer')`, [])
  const check1 = await as(ADMIN, `select role from public.staff_profiles where id = $1`, [STAFF_A])
  check('linking by email creates the staff account', check1.ok && check1.rows[0].role === 'staff')

  await asKeep(ADMIN, `select public.admin_link_staff('staff-a@example.com', 'reviewer', null, 'Sam Staff')`, [])
  const moved = await as(ADMIN, `select role, body_id from public.staff_profiles where id = $1`, [STAFF_A])
  check('linking the same email again changes their role instead of duplicating', moved.rows[0].role === 'reviewer' && moved.rows[0].body_id === null, JSON.stringify(moved.rows))
  await asKeep(ADMIN, `select public.admin_link_staff('staff-a@example.com', 'staff', $1, 'Sam Staff')`, [COUNCIL_A]) // put it back
}

// ---- what each role can see about staff, and switching an account off ----
{
  const own = await as(STAFF_A, `select display_name from public.staff_profiles where id = $1`, [STAFF_A])
  check('staff can read their own row', own.ok && own.rows[0].display_name === 'Sam Staff')
  const others = await as(STAFF_A, `select * from public.staff_profiles where id = $1`, [STAFF_B])
  check('...but not someone else\'s', others.ok && others.rows.length === 0)
  const adminSees = await as(ADMIN, `select count(*) as n from public.staff_profiles`)
  check('an admin can read every staff account', adminSees.ok && Number(adminSees.rows[0].n) >= 4)

  const selfOff = await as(ADMIN, `select public.admin_set_staff_active($1, false)`, [ADMIN])
  check('an admin cannot switch off their own account', !selfOff.ok)
  const notAdminOff = await as(STAFF_A, `select public.admin_set_staff_active($1, false)`, [STAFF_B])
  check('staff cannot switch off another account', !notAdminOff.ok)
  await asKeep(ADMIN, `select public.admin_set_staff_active($1, false)`, [STAFF_B])
  const off = await as(ADMIN, `select active from public.staff_profiles where id = $1`, [STAFF_B])
  check('an admin can switch an account off', off.rows[0].active === false)
  const cannotAct = await as(STAFF_B, `select public.claim_report($1)`, [uid()])
  check('a switched-off account can no longer act as staff', !cannotAct.ok)
  await asKeep(ADMIN, `select public.admin_set_staff_active($1, true)`, [STAFF_B]) // back on for the rest of the tests
}

// ---- councils and contractors ----
{
  const w = await as(STAFF_A, `insert into public.responsible_bodies (name, kind, tier) values ('New (test data)', 'council', 'unitary')`)
  check('ordinary staff cannot add a council', !w.ok)
  const ok = await as(ADMIN, `insert into public.responsible_bodies (name, kind, tier) values ('New Council (test data)', 'council', 'district')`)
  check('an admin can add one', ok.ok, ok.error)
  const rename = await as(ADMIN, `update public.responsible_bodies set functions = array['waste'] where id = $1`, [COUNCIL_A])
  check('an admin can edit one', rename.ok, rename.error)
}

// making and claiming a report, one for each council
const openA = () =>
  db.query(
    `insert into public.reports (category_code, description, photo_path, lat, lng) values ('pothole', 'x', '${PHOTO}', 51, 0) returning id`,
  )

// ---- claiming ----
{
  const r1 = (await openA()).rows[0].id
  const notLinked = await as(NOBODY, `select public.claim_report($1)`, [r1])
  check('someone with no staff role cannot claim a report', !notLinked.ok)
  const reviewerCant = await as(REVIEWER, `select public.claim_report($1)`, [r1])
  check('a reviewer has no council, so cannot claim one either', !reviewerCant.ok)
  const adminCant = await as(ADMIN, `select public.claim_report($1)`, [r1])
  check('an admin has no council either, and cannot claim one', !adminCant.ok)

  await asKeep(STAFF_A, `select public.claim_report($1)`, [r1])
  const claimed = await db.query(`select responsible_body_id, current_status from public.reports where id = $1`, [r1])
  check('claiming assigns the report to that council', claimed.rows[0].responsible_body_id === COUNCIL_A)
  check('...and moves it to "responsible body identified"', claimed.rows[0].current_status === 'routed')
  const events = await db.query(`select status, actor_type, actor_id from public.report_events where report_id = $1 order by seq`, [r1])
  check('the claim is written to the history as a staff action', events.rows.at(-1).status === 'routed' && events.rows.at(-1).actor_type === 'staff' && events.rows.at(-1).actor_id === STAFF_A, JSON.stringify(events.rows))

  const already = await as(STAFF_B, `select public.claim_report($1)`, [r1])
  check('another council cannot claim an already-claimed report', !already.ok)
  const r2 = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r2])
  const wrongStage = await as(STAFF_A, `select public.claim_report($1)`, [r2])
  check('a report cannot be claimed twice, even by the one that already holds it', !wrongStage.ok)
  const missing = await as(STAFF_A, `select public.claim_report($1)`, [uid()])
  check('claiming a report that does not exist fails cleanly', !missing.ok)
}

// ---- reassigning (admin only) ----
{
  const r = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r])
  const w = await as(STAFF_A, `select public.admin_reassign_report($1, $2)`, [r, COUNCIL_B])
  check('ordinary staff cannot reassign a report', !w.ok)
  await asKeep(ADMIN, `select public.admin_reassign_report($1, $2)`, [r, COUNCIL_B])
  const moved = await db.query(`select responsible_body_id from public.reports where id = $1`, [r])
  check('an admin can move a report to a different council', moved.rows[0].responsible_body_id === COUNCIL_B)
  const noExtraEvent = await db.query(`select count(*) as n from public.report_events where report_id = $1 and status = 'routed'`, [r])
  check('moving an already-claimed report does not add a second "routed" entry', Number(noExtraEvent.rows[0].n) === 1)
}

// ---- an admin assigning an unclaimed report directly ----
{
  const r = (await openA()).rows[0].id
  await asKeep(ADMIN, `select public.admin_reassign_report($1, $2)`, [r, COUNCIL_A])
  const now = await db.query(`select responsible_body_id, current_status from public.reports where id = $1`, [r])
  check('an admin can assign an unclaimed report straight to a council', now.rows[0].responsible_body_id === COUNCIL_A)
  check('...and it moves to "responsible body identified", not left stuck at "reported"', now.rows[0].current_status === 'routed')
  const ev = await db.query(`select actor_type from public.report_events where report_id = $1 order by seq desc limit 1`, [r])
  check('that move is credited to the admin', ev.rows[0].actor_type === 'admin')
  await asKeep(STAFF_A, `select public.advance_report($1, 'acknowledged')`, [r])
  const acked = await db.query(`select current_status from public.reports where id = $1`, [r])
  check('the council can now act on it normally', acked.rows[0].current_status === 'acknowledged')
}

// ---- rejecting ----
{
  const r = (await openA()).rows[0].id
  const w = await as(NOBODY, `select public.reject_report($1, 'not ours')`, [r])
  check('someone with no staff role cannot reject a report', !w.ok)
  await asKeep(REVIEWER, `select public.reject_report($1, 'Not actionable by any council.')`, [r])
  const rejected = await db.query(`select current_status from public.reports where id = $1`, [r])
  check('a reviewer can reject an unclaimed report', rejected.rows[0].current_status === 'rejected')
  const ev = await db.query(`select actor_type, note from public.report_events where report_id = $1 order by seq desc limit 1`, [r])
  check('the note is kept, and the reviewer is credited by role', ev.rows[0].note === 'Not actionable by any council.' && ev.rows[0].actor_type === 'reviewer')

  const r2 = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r2])
  const tooLate = await as(STAFF_A, `select public.reject_report($1)`, [r2])
  check('a report cannot be rejected once it has been claimed', !tooLate.ok)

  const r3 = (await openA()).rows[0].id
  await asKeep(ADMIN, `select public.reject_report($1)`, [r3])
  const ev3 = await db.query(`select actor_type from public.report_events where report_id = $1 order by seq desc limit 1`, [r3])
  check('an admin\'s own actions are logged as "admin", not folded into "reviewer"', ev3.rows[0].actor_type === 'admin')
}

// ---- acknowledge, schedule, clear ----
{
  const r = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r])

  const wrongCouncil = await as(STAFF_B, `select public.advance_report($1, 'acknowledged')`, [r])
  check('a different council cannot act on this report', !wrongCouncil.ok)
  const reviewerCant = await as(REVIEWER, `select public.advance_report($1, 'acknowledged')`, [r])
  check('a reviewer cannot acknowledge a report; that is the council\'s job', !reviewerCant.ok)

  await asKeep(STAFF_A, `select public.advance_report($1, 'acknowledged', 'Seen, will visit Tuesday.')`, [r])
  let now = await db.query(`select current_status from public.reports where id = $1`, [r])
  check('the owning council can acknowledge it', now.rows[0].current_status === 'acknowledged')
  const ev = await db.query(`select note from public.report_events where report_id = $1 order by seq desc limit 1`, [r])
  check('a note travels with the action', ev.rows[0].note === 'Seen, will visit Tuesday.')

  const skip = await as(STAFF_A, `select public.advance_report($1, 'verified')`, [r])
  check('staff still cannot skip to a move the report diagram does not allow', !skip.ok)

  await asKeep(STAFF_A, `select public.advance_report($1, 'cleared')`, [r])
  now = await db.query(`select current_status from public.reports where id = $1`, [r])
  check('acknowledged can go straight to cleared, same as before', now.rows[0].current_status === 'cleared')
}

{
  const r = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r])
  const bad = await as(STAFF_A, `select public.advance_report($1, 'reported')`, [r])
  check('advance_report refuses a move that is not one of its five known ones', !bad.ok)
  const bad2 = await as(STAFF_A, `select public.advance_report($1, 'routed')`, [r])
  check('"routed" only happens through claim_report, not advance_report', !bad2.ok)
}

// ---- verify and reopen ----
{
  const r = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r])
  await asKeep(STAFF_A, `select public.advance_report($1, 'acknowledged')`, [r])
  await asKeep(STAFF_A, `select public.advance_report($1, 'cleared')`, [r])

  const staffCant = await as(STAFF_A, `select public.advance_report($1, 'verified')`, [r])
  check('the council that cleared it cannot also verify it themselves', !staffCant.ok)
  await asKeep(REVIEWER, `select public.advance_report($1, 'verified', 'Five agreements, all with a clear photo.')`, [r])
  const done = await db.query(`select current_status from public.reports where id = $1`, [r])
  check('a reviewer can verify a cleared report', done.rows[0].current_status === 'verified')

  const r2 = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r2])
  await asKeep(STAFF_A, `select public.advance_report($1, 'acknowledged')`, [r2])
  await asKeep(STAFF_A, `select public.advance_report($1, 'cleared')`, [r2])
  await asKeep(ADMIN, `select public.advance_report($1, 'reopened', 'Photo shows it is still there.')`, [r2])
  const reopened = await db.query(`select current_status from public.reports where id = $1`, [r2])
  check('an admin can reopen a cleared report too', reopened.rows[0].current_status === 'reopened')
  await asKeep(STAFF_A, `select public.advance_report($1, 'acknowledged')`, [r2])
  const back = await db.query(`select current_status from public.reports where id = $1`, [r2])
  check('the owning council can pick a reopened report back up', back.rows[0].current_status === 'acknowledged')
}

// ---- an admin can act for any council, staff still cannot cross into another's ----
{
  const r = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r])
  await asKeep(ADMIN, `select public.advance_report($1, 'acknowledged')`, [r])
  const now = await db.query(`select current_status from public.reports where id = $1`, [r])
  check('an admin can act on a report that belongs to a specific council', now.rows[0].current_status === 'acknowledged')
}

// ---- reading reports stays open to everyone, exactly as before ----
{
  const r = (await openA()).rows[0].id
  const pub = await as('anon', `select id from public.reports where id = $1`, [r])
  check('reports are still publicly readable; the dashboard only changes who may act', pub.ok && pub.rows.length === 1)
}

// ---- what was done, and what it cost ----
{
  const r = (await openA()).rows[0].id
  await asKeep(STAFF_A, `select public.claim_report($1)`, [r])

  const pub = await as('anon', `select * from public.interventions`)
  check('the public still cannot read cost data', !pub.ok)
  const nobody = await as(NOBODY, `select * from public.interventions`)
  check('a signed-in person with no staff role sees none (the row policy filters them out, same as an empty result)', nobody.ok && nobody.rows.length === 0, JSON.stringify(nobody))
  const staffReads = await as(STAFF_A, `select count(*) as n from public.interventions`)
  check('staff can read the interventions table', staffReads.ok)

  const wrongBody = await as(STAFF_B, `insert into public.interventions (report_id, body_id, type, cost_pence) values ($1, $2, 'cleared', 500)`, [r, COUNCIL_B])
  check('a different council cannot log work on this report', !wrongBody.ok)
  const mismatch = await as(STAFF_A, `insert into public.interventions (report_id, body_id, type, cost_pence) values ($1, $2, 'cleared', 500)`, [r, COUNCIL_B])
  check('the body on the record must match the council actually doing the work', !mismatch.ok)

  await asKeep(STAFF_A, `insert into public.interventions (report_id, body_id, type, cost_pence) values ($1, $2, 'cleared', 4500)`, [r, COUNCIL_A])
  const logged = await db.query(`select cost_pence from public.interventions where report_id = $1`, [r])
  check('the owning council can log what it did and what it cost', logged.rows[0].cost_pence === 4500)

  await asKeep(ADMIN, `insert into public.interventions (report_id, body_id, type) values ($1, $2, 'camera')`, [r, COUNCIL_A])
  const adminLogged = await db.query(`select count(*) as n from public.interventions where report_id = $1`, [r])
  check('an admin can log one for any council', Number(adminLogged.rows[0].n) === 2)
}

console.log(failed ? `\n${failed} FAILED` : '\nAll dashboard database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
