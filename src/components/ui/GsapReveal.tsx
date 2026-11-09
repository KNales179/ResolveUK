import { useEffect, useRef, type ElementType, type ReactNode } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'

// A GSAP+ScrollTrigger sibling of Reveal.tsx, for the homepage only. Content is visible by
// default; the fade-up only ever gets applied once GSAP actually runs the tween, and never for
// anyone who prefers less motion, so nothing is hidden by default.
export function GsapReveal({
  as: Tag = 'div',
  className = '',
  delay = 0,
  y = 28,
  children,
}: {
  as?: ElementType
  className?: string
  delay?: number
  y?: number
  children: ReactNode
}) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || reducedMotion()) return
    const ctx = gsap.context(() => {
      gsap.fromTo(
        el,
        { opacity: 0, y },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          delay: delay / 1000,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        },
      )
    })
    return () => ctx.revert()
  }, [delay, y])

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  )
}
