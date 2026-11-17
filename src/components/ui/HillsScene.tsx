import { useEffect, useRef, useState, type ReactNode } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'

// One continuous hill landscape behind every section from "How it works" down to the closing CTA:
// rolling bands of hills whose colour follows the section they sit behind, one river winding the
// whole way down, reeds on its banks, trees on the ridges and a few people out walking.
//
// How it's built, and why:
//  * Everything that doesn't move is one SVG, computed once per layout. Vector shapes stay crisp at
//    any pixel density and cost almost nothing to keep around — unlike a canvas the height of the
//    whole page, which was tens of millions of pixels and had to be thrown away and repainted
//    every time a section changed height.
//  * Colours are CSS variables used directly as fills, so a light/dark switch restyles the scene
//    instantly with no redraw.
//  * The only moving parts — glints of current on the river and the walkers' legs — are drawn on a
//    canvas the size of the screen that follows the viewport (position: sticky) and only draws what
//    is actually in view. Its loop only runs while the scene is on screen and the tab is visible.
//  * Reduced motion, or a phone-sized screen, gets the same scene frozen: still glints and standing
//    figures in the SVG, and no loop at all.

const BAND = 320 // height of one band of hills, in px
const SEED = 9001

function hash01(a: number, b: number) {
  let h = (a * 374761393 + b * 668265263 + SEED * 2246822519) | 0
  h = (h ^ (h >>> 13)) * 1274126177
  h = h ^ (h >>> 16)
  return ((h >>> 0) % 100000) / 100000
}

// Smoothly varying noise in [-0.5, 0.5]: eased interpolation between random values `step` apart.
function smoothNoise(x: number, step: number, salt: number) {
  const g = x / step
  const g0 = Math.floor(g)
  const f = g - g0
  const e = f * f * (3 - 2 * f)
  const a = hash01(g0, salt) - 0.5
  const b = hash01(g0 + 1, salt) - 0.5
  return a + (b - a) * e
}

type Pt = { x: number; y: number }
const f1 = (n: number) => Math.round(n * 10) / 10

// Catmull-Rom through the points, written as cubic Béziers: a curve that passes through every
// point with no corners. `start` adds the initial moveto.
function smoothPath(pts: Pt[], start = true) {
  let d = start ? `M${f1(pts[0].x)} ${f1(pts[0].y)}` : ''
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1x = p1.x + (p2.x - p0.x) / 6
    const c1y = p1.y + (p2.y - p0.y) / 6
    const c2x = p2.x - (p3.x - p1.x) / 6
    const c2y = p2.y - (p3.y - p1.y) / 6
    d += `C${f1(c1x)} ${f1(c1y)} ${f1(c2x)} ${f1(c2y)} ${f1(p2.x)} ${f1(p2.y)}`
  }
  return d
}

// The same curve sampled densely, for keeping walkers' feet on the ground.
function sampleSmooth(pts: Pt[], per = 12): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i]
    const p1 = pts[i]
    const p2 = pts[i + 1]
    const p3 = pts[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    for (let s = 0; s < per; s++) {
      const t = s / per
      const m = 1 - t
      out.push({
        x: m * m * m * p1.x + 3 * m * m * t * c1.x + 3 * m * t * t * c2.x + t * t * t * p2.x,
        y: m * m * m * p1.y + 3 * m * m * t * c1.y + 3 * m * t * t * c2.y + t * t * t * p2.y,
      })
    }
  }
  out.push(pts[pts.length - 1])
  return out
}

function groundY(ground: Pt[], x: number) {
  for (let i = 0; i < ground.length - 1; i++) {
    const a = ground[i]
    const b = ground[i + 1]
    if (x >= a.x && x <= b.x) return a.y + (b.y - a.y) * ((x - a.x) / (b.x - a.x || 1))
  }
  return ground[x < ground[0].x ? 0 : ground.length - 1].y
}

type Walker = { x0: number; range: number; seed: number; ground: Pt[] }
type River = { pts: Pt[]; widths: number[] }
type Scene = {
  w: number
  h: number
  bands: Array<{ d: string; color: string; near: boolean; ridge: string }>
  river: { d: string; centre: string; left: string; right: string }
  reeds: string
  trees: Array<{ x: number; y: number; s: number }>
  walkers: Walker[]
  riverData: River
  glints: string
}

function riverPoint(r: River, t: number) {
  const idx = Math.min(0.9999, Math.max(0, t)) * (r.pts.length - 1)
  const i = Math.floor(idx)
  const f = idx - i
  const a = r.pts[i]
  const b = r.pts[i + 1]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: a.x + dx * f, y: a.y + dy * f, w: r.widths[i] + (r.widths[i + 1] - r.widths[i]) * f, nx: dx / len, ny: dy / len }
}

function buildScene(w: number, h: number, sectionMids: number[], zones: string[], still: boolean): Scene {
  // ---- hills: a ridge every BAND px, each band filled between its ridge and the next
  const cols = Math.max(6, Math.round(w / 160))
  const first = -1
  const last = Math.ceil(h / BAND) + 1
  const ridges: Pt[][] = []
  for (let k = first; k <= last; k++) {
    const pts: Pt[] = []
    for (let s = 0; s <= cols; s++) {
      const x = -40 + ((w + 80) / cols) * s
      const roll = Math.sin(k * 1.7 + s * 0.9) * BAND * 0.11
      const wobble = smoothNoise(s, 2, k * 31 + 7) * BAND * 0.16
      pts.push({ x, y: k * BAND + roll + wobble })
    }
    ridges.push(pts)
  }
  const zoneFor = (y: number) => {
    let best = 0
    for (let i = 1; i < sectionMids.length; i++) if (Math.abs(sectionMids[i] - y) < Math.abs(sectionMids[best] - y)) best = i
    return zones[best % zones.length]
  }
  const bands: Scene['bands'] = []
  const trees: Scene['trees'] = []
  const walkers: Walker[] = []
  for (let i = 0; i < ridges.length - 1; i++) {
    const k = first + i
    const top = ridges[i]
    const bottom = ridges[i + 1]
    const d = `${smoothPath(top)}L${f1(bottom[bottom.length - 1].x)} ${f1(bottom[bottom.length - 1].y)}${smoothPath([...bottom].reverse(), false)}Z`
    bands.push({ d, color: `var(${zoneFor(k * BAND + BAND / 2)})`, near: k % 2 !== 0, ridge: smoothPath(top) })

    // a couple of things standing on this ridge
    const ground = sampleSmooth(top)
    const n = 2 + (hash01(k, 1) > 0.5 ? 1 : 0)
    for (let j = 0; j < n; j++) {
      const x = (w / (n + 1)) * (j + 1) + (hash01(k, j + 10) - 0.5) * 120
      if (x < 24 || x > w - 24) continue
      const y = groundY(ground, x)
      if (y < 40 || y > h - 20) continue
      if (hash01(k, j + 20) < 0.62) trees.push({ x, y, s: 0.85 + hash01(k, j + 30) * 0.5 })
      else walkers.push({ x0: x, range: 26 + hash01(k, j + 40) * 30, seed: hash01(k, j + 50), ground })
    }
  }

  // ---- river: one meander top to bottom, an even-width ribbon with soft banks
  const step = 24
  const n = Math.max(40, Math.round(h / step))
  const centre: Pt[] = []
  const widths: number[] = []
  for (let i = 0; i <= n; i++) {
    const y = (h / n) * i
    const x = w * 0.5 + Math.sin(y / 260 + 2.1) * w * 0.27 + smoothNoise(y, 220, 500) * w * 0.08
    centre.push({ x, y })
    widths.push(18 + (smoothNoise(y, 300, 501) + 0.5) * 16)
  }
  const left: Pt[] = []
  const right: Pt[] = []
  for (let i = 0; i <= n; i++) {
    const a = centre[Math.max(0, i - 1)]
    const b = centre[Math.min(n, i + 1)]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    const px = -dy / len
    const py = dx / len
    left.push({ x: centre[i].x - px * widths[i], y: centre[i].y - py * widths[i] })
    right.push({ x: centre[i].x + px * widths[i], y: centre[i].y + py * widths[i] })
  }
  const leftD = smoothPath(left)
  const rightD = smoothPath(right)
  const riverD = `${leftD}L${f1(right[n].x)} ${f1(right[n].y)}${smoothPath([...right].reverse(), false)}Z`
  const riverData = { pts: centre, widths }

  // keep trees and walkers off the water — measured across the river's own direction, since where
  // it runs diagonally its horizontal span is wider than its width
  const offRiver = (x: number, y: number) => {
    const i = Math.min(n, Math.max(0, Math.round((y / h) * n)))
    const a = centre[Math.max(0, i - 1)]
    const b = centre[Math.min(n, i + 1)]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const across = Math.min(4, len / Math.max(Math.abs(b.y - a.y), 1e-3))
    return Math.abs(x - centre[i].x) > (widths[i] + 30) * across
  }
  const treesDry = trees.filter((t) => offRiver(t.x, t.y))
  const walkersDry = walkers.filter((p) => offRiver(p.x0, groundY(p.ground, p.x0)) && offRiver(p.x0 - p.range, groundY(p.ground, p.x0)) && offRiver(p.x0 + p.range, groundY(p.ground, p.x0)))

  // reeds in small clumps along both banks
  let reeds = ''
  const clumps = Math.round(h / 170)
  for (let c = 0; c < clumps; c++) {
    const t = (c + hash01(c, 600)) / clumps
    const p = riverPoint(riverData, t)
    const side = hash01(c, 601) > 0.5 ? 1 : -1
    const bx = p.x + -p.ny * side * (p.w + 6)
    const by = p.y + p.nx * side * (p.w + 6)
    for (let s = 0; s < 3; s++) {
      const x = bx + (s - 1) * 3.5
      const lean = (hash01(c * 3 + s, 603) - 0.5) * 9
      const tall = 13 + hash01(c * 3 + s, 604) * 7
      reeds += `M${f1(x)} ${f1(by)}Q${f1(x + lean)} ${f1(by - tall * 0.6)} ${f1(x + lean * 0.7)} ${f1(by - tall)}`
    }
  }

  // still glints for the frozen version
  let glints = ''
  if (still) {
    const count = Math.max(24, Math.round(h / 45))
    for (let g = 0; g < count; g++) {
      const p = riverPoint(riverData, hash01(g, 710))
      const lane = (hash01(g, 711) - 0.5) * 1.2 * p.w
      const len = 3 + hash01(g, 712) * 6
      const cx = p.x - p.ny * lane
      const cy = p.y + p.nx * lane
      glints += `M${f1(cx - p.nx * len)} ${f1(cy - p.ny * len)}L${f1(cx + p.nx * len)} ${f1(cy + p.ny * len)}`
    }
  }

  return {
    w, h, bands,
    river: { d: riverD, centre: smoothPath(centre), left: leftD, right: rightD },
    reeds, trees: treesDry, walkers: walkersDry, riverData, glints,
  }
}

function drawWalker(ctx: CanvasRenderingContext2D, x: number, y: number, swing: number) {
  ctx.beginPath()
  ctx.arc(x, y - 19, 2.6, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x, y - 16)
  ctx.lineTo(x, y - 7)
  ctx.moveTo(x, y - 13)
  ctx.lineTo(x - 3 - swing * 0.5, y - 9)
  ctx.moveTo(x, y - 13)
  ctx.lineTo(x + 3 + swing * 0.5, y - 9)
  ctx.moveTo(x, y - 7)
  ctx.lineTo(x - 3.5 + swing, y)
  ctx.moveTo(x, y - 7)
  ctx.lineTo(x + 3.5 - swing, y)
  ctx.stroke()
}

export function HillsScene({ zoneColors, children }: { zoneColors: string[]; children: ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [scene, setScene] = useState<Scene | null>(null)
  const [still] = useState(() => reducedMotion() || window.innerWidth < 768)

  // Measure the scene and build its geometry. Only rebuilds when the size really changes.
  useEffect(() => {
    const wrap = wrapRef.current
    if (!wrap) return
    const isStill = still
    let last = ''
    let timer = 0
    const measure = () => {
      const w = wrap.clientWidth
      const h = wrap.scrollHeight
      if (w < 1 || h < 1) return
      const top = wrap.getBoundingClientRect().top
      const sections = Array.from(wrap.children).filter((el): el is HTMLElement => el.tagName === 'SECTION')
      const mids = sections.map((el) => {
        const r = el.getBoundingClientRect()
        return r.top - top + r.height / 2
      })
      const key = `${w}x${Math.round(h / 4)}:${mids.map((m) => Math.round(m / 8)).join(',')}`
      if (key === last) return
      last = key
      setScene(buildScene(w, h, mids.length ? mids : [h / 2], zoneColors, isStill))
    }
    measure()
    const ro = new ResizeObserver(() => {
      window.clearTimeout(timer)
      timer = window.setTimeout(measure, 160)
    })
    ro.observe(wrap)
    return () => {
      ro.disconnect()
      window.clearTimeout(timer)
    }
  }, [zoneColors, still])

  // The moving parts: a screen-sized canvas, drawn only while the scene is on screen.
  useEffect(() => {
    const wrap = wrapRef.current
    const canvas = canvasRef.current
    if (!wrap || !canvas || !scene || still) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let water = '#ffffff'
    let ink = '#000000'
    const readColours = () => {
      const cs = getComputedStyle(document.documentElement)
      water = cs.getPropertyValue('--c-surface').trim() || water
      ink = cs.getPropertyValue('--c-ink').trim() || ink
    }
    readColours()
    const themeObserver = new MutationObserver(readColours)
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })

    let vw = 0
    let vh = 0
    let dpr = 1
    const size = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      vw = canvas.clientWidth
      vh = canvas.clientHeight
      canvas.width = Math.round(vw * dpr)
      canvas.height = Math.round(vh * dpr)
    }
    size()
    window.addEventListener('resize', size)

    const particles = Math.max(36, Math.round(scene.h / 30))
    const tick = (time: number) => {
      // where the sticky canvas currently sits within the scene
      const rect = wrap.getBoundingClientRect()
      const offset = Math.min(Math.max(-rect.top, 0), Math.max(0, scene.h - vh))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, vw, vh)
      ctx.translate(0, -offset)
      const y0 = offset - 30
      const y1 = offset + vh + 30

      // glints of current: each fades in, drifts a little way downstream, fades out, then
      // reappears somewhere new — reads as light on moving water rather than a sliding line
      ctx.strokeStyle = water
      ctx.lineCap = 'round'
      for (let p = 0; p < particles; p++) {
        const cycle = 1.8 + hash01(p, 720) * 1.8
        const raw = time / cycle + hash01(p, 721)
        const ci = Math.floor(raw)
        const frac = raw - ci
        if (frac > 0.62) continue
        const prog = frac / 0.62
        const t = hash01(p, ci * 3 + 1) + prog * (0.02 + hash01(p, ci * 3 + 2) * 0.04)
        const pt = riverPoint(scene.riverData, t)
        if (pt.y < y0 || pt.y > y1) continue
        const lane = (hash01(p, ci * 3 + 3) - 0.5) * 1.1 * pt.w + Math.sin(time * 2 + p) * 2.5
        const len = 3 + hash01(p, ci * 3 + 4) * 7
        const cx = pt.x - pt.ny * lane
        const cy = pt.y + pt.nx * lane
        ctx.globalAlpha = 0.7 * Math.min(1, prog / 0.2, (1 - prog) / 0.25)
        ctx.lineWidth = 1.3 + hash01(p, ci * 3 + 5) * 1.3
        ctx.beginPath()
        ctx.moveTo(cx - pt.nx * len, cy - pt.ny * len)
        ctx.lineTo(cx + pt.nx * len, cy + pt.ny * len)
        ctx.stroke()
      }

      // walkers patrolling a short stretch of their own ridge
      ctx.globalAlpha = 0.5
      ctx.strokeStyle = ink
      ctx.fillStyle = ink
      ctx.lineWidth = 1.6
      for (const wk of scene.walkers) {
        const walkT = time * 0.5 + wk.seed * 20
        const x = wk.x0 + Math.sin(walkT) * wk.range
        const y = groundY(wk.ground, x)
        if (y < y0 || y > y1) continue
        const speed = Math.min(1, Math.abs(Math.cos(walkT)) * 2)
        drawWalker(ctx, x, y, Math.sin(time * 7 + wk.seed * 20) * speed * 3)
      }
      ctx.globalAlpha = 1
    }

    let running = false
    let onScreen = false
    const setRunning = (on: boolean) => {
      if (on === running) return
      running = on
      if (on) gsap.ticker.add(tick)
      else {
        gsap.ticker.remove(tick)
        ctx.setTransform(1, 0, 0, 1, 0, 0)
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
    const io = new IntersectionObserver(([entry]) => {
      onScreen = entry.isIntersecting
      setRunning(onScreen && !document.hidden)
    })
    io.observe(wrap)
    const onVisibility = () => setRunning(onScreen && !document.hidden)
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      setRunning(false)
      io.disconnect()
      themeObserver.disconnect()
      window.removeEventListener('resize', size)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [scene, still])

  return (
    <div ref={wrapRef} className="relative">
      {scene && (
        <svg className="hills-layer" width={scene.w} height={scene.h} viewBox={`0 0 ${scene.w} ${scene.h}`} aria-hidden="true" focusable="false">
          {/* alternating near/far bands; their strength per theme lives in index.css (.hill-*) */}
          {scene.bands.map((b, i) => (
            <path key={i} d={b.d} fill={b.color} className={b.near ? 'hill-near' : 'hill-far'} />
          ))}
          <g fill="none" stroke="var(--c-ink)" strokeOpacity="0.07" strokeWidth="1.2">
            {scene.bands.map((b, i) => (
              <path key={i} d={b.ridge} />
            ))}
          </g>
          <path d={scene.river.d} fill="var(--c-water)" fillOpacity="0.62" />
          <g fill="none" stroke="var(--c-ink)" strokeOpacity="0.1" strokeWidth="1.2">
            <path d={scene.river.left} />
            <path d={scene.river.right} />
          </g>
          <path d={scene.river.centre} fill="none" stroke="var(--c-surface)" strokeOpacity="0.35" strokeWidth="1.5" />
          {scene.glints && <path d={scene.glints} fill="none" stroke="var(--c-surface)" strokeOpacity="0.6" strokeWidth="1.8" strokeLinecap="round" />}
          <path d={scene.reeds} fill="none" stroke="var(--c-ink)" strokeOpacity="0.32" strokeWidth="1.4" strokeLinecap="round" />
          {scene.trees.map((t, i) => (
            <g key={i} transform={`translate(${f1(t.x)} ${f1(t.y)}) scale(${t.s.toFixed(2)})`}>
              <path d="M0 0V-11" stroke="var(--c-ink)" strokeOpacity="0.38" strokeWidth="2.2" strokeLinecap="round" />
              {/* a bushy canopy: opaque circles inside one faded group, so overlaps stay even */}
              <g fill="var(--c-ink)" opacity="0.17">
                <circle cx="0" cy="-22" r="8" />
                <circle cx="-7" cy="-16" r="6.5" />
                <circle cx="7" cy="-16" r="6.5" />
                <circle cx="0" cy="-14" r="6" />
              </g>
              <circle cx="-3" cy="-24" r="3.6" fill="var(--c-surface)" fillOpacity="0.22" />
            </g>
          ))}
          {still && (
            <g fill="var(--c-ink)" stroke="var(--c-ink)" strokeWidth="1.6" strokeLinecap="round" opacity="0.5">
              {scene.walkers.map((wk, i) => {
                const y = groundY(wk.ground, wk.x0)
                const x = wk.x0
                return (
                  <g key={i}>
                    <circle cx={f1(x)} cy={f1(y - 19)} r="2.6" stroke="none" />
                    <path d={`M${f1(x)} ${f1(y - 16)}V${f1(y - 7)}M${f1(x)} ${f1(y - 13)}l-3 4M${f1(x)} ${f1(y - 13)}l3 4M${f1(x)} ${f1(y - 7)}l-3.5 7M${f1(x)} ${f1(y - 7)}l3.5 7`} fill="none" />
                  </g>
                )
              })}
            </g>
          )}
        </svg>
      )}
      {!still && (
        <div className="pointer-events-none absolute inset-0 -z-[1]" aria-hidden="true">
          <canvas ref={canvasRef} className="sticky top-0 block h-[100svh] w-full" />
        </div>
      )}
      {children}
    </div>
  )
}
