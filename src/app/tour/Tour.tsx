import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { gsap, reducedMotion } from '../../lib/gsap'
import { useAppSession } from '../session'
import { findTour, tourForRoute, type Tour } from './steps'

// Guided tours (coach marks), modelled on Fico's: the screen dims except a spotlight around one
// part of the page, with a speech bubble and a bobbing arrow pointing at it; Next and Back glide
// the spotlight from part to part. Clicks on the dimmed page are swallowed while it is open.
// Escape or Skip ends it; the arrow keys step through it.
//
// When tours run (what the user asked for): in the demo, a page's tour starts by itself the first
// time that page is opened in the demo session. With a real account nothing starts by itself;
// tours only run from "How Resolve works" (/app/tutorial).

export const TOURS_SEEN = 'resolve.toursSeen'

function seen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(TOURS_SEEN) || '[]') as string[]
  } catch {
    return []
  }
}
function markSeen(id: string) {
  try {
    localStorage.setItem(TOURS_SEEN, JSON.stringify([...new Set([...seen(), id])]))
  } catch {
    // storage blocked: it may show again next visit
  }
}

interface TourCtx {
  startTour: (id: string) => void
  running: boolean
}
const Ctx = createContext<TourCtx>({ startTour: () => {}, running: false })
export const useTour = () => useContext(Ctx)

/** The first element matching the selector that is actually on screen. */
function find(selector: string): HTMLElement | null {
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden') return el
  }
  return null
}

/** The screen area a part can be lit in: below the sticky header and above the phone's tab bar,
 *  unless the part is itself in the header or the tab bar. */
function room(el: HTMLElement): { lo: number; hi: number } {
  const vh = window.innerHeight
  const header = document.querySelector<HTMLElement>('header.site-header')
  const nav = document.querySelector<HTMLElement>('.app-bottom-nav')
  const inBars = !!(header?.contains(el) || nav?.contains(el))
  if (inBars) return { lo: 8, hi: vh - 8 }
  const hb = header ? header.getBoundingClientRect().bottom : 0
  const nr = nav?.getBoundingClientRect()
  const nt = nr && nr.height > 0 && nr.top < vh ? nr.top : vh
  return { lo: Math.max(8, hb + 4), hi: nt - 8 }
}

/** Where to scroll so the part and its note both fit; null when it is already fine or can't move. */
function scrollTarget(el: HTMLElement, bubbleH: number): number | null {
  const { lo, hi } = room(el)
  if (lo <= 8 && hi >= window.innerHeight - 8) return null // in the header or tab bar: fixed in place
  const r = el.getBoundingClientRect()
  const need = r.height + 16 + 18 + bubbleH
  const avail = hi - lo
  if (need <= avail) {
    if (r.top >= lo + 8 && r.top + need <= hi) return null
    return Math.max(0, window.scrollY + r.top - lo - 8 - (avail - need) / 2)
  }
  // Taller than the room: put its top just under the header.
  if (Math.abs(r.top - (lo + 8)) < 6) return null
  return Math.max(0, window.scrollY + r.top - lo - 8)
}

/** Resolves once the page has stopped scrolling (or after 1.5s). */
function settled(): Promise<void> {
  return new Promise((done) => {
    const start = performance.now()
    let last = -1
    let same = 0
    const tick = () => {
      const y = window.scrollY
      same = y === last ? same + 1 : 0
      last = y
      if (same >= 4 || performance.now() - start > 1500) done()
      else requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

async function waitFor(selector: string, ms = 7000): Promise<boolean> {
  const end = Date.now() + ms
  while (Date.now() < end) {
    if (find(selector)) return true
    await new Promise((r) => setTimeout(r, 150))
  }
  return false
}

export function TourProvider({ children }: { children: ReactNode }) {
  const s = useAppSession()
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const [tour, setTour] = useState<Tour | null>(null)
  const pending = useRef<string | null>(null)

  const run = useCallback(async (t: Tour) => {
    if (!(await waitFor(t.ready))) return
    await new Promise((r) => setTimeout(r, 900)) // let the page's own entrance finish first
    markSeen(t.id)
    setTour(t)
  }, [])

  // From "How Resolve works": open the tour's page, then start it there.
  const startTour = useCallback(
    (id: string) => {
      const t = findTour(id)
      if (!t) return
      if (pathname === t.route) void run(t)
      else {
        pending.current = id
        navigate(t.route)
      }
    },
    [navigate, pathname, run],
  )

  useEffect(() => {
    // A tour asked for from another page starts once we arrive.
    if (pending.current) {
      const t = findTour(pending.current)
      pending.current = null
      if (t && t.route === pathname) void run(t)
      return
    }
    // Demo only: the first time each page is opened in this demo session.
    if (!s.demo || tour) return
    const t = tourForRoute(pathname)
    if (!t || seen().includes(t.id) || (t.roles && !t.roles.includes(s.role))) return
    void run(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname, s.demo, s.role])

  const value = useMemo(() => ({ startTour, running: tour !== null }), [startTour, tour])
  return (
    <Ctx.Provider value={value}>
      {children}
      {tour && <TourOverlay key={tour.id} tour={tour} onClose={() => setTour(null)} />}
    </Ctx.Provider>
  )
}

function TourOverlay({ tour, onClose }: { tour: Tour; onClose: () => void }) {
  const [i, setI] = useState(0)
  const spot = useRef<HTMLDivElement>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const arrow = useRef<HTMLDivElement>(null)
  const nextBtn = useRef<HTMLButtonElement>(null)
  const target = useRef<HTMLElement | null>(null)
  const still = reducedMotion()

  // Steps whose part is on screen right now (plus the centred ones).
  const steps = useMemo(() => tour.steps.filter((st) => st.target === null || find(st.target)), [tour])
  const step = steps[Math.min(i, steps.length - 1)]
  const last = i >= steps.length - 1

  // While the tour itself is scrolling the page to the next part, the spotlight waits and then
  // glides once; when the person scrolls, it follows instantly.
  const autoScrolling = useRef(false)

  const place = useCallback(
    (animate: boolean) => {
      const sp = spot.current
      const bu = bubble.current
      const ar = arrow.current
      if (!sp || !bu || !ar) return
      const vw = window.innerWidth
      const vh = window.innerHeight
      // overwrite: a newer placement always replaces one still gliding, so the spotlight can
      // never end up where the part used to be before the page scrolled.
      const d = animate && !still ? 0.45 : 0
      const tw = { duration: d, ease: 'power3.inOut', overwrite: true }
      const el = target.current
      const bw = Math.min(360, vw - 24)
      if (!el) {
        gsap.to(sp, { left: vw / 2, top: vh / 2, width: 0, height: 0, ...tw })
        gsap.to(bu, { left: (vw - bw) / 2, top: Math.max(16, vh / 2 - bu.offsetHeight / 2), width: bw, ...tw })
        gsap.set(ar, { autoAlpha: 0 })
        return
      }
      const r = el.getBoundingClientRect()
      const { lo, hi } = room(el)
      const pad = 8
      const gap = 18
      const bh = bu.offsetHeight
      // Only the part of it that is on screen between the header and the tab bar is lit, so a tall
      // part (the map, a long list) never gets a frame running off the screen.
      let top = Math.max(r.top, lo + pad)
      let bot = Math.min(r.bottom, hi - pad)
      if (bot - top < 24) {
        top = r.top
        bot = r.bottom
      }
      let below: boolean
      let bTop: number
      if (bot + pad + gap + bh <= hi) {
        below = true
        bTop = bot + pad + gap
      } else if (top - pad - gap - bh >= lo) {
        below = false
        bTop = top - pad - gap - bh
      } else {
        // No room above or below: the note sits at the bottom and the light shows the top of the part.
        below = true
        bTop = hi - bh
        bot = Math.max(top + 40, Math.min(bot, bTop - gap - pad))
      }
      const sl = Math.max(4, r.left - pad)
      const sr = Math.min(vw - 4, r.right + pad)
      gsap.to(sp, { left: sl, top: top - pad, width: sr - sl, height: bot - top + pad * 2, ...tw })
      const left = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), vw - bw - 12)
      gsap.to(bu, { left, top: bTop, width: bw, ...tw })
      const ax = Math.min(Math.max(left + 20, (sl + sr) / 2), left + bw - 20)
      gsap.set(ar, { autoAlpha: 1, left: ax - 9, top: below ? bTop - 14 : bTop + bh, rotation: below ? 0 : 180 })
    },
    [still],
  )

  // A new step: bring its part into view (clear of the header and the phone's tab bar), wait for
  // the scroll to actually finish (phones scroll at their own pace), then glide.
  useLayoutEffect(() => {
    if (!step) return
    target.current = step.target ? find(step.target) : null
    const el = target.current
    let cancelled = false
    const want = el ? scrollTarget(el, bubble.current?.offsetHeight ?? 200) : null
    if (want !== null && Math.abs(want - window.scrollY) > 4) {
      autoScrolling.current = true
      window.scrollTo({ top: want, behavior: still ? 'auto' : 'smooth' })
      void settled().then(() => {
        autoScrolling.current = false
        if (!cancelled) place(true)
      })
    } else place(true)
    nextBtn.current?.focus({ preventScroll: true })
    if (bubble.current && !still) gsap.fromTo(bubble.current.querySelector('.tour-text'), { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out', delay: 0.15 })
    return () => {
      cancelled = true
      autoScrolling.current = false
    }
  }, [step, place, still])

  // Follow the page as it scrolls or the window changes size; bob the arrow; fade in.
  useEffect(() => {
    const follow = () => {
      if (!autoScrolling.current) place(false)
    }
    window.addEventListener('scroll', follow, { passive: true })
    window.addEventListener('resize', follow)
    const bob = still ? null : gsap.to(arrow.current, { y: -6, duration: 0.6, ease: 'sine.inOut', yoyo: true, repeat: -1 })
    if (!still) gsap.fromTo([spot.current, bubble.current], { opacity: 0 }, { opacity: 1, duration: 0.35 })
    return () => {
      window.removeEventListener('scroll', follow)
      window.removeEventListener('resize', follow)
      bob?.kill()
    }
  }, [place, still])

  const go = useCallback((n: number) => (n >= steps.length ? onClose() : setI(Math.max(0, n))), [steps.length, onClose])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      else if (e.key === 'ArrowRight') go(i + 1)
      else if (e.key === 'ArrowLeft') go(i - 1)
    }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [go, i, onClose])

  if (!step) return null
  return createPortal(
    <div className="tour fixed inset-0 z-[130]" role="dialog" aria-modal="true" aria-labelledby="tour-title">
      {/* Swallows clicks on the dimmed page. */}
      <div className="absolute inset-0" onClick={(e) => e.stopPropagation()} />
      <div ref={spot} className="tour-spot" />
      <div ref={arrow} className="tour-arrow" aria-hidden="true" />
      <div ref={bubble} className="tour-bubble">
        <div className="tour-text">
          <p className="tour-count num">
            {i + 1} / {steps.length}
          </p>
          <h2 id="tour-title" className="mt-1 font-serif text-xl leading-snug">
            {step.title}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed opacity-85">{step.body}</p>
        </div>
        <div className="mt-4 flex items-center gap-2">
          {!last && (
            <button type="button" className="tour-skip mr-auto" onClick={onClose}>
              Skip
            </button>
          )}
          {last && <span className="mr-auto" />}
          {i > 0 && (
            <button type="button" className="btn btn-sm tour-back" onClick={() => go(i - 1)}>
              Back
            </button>
          )}
          <button ref={nextBtn} type="button" className="btn btn-sm tour-next" onClick={() => go(i + 1)}>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
