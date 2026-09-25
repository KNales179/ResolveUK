// Checks the Community stage (supabase/community.sql) on a local Postgres (PGlite), the same way foundation.test.mjs does.
// Run with:  npm run test:db
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(here, '..', 'schema.sql'), 'utf8')
const communitySql = readFileSync(join(here, '..', 'community.sql'), 'utf8')

const db = new PGlite()
await db.exec(`
  create role anon nologin;
  create role authenticated nologin;
  create schema storage;
  create table storage.buckets (
    id text primary key, name text, public boolean default false,
    file_size_limit bigint, allowed_mime_types text[]);
  create table storage.objects (
    id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text);
  alter table storage.objects enable row level security;
  grant usage on schema public, storage to anon, authenticated;
  alter default privileges in schema public grant all on tables to anon, authenticated;
  alter default privileges in schema public grant all on functions to anon, authenticated;
  grant all on storage.buckets, storage.objects to anon, authenticated;
`)
await db.exec(schemaSql)
await db.exec(communitySql)
await db.exec(communitySql) // running it twice must be harmless

let failed = 0
const check = (name, ok, extra) => {
  if (!ok) failed++
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra))
}

async function as(role, sql, params) {
  await db.exec('begin')
  try {
    if (role !== 'admin') await db.exec(`set local role ${role}`)
    const res = await db.query(sql, params)
    return { ok: true, rows: res.rows }
  } catch (e) {
    return { ok: false, error: String(e.message || e) }
  } finally {
    await db.exec('rollback')
  }
}

const LAT = 51.8896
const LNG = 0.9
const M = 1 / 111000 // one metre, in degrees of latitude
const photo = (n) => `${String(n).padStart(8, '0')}-1111-4111-8111-111111111111.jpg`
let counter = 0

// Adds a report as the owner and (optionally) moves it along to a later stage.
async function report({ category = 'graffiti', dLat = 0, dLng = 0, lat = LAT, lng = LNG, path = [] } = {}) {
  const { rows } = await db.query(
    `insert into public.reports (category_code, description, photo_path, lat, lng)
     values ($1, $2, $3, $4, $5) returning id`,
    [category, `report ${++counter}`, photo(counter), lat + dLat * M, lng + dLng * M],
  )
  for (const status of path) {
    await db.query(`insert into public.report_events (report_id, status, actor_type) values ($1, $2, 'staff')`, [rows[0].id, status])
  }
  return rows[0].id
}

const near = (lat, lng, category, acc = null, role = 'anon') =>
  as(role, `select * from public.nearby_reports($1, $2, $3, $4)`, [lat, lng, category, acc])

// ---- how close counts ----
{
  const r = await as('anon', `select code, match_radius_m from public.categories order by code`)
  const by = Object.fromEntries(r.rows.map((x) => [x.code, x.match_radius_m]))
  check('a pothole counts as the same place within 20 m', by.pothole === 20, JSON.stringify(by))
  check('every other type starts at 50 m', ['fly-tipping', 'graffiti', 'abandoned-vehicle', 'damaged-infrastructure', 'other'].every((k) => by[k] === 50), JSON.stringify(by))

  await db.exec(`update public.categories set match_radius_m = 33 where code = 'pothole'`)
  await db.exec(communitySql)
  const again = await as('anon', `select match_radius_m from public.categories where code = 'pothole'`)
  check('running community.sql again does not undo a distance you changed', again.rows[0].match_radius_m === 33)
  await db.exec(`update public.categories set match_radius_m = 20 where code = 'pothole'`)

  const bad = await as('admin', `update public.categories set match_radius_m = 2 where code = 'pothole'`)
  check('a distance under 5 m is refused', !bad.ok)
  const bad2 = await as('admin', `update public.categories set match_radius_m = 900 where code = 'pothole'`)
  check('a distance over 500 m is refused', !bad2.ok)
  const w = await as('anon', `update public.categories set match_radius_m = 500`)
  check('the public cannot change the distances', !w.ok)
}

// ---- the search ----
{
  const a = await report({ dLat: 10 }) // 10 m away
  const b = await report({ dLat: 44 }) // 44 m away
  await report({ category: 'fly-tipping', dLat: 5 }) // different type
  await report({ dLat: 5, path: ['routed', 'acknowledged', 'cleared'] }) // already cleared
  await report({ dLat: 6, path: ['duplicate'] }) // a duplicate
  await report({ dLat: 7, path: ['rejected'] }) // rejected
  await report({ dLat: 1000 }) // 1 km away
  const sched = await report({ dLat: 20, path: ['routed', 'acknowledged', 'scheduled'] }) // scheduled: still open
  const reopened = await report({ dLat: 25, path: ['routed', 'acknowledged', 'cleared', 'reopened'] }) // reopened: open again

  const r = await near(LAT, LNG, 'graffiti')
  const ids = r.rows.map((x) => x.id)
  check('the public can run the search', r.ok, r.error)
  check('it finds open reports of the same type nearby', ids.includes(a) && ids.includes(b) && ids.includes(sched) && ids.includes(reopened), JSON.stringify(ids))
  check('it ignores other types, cleared, duplicate, rejected and far-away reports', r.rows.length === 4, String(r.rows.length))
  check('nearest comes first', r.rows[0].id === a && r.rows[0].distance_m > 8 && r.rows[0].distance_m < 12, JSON.stringify(r.rows.map((x) => Math.round(x.distance_m))))
  check('it says how far away each one is (metres)', r.rows.every((x) => typeof x.distance_m === 'number'))
  check('it returns what the app needs to show', ['id', 'description', 'photo_path', 'current_status', 'created_at', 'backers'].every((k) => k in r.rows[0]))
  check('one person backs a fresh report (the person who sent it)', Number(r.rows[0].backers) === 1)

  const pot = await report({ category: 'pothole', dLat: 15 })
  const potFar = await report({ category: 'pothole', dLat: 26 })
  const p0 = await near(LAT, LNG, 'pothole')
  check('a pothole 15 m away is found, one 26 m away is not (20 m circle)', p0.rows.map((x) => x.id).join() === pot, JSON.stringify(p0.rows.map((x) => Math.round(x.distance_m))))
  const p1 = await near(LAT, LNG, 'pothole', 10)
  check('a GPS reading that is 10 m out widens the circle by 10 m', p1.rows.map((x) => x.id).includes(potFar) && p1.rows.length === 2, JSON.stringify(p1.rows.map((x) => Math.round(x.distance_m))))
  const potWayOut = await report({ category: 'pothole', dLat: 60 })
  const p2 = await near(LAT, LNG, 'pothole', 500)
  check('the widening is capped at 30 m, however bad the reading', !p2.rows.map((x) => x.id).includes(potWayOut))

  const none = await near(LAT, LNG, 'nonsense')
  check('an unknown issue type finds nothing', none.ok && none.rows.length === 0)
  await db.exec(`update public.categories set active = false where code = 'graffiti'`)
  const off = await near(LAT, LNG, 'graffiti')
  check('a switched-off issue type finds nothing', off.ok && off.rows.length === 0)
  await db.exec(`update public.categories set active = true where code = 'graffiti'`)

  const signedIn = await near(LAT, LNG, 'graffiti', null, 'authenticated')
  check('a signed-in person can run it too', signedIn.ok && signedIn.rows.length === 4)

  // a point far from the equator: a degree of longitude is shorter, so the box must not cut off real matches
  const farNorth = await report({ category: 'other', lat: 55, lng: -1.6, dLng: 32 * 1.74 }) // about 32 m east at latitude 55
  const fn = await near(55, -1.6, 'other')
  check('the box allows for longitude being shorter in the north (32 m east at 55 degrees)', fn.rows.map((x) => x.id).includes(farNorth), JSON.stringify(fn.rows))

  for (let i = 0; i < 7; i++) await report({ category: 'damaged-infrastructure', dLat: i })
  const many = await near(LAT, LNG, 'damaged-infrastructure')
  check('it returns at most five', many.rows.length === 5)
}

// ---- backing a report ----
{
  const open = await report({ category: 'abandoned-vehicle' })
  const other = await report({ category: 'abandoned-vehicle', dLat: 500 })
  const cleared = await report({ category: 'abandoned-vehicle', dLat: 900, path: ['routed', 'acknowledged', 'cleared'] })
  const T1 = '11111111-aaaa-4aaa-8aaa-111111111111'
  const T2 = '22222222-aaaa-4aaa-8aaa-222222222222'
  const back = (id, token = T1, kind = 'same_issue') =>
    [`insert into public.report_supports (report_id, device_token, kind) values ($1, $2, $3)`, [id, token, kind]]

  let r = await as('anon', ...back(open))
  check('the public can back an open report', r.ok, r.error)
  r = await as('authenticated', ...back(open))
  check('so can a signed-in person', r.ok, r.error)

  await db.query(...back(open, T1))
  r = await as('anon', ...back(open, T1))
  check('the same device cannot back the same report twice', !r.ok)
  r = await as('anon', ...back(other, T1))
  check('...but it can back a different report', r.ok, r.error)
  r = await as('anon', ...back(open, T2))
  check('another device can back the same report', r.ok, r.error)

  r = await as('anon', ...back(open, T2, 'fixed'))
  check('"fixed" backing is not open yet (it needs a photo and a reviewer)', !r.ok)
  r = await as('anon', ...back(open, T2, 'still_there'))
  check('"still there" backing is not open yet either', !r.ok)
  r = await as('anon', ...back(cleared))
  check('a cleared report cannot be backed', !r.ok)
  r = await as('anon', ...back('99999999-9999-4999-8999-999999999999'))
  check('a report that does not exist cannot be backed', !r.ok)
  r = await as('anon', `insert into public.report_supports (report_id, device_token, kind) values ($1, 'not-a-uuid', 'same_issue')`, [open])
  check('a device id that is not a proper id is refused', !r.ok)

  r = await as('anon', `insert into public.report_supports (report_id, device_token, created_at) values ($1, $2, '2000-01-01')`, [open, T2])
  check('the public cannot set the time of a backing', !r.ok)
  r = await as('anon', `insert into public.report_supports (id, report_id, device_token) values (gen_random_uuid(), $1, $2)`, [open, T2])
  check('the public cannot choose the id of a backing', !r.ok)

  await db.query(...back(open, T2))
  r = await as('anon', `select count(*) as n from public.report_supports where report_id = $1`, [open])
  check('the public can count backings', r.ok && Number(r.rows[0].n) === 2, JSON.stringify(r))
  r = await as('anon', `select report_id, kind, created_at from public.report_supports`)
  check('the public can read which report and when', r.ok)
  r = await as('anon', `select device_token from public.report_supports`)
  check('the public cannot read the private device ids', !r.ok)
  r = await as('anon', `select * from public.report_supports`)
  check('"select *" does not leak device ids either', !r.ok)
  r = await as('authenticated', `select device_token from public.report_supports`)
  check('a signed-in person cannot read device ids either', !r.ok)

  r = await as('anon', `update public.report_supports set kind = 'fixed'`)
  check('a backing cannot be edited', !r.ok)
  r = await as('anon', `delete from public.report_supports`)
  check('a backing cannot be removed', !r.ok)
  r = await as('authenticated', `delete from public.report_supports`)
  check('a signed-in person cannot remove one either', !r.ok)

  const n = await near(LAT, LNG, 'abandoned-vehicle')
  check('backers is one plus the number of backings', Number(n.rows.find((x) => x.id === open).backers) === 3, JSON.stringify(n.rows))
}

console.log(failed ? `\n${failed} FAILED` : '\nAll community database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
