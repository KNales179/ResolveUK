import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'
import { LEAF_LEFT_PATH, LEAF_RIGHT_PATH, PIN_PATH, R_PATH } from './logoPaths'

const PIN_TIP = '76.5 91'
const LL_BASE = '59 223'
const LR_BASE = '182 223'

type Touch = (tl: gsap.core.Timeline, p: { pin: SVGPathElement; leafL: SVGPathElement; leafR: SVGPathElement; pings: SVGEllipseElement[] }) => void

const ping = (tl: gsap.core.Timeline, pings: SVGEllipseElement[], at: number) =>
  pings.forEach((e, i) => {
    tl.fromTo(e, { autoAlpha: 0.9, attr: { rx: 6, ry: 2.2 } }, { autoAlpha: 0, attr: { rx: 52, ry: 17 }, duration: 0.7, ease: 'power2.out' }, at + i * 0.15)
  })

const land = (tl: gsap.core.Timeline, pin: SVGPathElement, at: number) =>
  tl.to(pin, { keyframes: [{ scaleY: 0.82, scaleX: 1.12, duration: 0.07 }, { scaleY: 1, scaleX: 1, duration: 0.4, ease: 'elastic.out(1,0.45)' }] }, at)

// The three small hover moves, played in turn on successive hovers.
const TOUCHES: Touch[] = [
  // Nudge: the pin hops and pings while the leaves give a quick rustle
  (tl, { pin, leafL, leafR, pings }) => {
    tl.to(pin, { y: -26, duration: 0.22, ease: 'power2.out' }, 0)
      .to(pin, { y: 0, duration: 0.28, ease: 'power2.in' }, 0.22)
      .to(leafL, { keyframes: [{ rotation: -9, duration: 0.12 }, { rotation: 6, duration: 0.14 }, { rotation: 0, duration: 0.25 }], svgOrigin: LL_BASE }, 0.05)
      .to(leafR, { keyframes: [{ rotation: 8, duration: 0.12 }, { rotation: -5, duration: 0.14 }, { rotation: 0, duration: 0.25 }], svgOrigin: LR_BASE }, 0.1)
    land(tl, pin, 0.5)
    ping(tl, pings, 0.5)
  },
  // Breeze: the leaves sway and the pin bobs once
  (tl, { pin, leafL, leafR }) => {
    tl.to(leafL, { keyframes: [{ rotation: -10, duration: 0.45 }, { rotation: 7, duration: 0.55 }, { rotation: -3, duration: 0.45 }, { rotation: 0, duration: 0.4 }], svgOrigin: LL_BASE, ease: 'sine.inOut' }, 0)
      .to(leafR, { keyframes: [{ rotation: -8, duration: 0.5 }, { rotation: 6, duration: 0.55 }, { rotation: -2, duration: 0.45 }, { rotation: 0, duration: 0.4 }], svgOrigin: LR_BASE, ease: 'sine.inOut' }, 0.12)
      .to(pin, { keyframes: [{ y: -8, duration: 0.45 }, { y: 0, duration: 0.55 }], ease: 'sine.inOut' }, 0.2)
  },
  // Locate: the pin spins like it's finding you, then lands with a ping
  (tl, { pin, pings }) => {
    tl.to(pin, { y: -18, duration: 0.25, ease: 'power2.out' }, 0)
      .to(pin, { keyframes: [{ scaleX: -1, duration: 0.2 }, { scaleX: 1, duration: 0.2 }, { scaleX: -1, duration: 0.22 }, { scaleX: 1, duration: 0.26 }], ease: 'sine.inOut' }, 0.05)
      .to(pin, { y: 0, duration: 0.3, ease: 'power2.in' }, 0.75)
    land(tl, pin, 1.05)
    ping(tl, pings, 1.05)
  },
]

// The header logo. Hovering (or keyboard-focusing) the link it sits in plays a small move — the pin
// hops, the leaves sway, or the pin spins and lands — a different one each time, in turn. The
// finished state is always identical to <Logo>; nothing plays for anyone who asked for less motion.
export function AnimatedLogo({ className = '' }: { className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = svgRef.current
    const host = svg?.closest('a') ?? svg
    if (!svg || !host || reducedMotion()) return
    const pin = svg.querySelector<SVGPathElement>('.lg-pin')!
    const leafL = svg.querySelector<SVGPathElement>('.lg-leaf-l')!
    const leafR = svg.querySelector<SVGPathElement>('.lg-leaf-r')!
    const pings = Array.from(svg.querySelectorAll<SVGEllipseElement>('.lg-ping'))
    // The pin always pivots on its tip. Set once while it's untransformed: setting a pivot in the
    // same step as a move or scale makes GSAP bake in an offset that never goes away.
    gsap.set(pin, { svgOrigin: PIN_TIP, smoothOrigin: false })

    let next = 0
    let tl: gsap.core.Timeline | null = null
    const play = () => {
      if (tl?.isActive()) return
      tl?.kill()
      tl = gsap.timeline()
      TOUCHES[next](tl, { pin, leafL, leafR, pings })
      next = (next + 1) % TOUCHES.length
    }
    host.addEventListener('mouseenter', play)
    host.addEventListener('focus', play)
    return () => {
      host.removeEventListener('mouseenter', play)
      host.removeEventListener('focus', play)
      tl?.kill()
    }
  }, [])

  return (
    <svg ref={svgRef} viewBox="0 0 198 223" width="198" height="223" className={`h-7 w-auto shrink-0 overflow-visible ${className}`} role="img" aria-label="Resolve">
      <ellipse className="lg-ping" cx="76.5" cy="91" rx="6" ry="2.2" fill="none" stroke="var(--c-accent)" strokeWidth="7" opacity="0" />
      <ellipse className="lg-ping" cx="76.5" cy="91" rx="6" ry="2.2" fill="none" stroke="var(--c-accent)" strokeWidth="7" opacity="0" />
      <path d={R_PATH} fill="var(--c-logo-mark)" />
      <path className="lg-leaf-r" d={LEAF_RIGHT_PATH} fill="var(--c-logo-leaf-r, var(--c-accent))" />
      <path className="lg-leaf-l" d={LEAF_LEFT_PATH} fill="var(--c-logo-leaf-l, var(--c-accent-display))" />
      <path className="lg-pin" d={PIN_PATH} fill="var(--c-logo-mark)" fillRule="evenodd" />
    </svg>
  )
}
