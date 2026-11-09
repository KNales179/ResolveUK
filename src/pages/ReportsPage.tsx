import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { ReportDrawer } from '../components/ReportDrawer'
import { Dropdown } from '../components/ui/Dropdown'
import { Icon, type IconName } from '../components/ui/Icon'
import { FALLBACK_CATEGORIES, useCategories } from '../lib/categories'
import { timeAgo } from '../lib/format'
import { photoUrl } from '../lib/photos'
import { STATUS_LABELS, statusGroup, type StatusGroup } from '../lib/status'
import { supabase } from '../lib/supabase'
import type { Report } from '../types'

const FILTERS: Array<[StatusGroup | 'all', string]> = [
  ['all', 'All'],
  ['reported', 'Reported'],
  ['progress', 'In progress'],
  ['cleared', 'Cleared'],
  ['verified', 'Verified'],
]
const TYPE_ICON: Record<string, IconName> = { 'fly-tipping': 'trash', pothole: 'road', graffiti: 'spray', 'abandoned-vehicle': 'car', 'damaged-infrastructure': 'lamp', other: 'more' }
const SORTS = ['Newest', 'Most backed', 'Oldest']
const backersOf = (r: Report) => 1 + (r.report_supports?.[0]?.count ?? 0)

// Temporary: shown in place of a live fetch while the backend is down, so the page still
// demonstrates the list, filters and detail drawer. Photos are the site's own local sample set
// rather than Supabase storage, which photoUrl() passes through unchanged for a path like this.
const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()
const SAMPLE_REPORTS: Report[] = [
  {
    id: 'sample-1',
    category_code: 'fly-tipping',
    description: 'Bin bags and loose rubbish dumped at the layby on the A595, spilling onto the verge.',
    photo_path: '/img/roadside-litter-480.webp',
    lat: 54.4609,
    lng: -3.4219,
    location_accuracy_m: 12,
    location_source: 'gps',
    responsible_body_id: null,
    current_status: 'reported',
    created_at: daysAgo(0.2),
    report_supports: [{ count: 2 }],
  },
  {
    id: 'sample-2',
    category_code: 'fly-tipping',
    description: 'Several bottles and cans scattered along the footpath by the river crossing.',
    photo_path: '/img/litter-bottles-640.webp',
    lat: 54.9783,
    lng: -1.6178,
    location_accuracy_m: 8,
    location_source: 'gps',
    responsible_body_id: 'sample-body-1',
    responsible_bodies: { name: 'Sample District Council', kind: 'council' },
    current_status: 'acknowledged',
    created_at: daysAgo(2),
    report_events: [
      { id: 'e1', seq: 1, status: 'reported', note: null, created_at: daysAgo(2) },
      { id: 'e2', seq: 2, status: 'routed', note: 'Sent to Sample District Council.', created_at: daysAgo(1.6) },
      { id: 'e3', seq: 3, status: 'acknowledged', note: null, created_at: daysAgo(1) },
    ],
    report_supports: [{ count: 5 }],
  },
  {
    id: 'sample-3',
    category_code: 'fly-tipping',
    description: 'Old furniture and bin bags left behind the row of shops on the high street.',
    photo_path: '/img/rubbish-street-678.webp',
    lat: 53.4808,
    lng: -2.2426,
    location_accuracy_m: 15,
    location_source: 'manual',
    responsible_body_id: 'sample-body-2',
    responsible_bodies: { name: 'Sample Clearance Ltd.', kind: 'contractor' },
    current_status: 'scheduled',
    created_at: daysAgo(4),
    report_events: [
      { id: 'e1', seq: 1, status: 'reported', note: null, created_at: daysAgo(4) },
      { id: 'e2', seq: 2, status: 'routed', note: null, created_at: daysAgo(3.5) },
      { id: 'e3', seq: 3, status: 'acknowledged', note: null, created_at: daysAgo(3) },
      { id: 'e4', seq: 4, status: 'scheduled', note: 'Collection booked for Thursday.', created_at: daysAgo(1) },
    ],
    report_supports: [{ count: 3 }],
  },
  {
    id: 'sample-4',
    category_code: 'fly-tipping',
    description: 'Dumped rubbish piled against the wall of the car park, blocking a bay.',
    photo_path: '/img/trash-picking-700.webp',
    lat: 51.4545,
    lng: -2.5879,
    location_accuracy_m: 10,
    location_source: 'gps',
    responsible_body_id: 'sample-body-1',
    responsible_bodies: { name: 'Sample District Council', kind: 'council' },
    current_status: 'cleared',
    created_at: daysAgo(7),
    report_events: [
      { id: 'e1', seq: 1, status: 'reported', note: null, created_at: daysAgo(7) },
      { id: 'e2', seq: 2, status: 'routed', note: null, created_at: daysAgo(6.5) },
      { id: 'e3', seq: 3, status: 'acknowledged', note: null, created_at: daysAgo(6) },
      { id: 'e4', seq: 4, status: 'scheduled', note: null, created_at: daysAgo(5) },
      { id: 'e5', seq: 5, status: 'cleared', note: 'Removed by the grounds team.', created_at: daysAgo(3) },
    ],
    report_supports: [{ count: 7 }],
  },
  {
    id: 'sample-5',
    category_code: 'fly-tipping',
    description: 'Litter scattered along the lane after an overflowing bin was not emptied.',
    photo_path: '/img/litter-picking-cumbria-640.webp',
    lat: 54.6039,
    lng: -3.1080,
    location_accuracy_m: 9,
    location_source: 'gps',
    responsible_body_id: 'sample-body-1',
    responsible_bodies: { name: 'Sample District Council', kind: 'council' },
    current_status: 'verified',
    created_at: daysAgo(12),
    report_events: [
      { id: 'e1', seq: 1, status: 'reported', note: null, created_at: daysAgo(12) },
      { id: 'e2', seq: 2, status: 'routed', note: null, created_at: daysAgo(11.5) },
      { id: 'e3', seq: 3, status: 'acknowledged', note: null, created_at: daysAgo(11) },
      { id: 'e4', seq: 4, status: 'scheduled', note: null, created_at: daysAgo(10) },
      { id: 'e5', seq: 5, status: 'cleared', note: null, created_at: daysAgo(9) },
      { id: 'e6', seq: 6, status: 'verified', note: 'Confirmed clear with a follow-up photo.', created_at: daysAgo(8) },
    ],
    report_supports: [{ count: 11 }],
  },
]

export function ReportsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const categories = useCategories()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [usingSamples, setUsingSamples] = useState(false)
  const [status, setStatus] = useState<StatusGroup | 'all'>('all')
  const [type, setType] = useState('All types')
  const [sort, setSort] = useState('Newest')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    let settled = false
    const fallBackToSamples = () => {
      if (!alive || settled) return
      settled = true
      window.clearTimeout(timer)
      setReports(SAMPLE_REPORTS)
      setUsingSamples(true)
    }
    // A down backend does not always reject promptly — the client can also just hang. A timeout
    // race covers that case too, not just an outright error from the request.
    const timer = window.setTimeout(fallBackToSamples, 6000)
    supabase
      .from('reports')
      .select('*, report_events(id, seq, status, note, created_at), report_supports(count), responsible_bodies(name, kind)')
      .order('created_at', { ascending: false })
      .then(
        ({ data, error: problem }) => {
          if (!alive || settled) return
          if (problem) return fallBackToSamples()
          settled = true
          window.clearTimeout(timer)
          setReports((data ?? []) as unknown as Report[])
        },
        fallBackToSamples,
      )
    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [])

  const labelOf = useCallback(
    (code: string) => categories.find((c) => c.code === code)?.label ?? FALLBACK_CATEGORIES.find((c) => c.code === code)?.label ?? code,
    [categories],
  )

  const shown = useMemo(() => {
    if (!reports) return []
    const q = query.trim().toLowerCase()
    const list = reports.filter(
      (r) =>
        (status === 'all' || statusGroup(r.current_status) === status) &&
        (type === 'All types' || labelOf(r.category_code) === type) &&
        (!q || `${r.description} ${labelOf(r.category_code)}`.toLowerCase().includes(q)),
    )
    if (sort === 'Most backed') list.sort((a, b) => backersOf(b) - backersOf(a))
    else if (sort === 'Oldest') list.sort((a, b) => a.created_at.localeCompare(b.created_at))
    return list
  }, [reports, status, type, sort, query, labelOf])

  const selected = reports?.find((r) => r.id === id) ?? null
  const close = useCallback(() => navigate('/reports'), [navigate])
  const onBacked = useCallback(
    (rid: string) => setReports((list) => list && list.map((r) => (r.id === rid ? { ...r, report_supports: [{ count: (r.report_supports?.[0]?.count ?? 0) + 1 }] } : r))),
    [],
  )

  return (
    <>
      <div className="relative">
        <PageBackdrop />
        <main className="grid-texture grid-shimmer mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8">
        <div className="rise flex flex-wrap items-end justify-between gap-6">
          <div className="text-halo max-w-2xl">
            <h1 className="text-4xl sm:text-5xl">Reported problems</h1>
            <p className="mt-4 text-lg text-soft">Open a report to see its photo, where it stands and everything that has happened to it.</p>
          </div>
          <Link to="/report" className="btn btn-primary">
            Report a problem <Icon name="arrow" />
          </Link>
        </div>

        {notice && (
          <p className="msg msg-ok mt-8" role="status">
            {notice}
          </p>
        )}

        <div className="rise relative z-20 mt-10 flex flex-wrap items-center gap-3" style={{ animationDelay: '.1s' }}>
          <label className="relative w-full sm:w-auto sm:min-w-[14rem] sm:max-w-sm sm:flex-1">
            <span className="sr-only">Search reports</span>
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-soft">
              <Icon name="search" />
            </span>
            <input className="input pl-12" type="search" placeholder="Search reports" autoComplete="off" value={query} onChange={(e) => setQuery(e.target.value)} />
          </label>
          <div className="no-scrollbar flex w-full gap-1 overflow-x-auto rounded-xl border border-line bg-surface/60 p-1 sm:w-auto" role="group" aria-label="Filter by status">
            {FILTERS.map(([value, text]) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => setStatus(value)}
                className="shrink-0 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-soft transition hover:text-ink aria-pressed:bg-accent aria-pressed:text-accent-ink"
              >
                {text}
              </button>
            ))}
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:contents">
            <Dropdown label="Type" options={['All types', ...categories.map((c) => c.label)]} value={type} onChange={setType} />
            <Dropdown label="Sort" options={SORTS} value={sort} onChange={setSort} className="[&_.dd-list]:right-0 [&_.dd-list]:left-auto" />
          </div>
        </div>

        {usingSamples && (
          <p className="msg msg-warn mt-8" role="status">
            Showing sample reports. Live reports are not available right now.
          </p>
        )}

        <p className="mt-8 text-sm font-semibold text-soft" aria-live="polite">
          {reports ? `Showing ${shown.length} of ${reports.length} reports` : 'Loading reports…'}
        </p>

        {!reports && (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="card overflow-hidden rounded-3xl">
                <div className="skeleton aspect-[4/3] rounded-none" />
                <div className="space-y-3 p-5">
                  <div className="skeleton h-3 w-1/3" />
                  <div className="skeleton h-5 w-4/5" />
                  <div className="skeleton h-3 w-full" />
                </div>
              </li>
            ))}
          </ul>
        )}

        {reports && shown.length > 0 && (
          <ul className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((r) => (
              <li key={r.id}>
                <Link to={`/reports/${r.id}`} className="card group flex h-full flex-col overflow-hidden rounded-3xl text-left transition hover:border-ink/40" data-report={r.id}>
                  <span className="relative block aspect-[4/3] w-full overflow-hidden bg-surface2">
                    <img src={photoUrl(r.photo_path)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105" />
                    <span className="absolute left-3 top-3">
                      <span className={`pill pill-${statusGroup(r.current_status)}`}>{STATUS_LABELS[r.current_status]}</span>
                    </span>
                  </span>
                  <span className="flex flex-1 flex-col gap-3 p-5">
                    <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-soft">
                      <Icon name={TYPE_ICON[r.category_code] ?? 'more'} className="size-4" />
                      {labelOf(r.category_code)}
                    </span>
                    <span className="line-clamp-2 text-lg font-semibold leading-snug">{r.description}</span>
                    <span className="mt-auto flex items-center justify-between pt-2 text-sm text-soft">
                      <span className="flex items-center gap-1.5">
                        <Icon name="users" className="size-4" />
                        {backersOf(r)} back this
                      </span>
                      <span>{timeAgo(r.created_at)}</span>
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}

        {reports && shown.length === 0 && (
          <div className="card mt-6 rounded-3xl p-12 text-center">
            <span className="tile-icon mx-auto size-14 rounded-2xl">
              <Icon name="search" className="size-6" />
            </span>
            <p className="mt-5 font-serif text-2xl">{reports.length === 0 ? 'No reports yet' : 'No reports match that'}</p>
            <p className="mt-1 text-soft">{reports.length === 0 ? 'Be the first to report a problem.' : 'Try a different word or clear the filters.'}</p>
          </div>
        )}
        </main>
      </div>

      <ReportDrawer report={selected} categories={categories} onClose={close} onBacked={onBacked} />
    </>
  )
}
