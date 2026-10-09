import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { toggleTheme } from '../../lib/theme'
import { Logo } from './Logo'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3.5 py-2 transition ${isActive ? 'bg-surface2 text-ink' : 'text-soft hover:text-ink'}`

const ABOUT_LINKS: Array<[string, string]> = [
  ['/about', 'About'],
  ['/why', 'Why this matters'],
  ['/get-involved', 'Get involved'],
]

// A small link menu for the About cluster, so the flat nav does not have to grow every time an
// info page is added. Styled with the same .dd / .dd-list classes the filter dropdowns use.
function AboutMenu() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const root = useRef<HTMLDivElement>(null)
  const active = ABOUT_LINKS.some(([href]) => href === pathname)

  useEffect(() => {
    if (!open) return
    const away = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', away)
    return () => document.removeEventListener('mousedown', away)
  }, [open])

  return (
    <div ref={root} className="dd" data-open={open} onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}>
      <button
        type="button"
        className={`flex items-center gap-1 rounded-lg px-3.5 py-2 transition ${active ? 'bg-surface2 text-ink' : 'text-soft hover:text-ink'}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        About <Icon name="chevron" className="dd-chevron size-4" />
      </button>
      <div className="dd-list min-w-[12rem]" role="menu">
        {ABOUT_LINKS.map(([href, label]) => (
          <Link key={href} to={href} role="menuitem" className="dd-opt" onClick={() => setOpen(false)}>
            <span>{label}</span>
          </Link>
        ))}
      </div>
    </div>
  )
}

function Nav() {
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <nav className="flex h-16 items-center justify-between" aria-label="Main">
          <Link to="/" className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-tight">
            <Logo />
            <span className="whitespace-nowrap">Resolve UK</span>
          </Link>
          <div className="hidden items-center gap-1 whitespace-nowrap text-sm font-semibold xl:flex">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
            <Link to="/#how" className="rounded-lg px-3.5 py-2 text-soft transition hover:text-ink">
              How it works
            </Link>
            <NavLink to="/reports" className={linkClass}>
              Reported problems
            </NavLink>
            <NavLink to="/community" className={linkClass}>
              Community
            </NavLink>
            <NavLink to="/commercial" className={linkClass}>
              Commercial
            </NavLink>
            <AboutMenu />
          </div>
          <div className="flex items-center gap-2">
            <Link className="icon-btn hidden sm:inline-flex" to="/account" aria-label="Your account">
              <Icon name="user" />
            </Link>
            <button className="icon-btn" type="button" onClick={toggleTheme} aria-label="Switch between light and dark mode">
              <span className="dark:hidden">
                <Icon name="moon" />
              </span>
              <span className="hidden dark:block">
                <Icon name="sun" />
              </span>
            </button>
            <Link className="btn btn-primary btn-sm hidden sm:inline-flex" to="/report">
              Report a problem <Icon name="arrow" className="size-4" />
            </Link>
            <button className="icon-btn xl:hidden" type="button" aria-expanded={open} aria-controls="mobile-menu" aria-label={open ? 'Close menu' : 'Open menu'} onClick={() => setOpen((o) => !o)}>
              <Icon name={open ? 'x' : 'menu'} />
            </button>
          </div>
        </nav>
        {open && (
          <div id="mobile-menu" className="max-h-[calc(100svh-4rem)] overflow-y-auto border-t border-line py-3 xl:hidden">
            <div className="grid gap-1 text-base font-semibold">
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/">
                Home
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/#how">
                How it works
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/reports">
                Reported problems
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/community">
                Community
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/commercial">
                Commercial
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/about">
                About
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/why">
                Why this matters
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/get-involved">
                Get involved
              </Link>
              <Link className="rounded-lg px-4 py-3 hover:bg-surface2" to="/account">
                Your account
              </Link>
              <Link className="btn btn-primary mt-1" to="/report">
                Report a problem
              </Link>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <Logo />
            <span>Resolve UK</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-soft">
            See it, report it, and follow it through to whoever actually resolves it. An early prototype.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Explore</p>
          <ul className="mt-3 space-y-2 text-soft">
            <li>
              <Link className="hover:text-ink" to="/report">
                Report a problem
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/reports">
                Reported problems
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/#how">
                How it works
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/about">
                About
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/why">
                Why this matters
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/get-involved">
                Get involved
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Resolution network</p>
          <ul className="mt-3 space-y-2 text-soft">
            <li>
              <Link className="hover:text-ink" to="/community">
                Community route
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/commercial">
                Commercial route
              </Link>
            </li>
            <li>
              <Link className="hover:text-ink" to="/account">
                Your account
              </Link>
            </li>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">For councils</p>
          <ul className="mt-3 space-y-2 text-soft">
            <li>
              <Link className="hover:text-ink" to="/staff">
                Staff sign-in
              </Link>
            </li>
          </ul>
          <p className="mt-6 text-xs text-soft">Photo credits: being confirmed.</p>
        </div>
      </div>
    </footer>
  )
}

export function SiteShell() {
  const { pathname, hash } = useLocation()
  // Move to the top on a new page, or to the section named in the address (like /#how).
  useEffect(() => {
    if (hash) {
      document.getElementById(hash.slice(1))?.scrollIntoView()
    } else {
      window.scrollTo(0, 0)
    }
  }, [pathname, hash])

  return (
    <>
      <Nav />
      <Outlet />
      <Footer />
    </>
  )
}

// A soft picture behind the working pages, so they feel part of the same place as the landing page.
export function PageBackdrop() {
  return (
    <>
      <div className="page-bg fixed inset-0 -z-20" />
      <div className="fixed inset-0 -z-10" style={{ background: 'linear-gradient(0deg,var(--c-bg) 8%,color-mix(in oklab,var(--c-bg) 88%,transparent))' }} />
    </>
  )
}
