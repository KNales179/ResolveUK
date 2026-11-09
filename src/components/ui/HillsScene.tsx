import { useEffect, useRef, type ReactNode } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'

// Fixed wavelength and a stateless hash (not a sequential PRNG stream) for the ridge geometry —
// any point in the scene can be computed independently, so there's nothing to keep in sync
// across sections.
const WAVELENGTH = 260
const GEOM_SEED = 9001

function hash01(a: number, b: number, seed: number) {
  let h = (a * 374761393 + b * 668265263 + seed * 2246822519) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 100000) / 100000
}

// Continues the CURRENT path through pts via a smooth curve — assumes the pen is already at
// pts[0] (no moveTo of its own). Used to chain two curves into one closed polygon: calling moveTo
// partway through silently splits the path into two disconnected subpaths, each then
// independently auto-closed for fill, leaving most of the band transparent.
function curveThrough(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>) {
  if (pts.length < 2) return
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2
    const my = (pts[i].y + pts[i + 1].y) / 2
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my)
  }
  const last = pts[pts.length - 1]
  ctx.lineTo(last.x, last.y)
}
function drawSmooth(ctx: CanvasRenderingContext2D, pts: Array<{ x: number; y: number }>) {
  if (pts.length < 2) return
  ctx.moveTo(pts[0].x, pts[0].y)
  curveThrough(ctx, pts)
}

function hexToRgb(hex: string): [number, number, number] | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : null
}
function rgbToHex([r, g, b]: [number, number, number]): string {
  const h = (c: number) => Math.round(Math.min(255, Math.max(0, c))).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}
// Lightens (amt > 0) or darkens (amt < 0) a plain #rrggbb colour. Anything else is returned
// unchanged — still a valid fillStyle, just without a shaded variant generated from it.
function shade(hex: string, amt: number): string {
  const c = hexToRgb(hex)
  if (!c) return hex
  const mix = (v: number) => (amt >= 0 ? v + (255 - v) * amt : v + v * amt)
  return rgbToHex([mix(c[0]), mix(c[1]), mix(c[2])])
}
function lerpColor(a: string, b: string, t: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  if (!ca || !cb) return t < 0.5 ? a : b
  return rgbToHex([ca[0] + (cb[0] - ca[0]) * t, ca[1] + (cb[1] - ca[1]) * t, ca[2] + (cb[2] - ca[2]) * t])
}

type Keyframe = { y: number; color: string }
function colorAt(y: number, keyframes: Keyframe[]): string {
  if (keyframes.length === 0) return '#000000'
  if (y <= keyframes[0].y) return keyframes[0].color
  const lastKf = keyframes[keyframes.length - 1]
  if (y >= lastKf.y) return lastKf.color
  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i]
    const b = keyframes[i + 1]
    if (y >= a.y && y <= b.y) return lerpColor(a.color, b.color, (y - a.y) / (b.y - a.y || 1))
  }
  return lastKf.color
}

type Pt = { x: number; y: number }
type Human = { x0: number; ridge: Pt[]; seed: number; range: number }

// Linear-interpolates the ridge's y at a given x, so a figure walking across it can stay on the
// ground instead of floating at the y it happened to spawn at.
function interpY(ridge: Pt[], x: number): number {
  if (x <= ridge[0].x) return ridge[0].y
  if (x >= ridge[ridge.length - 1].x) return ridge[ridge.length - 1].y
  for (let i = 0; i < ridge.length - 1; i++) {
    const a = ridge[i]
    const b = ridge[i + 1]
    if (x >= a.x && x <= b.x) return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1))
  }
  return ridge[ridge.length - 1].y
}

// A smooth, continuous wobble at `i` (no sudden jumps at any point) by interpolating between
// coarse random control values spaced `group` steps apart, eased rather than linear. Sampling the
// river densely but jittering every single fine sample independently would add high-frequency
// noise on top of the curve — this keeps the organic variation while staying smooth enough that a
// particle's direction never has to visibly snap from one sample to the next.
function smoothJitter(i: number, group: number, seedBase: number, amp: number) {
  const g = i / group
  const g0 = Math.floor(g)
  const f = g - g0
  const ease = f * f * (3 - 2 * f)
  const j0 = hash01(g0, seedBase, GEOM_SEED) - 0.5
  const j1 = hash01(g0 + 1, seedBase, GEOM_SEED) - 0.5
  return (j0 + (j1 - j0) * ease) * amp
}

// A point at fraction `t` (0 = source, 1 = mouth) along the river's sampled centreline, with the
// water's width there and the local downstream direction — everything a flow streak needs to
// place and orient itself without walking the whole point array each time.
function pointAlongRiver(riverPts: Pt[], riverWidths: number[], t: number) {
  const clamped = Math.min(0.999, Math.max(0, t))
  const idx = clamped * (riverPts.length - 1)
  const i0 = Math.floor(idx)
  const i1 = Math.min(riverPts.length - 1, i0 + 1)
  const f = idx - i0
  const x = riverPts[i0].x + (riverPts[i1].x - riverPts[i0].x) * f
  const y = riverPts[i0].y + (riverPts[i1].y - riverPts[i0].y) * f
  const width = riverWidths[i0] + (riverWidths[i1] - riverWidths[i0]) * f
  return { x, y, width, dx: riverPts[i1].x - riverPts[i0].x, dy: riverPts[i1].y - riverPts[i0].y }
}

// Draws one short streak, oriented along the river's local flow direction, at fraction `t` with
// a given sideways position within the channel (`lane`, -1..1) and opacity. `wiggle` nudges it
// sideways from that lane — fed a value that changes over the streak's lifetime, this is what
// makes it drift a little rather than slide in a dead-straight line. `length`/`width` vary it
// mark to mark so they don't all read as identical copies of the same dash.
function drawFlowStreak(
  ctx: CanvasRenderingContext2D,
  riverPts: Pt[],
  riverWidths: number[],
  t: number,
  lane: number,
  alpha: number,
  color: string,
  wiggle = 0,
  length = 7,
  width = 2,
) {
  const pt = pointAlongRiver(riverPts, riverWidths, t)
  const len = Math.hypot(pt.dx, pt.dy) || 1
  const nx = pt.dx / len
  const ny = pt.dy / len
  const px = -ny // perpendicular to the flow direction, for the wiggle and the lane offset
  const py = nx
  const cx = pt.x + px * (lane * pt.width * 0.55 + wiggle)
  const cy = pt.y + py * (lane * pt.width * 0.55 + wiggle)
  ctx.strokeStyle = color
  ctx.globalAlpha = alpha
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(cx - nx * length, cy - ny * length)
  ctx.lineTo(cx + nx * length, cy + ny * length)
  ctx.stroke()
  ctx.globalAlpha = 1
}

// One continuous hill illustration behind every section from "How it works" down to the closing
// CTA — a single canvas spanning the whole scene, not one per section, so the ridge line never
// seams at a section boundary. Each band fills as a strip BOUNDED between its own ridge and the
// next one, not down to a fixed bottom edge — that fixed-edge version is what made every wedge
// pinch at the same two corners, reading as rays fanning out of a corner once you looked closely.
// A bounded strip has no fixed anchor at all, so that can't happen. Each direct <section> child
// is a colour keyframe (via `zoneColors`, cycled in DOM order); the fill blends smoothly between
// them as you scroll. For this to show through, the wrapped sections must not paint their own
// opaque background colour.
//
// Everything here is static (hills, grid stroke, trees, litter, the river body, reeds) except the
// river's flow and the figures' legs, which redraw every frame on a second, transparent canvas
// layered on top — so the animation cost is a handful of short strokes per frame, not a full
// re-render of the whole scene.
export function HillsScene({ zoneColors, children }: { zoneColors: string[]; children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animCanvasRef = useRef<HTMLCanvasElement>(null)
  const riverPtsRef = useRef<Array<{ x: number; y: number }>>([])
  const riverWidthsRef = useRef<number[]>([])
  const humansRef = useRef<Human[]>([])
  const hedgeRef = useRef('#000000')
  const rippleColorRef = useRef('#ffffff')

  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    const animCanvas = animCanvasRef.current
    if (!wrap || !canvas || !animCanvas) return
    // The animated layer redraws the river's flow particles and every walking figure on a
    // canvas spanning the whole multi-thousand-pixel scene, 60 times a second — cheap on
    // desktop, heavy enough on mobile GPUs to visibly lag scrolling. Below the tablet
    // breakpoint it reuses the same static fallback already built for reduced motion (still
    // glints, a standing figure) instead of a separate code path.
    const motionOff = reducedMotion() || window.innerWidth < 768

    const draw = () => {
      const cssW = wrap.clientWidth
      const cssH = wrap.scrollHeight
      if (cssW < 1 || cssH < 1) return
      // The canvas still spans the whole scene even with the animation loop off, so the browser
      // keeps compositing it on every scroll frame regardless — capped lower on mobile keeps
      // that bitmap a quarter the size instead of just stopping the JS redraw loop.
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 768 ? 1 : 2)
      canvas.width = cssW * dpr
      canvas.height = cssH * dpr
      canvas.style.width = `${cssW}px`
      canvas.style.height = `${cssH}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, cssW, cssH)

      // The animated layer always matches the static one's size exactly, so a position computed
      // for one lands in the same place on the other.
      animCanvas.width = cssW * dpr
      animCanvas.height = cssH * dpr
      animCanvas.style.width = `${cssW}px`
      animCanvas.style.height = `${cssH}px`
      const actx = animCanvas.getContext('2d')
      if (actx) actx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const rootStyle = getComputedStyle(document.documentElement)
      const hedge = rootStyle.getPropertyValue('--c-ink').trim()
      const litterColor = shade(hedge, 0.3)
      const resolvedZones = zoneColors.map((c) => rootStyle.getPropertyValue(c).trim())
      hedgeRef.current = hedge
      rippleColorRef.current = rootStyle.getPropertyValue('--c-surface').trim()
      humansRef.current = []

      const sections = Array.from(wrap.children).filter((el): el is HTMLElement => el.tagName === 'SECTION')
      const wrapTop = wrap.getBoundingClientRect().top + window.scrollY
      const keyframes: Keyframe[] = sections.map((el, i) => {
        const r = el.getBoundingClientRect()
        const top = r.top + window.scrollY - wrapTop
        return { y: top + r.height / 2, color: resolvedZones[i % resolvedZones.length] }
      })

      const steps = 6
      const startIdx = Math.floor(0 / WAVELENGTH) - 1
      const endIdx = Math.ceil(cssH / WAVELENGTH) + 1

      const ridges: Array<Array<{ x: number; y: number }>> = []
      for (let idx = startIdx; idx <= endIdx; idx++) {
        const localBaseY = idx * WAVELENGTH
        const ridge: Array<{ x: number; y: number }> = []
        for (let s = 0; s <= steps; s++) {
          const x = (cssW / steps) * s
          const wave = Math.sin(idx * 1.7 + s * 1.3) * WAVELENGTH * 0.16
          const jitter = (hash01(idx, s, GEOM_SEED) - 0.5) * WAVELENGTH * 0.18
          ridge.push({ x, y: localBaseY + wave + jitter })
        }
        ridges.push(ridge)
      }

      for (let i = 0; i < ridges.length - 1; i++) {
        const idx = startIdx + i
        const top = ridges[i]
        const bottom = ridges[i + 1]
        const bandMidY = (top[0].y + bottom[0].y) / 2
        const zoneColor = colorAt(idx * WAVELENGTH + WAVELENGTH / 2, keyframes)
        const bandColor = idx % 2 === 0 ? zoneColor : shade(zoneColor, hash01(idx, 50, GEOM_SEED) > 0.5 ? 0.16 : -0.14)

        // Kept faint on purpose: this sits directly behind body text in sections that have no
        // card of their own, so it has to read as a background texture, not a shape competing
        // with what's printed on top of it.
        ctx.beginPath()
        ctx.moveTo(top[0].x, top[0].y)
        curveThrough(ctx, top)
        ctx.lineTo(bottom[bottom.length - 1].x, bottom[bottom.length - 1].y)
        curveThrough(ctx, [...bottom].reverse())
        ctx.closePath()
        ctx.fillStyle = bandColor
        ctx.globalAlpha = 0.16
        ctx.fill()
        ctx.globalAlpha = 1

        ctx.beginPath()
        drawSmooth(ctx, top)
        ctx.strokeStyle = hedge
        ctx.globalAlpha = 0.1
        ctx.lineWidth = 1.5
        ctx.stroke()
        ctx.globalAlpha = 1

        if (bandMidY < -WAVELENGTH || bandMidY > cssH + WAVELENGTH) continue

        const decorCount = 2 + (hash01(idx, 99, GEOM_SEED) > 0.4 ? 1 : 0)
        for (let d = 0; d < decorCount; d++) {
          const r1 = hash01(idx, d * 7 + 1, GEOM_SEED)
          const r2 = hash01(idx, d * 7 + 2, GEOM_SEED)
          const kind = r1 < 0.14 ? 'litter' : r1 < 0.42 ? 'human' : 'tree'
          const dx = (cssW / (decorCount + 1)) * (d + 1) + (r2 - 0.5) * 40
          const sIdx = Math.min(steps, Math.max(0, Math.round((dx / cssW) * steps)))
          const dy = top[sIdx]?.y ?? bandMidY

          if (kind === 'tree') {
            ctx.strokeStyle = hedge
            ctx.globalAlpha = 0.4
            ctx.lineWidth = 2
            ctx.beginPath()
            ctx.moveTo(dx, dy)
            ctx.lineTo(dx, dy - 10)
            ctx.stroke()
            ctx.beginPath()
            ctx.arc(dx, dy - 14, 5.5, 0, Math.PI * 2)
            ctx.fillStyle = shade(zoneColor, -0.1)
            ctx.globalAlpha = 0.3
            ctx.fill()
          } else if (kind === 'human') {
            // A tiny figure on the hillside — a nod to the volunteers the app is actually for.
            // With motion on, nothing is drawn here at all: the whole figure (not just the legs)
            // is redrawn each frame on the animated layer, walking back and forth along this
            // band's own ridge so it stays on the ground. With reduced motion, a neutral standing
            // pose is drawn once, right here, and nothing further ever runs.
            if (motionOff) {
              ctx.strokeStyle = hedge
              ctx.globalAlpha = 0.38
              ctx.lineWidth = 1.5
              ctx.beginPath()
              ctx.arc(dx, dy - 13, 2, 0, Math.PI * 2)
              ctx.stroke()
              ctx.beginPath()
              ctx.moveTo(dx, dy - 11)
              ctx.lineTo(dx, dy - 4)
              ctx.moveTo(dx, dy - 4)
              ctx.lineTo(dx - 3, dy)
              ctx.moveTo(dx, dy - 4)
              ctx.lineTo(dx + 3, dy)
              ctx.stroke()
              ctx.globalAlpha = 1
            } else {
              humansRef.current.push({
                x0: dx,
                ridge: top,
                seed: hash01(idx, d * 7 + 3, GEOM_SEED),
                range: 22 + hash01(idx, d * 7 + 4, GEOM_SEED) * 26,
              })
            }
          } else {
            // A small scrap of litter, off the green palette on purpose so it reads as something
            // that doesn't belong on the hillside.
            ctx.fillStyle = litterColor
            ctx.globalAlpha = 0.45
            ctx.beginPath()
            ctx.moveTo(dx - 3, dy - 1)
            ctx.lineTo(dx + 2, dy - 3)
            ctx.lineTo(dx + 4, dy + 1)
            ctx.lineTo(dx - 1, dy + 2)
            ctx.closePath()
            ctx.fill()
          }
          ctx.globalAlpha = 1
        }
      }

      // One river winding through the whole scene, drawn once over the hill bands — its own
      // independent path, not tied to the ridge geometry, with reeds along its banks. The body
      // of water and its reeds are static; the ripple lines that suggest flow are redrawn each
      // frame on the animated layer (see tick(), below), using riverPtsRef.
      const waterColor = rootStyle.getPropertyValue('--c-water').trim()
      // Sampled densely (every ~24px) so the piecewise-straight segments between points are short
      // enough that a flow particle's direction never has to visibly snap at a sample boundary —
      // that snapping was what read as the stream "hitting something and bouncing" at a bend. The
      // bend's actual wavelength is set against real pixels (WAVE_PX_PER_RAD), not against the
      // sample index, so this density only smooths the curve — it doesn't change its shape.
      const riverSteps = Math.max(60, Math.round(cssH / 24))
      const WAVE_PX_PER_RAD = 180 / 0.7
      const jitterGroup = Math.max(1, Math.round(180 / (cssH / riverSteps)))
      const riverPts: Array<{ x: number; y: number }> = []
      const riverWidths: number[] = []
      for (let i = 0; i <= riverSteps; i++) {
        const y = (cssH / riverSteps) * i
        const phase = y / WAVE_PX_PER_RAD + 2.1
        const jitter = smoothJitter(i, jitterGroup, 500, cssW * 0.05)
        const x = cssW * 0.5 + Math.sin(phase) * cssW * 0.26 + jitter
        riverPts.push({ x, y })
        riverWidths.push(20 + hash01(Math.floor(i / jitterGroup), 501, GEOM_SEED) * 26)
      }
      riverPtsRef.current = riverPts
      riverWidthsRef.current = riverWidths
      const leftBank = riverPts.map((p, i) => ({ x: p.x - riverWidths[i], y: p.y }))
      const rightBank = riverPts.map((p, i) => ({ x: p.x + riverWidths[i], y: p.y })).reverse()

      ctx.beginPath()
      ctx.moveTo(leftBank[0].x, leftBank[0].y)
      curveThrough(ctx, leftBank)
      ctx.lineTo(rightBank[0].x, rightBank[0].y)
      curveThrough(ctx, rightBank)
      ctx.closePath()
      ctx.fillStyle = waterColor
      ctx.globalAlpha = 0.4
      ctx.fill()
      ctx.globalAlpha = 1

      if (motionOff) {
        // A scatter of still glints standing in for the flow, rather than any dashed/marching
        // line — same visual language as the animated version, just frozen at one frame.
        const glintCount = Math.max(24, Math.round(cssH / 45))
        for (let p = 0; p < glintCount; p++) {
          const t = hash01(p, 710, GEOM_SEED)
          const lane = (hash01(p, 711, GEOM_SEED) - 0.5) * 1.3
          const length = 3 + hash01(p, 712, GEOM_SEED) * 7
          const width = 1.2 + hash01(p, 713, GEOM_SEED) * 1.4
          drawFlowStreak(ctx, riverPts, riverWidths, t, lane, 0.32, rippleColorRef.current, 0, length, width)
        }
      }

      const reedCount = Math.round(cssH / 150)
      for (let k = 0; k < reedCount; k++) {
        const ty = hash01(k, 600, GEOM_SEED) * cssH
        const ri = Math.min(riverSteps, Math.max(0, Math.round((ty / cssH) * riverSteps)))
        const side = hash01(k, 601, GEOM_SEED) > 0.5 ? 1 : -1
        const bx = riverPts[ri].x + side * (riverWidths[ri] + 8 + hash01(k, 602, GEOM_SEED) * 12)
        ctx.strokeStyle = hedge
        ctx.globalAlpha = 0.4
        ctx.lineWidth = 1.4
        for (let s = 0; s < 3; s++) {
          const sway = (hash01(k * 3 + s, 603, GEOM_SEED) - 0.5) * 8
          ctx.beginPath()
          ctx.moveTo(bx + s * 3 - 3, ty)
          ctx.quadraticCurveTo(bx + s * 3 - 3 + sway, ty - 8, bx + s * 3 - 3 + sway * 0.6, ty - 14)
          ctx.stroke()
        }
        ctx.globalAlpha = 1
      }
    }

    draw()

    // The animated layer: the river's ripple lines slide along its length (continuous curves,
    // never dashed — a dashed, marching offset just reads as a broken line marching, not water),
    // and each figure actually walks a short patrol along its own band's ridge, legs scissoring
    // in time with its steps. Cheap enough to redraw at 60fps since it never touches the hill
    // bands or the river body itself.
    const tick = (elapsed: number) => {
      const actx = animCanvas.getContext('2d')
      if (!actx) return
      const cssW = wrap.clientWidth
      const cssH = wrap.scrollHeight
      actx.clearRect(0, 0, cssW, cssH)

      const riverPts = riverPtsRef.current
      const riverWidths = riverWidthsRef.current
      if (riverPts.length > 1) {
        // Many short streaks, not one long line that slides — each one fades in, drifts a little
        // way downstream, fades out, then (after a gap) reappears at a fresh random spot. That
        // appear/drift/vanish cycle is what actually reads as flowing water, like glints of light
        // on moving current, rather than a single shape sliding back and forth.
        const particleCount = Math.max(36, Math.round(cssH / 32))
        const visibleFrac = 0.6 // the rest of each particle's cycle is its "gone" gap
        for (let p = 0; p < particleCount; p++) {
          const cycleLen = 1.8 + hash01(p, 710, GEOM_SEED) * 1.8
          const phaseOffset = hash01(p, 711, GEOM_SEED)
          const tRaw = elapsed / cycleLen + phaseOffset
          const cycleIndex = Math.floor(tRaw)
          const frac = tRaw - cycleIndex
          if (frac >= visibleFrac) continue
          const progress = frac / visibleFrac

          let alpha = 0.55
          if (progress < 0.2) alpha *= progress / 0.2
          else if (progress > 0.75) alpha *= (1 - progress) / 0.25

          const t0 = hash01(p, cycleIndex * 3 + 1, GEOM_SEED)
          const travelDist = 0.025 + hash01(p, cycleIndex * 3 + 2, GEOM_SEED) * 0.05
          const riverT = t0 + progress * travelDist
          const lane = (hash01(p, cycleIndex * 3 + 3, GEOM_SEED) - 0.5) * 1.3
          const length = 3 + hash01(p, cycleIndex * 3 + 4, GEOM_SEED) * 7
          const width = 1.2 + hash01(p, cycleIndex * 3 + 5, GEOM_SEED) * 1.4
          // A couple of independent sine wobbles (different speeds per particle) nudge it
          // sideways as it drifts, instead of sliding along a dead-straight line.
          const wiggle =
            Math.sin(elapsed * (1.8 + hash01(p, cycleIndex * 3 + 6, GEOM_SEED) * 1.4) + p * 11) * 3.2

          drawFlowStreak(actx, riverPts, riverWidths, riverT, lane, alpha, rippleColorRef.current, wiggle, length, width)
        }
      }

      humansRef.current.forEach((h) => {
        // A slow back-and-forth patrol around the spot it spawned at, not a lap of the whole
        // hillside — staying near its own band keeps it clear of neighbouring trees and litter.
        const walkT = elapsed * 0.55 + h.seed * 20
        const x = h.x0 + Math.sin(walkT) * h.range
        const groundY = interpY(h.ridge, x)
        // cos(walkT) is the patrol's own velocity: near zero right at each turn-around, fastest
        // through the middle — scales the leg swing down to a stop there instead of scissoring
        // on the spot while "stationary".
        const velocity = Math.min(1, Math.abs(Math.cos(walkT)) * 2)
        const swing = Math.sin(elapsed * 7 + h.seed * 20) * velocity * 2.6

        actx.strokeStyle = hedgeRef.current
        actx.globalAlpha = 0.38
        actx.lineWidth = 1.5
        actx.beginPath()
        actx.arc(x, groundY - 13, 2, 0, Math.PI * 2)
        actx.stroke()
        actx.beginPath()
        actx.moveTo(x, groundY - 11)
        actx.lineTo(x, groundY - 4)
        actx.moveTo(x, groundY - 4)
        actx.lineTo(x - 3 + swing, groundY)
        actx.moveTo(x, groundY - 4)
        actx.lineTo(x + 3 - swing, groundY)
        actx.stroke()
        actx.globalAlpha = 1
      })
    }

    if (!motionOff) gsap.ticker.add(tick)

    let resizeTimer = 0
    const onResize = () => {
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(draw, 150)
    }
    window.addEventListener('resize', onResize)
    const themeObserver = new MutationObserver(draw)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    // The sections' own heights can still shift after mount (fonts loading, images decoding),
    // which would leave the keyframe positions stale — re-measure when that happens too.
    const sizeObserver = new ResizeObserver(() => draw())
    sizeObserver.observe(wrap)
    return () => {
      if (!motionOff) gsap.ticker.remove(tick)
      window.removeEventListener('resize', onResize)
      window.clearTimeout(resizeTimer)
      themeObserver.disconnect()
      sizeObserver.disconnect()
    }
  }, [zoneColors])

  return (
    <div ref={wrapRef} className="relative">
      {/* Same theme-switched backdrop photo as every other page's PageBackdrop (river for light,
          foggy stream for dark), sitting behind the grid and the hills for this whole scene — not
          fixed to the viewport like PageBackdrop (that would also show through the hero above,
          which already has its own copy of this photo), just the furthest-back layer of this one
          wrapper. */}
      <div className="page-bg absolute inset-0 -z-20" aria-hidden="true" />
      <div className="absolute inset-0 -z-10" style={{ background: 'linear-gradient(0deg,var(--c-bg) 4%,color-mix(in oklab,var(--c-bg) 55%,transparent))' }} aria-hidden="true" />
      <canvas ref={canvasRef} className="hills-layer" aria-hidden="true" />
      <canvas ref={animCanvasRef} className="hills-layer" aria-hidden="true" />
      {children}
    </div>
  )
}
