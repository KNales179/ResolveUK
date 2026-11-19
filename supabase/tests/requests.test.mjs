// Checks supabase/requests.sql (private land clearance requests and quotes) on a local Postgres
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
for (const f of ['schema.sql', 'community.sql', 'dashboard.sql', 'security-update.sql', 'v2-concept.sql', 'flexible-bodies.sql', 'reporter-profile-fields.sql', 'staff-profile-fields.sql', 'app-roles.sql', 'stories.sql', 'organisations.sql']) {
  await db.exec(read(f))
}
await db.exec(read('jobs.sql'))
await db.exec(read('comments.sql'))
await db.exec(read('requests.sql'))
await db.exec(read('requests.sql')) // running it twice must be harmless

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

const ADMIN = 'ffffffff-0000-4000-8000-000000000001'
const OWNER = 'ffffffff-0000-4000-8000-000000000002'
const NEIGHBOUR = 'ffffffff-0000-4000-8000-000000000003'
const BOSS = 'ffffffff-0000-4000-8000-000000000004'
const WORKER = 'ffffffff-0000-4000-8000-000000000005'
const RIVAL = 'ffffffff-0000-4000-8000-000000000006'
const FARAWAY = 'ffffffff-0000-4000-8000-000000000007'
const users = { ADMIN, OWNER, NEIGHBOUR, BOSS, WORKER, RIVAL, FARAWAY }
await db.exec(`insert into auth.users (id, email) values ${Object.entries(users).map(([k, v]) => `('${v}', '${k.toLowerCase()}@example.com')`).join(', ')}`)
await db.exec(`
  insert into public.staff_profiles (id, body_id, role, display_name) values ('${ADMIN}', null, 'resolve_admin', 'Ada Admin');
  insert into public.reporter_profiles (id, display_name) values ('${OWNER}', 'Olive Farm'), ('${NEIGHBOUR}', 'Ned'), ('${BOSS}', 'Bo'), ('${WORKER}', 'Wes'), ('${RIVAL}', 'Riv'), ('${FARAWAY}', 'Fay');
`)
const AREA = JSON.stringify({ type: 'Polygon', coordinates: [[[-2.80, 54.36], [-2.70, 54.36], [-2.70, 54.28], [-2.80, 54.28], [-2.80, 54.36]]] })
const FAR = JSON.stringify({ type: 'Polygon', coordinates: [[[-1.70, 55.0], [-1.55, 55.0], [-1.55, 54.9], [-1.70, 54.9], [-1.70, 55.0]]] })
const register = async (who, name, area) => {
  const id = (await as(who, `select public.register_organisation('commercial', $1, 'Clearances', $2::jsonb, 'Cumbria', null, 'x@example.com', 'CBDU1234') as id`, [name, area])).rows[0].id
  await as(ADMIN, `select public.review_organisation($1, 'approved')`, [id])
  return id
}
const CO = await register(BOSS, 'Fellside Clearances', AREA)
const RIVAL_CO = await register(RIVAL, 'Kent Valley Waste', AREA)
const FAR_CO = await register(FARAWAY, 'Tyne Clear', FAR)
await db.exec(`insert into public.organisation_members (org_id, user_id, role, status, display_name) values ('${CO}', '${WORKER}', 'member', 'active', 'Wes')`)

check('the area check finds a point inside', (await db.query(`select public.area_covers($1::jsonb, 54.32, -2.75) as v`, [AREA])).rows[0].v === true)
check('and one outside', (await db.query(`select public.area_covers($1::jsonb, 54.32, -2.60) as v`, [AREA])).rows[0].v === false)

// ---- asking ----
check('someone not signed in cannot ask', !(await as(null, `select public.create_clearance_request('farm', 'Tyres and rubble dumped in the field gate.', 'Low Farm, Kendal', 54.32, -2.75)`)).ok)
const made = await as(OWNER, `select public.create_clearance_request('farm', 'About twenty tyres and builders rubble dumped in the field gate.', 'Low Farm, Kendal', 54.32, -2.75, 'Tyres, rubble', 'Gate code 1234, ring first') as id`)
check('a signed-in person can ask for quotes', made.ok, made.error)
const REQ = made.rows?.[0]?.id
check('their name is filled in', (await db.query(`select requester_name from public.clearance_requests where id = $1`, [REQ])).rows[0].requester_name === 'Olive Farm')
check('every member of each company covering the spot is told', Number((await db.query(`select count(*) as n from public.notifications where title like 'New clearance request%'`)).rows[0].n) === 3)
check('a company far away is not told', Number((await db.query(`select count(*) as n from public.notifications where user_id = $1`, [FARAWAY])).rows[0].n) === 0)
check('the asker sees their request', (await as(OWNER, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 1)
check('a neighbour does not', (await as(NEIGHBOUR, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 0)
check('the public does not', !(await as(null, `select id from public.clearance_requests where id = $1`, [REQ])).ok || (await as(null, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 0)
check('a covering company does', (await as(WORKER, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 1)
check('a company far away does not', (await as(FARAWAY, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 0)
check('nobody can write requests directly', !(await as(OWNER, `update public.clearance_requests set status = 'done' where id = $1`, [REQ])).ok || (await db.query(`select status from public.clearance_requests where id = $1`, [REQ])).rows[0].status === 'open')

// ---- quoting ----
check('a company far away cannot quote', !(await as(FARAWAY, `select public.send_quote($1, $2, 25000, 'Next week')`, [REQ, FAR_CO])).ok)
check('a neighbour cannot quote for a company', !(await as(NEIGHBOUR, `select public.send_quote($1, $2, 25000, 'Next week')`, [REQ, CO])).ok)
const q1 = await as(WORKER, `select public.send_quote($1, $2, 32000, 'Thursday morning', 'Tyres go to a licensed recycler; price includes disposal.') as id`, [REQ, CO])
check('a member of a covering company can quote', q1.ok, q1.error)
const Q1 = q1.rows?.[0]?.id
check('only once per company', !(await as(BOSS, `select public.send_quote($1, $2, 30000, 'Friday')`, [REQ, CO])).ok)
const Q2 = (await as(RIVAL, `select public.send_quote($1, $2, 28500, 'Within 3 days') as id`, [REQ, RIVAL_CO])).rows?.[0]?.id
check('another covering company can quote too', !!Q2)
check('the asker is told about each quote', Number((await db.query(`select count(*) as n from public.notifications where user_id = $1 and title like 'New quote%'`, [OWNER])).rows[0].n) === 2)
check('the asker sees both quotes', (await as(OWNER, `select id from public.clearance_quotes where request_id = $1`, [REQ])).rows?.length === 2)
check('a company only sees its own quote', (await as(RIVAL, `select id from public.clearance_quotes where request_id = $1`, [REQ])).rows?.length === 1)
check('a company cannot get the contact details before being chosen', !(await as(WORKER, `select * from public.request_contact($1)`, [REQ])).ok)

// ---- accepting ----
check('a company cannot accept its own quote', !(await as(WORKER, `select public.accept_quote($1)`, [Q1])).ok)
const acc = await as(OWNER, `select public.accept_quote($1)`, [Q1])
check('the asker can accept a quote', acc.ok, acc.error)
check('the request is now under way', (await db.query(`select status from public.clearance_requests where id = $1`, [REQ])).rows[0].status === 'accepted')
check('the other quote is declined', (await db.query(`select status from public.clearance_quotes where id = $1`, [Q2])).rows[0].status === 'declined')
check('a second quote cannot be accepted', !(await as(OWNER, `select public.accept_quote($1)`, [Q2])).ok)
check('the chosen company is told', Number((await db.query(`select count(*) as n from public.notifications where user_id = $1 and title = 'Your quote was accepted'`, [BOSS])).rows[0].n) === 1)
check('the other company is told too', Number((await db.query(`select count(*) as n from public.notifications where user_id = $1 and title = 'Another quote was chosen'`, [RIVAL])).rows[0].n) === 1)
const contact = await as(WORKER, `select * from public.request_contact($1)`, [REQ])
check('the chosen company gets the contact details', contact.ok && contact.rows?.[0]?.email === 'owner@example.com' && contact.rows?.[0]?.access_note === 'Gate code 1234, ring first', contact.error)
check('the other company does not', !(await as(RIVAL, `select * from public.request_contact($1)`, [REQ])).ok)
check('the other company can still see the request it quoted on', (await as(RIVAL, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 1)
check('a company that did not quote no longer sees it once taken', (await as(FARAWAY, `select id from public.clearance_requests where id = $1`, [REQ])).rows?.length === 0)

// ---- finishing ----
check('the other company cannot mark it done', !(await as(RIVAL, `select public.complete_clearance($1, 'Done')`, [REQ])).ok)
check('the asker cannot mark it done', !(await as(OWNER, `select public.complete_clearance($1, 'Done')`, [REQ])).ok)
const done = await as(WORKER, `select public.complete_clearance($1, 'Twenty tyres and a skip of rubble removed.', '22222222-3333-4444-8555-666666666666.jpg')`, [REQ])
check('the chosen company marks it done', done.ok, done.error)
check('the asker is told', Number((await db.query(`select count(*) as n from public.notifications where user_id = $1 and title like '%has cleared it'`, [OWNER])).rows[0].n) === 1)

// ---- cancelling, withdrawing ----
const R2 = (await as(OWNER, `select public.create_clearance_request('car_park', 'Mattresses dumped by the recycling bins at the back.', 'Shop car park, Kendal', 54.31, -2.74) as id`)).rows[0].id
const Q3 = (await as(WORKER, `select public.send_quote($1, $2, 9000, 'Tomorrow') as id`, [R2, CO])).rows[0].id
check('a company can withdraw a quote still waiting', (await as(BOSS, `select public.withdraw_quote($1)`, [Q3])).ok)
check('then quote again', (await as(BOSS, `select public.send_quote($1, $2, 8500, 'Tomorrow')`, [R2, CO])).ok)
check('only the asker can cancel', !(await as(NEIGHBOUR, `select public.cancel_clearance_request($1)`, [R2])).ok)
check('the asker can cancel', (await as(OWNER, `select public.cancel_clearance_request($1)`, [R2])).ok)
check('no more quotes once cancelled', !(await as(RIVAL, `select public.send_quote($1, $2, 8000, 'Today')`, [R2, RIVAL_CO])).ok)
check('an admin sees every request', (await as(ADMIN, `select id from public.clearance_requests`)).rows?.length === 2)
check('a request outside Great Britain is refused', !(await as(OWNER, `select public.create_clearance_request('farm', 'Somewhere far away from here.', 'Paris', 48.85, 2.35)`)).ok)

console.log(failed ? `\n${failed} request check(s) FAILED` : '\nAll request checks passed')
process.exit(failed ? 1 : 0)
