import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'
import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from '../../components/site/logoPaths'

// The sign-in panel's logo and sample report, animated together on a loop. Each round plays one of
// the site's three opening animations (pindrop, draw, path, in turn): the logo opens, rests for a
// moment, then closes again in that animation's own way, and the next one begins. The sample card
// moves with it: Reported as the logo arrives, In progress as it opens out, Cleared while it
// rests, Verified as it closes.
// For anyone who prefers less motion, both stay still (finished logo, a verified report).
type Variant = 'pindrop' | 'draw' | 'path'
const VARIANTS: Variant[] = ['pindrop', 'draw', 'path']
type Stage = 0 | 1 | 2 | 3

const PIN_TIP = '76.5 91'
const LR_BASE = '182 223'
const LL_BASE = '59 223'
const SPINE = 'M 16 236 C 20 190 42 160 78 140 C 112 121 150 106 150 66 C 150 32 126 14 96 14 L 18 14 L 18 150'

// Theme-aware: these read the showcase panel's light/dark tokens (--sc-* in index.css).
const INK = 'var(--sc-ink)'
const MINT = 'var(--sc-mint)'
const SAGE = 'var(--sc-sage)'

export function ShowcaseMark({ children }: { children?: ReactNode }) {
  const [still] = useState(reducedMotion)
  const [round, setRound] = useState(0)
  const [stage, setStage] = useState<Stage>(still ? 3 : 0)
  const root = useRef<SVGSVGElement>(null)
  const id = useId().replace(/:/g, '')
  const variant = VARIANTS[round % VARIANTS.length]

  useLayoutEffect(() => {
    const svg = root.current
    if (still || !svg) return
    const one = <T extends Element>(s: string) => svg.querySelector<T>(s)!
    const pin = one<SVGPathElement>('.m-pin')
    const leafL = one<SVGPathElement>('.m-leafL'), leafR = one<SVGPathElement>('.m-leafR')
    const pings = Array.from(svg.querySelectorAll<SVGEllipseElement>('.m-ping'))
    const outlines = Array.from(svg.querySelectorAll<SVGPathElement>('.m-o'))
    const wReveal = one('.m-w-reveal'), wLevel = one('.m-w-level'), wBrush = one('.m-w-brush')
    const revealC = one('.m-revealC'), levelR = one('.m-levelR'), levelLine = one('.m-levelLine')
    const brush = one<SVGPathElement>('.m-brush'), glint = one('.m-glint')

    gsap.set(pin, { svgOrigin: PIN_TIP, smoothOrigin: false })
    gsap.set([...outlines, ...pings, levelLine, glint], { autoAlpha: 0 })

    const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, onComplete: () => setRound((r) => r + 1) })
    const at = (st: Stage, t: number) => tl.call(() => setStage(st), [], t)
    at(0, 0)

    const pingAt = (t: number) =>
      pings.forEach((e, i) => {
        tl.set(e, { autoAlpha: 0.9, attr: { rx: 6, ry: 2.2 } }, t + i * 0.18).to(e, { autoAlpha: 0, attr: { rx: 46, ry: 15 }, duration: 0.8, ease: 'power2.out' }, t + i * 0.18)
      })
    const land = (t: number) =>
      tl.to(pin, { scaleY: 0.8, scaleX: 1.14, duration: 0.08, ease: 'power1.out' }, t).to(pin, { scaleY: 1, scaleX: 1, duration: 0.45, ease: 'elastic.out(1, 0.45)' }, t + 0.08)
    // The rest between opening and closing: the leaves sway in a breeze and the pin pings once.
    // Returns the time the closing starts.
    const idle = (t: number) => {
      at(2, t)
      tl.to(leafL, { keyframes: [{ rotation: -5, duration: 0.7 }, { rotation: 3, duration: 0.8 }, { rotation: 0, duration: 0.7 }], svgOrigin: LL_BASE, ease: 'sine.inOut' }, t + 0.3)
      tl.to(leafR, { keyframes: [{ rotation: 4, duration: 0.7 }, { rotation: -3, duration: 0.8 }, { rotation: 0, duration: 0.7 }], svgOrigin: LR_BASE, ease: 'sine.inOut' }, t + 0.45)
      pingAt(t + 1.2)
      return t + 3.2
    }
    // A short, empty beat after closing, before the next round starts.
    const rest = () => tl.to({}, { duration: 0.6 })

    // Every closing is its opening played back in its own terms, quick and clean, and it stays
    // inside the mark's own outline: nothing flies off across the panel.
    if (variant === 'pindrop') {
      gsap.set(wReveal, { attr: { 'clip-path': `url(#${id}-reveal)` } })
      gsap.set(revealC, { attr: { r: 0 } })
      gsap.set(pin, { y: -150, autoAlpha: 0 })
      tl.to(pin, { autoAlpha: 1, duration: 0.15 }, 0.1).to(pin, { y: 0, duration: 0.55, ease: 'power2.in' }, 0.1)
      land(0.65)
      pingAt(0.68)
      at(1, 0.9)
      tl.to(revealC, { attr: { r: 330 }, duration: 0.95, ease: 'power2.inOut' }, 0.9)
      const out = idle(2.1)
      // Closing: the mark folds back into the pin, then the pin sinks into a last ping and is gone.
      at(3, out)
      tl.to(revealC, { attr: { r: 0 }, duration: 0.9, ease: 'power2.inOut' }, out)
      pingAt(out + 0.95)
      tl.to(pin, { scaleY: 0.82, scaleX: 1.12, duration: 0.12, ease: 'power1.out' }, out + 0.9)
        .to(pin, { scale: 0, autoAlpha: 0, duration: 0.4, ease: 'back.in(1.8)' }, out + 1.02)
      rest()
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
      at(1, 0.95)
      tl.to(levelLine, { autoAlpha: 0.9, duration: 0.2 }, 0.95)
        .to(levelR, { attr: { y: -70 }, duration: 0.95, ease: 'power1.inOut' }, 0.95)
        .to(levelLine, { y: -293, duration: 0.95, ease: 'power1.inOut' }, 0.95)
        .to(levelLine, { autoAlpha: 0, duration: 0.2 }, 1.8)
        .to(pin, { autoAlpha: 1, scale: 1, duration: 0.5, ease: 'back.out(2.6)' }, 1.7)
        .to(outlines, { autoAlpha: 0, duration: 0.4 }, 1.75)
      const out = idle(2.4)
      // Closing: the outline comes back, the colour drains down out of it, then the pen lifts
      // each line back off the way it was drawn.
      at(3, out)
      tl.to(pin, { autoAlpha: 0, scale: 0.4, duration: 0.3, ease: 'back.in(2)' }, out)
        .to(outlines, { autoAlpha: 1, duration: 0.3 }, out)
        .to(levelLine, { autoAlpha: 0.9, duration: 0.15 }, out + 0.25)
        .to(levelR, { attr: { y: 223 }, duration: 0.9, ease: 'power1.inOut' }, out + 0.25)
        .to(levelLine, { y: 0, duration: 0.9, ease: 'power1.inOut' }, out + 0.25)
        .to(levelLine, { autoAlpha: 0, duration: 0.15 }, out + 1.05)
      outlines.forEach((o, i) => tl.to(o, { strokeDashoffset: o.getTotalLength(), duration: 0.8, ease: 'power1.inOut' }, out + 1.1 + (outlines.length - 1 - i) * 0.08))
      rest()
    }

    if (variant === 'path') {
      const len = brush.getTotalLength()
      gsap.set(wBrush, { attr: { mask: `url(#${id}-brush)` } })
      gsap.set(brush, { strokeDasharray: `${len} ${len + 120}`, strokeDashoffset: len + 40 })
      gsap.set(leafL, { scale: 0, svgOrigin: LL_BASE })
      gsap.set(leafR, { scale: 0, svgOrigin: LR_BASE })
      gsap.set(pin, { y: -90, autoAlpha: 0 })
      tl.to(brush, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' }, 0.1)
        .set(wBrush, { attr: { mask: 'none' } }, 1.32)
        .to(leafL, { scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.0)
        .to(leafR, { scale: 1, duration: 0.6, ease: 'back.out(2)' }, 1.1)
      at(1, 1.0)
      tl.to(pin, { autoAlpha: 1, duration: 0.15 }, 1.25).to(pin, { y: 0, duration: 0.38, ease: 'power2.in' }, 1.25)
      land(1.63)
      pingAt(1.66)
      tl.to(glint, { autoAlpha: 1, duration: 0.05 }, 1.85).to(glint, { x: 360, duration: 0.7, ease: 'power2.inOut' }, 1.85).to(glint, { autoAlpha: 0, duration: 0.1 }, 2.5)
      const out = idle(2.6)
      // Closing: the pin fades off the route, the leaves fold shut, and the route is rolled back
      // up from the top of the R to its foot, the reverse of how it was laid down.
      at(3, out)
      tl.to(pin, { scale: 0, autoAlpha: 0, duration: 0.35, ease: 'back.in(2)' }, out)
        .to(leafR, { scale: 0, duration: 0.45, ease: 'back.in(1.6)' }, out + 0.15)
        .to(leafL, { scale: 0, duration: 0.45, ease: 'back.in(1.6)' }, out + 0.25)
        .set(wBrush, { attr: { mask: `url(#${id}-brush)` } }, out + 0.5)
        .to(brush, { strokeDashoffset: len + 40, duration: 1.1, ease: 'power2.inOut' }, out + 0.5)
      rest()
    }

    return () => {
      tl.kill()
    }
  }, [variant, round, id, still])

  return (
    <>
      {/* A fresh drawing each round (key), so every animation starts from a clean slate. */}
      <div className="auth-mark relative">
      <svg key={round} ref={root} viewBox="-14 -16 226 255" className="w-40 overflow-visible" aria-hidden="true">
        <defs>
          <clipPath id={`${id}-reveal`}>
            <circle className="m-revealC" cx="76.5" cy="61.5" r="400" />
          </clipPath>
          <clipPath id={`${id}-level`}>
            <rect className="m-levelR" x="-60" y="-80" width="420" height="420" />
          </clipPath>
          <clipPath id={`${id}-shape`}>
            <path d={R_PATH} />
            <path d={LEAF_RIGHT_PATH} />
            <path d={LEAF_LEFT_PATH} />
            <path d={PIN_PATH} />
          </clipPath>
          <mask id={`${id}-brush`} maskUnits="userSpaceOnUse" x="-60" y="-80" width="420" height="420">
            <path className="m-brush" d={SPINE} fill="none" stroke="#fff" strokeWidth="74" strokeLinecap="round" strokeLinejoin="round" />
          </mask>
          <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#fff" stopOpacity="0" />
            <stop offset=".5" stopColor="#fff" stopOpacity=".7" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2].map((i) => (
          <ellipse key={i} className="m-ping" cx="76.5" cy="91" rx="6" ry="2.2" fill="none" stroke={MINT} strokeWidth="2.5" />
        ))}
        <g className="m-w-reveal">
          <g className="m-w-level">
            <g className="m-w-brush">
              <path d={R_PATH} fill={INK} />
            </g>
            <path className="m-leafL" d={LEAF_LEFT_PATH} fill={SAGE} />
            <path className="m-leafR" d={LEAF_RIGHT_PATH} fill={MINT} />
          </g>
        </g>
        <path className="m-pin" d={PIN_PATH} fill={INK} fillRule="evenodd" />
        <g clipPath={`url(#${id}-shape)`}>
          <line className="m-levelLine" x1="-10" y1="223" x2="210" y2="223" stroke="#fff" strokeWidth="2.5" />
        </g>
        <g fill="none" stroke={MINT} strokeWidth="2.4" strokeLinejoin="round">
          {[R_PATH, LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH].map((d, i) => (
            <path key={i} className="m-o" d={d} />
          ))}
        </g>
        <g clipPath={`url(#${id}-shape)`}>
          <rect className="m-glint" x="-60" y="-80" width="70" height="420" fill={`url(#${id}-glint)`} transform="skewX(-18)" />
        </g>
      </svg>
      </div>
      {children}
      <SampleCard stage={stage} />
    </>
  )
}

const STAGES: Array<{ label: string; tone: string; note: string; title: string; bars: number }> = [
  { label: 'Reported', tone: 'var(--sc-rep)', note: 'Just now', title: 'Bags dumped on Albert Terrace', bars: 1 },
  { label: 'In progress', tone: 'var(--sc-prog)', note: 'Council crew booked', title: 'Clearance booked for Albert Terrace', bars: 2 },
  { label: 'Cleared', tone: 'var(--sc-clear)', note: '2 days to fix', title: 'Bags removed from Albert Terrace', bars: 3 },
  { label: 'Verified', tone: 'var(--sc-ver)', note: 'Checked by a neighbour', title: 'Albert Terrace is clear', bars: 4 },
]

// One report moving through its stages, in step with the logo.
function SampleCard({ stage }: { stage: Stage }) {
  const s = STAGES[stage]
  return (
    <div className="auth-sample relative mt-10 w-full max-w-xs rounded-2xl p-4 text-left">
      <div key={stage} className="auth-swap">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold" style={{ color: s.tone }}>
            {stage === 3 ? '✓' : '●'} {s.label}
          </span>
          <span className="text-[var(--sc-soft)]">{s.note}</span>
        </div>
        <p className="mt-2 text-sm font-semibold text-[var(--sc-ink)]">{s.title}</p>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-1.5" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="auth-bar h-1.5 rounded-full" style={{ background: i < s.bars ? s.tone : 'var(--sc-bar-off)', transitionDelay: `${i * 90}ms` }} />
        ))}
      </div>
    </div>
  )
}
