import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useThemeName } from '../../lib/theme'
import { applyBgForTheme } from '../../lib/bgPreview'
import { drawContours, drawLeaves, rgba, veinsTile, viewportCanvas } from '../../lib/backdrops'

// The page background, fixed behind everything (the owner's picks from the "Resolve Backdrops"
// samples):
// - "home": contour lines, like an Ordnance Survey map, slightly blurred, running the whole length
//   of the page and scrolling with it (see ScrollContours).
// - "page": every other page. Soft colour fields in the brand greens, with dappled leaf shadows
//   (sunlight through a tree) swaying very slowly on top.
// A fine film grain sits over both. Redrawn when the theme or window size changes; the drift and
// sway are switched off for anyone who prefers reduced motion.
// - "public": every page of the public website except the homepage. The old landscape photo at the
//   top of the page, fading out as it goes down and scrolling with the page, with the same long,
//   scrolling contour lines over it where the line grid used to be.
// On both, the contour lines near the cursor light up in the accent green, the way the grid did.
export function Backdrop({ kind }: { kind: 'home' | 'page' | 'public' }) {
  if (kind === 'public') return <PublicBackdrop />
  return <DrawnBackdrop kind={kind} />
}

function DrawnBackdrop({ kind }: { kind: 'home' | 'page' }) {
  const host = useRef<HTMLDivElement>(null)
  const theme = useThemeName()

  // The background shade picked for each theme follows the theme on every page that has a
  // backdrop, the app included, so a dark shade never stays behind after switching to light.
  useEffect(() => applyBgForTheme(theme), [theme])

  useEffect(() => {
    const el = host.current
    if (!el) return
    const dark = theme === 'dark'
    const ink = dark ? '#4fd1a0' : '#0b3d36'

    const draw = () => {
      el.replaceChildren()
      if (kind === 'page') {
        const mesh = document.createElement('div')
        mesh.className = 'backdrop-mesh'
        mesh.style.background = dark
          ? `radial-gradient(40% 50% at 15% 20%, ${rgba('#1f7a5a', 0.5)}, transparent 70%), radial-gradient(45% 45% at 85% 25%, ${rgba('#0f5c4f', 0.55)}, transparent 70%), radial-gradient(50% 55% at 60% 90%, ${rgba('#3d6b3a', 0.4)}, transparent 70%)`
          : `radial-gradient(40% 50% at 12% 18%, ${rgba('#94c690', 0.5)}, transparent 70%), radial-gradient(45% 45% at 88% 22%, ${rgba('#99b788', 0.45)}, transparent 70%), radial-gradient(50% 55% at 62% 92%, ${rgba('#cfe3b8', 0.65)}, transparent 70%), radial-gradient(35% 35% at 40% 55%, ${rgba('#e4efd9', 0.85)}, transparent 70%)`
        const [c, ctx, w, h] = viewportCanvas()
        // Phones and tablets: the leaves' softness is drawn into the picture once, rather than a
        // live blur the phone re-applies (like Fico's background, which has no live blur at all).
        const bake = matchMedia('(pointer: coarse), (max-width: 760px)').matches && 'filter' in ctx
        if (bake) ctx.filter = 'blur(8px)'
        drawLeaves(ctx, w, h, ink)
        c.className = bake ? 'backdrop-leaves is-baked' : 'backdrop-leaves'
        c.style.opacity = dark ? '0.11' : '0.15'
        el.append(mesh, c)
      }
    }

    draw()
    let t = 0
    // On a phone the address bar sliding in and out while scrolling counts as a resize; redrawing
    // then threw the canvas away mid-scroll. Only a real change of width (or a big height change,
    // like turning the phone) redraws it.
    let lastW = window.innerWidth
    let lastH = window.innerHeight
    const onResize = () => {
      if (window.innerWidth === lastW && Math.abs(window.innerHeight - lastH) < 160) return
      lastW = window.innerWidth
      lastH = window.innerHeight
      window.clearTimeout(t)
      t = window.setTimeout(draw, 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
    }
  }, [kind, theme])

  return (
    <>
      <div ref={host} className="site-backdrop" aria-hidden="true" />
      {kind === 'home' && <ScrollContours dark={theme === 'dark'} />}
      <div className="site-grain" aria-hidden="true" />
    </>
  )
}

// The leaf-vein pattern behind the navbar and footer: drawn once per theme and handed to CSS as
// --veins on <html>, so the header and footer (see index.css) can both use it.
export function VeinsSync() {
  const theme = useThemeName()
  useEffect(() => {
    const dark = theme === 'dark'
    const url = veinsTile(dark ? '#4fd1a0' : '#0b3d36', dark ? 1.1 : 1.3)
    document.documentElement.style.setProperty('--veins', `url(${url})`)
  }, [theme])
  return null
}

function PublicBackdrop() {
  const theme = useThemeName()
  useEffect(() => applyBgForTheme(theme), [theme])
  return (
    <>
      <div className="public-photo" aria-hidden="true" />
      <ScrollContours dark={theme === 'dark'} />
      <div className="site-grain" aria-hidden="true" />
    </>
  )
}

// ---- contour lines down the whole page ----
// A whole page is too tall for one canvas, so the lines are drawn in strips stacked one under
// another (each continuing the same map, so they join up), and a strip is only drawn once it comes
// near the screen. The layer sits at the top of the document and is as tall as the page, so it
// scrolls with it. Each strip has the plain lines and, on top, the same lines in the accent colour,
// shown only around the pointer: the glow.
const STRIP = 1400 // a multiple of 7, the contour grid step

function ScrollContours({ dark }: { dark: boolean }) {
  const host = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })

  // How big the page is. Measured from the app's own root, never the document, which this layer
  // itself makes taller.
  useEffect(() => {
    const root = document.getElementById('root') ?? document.body
    let t = 0
    const measure = () => {
      window.clearTimeout(t)
      t = window.setTimeout(() => setSize({ w: document.documentElement.clientWidth, h: Math.ceil(root.getBoundingClientRect().height) }), 120)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(root)
    window.addEventListener('resize', measure)
    return () => {
      window.clearTimeout(t)
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [])

  // The glow follows the pointer (a mouse or pen; a finger has no hover), in page coordinates, so
  // it stays under the pointer as the page scrolls. Off for anyone who prefers reduced motion.
  useEffect(() => {
    const el = host.current
    // Not on touch screens either: there is no pointer to follow, and updating it on every scroll
    // made the phone recheck the styles of the whole contour layer each frame.
    if (!el || matchMedia('(prefers-reduced-motion: reduce)').matches || matchMedia('(pointer: coarse)').matches) return
    let raf = 0
    let cx = -9999
    let cy = -9999
    const paint = () => {
      raf = 0
      el.style.setProperty('--spot-x', `${cx + window.scrollX}px`)
      el.style.setProperty('--spot-y', `${cy + window.scrollY}px`)
    }
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(paint)
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      cx = e.clientX
      cy = e.clientY
      queue()
    }
    const leave = () => {
      cx = -9999
      cy = -9999
      queue()
    }
    window.addEventListener('pointermove', move, { passive: true })
    window.addEventListener('scroll', queue, { passive: true })
    document.documentElement.addEventListener('pointerleave', leave)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('scroll', queue)
      document.documentElement.removeEventListener('pointerleave', leave)
    }
  }, [size.w, size.h])

  if (!size.w || !size.h) return null
  const strips = Math.ceil(size.h / STRIP)
  return createPortal(
    <div ref={host} className="contour-scroll" style={{ height: size.h }} aria-hidden="true">
      {Array.from({ length: strips }, (_, i) => {
        const h = Math.min(STRIP, size.h - i * STRIP)
        return <ContourStrip key={`${i}-${size.w}-${h}-${dark}`} top={i * STRIP} w={size.w} h={h} dark={dark} />
      })}
    </div>,
    document.body,
  )
}

// One shared drawing thread for every strip, started the first time one is needed. Browsers that
// can't hand a canvas to another thread draw on the page as before.
let contourThread: Worker | null | undefined
function drawingThread(): Worker | null {
  if (contourThread !== undefined) return contourThread
  try {
    contourThread =
      typeof OffscreenCanvas !== 'undefined' && 'transferControlToOffscreen' in HTMLCanvasElement.prototype
        ? new Worker(new URL('../../lib/contourWorker.ts', import.meta.url), { type: 'module' })
        : null
  } catch {
    contourThread = null
  }
  return contourThread
}

function ContourStrip({ top, w, h, dark }: { top: number; w: number; h: number; dark: boolean }) {
  const box = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    // Phones and tablets: thin lines look the same at normal resolution (a quarter of the memory of
    // double), and there is no mouse for the glow, so its second canvas is skipped.
    const touch = matchMedia('(pointer: coarse)').matches
    const draw = () => {
      const dpr = touch ? 1 : Math.min(2, window.devicePixelRatio || 1)
      const make = (color: string, alpha: number, cls: string) => {
        const c = document.createElement('canvas')
        c.width = Math.round(w * dpr)
        c.height = Math.round(h * dpr)
        c.className = cls
        const thread = drawingThread()
        if (thread) {
          const off = c.transferControlToOffscreen()
          thread.postMessage({ canvas: off, w, h, dpr, color, alpha, top }, [off])
        } else {
          const ctx = c.getContext('2d')!
          ctx.scale(dpr, dpr)
          drawContours(ctx, w, h, color, alpha, top)
        }
        return c
      }
      const base = make(dark ? '#4fd1a0' : '#0b3d36', dark ? 0.09 : 0.1, 'backdrop-contours')
      if (touch) el.replaceChildren(base)
      else el.replaceChildren(base, make(dark ? '#6ee7b7' : '#1f8a55', dark ? 0.85 : 0.7, 'backdrop-contours-glow'))
    }
    // Drawn when it comes within a screen or so of view, and let go again when it is far away, so
    // a long page only ever holds the few strips around where you are (memory stays flat).
    const io = new IntersectionObserver(
      (entries) => {
        const near = entries.some((e) => e.isIntersecting)
        if (near && !el.firstChild) draw()
        else if (!near && el.firstChild) el.replaceChildren()
      },
      { rootMargin: '900px 0px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [top, w, h, dark])

  return <div ref={box} className="contour-strip" style={{ top, height: h, ['--top' as string]: `${top}px` }} />
}
