// Checks the database rules in supabase/schema.sql on a local Postgres (PGlite), with stand-ins for Supabase's
// roles and storage tables. It never connects to a real Supabase project.
// Run with:  npm run test:db
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { PGlite } from '@electric-sql/pglite'

const here = dirname(fileURLToPath(import.meta.url))
const schemaSql = readFileSync(join(here, '..', 'schema.sql'), 'utf8')

const db = new PGlite()

// Supabase gives "anon" and "authenticated" broad rights on every new table by default.
// Recreate that first, so the schema has to take the rights away itself.
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
await db.exec(schemaSql) // running it twice must be harmless

let failed = 0
const check = (name, ok, extra) => {
  if (!ok) failed++
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok || !extra ? '' : '  -> ' + extra))
}

// Runs SQL as the public (anon), a signed-in person (authenticated), or the database owner (admin),
// inside a transaction that is rolled back.
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

const PHOTO = '11111111-1111-4111-8111-111111111111.jpg'
const newReport = (over = {}) => {
  const r = { category: 'pothole', description: 'A deep hole', photo: PHOTO, lat: 51.89, lng: 0.9, acc: 12, src: 'gps', ...over }
  return [
    `insert into public.reports (category_code, description, photo_path, lat, lng, location_accuracy_m, location_source)
     values ($1, $2, $3, $4, $5, $6, $7) returning id, current_status`,
    [r.category, r.description, r.photo, r.lat, r.lng, r.acc, r.src],
  ]
}

// Adds a report as the owner, then tries each status in turn, each in its own savepoint.
async function chain(statuses) {
  await db.exec('begin')
  const out = []
  try {
    const { rows } = await db.query(
      `insert into public.reports (category_code, description, photo_path, lat, lng)
       values ('pothole', 'chain', '${PHOTO}', 51, 0) returning id`,
    )
    const id = rows[0].id
    for (const status of statuses) {
      await db.exec('savepoint s')
      try {
        await db.query(`insert into public.report_events (report_id, status, actor_type) values ($1, $2, 'staff')`, [id, status])
        out.push({ status, ok: true })
      } catch (e) {
        await db.exec('rollback to savepoint s')
        out.push({ status, ok: false, error: String(e.message) })
      }
    }
    const now = await db.query(`select current_status from public.reports where id = $1`, [id])
    return { out, current: now.rows[0].current_status }
  } finally {
    await db.exec('rollback')
  }
}

// ---- reading ----
{
  const c = await as('anon', `select code from public.categories order by position`)
  check('the public can read the issue types (six of them)', c.ok && c.rows.length === 6, JSON.stringify(c))
  check('the five issue types are there', ['fly-tipping', 'pothole', 'graffiti', 'abandoned-vehicle', 'damaged-infrastructure'].every((k) => c.rows.some((r) => r.code === k)))
}

// ---- adding a report ----
{
  const [sql, p] = newReport()
  const r = await as('anon', sql, p)
  check('the public can add a report', r.ok, r.error)
  check('...and it starts as "reported"', r.ok && r.rows[0].current_status === 'reported')

  await db.exec('begin')
  await db.exec('set local role anon')
  const made = await db.query(sql, p)
  await db.exec('reset role')
  const ev = await db.query(`select status, actor_type from public.report_events where report_id = $1`, [made.rows[0].id])
  await db.exec('rollback')
  check('adding a report writes its first history entry', ev.rows.length === 1 && ev.rows[0].status === 'reported' && ev.rows[0].actor_type === 'citizen', JSON.stringify(ev.rows))

  const signedIn = await as('authenticated', sql, p)
  check('a signed-in person can add one too', signedIn.ok, signedIn.error)

  const bad = async (name, over) => {
    const [s, q] = newReport(over)
    const x = await as('anon', s, q)
    check(name, !x.ok, x.ok ? 'it was accepted' : undefined)
  }
  await bad('an unknown issue type is refused', { category: 'nonsense' })
  await bad('a photo given as a web link is refused', { photo: 'https://evil.example/x.jpg' })
  await bad('a photo path with folders is refused', { photo: '../../x.jpg' })
  await bad('an empty description is refused', { description: '   ' })
  await bad('a description over 1000 characters is refused', { description: 'x'.repeat(1001) })
  await bad('a latitude off the planet is refused', { lat: 120 })
  await bad('a longitude off the planet is refused', { lng: -200 })
  await bad('a made-up location source is refused', { src: 'satellite' })

  const setStatus = await as(
    'anon',
    `insert into public.reports (category_code, description, photo_path, lat, lng, current_status)
     values ('pothole', 'x', '${PHOTO}', 1, 1, 'cleared')`,
  )
  check('the public cannot set a stage when adding a report', !setStatus.ok)

  const setBody = await as(
    'anon',
    `insert into public.reports (category_code, description, photo_path, lat, lng, responsible_body_id)
     values ('pothole', 'x', '${PHOTO}', 1, 1, gen_random_uuid())`,
  )
  check('the public cannot set a responsible body', !setBody.ok)

  const setDup = await as(
    'anon',
    `insert into public.reports (category_code, description, photo_path, lat, lng, duplicate_of)
     values ('pothole', 'x', '${PHOTO}', 1, 1, gen_random_uuid())`,
  )
  check('the public cannot mark a report as a duplicate', !setDup.ok)

  await db.exec(`update public.categories set active = false where code = 'graffiti'`)
  const [is, ip] = newReport({ category: 'graffiti' })
  const inactive = await as('anon', is, ip)
  check('a switched-off issue type is refused', !inactive.ok)
  await db.exec(`update public.categories set active = true where code = 'graffiti'`)
}

// ---- reading and changing reports ----
{
  await db.exec(`insert into public.reports (category_code, description, photo_path, lat, lng) values ('pothole', 'seed', '${PHOTO}', 51, 0)`)
  const read = await as('anon', `select id from public.reports`)
  check('the public can read reports', read.ok && read.rows.length === 1)
  const upd = await as('anon', `update public.reports set description = 'hacked'`)
  check('the public cannot change a report', !upd.ok)
  const upd2 = await as('authenticated', `update public.reports set current_status = 'verified'`)
  check('a signed-in person cannot change a report either', !upd2.ok)
  const del = await as('anon', `delete from public.reports`)
  check('the public cannot delete a report', !del.ok)
  const del2 = await as('authenticated', `delete from public.reports`)
  check('a signed-in person cannot delete a report', !del2.ok)
  const tl = await as('anon', `select status from public.report_events`)
  check('the public can read the history', tl.ok && tl.rows.length === 1)
}

// ---- history ----
{
  const write = await as('anon', `insert into public.report_events (report_id, status, actor_type) select id, 'cleared', 'citizen' from public.reports`)
  check('the public cannot write history', !write.ok)
  const write2 = await as('authenticated', `insert into public.report_events (report_id, status, actor_type) select id, 'routed', 'staff' from public.reports`)
  check('a signed-in person cannot write history yet (staff accounts come later)', !write2.ok)
  const upd = await as('anon', `update public.report_events set status = 'verified'`)
  check('history cannot be edited', !upd.ok)
  const upd2 = await as('authenticated', `update public.report_events set note = 'x'`)
  check('history cannot be edited by a signed-in person', !upd2.ok)
  const del = await as('anon', `delete from public.report_events`)
  check('history cannot be deleted', !del.ok)
}

// ---- report moves (the database enforces the diagram) ----
{
  let r = await chain(['routed', 'acknowledged', 'scheduled', 'cleared', 'verified'])
  check('a report can go all the way through to verified', r.out.every((s) => s.ok) && r.current === 'verified', JSON.stringify(r))

  r = await chain(['acknowledged'])
  check('it cannot skip from reported to acknowledged', !r.out[0].ok && r.current === 'reported')

  r = await chain(['routed', 'acknowledged', 'cleared'])
  check('acknowledged can go straight to cleared', r.out.every((s) => s.ok) && r.current === 'cleared')

  r = await chain(['routed', 'acknowledged', 'cleared', 'reopened', 'acknowledged'])
  check('cleared can be reopened, then picked up again', r.out.every((s) => s.ok) && r.current === 'acknowledged')

  r = await chain(['routed', 'acknowledged', 'cleared', 'verified', 'reopened'])
  check('a verified report cannot be reopened', !r.out[4].ok && r.current === 'verified')

  r = await chain(['duplicate', 'routed'])
  check('a duplicate is the end of the line', r.out[0].ok && !r.out[1].ok && r.current === 'duplicate')

  r = await chain(['rejected', 'acknowledged'])
  check('a rejected report is the end of the line', r.out[0].ok && !r.out[1].ok && r.current === 'rejected')

  r = await chain(['reported'])
  check('"reported" cannot be written twice', !r.out[0].ok)

  r = await chain(['routed', 'acknowledged', 'scheduled', 'acknowledged'])
  check('a scheduled report cannot go back to acknowledged', !r.out[3].ok && r.current === 'scheduled')
}

// ---- councils and contractors ----
{
  const council = `insert into public.responsible_bodies (name, kind, tier) values ('Test Unitary Council', 'council', 'unitary') returning id`
  const ok = await as('admin', council)
  check('a council needs a tier and can be added', ok.ok, ok.error)

  const noTier = await as('admin', `insert into public.responsible_bodies (name, kind) values ('No Tier Council', 'council')`)
  check('a council without a tier is refused', !noTier.ok)

  const orphan = await as('admin', `insert into public.responsible_bodies (name, kind) values ('Lonely Contractor', 'contractor')`)
  check('a contractor must work for a council', !orphan.ok)

  await db.exec('begin')
  const c = await db.query(council)
  const good = await db
    .query(`insert into public.responsible_bodies (name, kind, works_for_id) values ('Test Contractor', 'contractor', $1)`, [c.rows[0].id])
    .then(() => true, () => false)
  await db.exec('savepoint s')
  const chained = await db
    .query(
      `insert into public.responsible_bodies (name, kind, works_for_id)
       select 'Sub Contractor', 'contractor', id from public.responsible_bodies where kind = 'contractor'`,
    )
    .then(() => true, () => false)
  await db.exec('rollback to savepoint s')
  const dup = await db
    .query(`insert into public.responsible_bodies (name, kind, tier) values ('test unitary council', 'council', 'county')`)
    .then(() => true, () => false)
  await db.exec('rollback')
  check('a contractor working for a council is fine', good)
  check('a contractor cannot work for another contractor', !chained)
  check('two bodies cannot share a name (any capitals)', !dup)

  await db.exec(`insert into public.responsible_bodies (name, kind, tier) values ('Live Council', 'council', 'unitary'), ('Retired Council', 'council', 'unitary')`)
  await db.exec(`update public.responsible_bodies set active = false where name = 'Retired Council'`)
  const read = await as('anon', `select name from public.responsible_bodies`)
  check('the public sees active councils only', read.ok && read.rows.length === 1 && read.rows[0].name === 'Live Council', JSON.stringify(read))

  const w = await as('anon', `insert into public.responsible_bodies (name, kind, tier) values ('Fake Council', 'council', 'unitary')`)
  check('the public cannot add a council', !w.ok)
  const w2 = await as('authenticated', `update public.responsible_bodies set name = 'x'`)
  check('a signed-in person cannot rename a council', !w2.ok)
  const w3 = await as('anon', `insert into public.categories (code, label, function) values ('fake', 'Fake', 'other')`)
  check('the public cannot add an issue type', !w3.ok)
  const w4 = await as('anon', `update public.categories set active = false`)
  check('the public cannot switch an issue type off', !w4.ok)
}

// ---- fixes and costs (groundwork, closed for now) ----
{
  const r = await as('anon', `select * from public.interventions`)
  check('the public cannot read what was done or what it cost', !r.ok)
  const r2 = await as('authenticated', `insert into public.interventions (report_id, type) select id, 'cleared' from public.reports`)
  check('nobody can add a fix through the API yet', !r2.ok)
  const admin = await as('admin', `insert into public.interventions (report_id, type, cost_pence) select id, 'cleared', 12500 from public.reports limit 1 returning id`)
  check('the owner can record a fix and its cost', admin.ok, admin.error)
  const neg = await as('admin', `insert into public.interventions (report_id, type, cost_pence) select id, 'cleared', -1 from public.reports limit 1`)
  check('a negative cost is refused', !neg.ok)
}

// ---- photo storage ----
{
  const b = await as('admin', `select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'report-photos'`)
  check('the photo bucket exists, is viewable by link, limited to 5 MB', b.ok && b.rows[0]?.public === true && Number(b.rows[0].file_size_limit) === 5242880, JSON.stringify(b))
  check('the bucket only takes JPEG, PNG and WebP', b.ok && b.rows[0].allowed_mime_types.sort().join() === 'image/jpeg,image/png,image/webp')

  const up = await as('anon', `insert into storage.objects (bucket_id, name) values ('report-photos', '${PHOTO}')`)
  check('the public can upload a photo with a proper name', up.ok, up.error)

  const other = await as('anon', `insert into storage.objects (bucket_id, name) values ('some-other-bucket', '${PHOTO}')`)
  check('uploads to any other bucket are refused', !other.ok)

  const badName = await as('anon', `insert into storage.objects (bucket_id, name) values ('report-photos', 'anything.jpg')`)
  check('a photo with a made-up name is refused', !badName.ok)

  const badExt = await as('anon', `insert into storage.objects (bucket_id, name) values ('report-photos', '11111111-1111-4111-8111-111111111111.exe')`)
  check('a file that is not an image is refused', !badExt.ok)

  await db.exec(`insert into storage.objects (bucket_id, name) values ('report-photos', '${PHOTO}')`)
  const upd = await as('anon', `update storage.objects set name = '22222222-2222-4222-8222-222222222222.jpg'`)
  check('a photo cannot be replaced or renamed', upd.ok && upd.rows.length === 0 ? true : !upd.ok)
  const del = await as('anon', `delete from storage.objects returning id`)
  check('a photo cannot be deleted', del.ok ? del.rows.length === 0 : true)
}

console.log(failed ? `\n${failed} FAILED` : '\nAll database checks passed.')
await db.close()
process.exit(failed ? 1 : 0)
