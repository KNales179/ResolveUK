import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/ui/Icon'
import { Select } from '../../components/ui/Select'
import { useCategories, FALLBACK_CATEGORIES } from '../../lib/categories'
import { timeAgo } from '../../lib/format'
import { JOB_STATUS_LABEL, sampleJobs, type Job } from '../../lib/jobs'
import { photoUrl } from '../../lib/photos'
import { SAMPLE_REPORTS } from '../../lib/sampleReports'
import { STATUS_LABELS, statusGroup } from '../../lib/status'
import { supabase } from '../../lib/supabase'
import { advanceReport, claimReport, listBodies, listReports, reassignReport, rejectReport } from '../../staff/api'
import type { ReportStatus, ResponsibleBody, StaffProfile, StaffReport } from '../../types'
import { useAppSession } from '../session'

const OPEN: ReportStatus[] = ['routed', 'acknowledged', 'scheduled', 'reopened']
const OVERDUE_DAYS = 7
const DAY = 864e5
const ageDays = (iso: string) => (Date.now() - new Date(iso).getTime()) / DAY

type Filter = 'claim' | 'open' | 'overdue' | 'check' | 'all'
const ROLE_LABEL: Record<StaffProfile['role'], string> = { staff: 'Council or contractor staff', reviewer: 'Resolve reviewer', resolve_admin: 'Resolve admin' }

// The Staff page in the app: the queue for your council or contractor (or, for a Resolve
// reviewer or admin, every report), the numbers that matter at the top, each report's next step
// right on its row, and the jobs out with community groups and companies beside it. Every action
// goes through the same database functions as the original staff area; the database decides
// whether it is allowed. The demo works on sample reports and never touches the real records.
export function AppStaff() {
  const s = useAppSession()
  const categories = useCategories()
  const data = useStaffData()
  const [filter, setFilter] = useState<Filter | null>(null)
  const [query, setQuery] = useState('')

  const labelOf = useCallback((code: string) => categories.find((c) => c.code === code)?.label ?? FALLBACK_CATEGORIES.find((c) => c.code === code)?.label ?? code, [categories])
  const { me, reports, jobs } = data
  const isStaff = me?.role === 'staff'
  const oversees = me?.role === 'reviewer' || me?.role === 'resolve_admin'

  const scope = useMemo(() => (reports ?? []).filter((r) => (isStaff ? r.responsible_body_id === me?.body_id : true)), [reports, isStaff, me])
  const toClaim = useMemo(() => (reports ?? []).filter((r) => r.current_status === 'reported'), [reports])
  const open = useMemo(() => scope.filter((r) => OPEN.includes(r.current_status)), [scope])
  const overdue = useMemo(() => open.filter((r) => ageDays(r.created_at) > OVERDUE_DAYS), [open])
  const toCheck = useMemo(() => scope.filter((r) => r.current_status === 'cleared'), [scope])
  const liveJobs = useMemo(() => (jobs ?? []).filter((j) => (j.status === 'offered' || j.status === 'accepted') && (!isStaff || scope.some((r) => r.id === j.report_id))), [jobs, isStaff, scope])
  const avg = useMemo(() => averageDaysToClear(scope), [scope])

  const active: Filter = filter ?? (toClaim.length ? 'claim' : 'open')
  const lists: Record<Filter, StaffReport[]> = { claim: toClaim, open, overdue, check: toCheck, all: oversees ? reports ?? [] : scope }
  const shown = lists[active].filter((r) => !query.trim() || `${r.description} ${labelOf(r.category_code)} ${r.responsible_bodies?.name ?? ''}`.toLowerCase().includes(query.trim().toLowerCase()))
  const sorted = [...shown].sort((a, b) => (active === 'claim' || active === 'overdue' ? a.created_at.localeCompare(b.created_at) : b.created_at.localeCompare(a.created_at)))

  const tiles: Array<{ id: Filter | null; icon: IconName; value: string; label: string; hint: string; warn?: boolean }> = [
    { id: 'claim', icon: 'inbox', value: String(toClaim.length), label: 'To claim', hint: 'New reports nobody has taken on yet' },
    { id: 'open', icon: 'layers', value: String(open.length), label: isStaff ? 'Open with you' : 'Open', hint: 'Taken on, not yet cleared' },
    { id: 'overdue', icon: 'clock', value: String(overdue.length), label: 'Overdue', hint: `Open for more than ${OVERDUE_DAYS} days`, warn: overdue.length > 0 },
    { id: null, icon: 'check', value: avg === null ? '–' : avg < 10 ? avg.toFixed(1) : String(Math.round(avg)), label: 'Days to clear', hint: 'Average, reports cleared in the last 90 days' },
    { id: null, icon: 'users', value: String(liveJobs.length), label: 'Jobs with groups', hint: 'Offered or under way' },
  ]

  if (data.error && !reports)
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <p className="msg msg-error" role="alert">
          {data.error}
        </p>
      </div>
    )

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Your queue</p>
          <h1 className="font-serif text-4xl sm:text-5xl">Staff</h1>
          <p className="mt-2 text-soft">
            {me ? (
              <>
                {me.display_name} · {ROLE_LABEL[me.role]}
                {me.body_id && data.bodies.find((b) => b.id === me.body_id) && <> · {data.bodies.find((b) => b.id === me.body_id)?.name}</>}
              </>
            ) : (
              'Loading your account…'
            )}
          </p>
        </div>
        <Link to="/app/reports" className="btn btn-ghost btn-sm">
          <Icon name="layers" className="size-4" /> All reports and the map view
        </Link>
      </div>

      {s.demo && (
        <p className="msg msg-info mt-5" role="status">
          Demo: these are sample reports for Sample District Council. Claiming, clearing and the rest only change what this screen shows.
        </p>
      )}
      {data.error && reports && (
        <p className="msg msg-error mt-5" role="alert">
          {data.error}
        </p>
      )}

      {/* The numbers */}
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {tiles.map((t) => {
          const body = (
            <>
              <span className="flex items-center justify-between gap-2 text-sm font-semibold text-soft">
                {t.label}
                <Icon name={t.icon} className="size-4" />
              </span>
              <span className={`num mt-1 block font-serif text-4xl leading-none ${t.warn ? 'stat-warn' : 'text-honey-display'}`}>{reports ? t.value : '·'}</span>
              <span className="mt-2 block text-xs text-soft">{t.hint}</span>
            </>
          )
          return t.id ? (
            <button key={t.label} type="button" aria-pressed={active === t.id} onClick={() => setFilter(t.id)} className="stat-tile card flex flex-col justify-start rounded-2xl p-4 text-left">
              {body}
            </button>
          ) : (
            <div key={t.label} className="stat-tile card flex flex-col rounded-2xl p-4">
              {body}
            </div>
          )
        })}
      </div>

      <div className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        {/* The queue */}
        <section className="card rounded-3xl p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="Show">
              {(
                [
                  ['claim', 'To claim', toClaim.length],
                  ['open', 'Open', open.length],
                  ['overdue', 'Overdue', overdue.length],
                  ['check', 'Cleared', toCheck.length],
                  ['all', 'Everything', (oversees ? reports ?? [] : scope).length],
                ] as const
              ).map(([id, label, n]) => (
                <button key={id} type="button" aria-pressed={active === id} onClick={() => setFilter(id)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
                  {label} <span className="num opacity-70">{n}</span>
                </button>
              ))}
            </div>
            <input type="search" className="input min-w-0 flex-1 basis-56" placeholder="Search these reports" aria-label="Search these reports" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <p className="mt-3 text-sm text-soft">
            {active === 'claim' && (isStaff ? 'Claim the ones in your area for your council or contractor. Reject one only if nobody can act on it.' : 'New reports waiting for a council or contractor to take them on.')}
            {active === 'open' && 'Acknowledge, schedule and clear. Or open a report to offer it to a community group or clearance company.'}
            {active === 'overdue' && `Open for more than ${OVERDUE_DAYS} days, oldest first.`}
            {active === 'check' && (oversees ? 'Marked cleared. The person who reported it is asked to check; you can verify or reopen it too.' : 'Marked cleared, waiting for the person who reported it to check.')}
            {active === 'all' && 'Every report you can see, newest first.'}
          </p>

          {reports === null ? (
            <div className="mt-4 grid gap-3">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-[var(--c-field)]" />
              ))}
            </div>
          ) : sorted.length === 0 ? (
            <div className="mt-6 rounded-2xl border border-dashed border-line p-8 text-center">
              <p className="font-semibold">Nothing here</p>
              <p className="mt-1 text-sm text-soft">{query ? 'No reports match that search.' : 'All caught up.'}</p>
            </div>
          ) : (
            <ul className="mt-4 divide-y divide-line">
              {sorted.map((r) => (
                <QueueRow key={r.id} report={r} me={me} bodies={data.bodies} label={labelOf(r.category_code)} job={(jobs ?? []).find((j) => j.report_id === r.id && (j.status === 'offered' || j.status === 'accepted'))} onAct={data.act} />
              ))}
            </ul>
          )}
        </section>

        {/* Jobs with groups */}
        <aside className="card rounded-3xl p-5">
          <h2 className="font-serif text-2xl">Jobs with groups</h2>
          <p className="mt-1 text-sm text-soft">Reports offered to community groups and clearance companies. Open a report to offer one.</p>
          <ul className="mt-4 grid gap-3">
            {jobs === null && <li className="skeleton h-16 rounded-xl" aria-hidden="true" />}
            {jobs && (jobs.filter((j) => !isStaff || scope.some((r) => r.id === j.report_id)).length === 0) && <li className="text-sm text-soft">No jobs offered yet.</li>}
            {(jobs ?? [])
              .filter((j) => !isStaff || scope.some((r) => r.id === j.report_id))
              .slice(0, 8)
              .map((j) => (
                <li key={j.id}>
                  <Link to={`/app/reports/${j.report_id}`} className="job-mini block rounded-xl border border-line bg-[var(--c-field)] p-3">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{j.organisations?.name ?? 'A group'}</span>
                      <span className={`pill shrink-0 ${j.status === 'done' ? 'pill-cleared' : j.status === 'accepted' ? 'pill-progress' : j.status === 'offered' ? 'pill-reported' : 'pill-closed'}`}>{j.status === 'offered' ? 'Waiting' : JOB_STATUS_LABEL[j.status]}</span>
                    </span>
                    <span className="mt-1 line-clamp-2 block text-sm text-soft">{j.reports?.description}</span>
                    <span className="mt-1 block text-xs text-soft">{timeAgo(j.completed_at ?? j.responded_at ?? j.created_at)}</span>
                  </Link>
                </li>
              ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}

// One report in the queue: what it is, how old, where it stands, and its next step.
function QueueRow({ report: r, me, bodies, label, job, onAct }: { report: StaffReport; me: StaffProfile | null; bodies: ResponsibleBody[]; label: string; job?: Job; onAct: (r: StaffReport, a: Action) => Promise<string | null> }) {
  const [noting, setNoting] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [moveTo, setMoveTo] = useState('')
  const mine = !!me && ((me.role === 'staff' && r.responsible_body_id === me.body_id) || me.role === 'resolve_admin')
  const oversees = me?.role === 'reviewer' || me?.role === 'resolve_admin'
  const age = ageDays(r.created_at)
  const backers = 1 + (r.report_supports?.[0]?.count ?? 0)

  async function run(a: Action) {
    setBusy(true)
    setError(null)
    const problem = await onAct(r, { ...a, note: note.trim() || undefined })
    setBusy(false)
    if (problem) setError(problem)
    else {
      setNote('')
      setNoting(false)
    }
  }

  const buttons: Array<{ label: string; a: Action; primary?: boolean; icon?: IconName }> = []
  if (r.current_status === 'reported') {
    if (me?.role === 'staff') buttons.push({ label: 'Claim', a: { kind: 'claim' }, primary: true })
    buttons.push({ label: 'Reject', a: { kind: 'reject' } })
  }
  if (mine && (r.current_status === 'routed' || r.current_status === 'reopened')) buttons.push({ label: r.current_status === 'reopened' ? 'Acknowledge again' : 'Acknowledge', a: { kind: 'move', to: 'acknowledged' }, primary: true })
  if (mine && r.current_status === 'acknowledged') {
    buttons.push({ label: 'Schedule', a: { kind: 'move', to: 'scheduled' } })
    buttons.push({ label: 'Mark cleared', a: { kind: 'move', to: 'cleared' }, primary: true })
  }
  if (mine && r.current_status === 'scheduled') buttons.push({ label: 'Mark cleared', a: { kind: 'move', to: 'cleared' }, primary: true })
  if (oversees && r.current_status === 'cleared') {
    buttons.push({ label: 'Verify', a: { kind: 'move', to: 'verified' }, primary: true, icon: 'shield' })
    buttons.push({ label: 'Reopen', a: { kind: 'move', to: 'reopened' } })
  }

  return (
    <li className="queue-row grid gap-3 py-4 sm:grid-cols-[72px_minmax(0,1fr)] lg:grid-cols-[72px_minmax(0,1fr)_auto]">
      <Link to={`/app/reports/${r.id}`} className="hidden sm:block" tabIndex={-1} aria-hidden="true">
        <img src={photoUrl(r.photo_path)} alt="" loading="lazy" className="size-[72px] rounded-xl object-cover" />
      </Link>
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`pill pill-${statusGroup(r.current_status)}`}>{STATUS_LABELS[r.current_status]}</span>
          {OPEN.includes(r.current_status) && age > OVERDUE_DAYS && <span className="pill pill-overdue">Overdue</span>}
          {job && <span className="pill pill-closed">{job.organisations?.name}: {job.status === 'offered' ? 'offered' : 'clearing it'}</span>}
        </div>
        <Link to={`/app/reports/${r.id}`} className="mt-1.5 line-clamp-2 block font-semibold leading-snug hover:underline">
          {r.description}
        </Link>
        <p className="mt-1 text-sm text-soft">
          {label} · <span className="num">{age < 1 ? 'today' : `${Math.floor(age)} ${Math.floor(age) === 1 ? 'day' : 'days'} old`}</span> · {backers} {backers === 1 ? 'person' : 'people'}
          {r.responsible_bodies && <> · {r.responsible_bodies.name}</>}
        </p>
        {noting && (
          <input className="input mt-2" value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} placeholder="A note saved with your next step, e.g. booked for Thursday" aria-label="Note with the next step" autoFocus />
        )}
        {error && (
          <p className="msg msg-error mt-2" role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-start gap-2 sm:col-start-2 lg:col-start-auto lg:justify-end">
        {buttons.map((b) => (
          <button key={b.label} type="button" disabled={busy} className={`btn btn-sm ${b.primary ? 'btn-primary' : 'btn-ghost'}`} onClick={() => void run(b.a)}>
            {b.icon && <Icon name={b.icon} className="size-4" />} {b.label}
          </button>
        ))}
        {buttons.length > 0 && (
          <button type="button" className="icon-btn" aria-pressed={noting} aria-label={noting ? 'Hide the note' : 'Add a note'} title="Add a note" onClick={() => setNoting((n) => !n)}>
            <Icon name="edit" className="size-4" />
          </button>
        )}
        {me?.role === 'resolve_admin' && (
          <span className="flex items-center gap-2">
            <Select label="Move to a council or contractor" className="w-48" choices={bodies.filter((b) => b.id !== r.responsible_body_id && b.active).map((b) => ({ value: b.id, label: b.name }))} value={moveTo} onChange={setMoveTo} placeholder={r.current_status === 'reported' ? 'Assign to…' : 'Move to…'} />
            <button type="button" className="btn btn-ghost btn-sm" disabled={busy || !moveTo} onClick={() => void run({ kind: 'reassign', body: moveTo }).then(() => setMoveTo(''))}>
              Go
            </button>
          </span>
        )}
        <Link to={`/app/reports/${r.id}`} className="btn btn-ghost btn-sm">
          Open
        </Link>
      </div>
    </li>
  )
}

// ---- data ----
type Action = { kind: 'claim' | 'reject'; note?: string } | { kind: 'move'; to: ReportStatus; note?: string } | { kind: 'reassign'; body: string; note?: string }

function averageDaysToClear(list: StaffReport[]): number | null {
  const since = Date.now() - 90 * DAY
  const days = list
    .map((r) => {
      const cleared = (r.report_events ?? []).find((e) => e.status === 'cleared')
      return cleared && new Date(cleared.created_at).getTime() > since ? (new Date(cleared.created_at).getTime() - new Date(r.created_at).getTime()) / DAY : null
    })
    .filter((d): d is number => d !== null)
  return days.length ? days.reduce((a, b) => a + b, 0) / days.length : null
}

const plain = (msg: string) => (/^[A-Z][^\n]{8,160}$/.test(msg) && !/violates|syntax|relation|column|function/i.test(msg) ? msg : 'That did not save. Please try again.')

function useStaffData() {
  const s = useAppSession()
  const [me, setMe] = useState<StaffProfile | null>(null)
  const [reports, setReports] = useState<StaffReport[] | null>(null)
  const [bodies, setBodies] = useState<ResponsibleBody[]>([])
  const [jobs, setJobs] = useState<Job[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (s.demo) {
      setMe({ id: 'demo', body_id: s.role === 'admin' ? null : 'sample-body-1', role: s.role === 'admin' ? 'resolve_admin' : 'staff', display_name: 'Sam (demo)', bio: null, avatar_path: null, active: true, must_change_password: false })
      setReports((r) => r ?? demoReports())
      setBodies(DEMO_BODIES)
      setJobs((j) => j ?? sampleJobs())
      return
    }
    if (!s.userId) return
    let alive = true
    void (async () => {
      try {
        const [{ data: profile }, r, b, j] = await Promise.all([
          supabase.from('staff_profiles').select('*').eq('id', s.userId!).maybeSingle(),
          listReports(),
          listBodies(),
          supabase.from('report_jobs').select('*, organisations(name, kind), reports(id, description, photo_path, category_code, current_status, created_at)').order('created_at', { ascending: false }).limit(60),
        ])
        if (!alive) return
        setMe((profile as StaffProfile) ?? null)
        setReports(r)
        setBodies(b)
        setJobs((j.data as unknown as Job[]) ?? [])
        setError(profile ? null : "Your account isn't linked to a council or contractor yet. Ask a Resolve admin to link it.")
      } catch (e) {
        if (alive) setError(e instanceof Error ? plain(e.message) : 'The reports could not be loaded. Please reload the page.')
      }
    })()
    return () => {
      alive = false
    }
  }, [s.demo, s.role, s.userId, tick])

  const act = useCallback(
    async (r: StaffReport, a: Action): Promise<string | null> => {
      if (s.demo) {
        setReports((list) =>
          (list ?? []).map((x) => {
            if (x.id !== r.id) return x
            const to: ReportStatus = a.kind === 'move' ? a.to : a.kind === 'claim' ? 'routed' : a.kind === 'reject' ? 'rejected' : x.current_status === 'reported' ? 'routed' : x.current_status
            const body = a.kind === 'claim' ? DEMO_BODIES[0] : a.kind === 'reassign' ? DEMO_BODIES.find((b) => b.id === a.body) : null
            const events = [...(x.report_events ?? [])]
            if (to !== x.current_status) events.push({ id: `local-${Date.now()}`, seq: events.length + 1, status: to, note: a.note ?? null, created_at: new Date().toISOString() })
            return { ...x, current_status: to, report_events: events, ...(body ? { responsible_body_id: body.id, responsible_bodies: { name: body.name, kind: body.kind } } : {}) }
          }),
        )
        return null
      }
      try {
        if (a.kind === 'claim') await claimReport(r.id)
        else if (a.kind === 'reject') await rejectReport(r.id, a.note)
        else if (a.kind === 'reassign') await reassignReport(r.id, a.body)
        else if (a.kind === 'move') await advanceReport(r.id, a.to, a.note)
        setTick((t) => t + 1)
        return null
      } catch (e) {
        return e instanceof Error ? plain(e.message) : 'That did not save. Please try again.'
      }
    },
    [s.demo],
  )

  return { me, reports, bodies, jobs, error, act }
}

// ---- demo data: the shared sample reports plus a few more, so every part of the page has something in it ----
const DEMO_BODIES: ResponsibleBody[] = [
  { id: 'sample-body-1', name: 'Sample District Council', kind: 'council', tier: 'district', works_for_id: null, functions: ['waste', 'streetscene'], active: true },
  { id: 'sample-body-2', name: 'Sample Clearance Ltd.', kind: 'contractor', tier: null, works_for_id: 'sample-body-1', functions: ['waste'], active: true },
  { id: 'sample-body-3', name: 'Sample County Council', kind: 'council', tier: 'county', works_for_id: null, functions: ['highways'], active: true },
] as ResponsibleBody[]

function demoReports(): StaffReport[] {
  const ago = (d: number) => new Date(Date.now() - d * DAY).toISOString()
  const council = { responsible_body_id: 'sample-body-1', responsible_bodies: { name: 'Sample District Council', kind: 'council' as const } }
  const base = SAMPLE_REPORTS.map((r) => ({ ...r, ...(r.responsible_body_id === 'sample-body-2' ? council : r.responsible_body_id ? council : {}) })) as StaffReport[]
  const more: StaffReport[] = [
    { ...base[0], id: 'sample-6', description: 'Mattress and broken chairs dumped behind the bus shelter on Mill Lane.', current_status: 'reported', created_at: ago(0.6), responsible_body_id: null, responsible_bodies: null, report_events: [], report_supports: [{ count: 1 }] },
    { ...base[1], id: 'sample-7', description: 'Bags of garden waste tipped into the hedge on the lane to the allotments.', current_status: 'routed', created_at: ago(9), ...council, report_events: [{ id: 'x1', seq: 1, status: 'reported', note: null, created_at: ago(9) }, { id: 'x2', seq: 2, status: 'routed', note: null, created_at: ago(8.5) }], report_supports: [{ count: 3 }] },
    { ...base[2], id: 'sample-8', description: 'Builders rubble left at the end of the cul-de-sac on Station Road.', current_status: 'acknowledged', created_at: ago(12), ...council, report_events: [{ id: 'y1', seq: 1, status: 'reported', note: null, created_at: ago(12) }, { id: 'y2', seq: 2, status: 'routed', note: null, created_at: ago(11) }, { id: 'y3', seq: 3, status: 'acknowledged', note: null, created_at: ago(10) }], report_supports: [{ count: 7 }] },
    { ...base[3], id: 'sample-9', description: 'Fridge left on the verge outside the primary school.', current_status: 'verified', created_at: ago(20), ...council, report_events: [{ id: 'z1', seq: 1, status: 'reported', note: null, created_at: ago(20) }, { id: 'z2', seq: 2, status: 'routed', note: null, created_at: ago(19.5) }, { id: 'z3', seq: 3, status: 'acknowledged', note: null, created_at: ago(19) }, { id: 'z4', seq: 4, status: 'cleared', note: null, created_at: ago(17) }, { id: 'z5', seq: 5, status: 'verified', note: null, created_at: ago(16) }], report_supports: [{ count: 4 }] },
  ]
  return [...more, ...base]
}
