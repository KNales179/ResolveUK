// Drawing for the site's backgrounds (picked by the owner from the "Resolve Backdrops" samples):
// contour lines (homepage), leaf shadows (dappled light, on every other page, over soft colour
// fields), and leaf veins (navbar and footer). All drawn in code from the brand greens; no images.

type Ctx = CanvasRenderingContext2D

function rng(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function rgba(hex: string, a: number): string {
  const n = parseInt(hex.replace('#', ''), 16)
  return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`
}

// Smooth value noise in a few octaves: gentle hills for the contour lines to trace.
function makeNoise(seed: number) {
  const r = rng(seed)
  const P = 256
  const g = new Float32Array(P * P)
  for (let i = 0; i < g.length; i++) g[i] = r()
  const at = (x: number, y: number) => g[(y & 255) * P + (x & 255)]
  const s = (t: number) => t * t * (3 - 2 * t)
  const v = (x: number, y: number) => {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const xf = s(x - xi)
    const yf = s(y - yi)
    const a = at(xi, yi)
    const b = at(xi + 1, yi)
    const c = at(xi, yi + 1)
    const d = at(xi + 1, yi + 1)
    return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
  }
  return (x: number, y: number) => v(x, y) * 0.55 + v(x * 2.1 + 7, y * 2.1 + 3) * 0.3 + v(x * 4.3 + 1, y * 4.3 + 9) * 0.15
}

// Height lines like an Ordnance Survey map (marching squares over the noise field), with every
// fifth line a little heavier, the way an OS map marks its index contours. `oy` draws a strip
// further down the same map (in pixels), so strips drawn one under another join up seamlessly;
// keep it a multiple of 7 (the grid step).
export function drawContours(ctx: Ctx, w: number, h: number, color: string, alpha: number, oy = 0) {
  const noise = makeNoise(11)
  const step = 7
  const sc = 0.0042
  const cols = Math.ceil(w / step) + 1
  const rows = Math.ceil(h / step) + 1
  const f = new Float32Array(cols * rows)
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) f[j * cols + i] = noise(i * step * sc, (j * step + oy) * sc)
  const levels = 22
  for (let L = 1; L < levels; L++) {
    const t = L / levels
    const index = L % 5 === 0
    ctx.strokeStyle = rgba(color, index ? alpha * 2 : alpha)
    ctx.lineWidth = index ? 1.3 : 0.8
    ctx.beginPath()
    for (let j = 0; j < rows - 1; j++) {
      for (let i = 0; i < cols - 1; i++) {
        const a = f[j * cols + i]
        const b = f[j * cols + i + 1]
        const c = f[(j + 1) * cols + i + 1]
        const d = f[(j + 1) * cols + i]
        const k = (a > t ? 8 : 0) | (b > t ? 4 : 0) | (c > t ? 2 : 0) | (d > t ? 1 : 0)
        if (k === 0 || k === 15) continue
        const x = i * step
        const y = j * step
        const lerp = (p: number, q: number) => (t - p) / (q - p)
        const T: [number, number] = [x + step * lerp(a, b), y]
        const R: [number, number] = [x + step, y + step * lerp(b, c)]
        const B: [number, number] = [x + step * lerp(d, c), y + step]
        const Lf: [number, number] = [x, y + step * lerp(a, d)]
        const SEG: Record<number, Array<[number, number]>> = {
          1: [Lf, B], 2: [B, R], 3: [Lf, R], 4: [T, R], 5: [Lf, T, B, R], 6: [T, B], 7: [Lf, T],
          8: [Lf, T], 9: [T, B], 10: [T, R, Lf, B], 11: [T, R], 12: [Lf, R], 13: [B, R], 14: [Lf, B],
        }
        const seg = SEG[k]
        for (let s = 0; s < seg.length; s += 2) {
          ctx.moveTo(seg[s][0], seg[s][1])
          ctx.lineTo(seg[s + 1][0], seg[s + 1][1])
        }
      }
    }
    ctx.stroke()
  }
}

// Leaf silhouettes along a few branches reaching in from the top right; blurred and faded by CSS
// they read as sunlight through a tree.
export function drawLeaves(ctx: Ctx, w: number, h: number, color: string) {
  const r = rng(5)
  ctx.fillStyle = color
  const leaf = (x: number, y: number, len: number, ang: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(ang)
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0)
    ctx.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0)
    ctx.fill()
    ctx.restore()
  }
  for (let b = 0; b < 9; b++) {
    let x = w * (0.45 + r() * 0.6)
    let y = -20 + r() * h * 0.25
    let ang = Math.PI * (0.55 + r() * 0.5)
    const n = 26 + Math.floor(r() * 18)
    for (let i = 0; i < n; i++) {
      x += Math.cos(ang) * 16
      y += Math.sin(ang) * 16
      ang += (r() - 0.5) * 0.25
      leaf(x, y, 34 + r() * 30, ang + (i % 2 ? 0.9 : -0.9) + (r() - 0.5) * 0.5)
    }
  }
}

// A fine branching vein pattern (leaf venation), growing in from the edges.
export function drawVeins(ctx: Ctx, w: number, h: number, color: string, strength = 1) {
  const r = rng(23)
  ctx.lineCap = 'round'
  const branch = (x: number, y: number, ang: number, len: number, width: number, depth: number) => {
    if (depth > 8 || len < 6) return
    const x2 = x + Math.cos(ang) * len
    const y2 = y + Math.sin(ang) * len
    ctx.strokeStyle = rgba(color, Math.max(0.03, 0.16 - depth * 0.015) * strength)
    ctx.lineWidth = width
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.quadraticCurveTo((x + x2) / 2 + (r() - 0.5) * len * 0.3, (y + y2) / 2 + (r() - 0.5) * len * 0.3, x2, y2)
    ctx.stroke()
    branch(x2, y2, ang + (r() - 0.5) * 0.35, len * 0.86, width * 0.82, depth + 1)
    if (r() < 0.62) branch(x2, y2, ang + (r() < 0.5 ? -1 : 1) * (0.5 + r() * 0.5), len * 0.64, width * 0.7, depth + 1)
  }
  const roots: Array<[number, number, number]> = [
    [-20, h * 0.85, -0.45], [w + 20, h * 0.25, Math.PI + 0.35], [w * 0.3, h + 20, -1.25], [w + 20, h * 0.95, Math.PI + 0.6], [-20, h * 0.15, 0.3],
  ]
  for (const [x, y, a] of roots) branch(x, y, a, 120, 3, 0)
}

// A canvas sized to the viewport at the screen's pixel density (capped at 2).
export function viewportCanvas(): [HTMLCanvasElement, Ctx, number, number] {
  const c = document.createElement('canvas')
  const dpr = Math.min(2, window.devicePixelRatio || 1)
  const w = window.innerWidth
  const h = window.innerHeight
  c.width = Math.round(w * dpr)
  c.height = Math.round(h * dpr)
  const ctx = c.getContext('2d')!
  ctx.scale(dpr, dpr)
  return [c, ctx, w, h]
}

// The vein pattern as an image the navbar and footer use as a background (set as --veins on <html>).
export function veinsTile(color: string, strength: number): string {
  const w = 1600
  const h = 360
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  drawVeins(c.getContext('2d')!, w, h, color, strength)
  return c.toDataURL('image/png')
}
