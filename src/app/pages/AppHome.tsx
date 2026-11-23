import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../../components/ui/Icon'
import { canSee, ROLES, useAppSession, type AppRole } from '../session'
import { fetchPublishedStories, sampleStories, type Story, type StoryKind } from '../../lib/stories'
import { KIND_LABEL } from '../../lib/orgs'
import { StoryCard } from '../components/StoryCard'
import { useOrgs } from '../orgsData'
import { fetchMyThanks } from '../../lib/comments'
import { SkeletonCard } from '../../components/ui/Skeleton'

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
}

// Shortcuts down the left on wide screens, and as a scrolling strip across the top on phones.
const SHORTCUTS: Array<{ to: string; label: string; icon: IconName; show?: 'staff' | 'admin' }> = [
  { to: '/app/report', label: 'Report a problem', icon: 'camera' },
  { to: '/app/reports', label: 'Reports', icon: 'layers' },
  { to: '/app/map', label: 'Map', icon: 'map' },
  { to: '/app/community', label: 'Community groups', icon: 'users' },
  { to: '/app/clearance', label: 'Private land quotes', icon: 'truck' },
  { to: '/app/staff', label: 'Staff queue', icon: 'building', show: 'staff' },
  { to: '/app/admin', label: 'Admin', icon: 'shield', show: 'admin' },
  { to: '/app/account', label: 'Your account', icon: 'user' },
]

// What each role can do in the app now (with where to do it), and what is still on its way.
const NOW: Record<AppRole, Array<[string, string]>> = {
  resident: [['Follow a report to hear each time it moves on', '/app/reports'], ['Join a community group near you', '/app/community'], ['Get quotes to clear rubbish dumped on private land', '/app/clearance']],
  community: [['Take on jobs the council offers your group', '/app/community'], ['Post updates and before-and-after write-ups', '/app/community'], ['Follow reports in your area', '/app/reports']],
  staff: [["Work through your council's report queue", '/app/staff'], ['Offer a report to a community group or clearance company', '/app/reports'], ['Post official updates on a report', '/app/reports']],
  admin: [["Approve residents' stories and new groups", '/app/admin'], ['Add councils, contractors and staff accounts', '/app/admin'], ['See every report in the staff queue', '/app/staff']],
}
const COMING: Record<AppRole, string[]> = {
  resident: ['Email updates for the reports you follow'],
  community: ["Events and meet-ups on your group's page"],
  staff: ['A weekly email summary of your queue'],
  admin: ['Reports and exports for each council'],
}

const FILTERS: Array<[StoryKind | 'all', string]> = [
  ['all', 'Everything'],
  ['problem', 'Problems'],
  ['progress', 'Updates'],
  ['resolved', 'Resolved'],
]

// The app's home, laid out like a social feed: one column of posts to scroll through (problems
// people have spotted, updates from the groups and councils dealing with them, and before-and-
// after write-ups), with "what's happening?" at the top. On wide screens the rest of the width
// is used the way Facebook does: shortcuts down the left, and what you can do and groups near
// you down the right, both staying in view as the feed scrolls.
export function AppHome() {
  const s = useAppSession()
  const { orgs } = useOrgs()
  const [stories, setStories] = useState<Story[] | null>(() => (s.demo ? sampleStories('approved') : null))
  const [kind, setKind] = useState<StoryKind | 'all'>('all')
  const [thanked, setThanked] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (s.demo || !s.userId) return
    let alive = true
    void fetchMyThanks(s.userId).then((t) => {
      if (alive) setThanked(t)
    })
    return () => {
      alive = false
    }
  }, [s.demo, s.userId])

  useEffect(() => {
    if (s.demo) return
    let alive = true
    void fetchPublishedStories(30).then((list) => {
      if (alive) setStories(list ?? [])
    })
    return () => {
      alive = false
    }
  }, [s.demo])

  const shown = useMemo(() => (stories ?? []).filter((st) => kind === 'all' || st.kind === kind), [stories, kind])
  const first = s.name.replace(' (demo)', '').split(' ')[0]
  const initial = (s.name || s.email || '?').trim().charAt(0).toUpperCase()
  const shortcuts = SHORTCUTS.filter((x) => !x.show || canSee(s.role, x.show))
  const groups = (orgs ?? []).filter((o) => o.kind === 'community').slice(0, 3)

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[250px_minmax(0,1fr)_320px]">
        {/* Left: who you are, and shortcuts (wide screens only) */}
        <aside className="sticky top-24 hidden min-w-0 xl:block" aria-label="Shortcuts">
          <div className="flex items-center gap-3 px-2">
            <span className="app-avatar size-11 text-base">{initial}</span>
            <div className="min-w-0">
              <p className="truncate font-semibold">{s.name || 'You'}</p>
              <p className="text-xs text-soft">{ROLES.find((r) => r.id === s.role)?.label}</p>
            </div>
          </div>
          <nav className="mt-4 grid gap-0.5">
            {shortcuts.map((x) => (
              <Link key={x.to} to={x.to} className="app-menu-item">
                <span className="tile-icon size-8 shrink-0 rounded-lg">
                  <Icon name={x.icon} className="size-4" />
                </span>
                {x.label}
              </Link>
            ))}
          </nav>
        </aside>

        {/* The feed */}
        <section className="mx-auto w-full max-w-[640px] min-w-0" aria-labelledby="feed-title">
          <p className="text-sm font-semibold text-honey-text">
            {greeting()}
            {first ? `, ${first}` : ''}
          </p>
          <h1 id="feed-title" className="mt-0.5 font-serif text-3xl sm:text-4xl">
            What's happening <span className="hl">near you</span>
          </h1>

          {/* Shortcuts as a strip on phones and tablets */}
          <div className="-mx-4 mt-4 flex gap-2 overflow-x-auto px-4 pb-1 xl:hidden" data-lenis-prevent>
            {shortcuts.slice(0, 5).map((x) => (
              <Link key={x.to} to={x.to} className="btn btn-ghost btn-sm shrink-0">
                <Icon name={x.icon} className="size-4" /> {x.label}
              </Link>
            ))}
          </div>

          {/* "What's happening?" */}
          <div className="card mt-5 rounded-2xl p-4" data-tour="composer">
            <div className="flex items-center gap-3">
              <span className="app-avatar size-10">{initial}</span>
              <Link to="/app/reports" className="composer-prompt min-w-0 flex-1 truncate rounded-full px-4 py-2.5 text-soft">
                Seen something{first ? `, ${first}` : ''}? Tell the neighbourhood…
              </Link>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-1 border-t border-line pt-3">
              <Link to="/app/report" className="feed-action">
                <Icon name="camera" className="size-4" /> Report
              </Link>
              <Link to="/app/reports" className="feed-action">
                <Icon name="sparkles" className="size-4" /> Post a story
              </Link>
              <Link to="/app/community" className="feed-action">
                <Icon name="users" className="size-4" /> Join a group
              </Link>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
            <div className="seg flex flex-wrap gap-1 rounded-xl border border-line bg-[var(--c-field)] p-1" role="group" aria-label="Show">
              {FILTERS.map(([id, label]) => (
                <button key={id} type="button" aria-pressed={kind === id} onClick={() => setKind(id)} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-soft hover:text-ink aria-pressed:bg-accent-vivid aria-pressed:text-accent-ink">
                  {label}
                </button>
              ))}
            </div>
            {s.demo && <span className="text-xs font-semibold text-soft">Sample posts</span>}
          </div>

          <div className="mt-4 grid gap-4">
            {stories === null && [0, 1].map((i) => <SkeletonCard key={i} media />)}
            {shown.map((st) => (
              <StoryCard key={st.id} story={st} variant="feed" thanked={thanked.has(st.id)} />
            ))}
            {stories !== null && shown.length === 0 && (
              <div className="card rounded-2xl p-8 text-center">
                <span className="tile-icon mx-auto size-12 rounded-2xl">
                  <Icon name="sparkles" className="size-6" />
                </span>
                <p className="mt-3 font-semibold">{stories.length ? 'Nothing of that kind yet' : 'No posts yet'}</p>
                <p className="mt-1 text-sm text-soft">Be the first: open a report and tell the neighbourhood what's happening.</p>
                <Link to="/app/reports" className="btn btn-ghost btn-sm mt-4">
                  Open the reports
                </Link>
              </div>
            )}
            {shown.length > 0 && <p className="py-4 text-center text-sm text-soft">You're all caught up.</p>}
          </div>
        </section>

        {/* Right: what you can do, groups near you */}
        <aside className="hidden min-w-0 grid-cols-[minmax(0,1fr)] gap-4 lg:sticky lg:top-24 lg:grid" aria-label="For you">
          <section className="card rounded-2xl p-5">
            <h2 className="font-serif text-xl">What you can do here</h2>
            <ul className="mt-3 grid gap-0.5">
              {NOW[s.role].map(([line, to]) => (
                <li key={line}>
                  <Link to={to} className="app-menu-item text-sm leading-snug">
                    <span className="tile-icon size-6 shrink-0 rounded-full">
                      <Icon name="check" className="size-3.5" />
                    </span>
                    <span className="flex-1">{line}</span>
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mt-4 text-xs font-semibold uppercase tracking-wide text-honey-text">Coming next</h3>
            <ul className="mt-2 grid gap-2">
              {COMING[s.role].map((line) => (
                <li key={line} className="flex gap-2.5 text-sm leading-snug">
                  <Icon name="clock" className="mt-0.5 size-4 shrink-0 text-soft" />
                  {line}
                </li>
              ))}
            </ul>
          </section>

          {groups.length > 0 && (
            <section className="card rounded-2xl p-5">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-serif text-xl">Groups near you</h2>
                <Link to="/app/community" className="text-sm font-semibold text-soft hover:text-ink">
                  See all
                </Link>
              </div>
              <ul className="mt-3 grid grid-cols-[minmax(0,1fr)] gap-3">
                {groups.map((o) => (
                  <li key={o.id}>
                    <Link to={`/app/community/${o.id}`} className="flex min-w-0 items-center gap-3 rounded-xl p-1.5 hover:bg-[var(--c-field)]">
                      <span className="app-avatar app-avatar-org size-10">
                        <Icon name="users" className="size-4" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold">{o.name}</span>
                        <span className="block truncate text-xs text-soft">
                          {KIND_LABEL[o.kind]} · <span className="num">{o.member_count}</span> members · {o.area_label}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  )
}
