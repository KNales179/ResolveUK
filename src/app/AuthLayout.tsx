import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useOutlet } from 'react-router-dom'
import { gsap, reducedMotion } from '../lib/gsap'
import { toggleTheme, useThemeName } from '../lib/theme'
import { drawContours } from '../lib/backdrops'
import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from '../components/site/logoPaths'
import { ShowcaseMark } from './components/ShowcaseMark'
import { Icon } from '../components/ui/Icon'
import { Backdrop } from '../components/site/Backdrop'

// Left-to-right order of the account screens, so going "forward" (sign in -> create account)
// slides one way and going back slides the other. Modelled on the Fico sign-in screens.
const ORDER: Record<string, number> = {
  '/app/forgot-password': 0,
  '/app/sign-in': 1,
  '/app/create-account': 2,
  '/app/check-email': 3,
}

const TAGLINES = [
  'See it. Report it. Resolve it.',
  'One public record for every street.',
  'From reported to verified, in the open.',
  'Better places, together.',
]

// The frame around every account screen: the form on the left; on wide screens, a deep green panel
// on the right with the Resolve mark over contour lines and a rotating line about what Resolve does.
// Moving between screens slides the card out one way and the next one in from the other.
export function AuthLayout() {
  const location = useLocation()
  const outlet = useOutlet()
  const card = useRef<HTMLDivElement>(null)
  const prev = useRef(location.pathname)

  useLayoutEffect(() => {
    const el = card.current
    if (!el || reducedMotion()) return
    const from = ORDER[prev.current] ?? 1
    const to = ORDER[location.pathname] ?? 1
    const first = prev.current === location.pathname
    prev.current = location.pathname
    const tween = first
      ? gsap.fromTo(el, { y: 18, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', clearProps: 'transform,opacity,visibility' })
      : gsap.fromTo(el, { x: (to >= from ? 1 : -1) * 28, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.4, ease: 'power3.out', clearProps: 'transform,opacity,visibility' })
    return () => {
      tween.kill()
    }
  }, [location.pathname])

  return (
    <div className="relative min-h-svh overflow-x-clip">
      <Backdrop kind="page" />
      <div className="mx-auto grid min-h-svh w-full max-w-7xl gap-8 px-4 py-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:px-8 lg:py-8">
        <section className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 text-lg font-semibold tracking-tight" aria-label="Resolve UK, back to the website">
              <svg viewBox="0 0 198 223" className="h-8 w-auto" aria-hidden="true">
                <path fill="var(--c-logo-mark)" fillRule="evenodd" d={`${R_PATH} ${PIN_PATH}`} />
                <path fill="var(--c-accent)" d={LEAF_RIGHT_PATH} />
                <path fill="var(--c-accent-display)" d={LEAF_LEFT_PATH} />
              </svg>
              Resolve UK
            </Link>
            <button type="button" className="icon-btn" aria-label="Switch light or dark" onClick={(e) => toggleTheme({ x: e.clientX, y: e.clientY })}>
              <ThemeIcon />
            </button>
          </header>

          <div className="flex flex-1 flex-col items-center justify-center py-8 lg:py-10">
            <div className="w-full max-w-md">
              <div ref={card}>{outlet}</div>
            </div>
          </div>

          <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-1 text-xs text-soft lg:justify-start">
            <span>© {new Date().getFullYear()} Resolve UK · an early prototype</span>
            <Link to="/about" className="underline underline-offset-2 hover:text-ink">
              About
            </Link>
            <Link to="/" className="underline underline-offset-2 hover:text-ink">
              Back to the website
            </Link>
          </footer>
        </section>

        <aside className="sticky top-8 hidden h-[calc(100svh-4rem)] min-h-[34rem] self-start lg:block" aria-hidden="true">
          <Showcase />
        </aside>
      </div>
    </div>
  )
}

function ThemeIcon() {
  const theme = useThemeName()
  return <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
}

function Showcase() {
  const host = useRef<HTMLDivElement>(null)
  const [line, setLine] = useState(0)

  // Contour lines across the panel, drawn once per size.
  useEffect(() => {
    const el = host.current
    if (!el) return
    const draw = () => {
      const r = el.getBoundingClientRect()
      const c = document.createElement('canvas')
      const dpr = Math.min(2, window.devicePixelRatio || 1)
      c.width = Math.round(r.width * dpr)
      c.height = Math.round(r.height * dpr)
      c.className = 'auth-contours'
      const ctx = c.getContext('2d')!
      ctx.scale(dpr, dpr)
      drawContours(ctx, r.width, r.height, '#94c690', 0.12)
      el.querySelector('canvas')?.remove()
      el.prepend(c)
    }
    draw()
    const ro = new ResizeObserver(() => draw())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    if (reducedMotion()) return
    const t = window.setInterval(() => setLine((n) => (n + 1) % TAGLINES.length), 3600)
    return () => window.clearInterval(t)
  }, [])

  return (
    <div ref={host} className="auth-showcase relative flex h-full flex-col items-center justify-center overflow-hidden rounded-[2rem] p-10 text-center">
      <ShowcaseMark>
        <p key={line} className="auth-tagline relative mt-10 font-serif text-3xl leading-snug text-[#f0f5ec]">
          {TAGLINES[line]}
        </p>
      </ShowcaseMark>
    </div>
  )
}
