import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { Icon } from '../ui/Icon'
import { toggleTheme, useThemeName } from '../../lib/theme'
import { applyBgForTheme } from '../../lib/bgPreview'
import { Logo } from './Logo'
import { CornerHover } from '../ui/CornerHover'
import { PageTransition } from './PageTransition'

// Temporary: bumped on every change, so the footer itself shows whether a refresh actually picked
// up the latest update — if it still shows the old number, the page/app didn't update.
const PROTOTYPE_VERSION = '1.4'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `nav-link rounded-lg px-3.5 py-2 transition ${isActive ? 'nav-link-active bg-surface2 text-ink' : 'text-soft hover:text-ink hover:bg-surface2/70'}`

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
        className={`nav-link flex items-center gap-1 rounded-lg px-3.5 py-2 transition ${active ? 'nav-link-active bg-surface2 text-ink' : 'text-soft hover:text-ink hover:bg-surface2/70'}`}
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
    <header className="site-header fixed inset-x-0 top-0 z-40 border-b border-line">
      <div className="mx-auto max-w-7xl px-4 sm:px-8">
        <nav className="flex h-16 items-center justify-between" aria-label="Main">
          <Link to="/" className="flex items-center gap-2.5 text-[1.05rem] font-semibold tracking-tight">
            <Logo />
            <span className="whitespace-nowrap">Resolve</span>
          </Link>
          <div className="hidden items-center gap-1 whitespace-nowrap text-sm font-semibold xl:flex">
            <NavLink to="/" end className={linkClass}>
              Home
            </NavLink>
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
            <button
              className="icon-btn"
              type="button"
              onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}
              aria-label="Switch between light and dark mode"
            >
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
    <footer className="grid-texture grid-shimmer border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 sm:px-8 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <div>
          <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight">
            <Logo />
            <span>Resolve</span>
          </Link>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-soft">
            See it, report it, and follow it through to whoever actually resolves it. An early prototype.
          </p>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Explore</p>
          <ul className="mt-3 -mx-3 space-y-1 text-soft">
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/report">
                Report a problem
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/reports">
                Reported problems
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/#how">
                How it works
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/about">
                About
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/why">
                Why this matters
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/get-involved">
                Get involved
              </Link>
            </CornerHover>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">Resolution network</p>
          <ul className="mt-3 -mx-3 space-y-1 text-soft">
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/community">
                Community route
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/commercial">
                Commercial route
              </Link>
            </CornerHover>
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/account">
                Your account
              </Link>
            </CornerHover>
          </ul>
        </div>
        <div className="text-sm">
          <p className="font-semibold">For councils</p>
          <ul className="mt-3 -mx-3 space-y-1 text-soft">
            <CornerHover as="li">
              <Link className="block px-3 py-1.5 hover:text-ink" to="/staff">
                Staff sign-in
              </Link>
            </CornerHover>
          </ul>
          <p className="mt-6 text-xs text-soft">Photo credits: being confirmed.</p>
        </div>
      </div>
      <p className="border-t border-line px-5 py-3 text-center text-[0.7rem] text-soft sm:px-8 sm:text-left">
        Prototype version {PROTOTYPE_VERSION}
      </p>
    </footer>
  )
}

// Drives the grid shimmer: on every section carrying `.grid-shimmer`, sets --spot-x/--spot-y to
// the cursor's position *local to that section* (not the viewport), so the small masked circle in
// its ::after (see .grid-shimmer in index.css) lands exactly on that section's own grid lines
// regardless of scroll position. Renders nothing itself — it only ever writes CSS custom
// properties. Throttled to one update per animation frame; skipped for reduced motion.
function CursorGlow() {
  useEffect(() => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf = 0
    const onMove = (e: MouseEvent) => {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        document.querySelectorAll<HTMLElement>('.grid-shimmer').forEach((el) => {
          const r = el.getBoundingClientRect()
          el.style.setProperty('--spot-x', `${e.clientX - r.left}px`)
          el.style.setProperty('--spot-y', `${e.clientY - r.top}px`)
        })
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mousemove', onMove)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return null
}

// TEMPORARY — part of the BgSwatchPicker comparison tool (see BgSwatchPicker.tsx and
// lib/bgPreview.ts). Delete alongside them once a background colour is picked for each theme.
// Unlike the picker itself, this is mounted on every page, so a theme toggle anywhere re-syncs
// --c-bg to that theme's remembered pick (or clears it) no matter which page you're on — without
// this, toggling theme on a page other than Home left the colour stuck on the previous theme's
// value until you navigated back to Home and the picker remounted.
function BgPreviewSync() {
  const theme = useThemeName()
  useEffect(() => {
    applyBgForTheme(theme)
  }, [theme])
  return null
}

export function SiteShell() {
  return (
    <>
      <CursorGlow />
      <BgPreviewSync />
      <Nav />
      <PageTransition />
      <Footer />
    </>
  )
}

// A soft picture behind the working pages, so they feel part of the same place as the landing
// page — absolutely positioned (not fixed) so it scrolls along with the page's own content,
// the same as the home page's hill scene backdrop. The page using this must wrap its own
// content in a `relative` element for this to size against (see each page's outer <div>).
export function PageBackdrop() {
  return (
    <>
      <div className="page-bg absolute inset-0 -z-20" />
      <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(0deg,var(--c-bg) 4%,color-mix(in oklab,var(--c-bg) 55%,transparent))' }} />
    </>
  )
}
