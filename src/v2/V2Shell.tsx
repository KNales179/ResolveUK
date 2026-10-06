import { Link, NavLink, Outlet } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'
import { Logo } from '../components/site/Logo'
import { PageBackdrop } from '../components/site/SiteShell'
import { ReporterAuthProvider } from './reporterAuth'

const tab = ({ isActive }: { isActive: boolean }) => `rounded-lg px-3.5 py-2 text-sm font-semibold transition ${isActive ? 'bg-surface2 text-ink' : 'text-soft hover:text-ink'}`

// Everything under /v2 is a concept area for Ms Kay to react to, kept apart from the real site on
// purpose: nothing built in here is wired into the live reporting flow or linked from its nav.
export function V2Shell() {
  return (
    <ReporterAuthProvider>
      <PageBackdrop />
      <div className="msg-warn flex items-center justify-center gap-2 rounded-none border-0 py-2 text-center text-sm font-semibold">
        <Icon name="shield" className="size-4 shrink-0" />
        Concept preview, not part of the live site. For review only.
      </div>
      <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl px-4 sm:px-8">
          <nav className="flex h-16 flex-wrap items-center justify-between gap-2" aria-label="Concept">
            <Link to="/v2" className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-tight">
              <Logo />
              <span>Resolve UK · Concept</span>
            </Link>
            <div className="flex flex-wrap items-center gap-1">
              <NavLink to="/v2" end className={tab}>
                Overview
              </NavLink>
              <NavLink to="/v2/community" className={tab}>
                Community route
              </NavLink>
              <NavLink to="/v2/commercial" className={tab}>
                Commercial route
              </NavLink>
              <NavLink to="/v2/account" className={tab}>
                Account
              </NavLink>
              <Link to="/" className="rounded-lg px-3.5 py-2 text-sm font-semibold text-soft transition hover:text-ink">
                Back to the real site
              </Link>
            </div>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 pb-24 pt-14 sm:px-8">
        <Outlet />
      </main>
    </ReporterAuthProvider>
  )
}
