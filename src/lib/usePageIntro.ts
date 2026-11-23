import { useLayoutEffect, type RefObject } from 'react'
import { gsap, ScrollTrigger, reducedMotion } from './gsap'

// The same feel as the homepage on every other page. On each page change:
// 1. Intro: what is on screen first (the label, the heading, the text under it, buttons, the top
//    panel) rises in with a quick stagger, the heading with a slight lift and un-blur.
// 2. Scroll: cards and sections further down fade up as they come into view, a few at a time.
// Content is visible by default: GSAP only hides things at the moment it animates them, it never
// runs for anyone who prefers less motion, and everything is put back when the page changes.
// Skips anything that already has its own reveal (.reveal, the homepage) and anything inside a
// map or dialog.
const INTRO = 'h1, .eyebrow, h1 + p, h1 ~ p, .accent-panel, main .btn'
const LATER = '.card, .panel-tint, .panel-neutral, .panel-caution, article, section > h2, li.card, figure, details, .accent-panel, ol > li, .report-grid > li'
const SKIP = '.reveal, .maplibregl-map, [role="dialog"], .no-intro, .wtn'

export function usePageIntro(root: RefObject<HTMLElement | null>, key: string, enabled = true) {
  useLayoutEffect(() => {
    const scope = root.current
    if (!enabled || !scope || reducedMotion()) return
    const ok = (el: Element) => !el.closest(SKIP) && !el.querySelector(':scope > .reveal')
    const fold = window.innerHeight * 0.92

    const ctx = gsap.context(() => {
      const all = (sel: string) => gsap.utils.toArray<HTMLElement>(scope.querySelectorAll(sel)).filter(ok)
      // Only elements that are not inside another animated one, so nothing moves twice.
      const outermost = (list: HTMLElement[]) => list.filter((el) => !list.some((o) => o !== el && o.contains(el)))

      const intro = outermost(all(INTRO).filter((el) => el.getBoundingClientRect().top < fold))
      const heads = intro.filter((el) => el.tagName === 'H1')
      const rest = intro.filter((el) => el.tagName !== 'H1')
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } })
      // The heading's un-blur is skipped on touch screens: animating a blur is costly on a phone.
      const touch = matchMedia('(pointer: coarse)').matches
      if (heads.length) tl.from(heads, { y: 34, opacity: 0, ...(touch ? {} : { filter: 'blur(6px)' }), duration: 0.8, clearProps: 'filter,transform,opacity' }, 0)
      // A slight overshoot as each one lands (follow-through), rather than a dead stop.
      if (rest.length) tl.from(rest, { y: 22, opacity: 0, duration: 0.7, stagger: 0.06, ease: 'back.out(1.3)', clearProps: 'transform,opacity' }, 0.08)

      const later = outermost(all(LATER).filter((el) => el.getBoundingClientRect().top >= fold && !intro.some((i) => i.contains(el))))
      if (later.length) {
        gsap.set(later, { opacity: 0, y: 30 })
        ScrollTrigger.batch(later, {
          start: 'top 90%',
          once: true,
          onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08, clearProps: 'transform' }),
        })
      }
    }, scope)
    // Layout can settle after fonts and images load; let ScrollTrigger re-measure.
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 400)
    return () => {
      window.clearTimeout(t)
      ctx.revert()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled])
}
