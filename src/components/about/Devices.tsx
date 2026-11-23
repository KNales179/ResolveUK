import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'
import { useThemeName } from '../../lib/theme'
import { DEMO } from './devicesDemo'

// Resolve UK on a laptop, a tablet and a phone, each acting out a real visit on a loop, made from
// real screenshots of the site (public/devices, captured by a script that clicked through the same
// path; the paths and tap spots are in devicesDemo.ts).
// - Each page is its scrolling content plus its fixed top and bottom bars as separate layers, so the
//   bars stay pinned while the page scrolls under them, like a real browser.
// - The laptop scrolls the way a mouse wheel does (quick notches in short bursts) and a cursor
//   moves to each link and clicks it. The tablet and phone flick (a fast push that glides to a
//   stop) and show a finger tap. Every click or tap opens the next page straight away.
// - Loops while on screen, pauses off screen, and stays on its first screen for anyone who prefers
//   less motion. Light and dark each have their own screenshots.

type Name = keyof typeof DEMO
type Page = { h: number; top: number; bot: number; whole: boolean }
type Step = { page: string; tap: { x: number; y: number; fixed: boolean } | null }

function Shot({ base, part = '' }: { base: string; part?: string }) {
  return (
    <>
      <img src={`/devices/${base}-light${part}.webp`} alt="" decoding="async" className="theme-light-only block h-auto w-full" />
      <img src={`/devices/${base}-dark${part}.webp`} alt="" decoding="async" className="theme-dark-only block h-auto w-full" />
    </>
  )
}

function Screen({ name, label }: { name: Name; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  const theme = useThemeName()
  const demo = DEMO[name] as unknown as { cssW: number; pages: Record<string, Page>; steps: Step[] }
  const keys = Object.keys(demo.pages)
  const mouse = name === 'laptop'

  useEffect(() => {
    const el = box.current
    if (!el || reducedMotion()) return
    const layer = (k: string) => el.querySelector<HTMLElement>(`[data-page="${k}"]`)!
    const content = (k: string) => layer(k).querySelector<HTMLElement>('.demo-content')!
    const pointer = el.querySelector<HTMLElement>('.demo-pointer')!
    const ripple = el.querySelector<HTMLElement>('.demo-ripple')!
    let tl: gsap.core.Timeline | null = null
    let visible = false
    let alive = true

    const build = () => {
      tl?.kill()
      const W = el.clientWidth
      const S = el.clientHeight
      if (!W || !S) return
      const scale = W / demo.cssW
      const maxScroll = (k: string) => Math.max(0, content(k).offsetHeight - S)
      const steps = demo.steps
      const first = steps[0].page

      tl = gsap.timeline({ paused: true, repeat: -1 })
      // A known starting point for every loop.
      keys.forEach((k) => tl!.set(layer(k), { autoAlpha: k === first ? 1 : 0, zIndex: k === first ? 2 : 1, yPercent: 0 }, 0))
      keys.forEach((k) => tl!.set(content(k), { y: 0 }, 0))
      tl.set(pointer, { x: W * 0.62, y: S * 0.55, autoAlpha: mouse ? 1 : 0, scale: 1 }, 0)
      tl.set(ripple, { autoAlpha: 0 }, 0)
      tl.to({}, { duration: 0.9 })

      const scrollOf: Record<string, number> = {}
      keys.forEach((k) => (scrollOf[k] = 0))
      const seen = new Set<string>()
      let z = 3

      steps.forEach((step, i) => {
        const k = step.page
        const c = content(k)
        const max = maxScroll(k)
        const firstVisit = !seen.has(k)
        seen.add(k)

        // Look around the page: wheel notches on the laptop, flicks on touch screens.
        if (firstVisit && !demo.pages[k].whole && max > 0) {
          const target = -Math.round(max * 0.72)
          if (mouse) {
            // A good spin of the wheel: one long, quick scroll (most of a screen), then a pause to
            // look, then another, the way people actually scroll a page with a mouse.
            let y = 0
            while (y > target) {
              y = Math.max(target, y - S * (0.7 + Math.random() * 0.25))
              tl!.to(c, { y, duration: 0.75, ease: 'power2.out' }).to({}, { duration: 0.9 })
            }
            scrollOf[k] = y
          } else {
            let y = 0
            while (y > target) {
              y = Math.max(target, y - S * (0.55 + Math.random() * 0.25))
              tl!.to(c, { y, duration: 0.95, ease: 'expo.out' }).to({}, { duration: 0.35 })
            }
            scrollOf[k] = y
          }
        }
        // Bring a tap target in the page itself into view.
        if (step.tap && !step.tap.fixed) {
          const want = -Math.min(Math.max(0, step.tap.y * scale - S * 0.45), max)
          if (Math.abs(want - scrollOf[k]) > 4) {
            tl!.to(c, mouse ? { y: want, duration: 0.5, ease: 'power2.inOut' } : { y: want, duration: 0.9, ease: 'expo.out' }).to({}, { duration: 0.3 })
            scrollOf[k] = want
          }
        }
        if (!step.tap) return

        // Point and click, or tap.
        const tx = step.tap.x * W
        const ty = step.tap.fixed ? step.tap.y * scale : step.tap.y * scale + scrollOf[k]
        if (mouse) {
          tl!.to(pointer, { x: tx, y: ty, duration: 0.6, ease: 'power2.inOut' }).to(pointer, { scale: 0.82, duration: 0.08 }).to(pointer, { scale: 1, duration: 0.14 })
          tl!.fromTo(ripple, { x: tx, y: ty, scale: 0.3, autoAlpha: 0.8 }, { scale: 1.5, autoAlpha: 0, duration: 0.4, ease: 'power2.out' }, '<-0.1')
        } else {
          tl!.to({}, { duration: 0.25 })
            .fromTo(ripple, { x: tx, y: ty, scale: 0.3, autoAlpha: 0 }, { scale: 1, autoAlpha: 0.9, duration: 0.14, ease: 'power2.out' })
            .to(ripple, { scale: 1.8, autoAlpha: 0, duration: 0.35, ease: 'power2.out' })
        }

        // The next page opens straight away.
        const next = steps[(i + 1) % steps.length].page
        const closingOverlay = demo.pages[k].whole && !demo.pages[next].whole && i > 0 && steps[i - 1].page === next
        const nl = layer(next)
        if (!closingOverlay && next !== k) {
          tl!.set(content(next), { y: 0 }, '-=0.2') // a newly opened page starts at its top
          scrollOf[next] = 0
          if (next === first) seen.delete(next)
        }
        tl!.set(nl, { zIndex: ++z }, '-=0.15')
        if (demo.pages[next].whole && !mouse) {
          tl!.fromTo(nl, { autoAlpha: 0, yPercent: 6 }, { autoAlpha: 1, yPercent: 0, duration: 0.32, ease: 'power3.out' }, '-=0.15')
        } else {
          tl!.fromTo(nl, { autoAlpha: 0 }, { autoAlpha: 1, duration: mouse ? 0.16 : 0.2, ease: 'power1.out' }, '-=0.15')
        }
        tl!.set(layer(k), { autoAlpha: 0 })
        tl!.to({}, { duration: 0.7 })
      })
      if (visible) tl.play()
    }

    const imgs = [...el.querySelectorAll<HTMLImageElement>('img')].filter((i) => i.offsetParent !== null)
    void Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined)))).then(() => alive && build())
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) tl?.play()
      else tl?.pause()
    }, { threshold: 0.25 })
    io.observe(el)
    let t = 0
    const onResize = () => {
      window.clearTimeout(t)
      t = window.setTimeout(build, 200)
    }
    window.addEventListener('resize', onResize)
    return () => {
      alive = false
      io.disconnect()
      window.removeEventListener('resize', onResize)
      window.clearTimeout(t)
      tl?.kill()
      gsap.set(el.querySelectorAll('[data-page], .demo-content, .demo-pointer, .demo-ripple'), { clearProps: 'all' })
    }
    // demo, keys and mouse all follow from name (a fixed import), so name and theme are enough.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, theme])

  return (
    <div ref={box} className="relative size-full overflow-hidden bg-bg" role="img" aria-label={label}>
      {keys.map((k, i) => {
        const p = demo.pages[k]
        const base = `${name}-${k}`
        return (
          <div key={k} data-page={k} className="absolute inset-0 overflow-hidden bg-bg" style={i === 0 ? undefined : { visibility: 'hidden', opacity: 0 }}>
            <div className="demo-content absolute inset-x-0 top-0 will-change-transform">
              <Shot base={base} />
            </div>
            {p.top > 0 && (
              <div className="absolute inset-x-0 top-0 z-10">
                <Shot base={base} part="-top" />
              </div>
            )}
            {p.bot > 0 && (
              <div className="absolute inset-x-0 bottom-0 z-10">
                <Shot base={base} part="-bot" />
              </div>
            )}
          </div>
        )
      })}
      <span className="demo-ripple pointer-events-none absolute left-0 top-0 z-[200] -ml-5 -mt-5 size-10 rounded-full border-2 border-white/90 bg-[rgb(79_209_160/0.45)] opacity-0 shadow-[0_0_0_4px_rgb(0_0_0/0.15)]" />
      {mouse && (
        <svg viewBox="0 0 24 24" className="demo-pointer pointer-events-none absolute left-0 top-0 z-[201] size-[clamp(14px,1.6vw,22px)] opacity-0 drop-shadow-[0_2px_3px_rgb(0_0_0/0.45)]" aria-hidden="true">
          <path d="M3 2l7.5 19 2.6-7.9L21 10.6z" fill="#fff" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  )
}

export function Devices() {
  return (
    <div className="relative mx-auto aspect-[16/12] w-full max-w-5xl">
      <div className="hover-device absolute left-1/2 top-0 w-[86%] -translate-x-1/2 sm:w-[68%]">
        <div className="device-bezel overflow-hidden rounded-t-[1.1rem] border-[0.55rem] border-b-[0.8rem]">
          <div className="aspect-[16/10] overflow-hidden rounded-[0.25rem]">
            <Screen name="laptop" label="Resolve UK on a laptop: the homepage, then Reported problems and Community" />
          </div>
        </div>
        <div className="device-base mx-auto h-[0.85rem] w-[112%] -translate-x-[5.4%] rounded-b-[1.2rem]">
          <div className="mx-auto h-[0.3rem] w-[16%] rounded-b-md bg-black/25" />
        </div>
      </div>

      <div className="hover-device device-bezel absolute bottom-0 left-0 w-[40%] overflow-hidden rounded-[1.4rem] border-[0.5rem] shadow-2xl sm:w-[32%]">
        <div className="aspect-[820/1180] overflow-hidden rounded-[0.8rem]">
          <Screen name="tablet" label="The app on a tablet: the report list, one report, then the map" />
        </div>
      </div>

      <div className="hover-device device-bezel absolute bottom-0 right-0 w-[28%] overflow-hidden rounded-[1.6rem] border-[0.42rem] shadow-2xl sm:right-[2%] sm:w-[21%]">
        <div className="relative flex aspect-[600/1360] flex-col overflow-hidden rounded-[1.15rem] bg-bg">
          <div className="relative h-[4.6%] shrink-0" aria-hidden="true">
            <span className="absolute left-1/2 top-1/2 h-[55%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
          </div>
          <div className="min-h-0 flex-1">
            <Screen name="phone" label="The app on a phone: the feed, the map, a report, then Community" />
          </div>
        </div>
      </div>
    </div>
  )
}
