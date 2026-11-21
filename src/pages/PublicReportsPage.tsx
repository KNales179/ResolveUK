import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { PageBackdrop } from '../components/site/SiteShell'
import { Icon, type IconName } from '../components/ui/Icon'
import { FALLBACK_CATEGORIES, useCategories } from '../lib/categories'
import { timeAgo } from '../lib/format'
import { photoUrl } from '../lib/photos'
import { STATUS_LABELS, statusGroup } from '../lib/status'
import { useReports } from '../lib/useReports'
import { fetchPublishedStories, type Story } from '../lib/stories'

const TYPE_ICON: Record<string, IconName> = { 'fly-tipping': 'trash', pothole: 'road', graffiti: 'spray', 'abandoned-vehicle': 'car', 'damaged-infrastructure': 'lamp', other: 'more' }
const SHOWN = 6

// The public website's reports page: a limited view. The most recent reports and the latest
// published stories, so anyone can see that problems are being reported and followed up. The full
// list (search, filters, each report's whole history, backing, the map, posting a story) is in
// the app, which anyone can open by signing in or trying the demo.
export function PublicReportsPage() {
  const location = useLocation()
  const notice = (location.state as { notice?: string } | null)?.notice
  const categories = useCategories()
  const { reports } = useReports()
  const [stories, setStories] = useState<Story[]>([])

  useEffect(() => {
    let alive = true
    void fetchPublishedStories(3).then((list) => {
      if (alive && list) setStories(list)
    })
    return () => {
      alive = false
    }
  }, [])

  const labelOf = (code: string) => categories.find((c) => c.code === code)?.label ?? FALLBACK_CATEGORIES.find((c) => c.code === code)?.label ?? code
  const recent = reports.slice(0, SHOWN)

  return (
    <div className="relative">
      <PageBackdrop />
      <main className="mx-auto max-w-7xl px-5 pb-24 pt-32 sm:px-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="accent-panel max-w-2xl rounded-3xl p-6 sm:p-8">
            <h1 className="text-4xl sm:text-5xl">Recent <span className="hl">reports</span></h1>
            <p className="mt-4 text-lg opacity-90">The latest problems people have reported. Open the Resolve UK app to see every report, follow one, or see them all on a map.</p>
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

        <ul className="report-grid mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recent.map((r) => (
            <li key={r.id} className="card flex h-full flex-col overflow-hidden rounded-3xl">
              <span className="relative block aspect-[4/3] w-full bg-surface2">
                <img src={photoUrl(r.photo_path)} alt="" loading="lazy" decoding="async" className="absolute inset-0 size-full object-cover" />
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
                <span className="mt-auto pt-2 text-sm text-soft">Reported {timeAgo(r.created_at)}</span>
              </span>
            </li>
          ))}
        </ul>

        {stories.length > 0 && (
          <section className="mt-14">
            <h2 className="font-serif text-3xl">What people are <span className="hl">saying</span></h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {stories.map((st) => (
                <article key={st.id} className="card flex flex-col rounded-3xl p-5">
                  <p className="text-sm font-semibold">{st.author_name}</p>
                  <p className="text-xs text-soft">{timeAgo(st.created_at)}</p>
                  <p className="mt-3 line-clamp-5 leading-relaxed">{st.body}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="stand-panel mt-14 grid gap-6 rounded-3xl p-8 sm:p-10 md:grid-cols-[1.3fr_auto] md:items-center">
          <div>
            <h2 className="font-serif text-3xl">See everything <span className="hl">in the app</span></h2>
            <p className="mt-3 max-w-2xl leading-relaxed text-soft">
              Every report with search and filters, the full history of each one, the map, and stories from your area. Back a report you've seen too, or post a story so the neighbourhood knows. Free to join, or try it first with sample data.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/app" className="btn btn-primary">
              Open the app <Icon name="arrow" />
            </Link>
            <Link to="/app/sign-in" className="btn btn-ghost">
              Try the demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  )
}

// Old links to one report (/reports/:id) open it in the app.
export function PublicReportRedirect() {
  const { id } = useParams()
  return <Navigate to={`/app/reports/${id ?? ''}`} replace />
}
