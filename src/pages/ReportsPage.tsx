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

export function ReportsPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const categories = useCategories()
  const [reports, setReports] = useState<Report[] | null>(null)
  const [error, setError] = useState('')
  const [status, setStatus] = useState<StatusGroup | 'all'>('all')
  const [type, setType] = useState('All types')
  const [sort, setSort] = useState('Newest')
  const [query, setQuery] = useState('')

  useEffect(() => {
    let alive = true
    supabase
      .from('reports')
      .select('*, report_events(id, seq, status, note, created_at), report_supports(count), responsible_bodies(name, kind)')
      .order('created_at', { ascending: false })
      .then(({ data, error: problem }) => {
        if (!alive) return
        if (problem) setError(problem.message)
        else setReports((data ?? []) as unknown as Report[])
      })
    return () => {
      alive = false
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
      <PageBackdrop />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8">
        <div className="rise flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
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

        {error && (
          <p className="msg msg-error mt-8" role="alert">
            {error}
          </p>
        )}

        <p className="mt-8 text-sm font-semibold text-soft" aria-live="polite">
          {reports ? `Showing ${shown.length} of ${reports.length} reports` : 'Loading reports…'}
        </p>

        {!reports && !error && (
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

      <ReportDrawer report={selected} categories={categories} onClose={close} onBacked={onBacked} />
    </>
  )
}
