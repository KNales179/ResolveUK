import { useEffect, useRef, type ElementType, type ReactNode } from 'react'

// Fades a section up as it scrolls into view. Content is visible by default: the hiding only applies once
// the page has confirmed scripts are running (the "js" class), and never for people who prefer less motion.
export function Reveal({ as: Tag = 'div', className = '', delay = 0, children }: { as?: ElementType; className?: string; delay?: number; children: ReactNode }) {
  const ref = useRef<HTMLElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.classList.add('in')
      return
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('in')
          io.disconnect()
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])
  return (
    <Tag ref={ref} className={`reveal ${className}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>
      {children}
    </Tag>
  )
}
