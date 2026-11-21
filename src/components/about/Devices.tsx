import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'
import { useThemeName } from '../../lib/theme'

// Resolve UK on a laptop, a tablet and a phone, each acting out a short, looping visit, made from
// real screenshots of the site (public/devices/*.webp, two per device: "a" the page it starts on,
// tall, and "b" the page a tap on "a" opens). Each device scrolls its page the way a person does
// (eases in, speeds up, eases out, with pauses), shows a tap on a real button, the next page
// slides or fades in, then it goes back and starts again. They loop while on screen, pause
// off screen, and stay still on their first screen for anyone who prefers less motion.
// Light and dark each have their own screenshots. Adapted from the Fico landing page frames.

type Name = 'laptop' | 'tablet' | 'phone'

// Where the tapped button sits on the "a" screenshot, as fractions of its width and height
// (measured when the screenshots were taken), and how the "b" page arrives.
const SCRIPT: Record<Name, { tap: [number, number]; arrive: 'fade' | 'slide'; bScroll: boolean; start: number }> = {
  laptop: { tap: [0.3, 0.27], arrive: 'fade', bScroll: true, start: 0 },
  tablet: { tap: [0.26, 0.4], arrive: 'slide', bScroll: false, start: 1.4 },
  phone: { tap: [0.91, 0.072], arrive: 'slide', bScroll: false, start: 2.8 },
}

function Shots({ name, part }: { name: Name; part: 'a' | 'b' }) {
  return (
    <>
      <img src={`/devices/${name}-${part}-light.webp`} alt="" decoding="async" className="theme-light-only block h-auto w-full" />
      <img src={`/devices/${name}-${part}-dark.webp`} alt="" decoding="async" className="theme-dark-only block h-auto w-full" />
    </>
  )
}

function Screen({ name, label }: { name: Name; label: string }) {
  const box = useRef<HTMLDivElement>(null)
  const theme = useThemeName()

  useEffect(() => {
    const el = box.current
    if (!el || reducedMotion()) return
    const a = el.querySelector<HTMLElement>('.demo-a')!
    const b = el.querySelector<HTMLElement>('.demo-b')!
    const tap = el.querySelector<HTMLElement>('.demo-tap')!
    const s = SCRIPT[name]
    let tl: gsap.core.Timeline | null = null
    let visible = false
    let alive = true

    const build = () => {
      tl?.kill()
      const S = el.clientHeight
      const A = a.offsetHeight
      const B = b.offsetHeight
      if (!S || !A) return
      const deepest = -Math.max(0, A - S)
      const toTap = -Math.min(Math.max(0, s.tap[1] * A - S * 0.45), Math.max(0, A - S))
      const scroll = { ease: 'sine.inOut' }
      gsap.set(a, { y: 0, opacity: 1 })
      gsap.set(b, s.arrive === 'slide' ? { xPercent: 100, y: 0, opacity: 1 } : { xPercent: 0, y: 12, opacity: 0 })
      gsap.set(tap, { left: `${s.tap[0] * 100}%`, top: `${s.tap[1] * 100}%`, scale: 0.3, opacity: 0 })

      tl = gsap.timeline({ paused: true, repeat: -1, repeatDelay: 0.6, delay: s.start })
      tl.to({}, { duration: 1 }) // a moment on the first screen
        .to(a, { y: deepest * 0.55, duration: 3.2, ...scroll }) // read down the page…
        .to({}, { duration: 0.9 })
        .to(a, { y: deepest, duration: 2.4, ...scroll }) // …to the end
        .to({}, { duration: 0.8 })
        .to(a, { y: toTap, duration: 2.6, ...scroll }) // back up to the button
        .to({}, { duration: 0.4 })
        .to(tap, { scale: 1, opacity: 0.9, duration: 0.22, ease: 'power2.out' }) // the tap
        .to(tap, { scale: 1.9, opacity: 0, duration: 0.45, ease: 'power2.out' })
        .add('open', '-=0.25')
      if (s.arrive === 'slide') tl.to(b, { xPercent: 0, duration: 0.65, ease: 'power3.inOut' }, 'open')
      else tl.to(b, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' }, 'open')
      tl.to({}, { duration: 1.2 })
      if (s.bScroll && B > S) {
        tl.to(b, { y: -(B - S) * 0.7, duration: 3, ...scroll }).to({}, { duration: 1 })
      } else {
        tl.to({}, { duration: 1.6 })
      }
      // Back to the start: the first page returns to its top behind the second, which then leaves.
      tl.set(a, { y: 0 })
      if (s.arrive === 'slide') tl.to(b, { xPercent: 100, duration: 0.6, ease: 'power3.inOut' })
      else tl.to(b, { opacity: 0, duration: 0.5, ease: 'power2.inOut' })
      tl.set(b, { y: s.arrive === 'slide' ? 0 : 12 })
      if (visible) tl.play()
    }

    // Wait for the screenshots in use to load, so their heights are known.
    const imgs = [...el.querySelectorAll<HTMLImageElement>('img')].filter((i) => i.offsetParent !== null)
    void Promise.all(imgs.map((i) => (i.complete ? Promise.resolve() : i.decode().catch(() => undefined)))).then(() => {
      if (alive) build()
    })

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
      gsap.set([a, b, tap], { clearProps: 'all' })
    }
  }, [name, theme])

  return (
    <div ref={box} className="relative size-full overflow-hidden bg-bg" role="img" aria-label={label}>
      <div className="demo-a absolute inset-x-0 top-0 will-change-transform">
        <Shots name={name} part="a" />
        <span className="demo-tap pointer-events-none absolute -ml-5 -mt-5 size-10 rounded-full border-2 border-white/90 bg-[rgb(79_209_160/0.45)] opacity-0 shadow-[0_0_0_4px_rgb(0_0_0/0.15)]" />
      </div>
      <div className="demo-b absolute inset-x-0 top-0 opacity-0 shadow-[-12px_0_30px_-12px_rgb(0_0_0/0.4)] will-change-transform">
        <Shots name={name} part="b" />
      </div>
    </div>
  )
}

export function Devices() {
  return (
    <div className="relative mx-auto aspect-[16/12] w-full max-w-5xl">
      <div className="hover-device absolute left-1/2 top-0 w-[86%] -translate-x-1/2 sm:w-[68%]">
        <div className="device-bezel overflow-hidden rounded-t-[1.1rem] border-[0.55rem] border-b-[0.8rem]">
          <div className="aspect-[16/10] overflow-hidden rounded-[0.25rem]">
            <Screen name="laptop" label="The Resolve UK homepage on a laptop, opening Reported problems" />
          </div>
        </div>
        <div className="device-base mx-auto h-[0.85rem] w-[112%] -translate-x-[5.4%] rounded-b-[1.2rem]">
          <div className="mx-auto h-[0.3rem] w-[16%] rounded-b-md bg-black/25" />
        </div>
      </div>

      <div className="hover-device device-bezel absolute bottom-0 left-0 w-[40%] overflow-hidden rounded-[1.4rem] border-[0.5rem] shadow-2xl sm:w-[32%]">
        <div className="aspect-[820/1180] overflow-hidden rounded-[0.8rem]">
          <Screen name="tablet" label="Reports in the app on a tablet, opening one report" />
        </div>
      </div>

      <div className="hover-device device-bezel absolute bottom-0 right-0 w-[28%] overflow-hidden rounded-[1.6rem] border-[0.42rem] shadow-2xl sm:right-[2%] sm:w-[21%]">
        <div className="relative flex aspect-[600/1360] flex-col overflow-hidden rounded-[1.15rem] bg-bg">
          <div className="relative h-[4.6%] shrink-0" aria-hidden="true">
            <span className="absolute left-1/2 top-1/2 h-[55%] w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-black" />
          </div>
          <div className="min-h-0 flex-1">
            <Screen name="phone" label="The signed-in home feed on a phone, opening the map" />
          </div>
        </div>
      </div>
    </div>
  )
}
