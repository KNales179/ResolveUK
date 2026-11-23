import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { toggleTheme, useThemeName } from '../lib/theme'
import { usePageIntro } from '../lib/usePageIntro'
import { Icon, type IconName } from '../components/ui/Icon'
import { Backdrop, VeinsSync } from '../components/site/Backdrop'
import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from '../components/site/logoPaths'
import { canSee, ROLES, useAppSession } from './session'
import { NotificationBell } from './components/NotificationBell'

interface Item {
  to: string
  label: string
  icon: IconName
  end?: boolean
  short?: string
  show?: 'staff' | 'admin'
  /** false: kept off the phone's bottom bar (used less often; it is in the account menu there). */
  bottom?: boolean
}
const ITEMS: Item[] = [
  { to: '/app', label: 'Home', icon: 'home', end: true },
  { to: '/app/reports', label: 'Reports', icon: 'layers' },
  { to: '/app/map', label: 'Map', icon: 'map' },
  { to: '/app/community', label: 'Community', icon: 'users' },
  // Most residents rarely need it, so on phones it moves to the account menu, which also leaves
  // fewer, wider tabs in the bottom bar (frequency of use, Fitts's law).
  { to: '/app/clearance', label: 'Private land', short: 'Land', icon: 'truck', bottom: false },
  { to: '/app/staff', label: 'Staff', icon: 'building', show: 'staff' },
  { to: '/app/admin', label: 'Admin', icon: 'shield', show: 'admin' },
]

// The app's frame (everything under /app once signed in or in the demo): a top bar with the
// sections on wide screens, a bottom tab bar on phones and tablets, and, in the demo, a banner with
// the role switch. Staff and Admin sections only appear for people who have that role.
export function AppLayout() {
  const s = useAppSession()
  const items = ITEMS.filter((i) => !i.show || canSee(s.role, i.show))
  const bottomItems = items.filter((i) => i.bottom !== false)
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])
  // The same page entrance as the public site, on every app page.
  usePageIntro(mainRef, location.pathname)

  return (
    <div className="relative min-h-svh pb-24 lg:pb-0">
      <VeinsSync />
      <Backdrop kind="page" />
      {s.demo && <DemoBanner />}
      <header className="site-header sticky top-0 z-40 border-b border-line">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/app" className="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight" aria-label="Resolve UK app home">
            <svg viewBox="0 0 198 223" className="h-7 w-auto" aria-hidden="true">
              <path fill="var(--c-logo-mark)" fillRule="evenodd" d={`${R_PATH} ${PIN_PATH}`} />
              <path fill="var(--c-logo-leaf-r, var(--c-accent))" d={LEAF_RIGHT_PATH} />
              <path fill="var(--c-logo-leaf-l, var(--c-accent-display))" d={LEAF_LEFT_PATH} />
            </svg>
            <span className="hidden sm:inline">Resolve UK</span>
          </Link>
          <nav className="ml-3 hidden items-center gap-1 lg:flex" aria-label="App sections">
            {items.map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `app-tab ${isActive ? 'app-tab-on' : ''}`}>
                {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/app/report" className="btn btn-primary btn-sm hidden sm:inline-flex">
              Report a problem <Icon name="arrow" className="size-4" />
            </Link>
            <NotificationBell />
            <ThemeButton />
            <AccountMenu />
          </div>
        </div>
      </header>

      <main ref={mainRef} className="relative">
        <Outlet />
      </main>

      {/* Phones and tablets: the sections as a bottom tab bar, in thumb reach. */}
      {createPortal(
        <nav className="app-bottom-nav fixed inset-x-0 bottom-0 z-40 border-t border-line lg:hidden" aria-label="App sections" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <ul className="mx-auto grid max-w-xl" style={{ gridTemplateColumns: `repeat(${bottomItems.length + (bottomItems.length <= 5 ? 1 : 0)}, minmax(0, 1fr))` }}>
            {bottomItems.map((i) => (
              <li key={i.to}>
                <NavLink to={i.to} end={i.end} className={({ isActive }) => `app-bottom-tab ${isActive ? 'app-bottom-tab-on' : ''}`} data-no-tag>
                  <Icon name={i.icon} className="size-5" />
                  <span>{i.short ?? i.label}</span>
                </NavLink>
              </li>
            ))}
            {/* With more than five sections the account stays in the avatar menu at the top. */}
            {bottomItems.length <= 5 && <li>
              <NavLink to="/app/account" className={({ isActive }) => `app-bottom-tab ${isActive ? 'app-bottom-tab-on' : ''}`} data-no-tag>
                <Icon name="user" className="size-5" />
                <span>Account</span>
              </NavLink>
            </li>}
          </ul>
        </nav>,
        document.body,
      )}
    </div>
  )
}

function ThemeButton() {
  const theme = useThemeName()
  return (
    <button type="button" className="icon-btn" aria-label="Switch light or dark" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}>
      <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
    </button>
  )
}

function AccountMenu() {
  const s = useAppSession()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false)
    }
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])
  const initial = (s.name || s.email || '?').trim().charAt(0).toUpperCase()

  async function signOut() {
    setOpen(false)
    await s.signOut()
    navigate('/app/sign-in', { replace: true })
  }

  return (
    <div ref={box} className="relative">
      <button type="button" className="app-avatar" aria-haspopup="menu" aria-expanded={open} aria-label="Your account" onClick={() => setOpen((o) => !o)}>
        {initial}
      </button>
      {open && (
        <div role="menu" className="card absolute right-0 top-12 z-50 w-64 rounded-2xl p-2 shadow-xl">
          <div className="px-3 py-2">
            <p className="truncate font-semibold">{s.name || 'Your account'}</p>
            <p className="truncate text-sm text-soft">{s.email}</p>
            <p className="mt-1.5">
              <span className="pill pill-closed">{ROLES.find((r) => r.id === s.role)?.label}</span>
            </p>
          </div>
          <div className="my-1 h-px bg-line" />
          <Link role="menuitem" to="/app/account" className="app-menu-item" onClick={() => setOpen(false)}>
            <Icon name="user" className="size-4" /> Your account
          </Link>
          {/* On phones and tablets Private land is not in the bottom bar, so it lives here. */}
          <Link role="menuitem" to="/app/clearance" className="app-menu-item lg:hidden" onClick={() => setOpen(false)}>
            <Icon name="truck" className="size-4" /> Private land
          </Link>
          <Link role="menuitem" to="/" className="app-menu-item" onClick={() => setOpen(false)}>
            <Icon name="home" className="size-4" /> Back to the website
          </Link>
          <button role="menuitem" type="button" className="app-menu-item w-full" onClick={() => void signOut()}>
            <Icon name="logout" className="size-4" /> {s.demo ? 'Leave the demo' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}

// Shown across the top in the demo: what it is, the role switch (which only changes what this
// browser shows, never the real system), a way to make a real account, and a way out.
function DemoBanner() {
  const s = useAppSession()
  const navigate = useNavigate()
  const leave = (to: string) => {
    s.exitDemo()
    navigate(to, { replace: true })
  }
  return (
    <div className="demo-banner relative z-50">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <span className="flex min-w-0 items-center gap-2 font-semibold">
          <Icon name="compass" className="size-4 shrink-0" /> Demo
          <span className="hidden font-normal opacity-85 md:inline">· sample data on this device only. Nothing is sent.</span>
        </span>
        <div className="demo-roles flex items-center gap-1" role="radiogroup" aria-label="Preview the app as">
          <span className="mr-1 hidden text-xs font-semibold uppercase tracking-wide opacity-75 sm:inline">View as</span>
          {ROLES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={s.role === r.id} className={`demo-role ${s.role === r.id ? 'demo-role-on' : ''}`} onClick={() => s.setDemoRole(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        <span className="ml-auto flex items-center gap-2">
          <button type="button" className="demo-cta" onClick={() => leave('/app/create-account')}>
            Create an account
          </button>
          <button type="button" className="demo-exit" onClick={() => leave('/app/sign-in')} aria-label="Leave the demo">
            Leave demo
          </button>
        </span>
      </div>
    </div>
  )
}
