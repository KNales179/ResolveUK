import { useEffect } from 'react'
import Lenis from 'lenis'
import { gsap, ScrollTrigger, reducedMotion } from './gsap'

// Smooth scrolling synced to GSAP's own ticker (not just the "scroll" event), so pinned and
// scrubbed ScrollTrigger sections stay a frame accurate instead of lagging behind. Mount once,
// on whichever page actually uses GSAP scroll animation.
export function useLenis(): void {
  useEffect(() => {
    if (reducedMotion()) return
    const lenis = new Lenis()
    document.documentElement.classList.add('lenis')
    lenis.on('scroll', ScrollTrigger.update)
    const onTick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(onTick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(onTick)
      lenis.destroy()
      document.documentElement.classList.remove('lenis')
    }
  }, [])
}
