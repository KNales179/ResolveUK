import { useId, useLayoutEffect, useRef, useState } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'
import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from './logoPaths'

// The opening animation: the logo arrives, the name and tagline follow, then the splash hands off
// to the page underneath. Once per browser session, on the first page you land on. A tap, click or
// any key skips straight to the hand-off. Nothing shows for anyone who asked for less motion.
//
// Three variants, played in turn across visits (the next one is remembered per device):
//   pindrop — the pin falls in, lands with map-style pings, the mark opens out from it, and the
//             splash closes in on the pin to reveal the page
//   draw    — a pen traces every part, colour rises up through the letter, the pin pops in on top
//   path    — a wide stroke lays the R down from the foot like a route, the leaves open, the pin lands
type Variant = 'pindrop' | 'draw' | 'path'
const VARIANTS: Variant[] = ['pindrop', 'draw', 'path']
const SEEN_KEY = 'resolve.introSeen'
const NEXT_KEY = 'resolve.introNext'

const PIN_TIP = '76.5 91'
const LR_BASE = '182 223'
const LL_BASE = '59 223'
// The R's spine (foot -> leg -> bowl -> top bar -> stem), used as a wide brush for "path".
const SPINE = 'M 16 236 C 20 190 42 160 78 140 C 112 121 150 106 150 66 C 150 32 126 14 96 14 L 18 14 L 18 150'

const store = (k: string, v?: string, session = false) => {
  try {
    const s = session ? sessionStorage : localStorage
    if (v === undefined) return s.getItem(k)
    s.setItem(k, v)
  } catch {
    return null
  }
  return null
}

// Decided once per page load, at module level: React's development mode runs component setup twice
// on purpose, which would otherwise advance the rotation twice and mark the intro "seen" before it
// ever played.
let decided: Variant | null | undefined
function pickVariant(): Variant | null {
  if (decided !== undefined) return decided
  if (reducedMotion() || store(SEEN_KEY, undefined, true)) return (decided = null)
  const i = Number(store(NEXT_KEY)) || 0
  decided = VARIANTS[((i % VARIANTS.length) + VARIANTS.length) % VARIANTS.length]
  store(SEEN_KEY, '1', true)
  store(NEXT_KEY, String((i + 1) % VARIANTS.length))
  return decided
}

export function IntroSplash() {
  const [variant] = useState(pickVariant)
  const [done, setDone] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const id = useId().replace(/:/g, '')

  // A layout effect, so the starting positions are applied before the browser first paints the
  // splash — otherwise the finished logo flashes up for a moment before the animation begins.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!variant || !root) return
    const one = <T extends Element>(s: string) => root.querySelector<T>(s)!
    const pin = one<SVGPathElement>('.i-pin')
    // Any tap, click or key jumps straight to the hand-off. (A function declaration, so release()
    // below can refer to it before the timeline it seeks exists.)
    function skip() {
      if (tl.time() < tl.labels.out) tl.seek('out')
    }
    const leafL = one<SVGPathElement>('.i-leafL'), leafR = one<SVGPathElement>('.i-leafR')
    const pings = Array.from(root.querySelectorAll<SVGEllipseElement>('.i-ping'))
    const outlines = Array.from(root.querySelectorAll<SVGPathElement>('.i-o'))
    const letters = root.querySelectorAll('.i-word span'), tag = one('.i-tag'), glow = one('.i-glow')
    const wReveal = one('.i-w-reveal'), wLevel = one('.i-w-level'), wBrush = one('.i-w-brush')
    const revealC = one('.i-revealC'), levelR = one('.i-levelR'), levelLine = one('.i-levelLine')
    const brush = one<SVGPathElement>('.i-brush'), glint = one('.i-glint')

    const prevOverflow = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    gsap.set(pin, { svgOrigin: PIN_TIP, smoothOrigin: false })

    // Runs when the intro finishes AND on cleanup: the component stays mounted (it just renders
    // nothing once done), so cleanup alone would leave the page unable to scroll.
    let released = false
    const release = () => {
      if (released) return
      released = true
      document.documentElement.style.overflow = prevOverflow
      window.removeEventListener('pointerdown', skip)
      window.removeEventListener('keydown', skip)
    }

    // Starting state, applied immediately (not as timeline steps, which only take effect on the
    // timeline's first tick).
    gsap.set([...outlines, ...pings, levelLine, glint], { autoAlpha: 0 })
    gsap.set(letters, { autoAlpha: 0, y: 10 })
    gsap.set(tag, { autoAlpha: 0, y: 8 })
    gsap.set(glow, { autoAlpha: 0, scale: 0.6 })

    const tl = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' }, onComplete: () => { release(); setDone(true) } })
    tl.to(glow, { autoAlpha: 1, scale: 1, duration: 1, ease: 'sine.out' }, 0)

    const pingAt = (at: number) =>
      pings.forEach((e, i) => {
        tl.set(e, { autoAlpha: 0.9, attr: { rx: 6, ry: 2.2 } }, at + i * 0.18)
          .to(e, { autoAlpha: 0, attr: { rx: 46, ry: 15 }, duration: 0.8, ease: 'power2.out' }, at + i * 0.18)
      })
    const land = (at: number) =>
      tl.to(pin, { scaleY: 0.8, scaleX: 1.14, duration: 0.08, ease: 'power1.out' }, at)
        .to(pin, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' }, at + 0.08)
    const words = (at: number, typed = false) =>
      tl.to(letters, typed ? { autoAlpha: 1, y: 0, duration: 0.01, stagger: 0.06 } : { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.45 }, at)
        .to(tag, { autoAlpha: 1, y: 0, duration: 0.45 }, at + 0.4)

    if (variant === 'pindrop') {
      gsap.set(wReveal, { attr: { 'clip-path': `url(#${id}-reveal)` } })
      gsap.set(revealC, { attr: { r: 0 } })
      gsap.set(pin, { y: -190, scale: 1.9, autoAlpha: 0 })
      tl.to(pin, { autoAlpha: 1, duration: 0.12 }, 0.1)
        .to(pin, { y: 0, scale: 1, duration: 0.55, ease: 'power2.in' }, 0.1)
      land(0.65)
      pingAt(0.68)
      tl.to(revealC, { attr: { r: 330 }, duration: 0.95, ease: 'power2.inOut' }, 0.9)
        .to(leafL, { keyframes: [{ rotation: -7, duration: 0.22 }, { rotation: 4, duration: 0.26 }, { rotation: 0, duration: 0.3 }], svgOrigin: LL_BASE, ease: 'sine.inOut' }, 1.45)
        .to(leafR, { keyframes: [{ rotation: 6, duration: 0.22 }, { rotation: -4, duration: 0.26 }, { rotation: 0, duration: 0.3 }], svgOrigin: LR_BASE, ease: 'sine.inOut' }, 1.52)
      words(1.5)
      // closes in on wherever the pin is on screen (a circle from a circle — GSAP can't blend the
      // overlay's starting rectangle clip into a circle)
      const at = () => {
        const r = pin.getBoundingClientRect()
        return `${Math.round(r.left + r.width / 2)}px ${Math.round(r.top + r.height * 0.4)}px`
      }
      tl.addLabel('out', 2.55).fromTo(
        root,
        { clipPath: () => `circle(150% at ${at()})` },
        { clipPath: () => `circle(0% at ${at()})`, duration: 0.75, ease: 'power2.in', immediateRender: false },
        'out',
      )
    }

    if (variant === 'draw') {
      gsap.set(wLevel, { attr: { 'clip-path': `url(#${id}-level)` } })
      gsap.set(levelR, { attr: { y: 223 } })
      gsap.set(pin, { autoAlpha: 0, scale: 0.4 })
      outlines.forEach((o) => {
        const len = o.getTotalLength()
        gsap.set(o, { autoAlpha: 1, strokeDasharray: len, strokeDashoffset: len })
      })
      tl.to(outlines, { strokeDashoffset: 0, duration: 1.05, ease: 'power1.inOut', stagger: 0.1 }, 0.1)
        .to(levelLine, { autoAlpha: 0.9, duration: 0.2 }, 0.95)
        .to(levelR, { attr: { y: -70 }, duration: 0.95, ease: 'power1.inOut' }, 0.95)
        .to(levelLine, { y: -293, duration: 0.95, ease: 'power1.inOut' }, 0.95)
        .to(levelLine, { autoAlpha: 0, duration: 0.2 }, 1.8)
        .to(pin, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.6)' }, 1.7)
        .to(outlines, { autoAlpha: 0, duration: 0.4 }, 1.75)
      words(1.8, true)
      tl.addLabel('out', 2.75).to(root, { yPercent: -100, duration: 0.75, ease: 'power3.inOut' }, 'out')
    }

    if (variant === 'path') {
      const len = brush.getTotalLength()
      gsap.set(wBrush, { attr: { mask: `url(#${id}-brush)` } })
      gsap.set(brush, { strokeDasharray: len, strokeDashoffset: len })
      gsap.set(leafL, { scale: 0, svgOrigin: LL_BASE })
      gsap.set(leafR, { scale: 0, svgOrigin: LR_BASE })
      gsap.set(pin, { y: -120, autoAlpha: 0 })
      tl.to(brush, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.1)
        .set(wBrush, { attr: { mask: 'none' } }, 1.32)
        .to(leafL, { scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.0)
        .to(leafR, { scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.1)
        .to(pin, { y: 0, autoAlpha: 1, duration: 0.38, ease: 'power2.in' }, 1.25)
      land(1.63)
      pingAt(1.66)
      tl.to(glint, { autoAlpha: 1, duration: 0.05 }, 1.85)
        .to(glint, { x: 360, duration: 0.7, ease: 'power2.inOut' }, 1.85)
        .to(glint, { autoAlpha: 0, duration: 0.1 }, 2.5)
      words(1.7)
      tl.addLabel('out', 2.75).to(root, { clipPath: 'inset(0% 0% 0% 100%)', duration: 0.75, ease: 'power3.inOut' }, 'out')
    }

    window.addEventListener('pointerdown', skip)
    window.addEventListener('keydown', skip)
    // Start once the page has painted twice: if loading keeps the browser busy, the animation
    // waits rather than starting and then jumping ahead to catch up.
    let raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => tl.play())
    })
    return () => {
      cancelAnimationFrame(raf)
      tl.kill()
      release()
    }
  }, [variant, id])

  if (!variant || done) return null

  return (
    <div
      ref={rootRef}
      className="fixed inset-0 z-[200] grid place-content-center justify-items-center gap-2 bg-bg"
      style={{ clipPath: 'inset(0% 0% 0% 0%)' }}
      aria-hidden="true"
    >
      <div className="i-glow pointer-events-none absolute left-1/2 top-[42%] aspect-square w-[min(70vw,520px)] -translate-x-1/2 -translate-y-1/2 rounded-full blur-md" style={{ background: 'radial-gradient(circle, color-mix(in oklab, var(--c-accent) 38%, transparent), transparent 65%)' }} />
      <svg className="relative w-[min(42vw,210px)] overflow-visible" viewBox="-14 -16 226 255">
        <defs>
          <clipPath id={`${id}-reveal`}><circle className="i-revealC" cx="76.5" cy="61.5" r="400" /></clipPath>
          <clipPath id={`${id}-level`}><rect className="i-levelR" x="-60" y="-80" width="420" height="420" /></clipPath>
          <clipPath id={`${id}-shape`}><path d={R_PATH} /><path d={LEAF_RIGHT_PATH} /><path d={LEAF_LEFT_PATH} /><path d={PIN_PATH} /></clipPath>
          <mask id={`${id}-brush`} maskUnits="userSpaceOnUse" x="-60" y="-80" width="420" height="420">
            <path className="i-brush" d={SPINE} fill="none" stroke="#fff" strokeWidth="74" strokeLinecap="round" strokeLinejoin="round" />
          </mask>
          <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" /><stop offset=".5" stopColor="#fff" stopOpacity=".7" /><stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} className="i-ping" cx="76.5" cy="91" rx="6" ry="2.2" fill="none" stroke="var(--c-accent)" strokeWidth="2.5" />
        ))}
        <g className="i-w-reveal">
          <g className="i-w-level">
            <g className="i-w-brush"><path className="i-R" d={R_PATH} fill="var(--c-logo-mark)" /></g>
            <path className="i-leafL" d={LEAF_LEFT_PATH} fill="var(--c-accent-display)" />
            <path className="i-leafR" d={LEAF_RIGHT_PATH} fill="var(--c-accent)" />
          </g>
        </g>
        <path className="i-pin" d={PIN_PATH} fill="var(--c-logo-mark)" fillRule="evenodd" />
        <line className="i-levelLine" x1="-10" y1="223" x2="210" y2="223" stroke="#fff" strokeWidth="2.5" clipPath={`url(#${id}-shape)`} />
        <g fill="none" stroke="var(--c-accent)" strokeWidth="2.4" strokeLinejoin="round">
          {[R_PATH, LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH].map((d, i) => (
            <path key={i} className="i-o" d={d} />
          ))}
        </g>
        <g clipPath={`url(#${id}-shape)`}>
          <rect className="i-glint" x="-60" y="-80" width="70" height="420" fill={`url(#${id}-glint)`} transform="skewX(-18)" />
        </g>
      </svg>
      <div className="i-word relative mt-3 flex text-[1.6rem] font-extrabold tracking-[0.16em] text-ink">
        {'RESOLVE'.split('').map((c, i) => (
          <span key={i} className="inline-block">{c}</span>
        ))}
      </div>
      <div className="i-tag relative text-[0.62rem] font-semibold tracking-[0.24em] text-soft">SEE IT. REPORT IT. RESOLVE IT.</div>
    </div>
  )
}
