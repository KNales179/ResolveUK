import { gsap, reducedMotion } from './gsap'

// Feedback a person can feel when they do something that matters (thank a post, back a report,
// follow one): a quick wind-up (the button dips), then an exaggerated pop that overshoots and
// settles (follow-through), a ring that spreads out, and, if given, a small label such as "+1"
// that floats up and fades. Short (under half a second) so nothing ever waits on it.
// Does nothing for anyone who prefers less motion.
export function celebrate(el: HTMLElement | null, label?: string): void {
  if (!el || reducedMotion()) return
  const icon = el.querySelector<SVGElement | HTMLElement>('svg') ?? el
  gsap
    .timeline()
    .to(icon, { scale: 0.7, duration: 0.08, ease: 'power2.in' }) // wind-up
    .to(icon, { scale: 1.45, rotation: -8, duration: 0.18, ease: 'power2.out' }) // pop
    .to(icon, { scale: 1, rotation: 0, duration: 0.45, ease: 'elastic.out(1, 0.45)', clearProps: 'transform' }) // settle

  const r = el.getBoundingClientRect()
  const ring = document.createElement('span')
  ring.className = 'fx-ring'
  const size = Math.max(r.height, 28)
  Object.assign(ring.style, { left: `${r.left + r.width / 2 - size / 2}px`, top: `${r.top + r.height / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` })
  document.body.appendChild(ring)
  gsap.fromTo(ring, { scale: 0.4, opacity: 0.7 }, { scale: 1.9, opacity: 0, duration: 0.55, ease: 'power2.out', onComplete: () => ring.remove() })

  if (label) {
    const tag = document.createElement('span')
    tag.className = 'fx-float'
    tag.textContent = label
    Object.assign(tag.style, { left: `${r.left + r.width / 2}px`, top: `${r.top}px` })
    document.body.appendChild(tag)
    gsap.fromTo(tag, { xPercent: -50, y: 0, opacity: 0, scale: 0.6 }, { y: -34, opacity: 1, scale: 1.1, duration: 0.35, ease: 'back.out(2)' })
    gsap.to(tag, { opacity: 0, y: -48, duration: 0.35, delay: 0.45, ease: 'power1.in', onComplete: () => tag.remove() })
  }
}
