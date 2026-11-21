import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'

// Matches every link and button site-wide, plus the handful of <label> elements that act as a
// clickable control themselves (a category tile or the photo dropzone, each wrapping a hidden
// radio/file input) — except ones that opt out with data-no-tag and ones already inside their own
// richer version of this same idea (the hero card stack, .stack-idle).
const SELECTOR = 'a:not([data-no-tag]), button:not([data-no-tag]):not(:disabled), label.tile:not([data-no-tag]), label.dropzone:not([data-no-tag])'

// The tag is a short hint, never a paragraph. A whole card wrapped in a link used to put every
// word of the card into the tag; anything over MAX now says "Open" (a link) or is cut short.
const MAX = 32

function labelFor(el: HTMLElement): string | null {
  const explicit = el.getAttribute('data-tag')
  if (explicit) return explicit
  const raw = (el.getAttribute('aria-label') || el.textContent || '').replace(/\s+/g, ' ').trim()
  if (!raw) return null
  if (raw.length <= MAX) return raw
  if (el.tagName === 'A') return 'Open'
  return raw.slice(0, MAX - 1).replace(/\s+\S*$/, '') + '…'
}

// A small branded tag that follows the cursor over any link or button, anywhere on the site,
// saying what a click there does (its own label, read straight off the element).
//
// Event-driven: it does work only when the pointer moves, the page scrolls under a still pointer,
// or the pointer leaves the window — never a loop that runs every frame for the life of the page.
// The hit test is batched to at most once per frame, and the show/hide tween only fires when the
// hovered target actually changes.
export function CursorTag() {
  const tagRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    // Only on a real mouse: a touch device has no hover to follow, and a reduced-motion user
    // asked for exactly this kind of decorative, cursor-chasing motion to be left out.
    if (reducedMotion() || !matchMedia('(hover: hover) and (pointer: fine)').matches) return
    const tagEl = tagRef.current
    const textEl = textRef.current
    if (!tagEl || !textEl) return

    gsap.set(tagEl, { x: -9999, y: -9999, rotation: -3, scale: 0.85, opacity: 0 })
    const moveX = gsap.quickTo(tagEl, 'x', { duration: 0.2, ease: 'power3.out' })
    const moveY = gsap.quickTo(tagEl, 'y', { duration: 0.2, ease: 'power3.out' })

    let active: HTMLElement | null = null
    let lastX = 0
    let lastY = 0
    let hasPointer = false
    let frame = 0

    const show = (on: boolean) => {
      // overwrite: a fast in/out/in can't leave two tweens fighting over the same properties.
      gsap.to(tagEl, on
        ? { opacity: 1, scale: 1, duration: 0.22, ease: 'back.out(1.7)', overwrite: 'auto' }
        : { opacity: 0, scale: 0.85, duration: 0.18, ease: 'power2.out', overwrite: 'auto' })
    }

    const update = () => {
      frame = 0
      const hit = hasPointer ? (document.elementFromPoint(lastX, lastY) as HTMLElement | null) : null
      const target = hit?.closest<HTMLElement>(SELECTOR)
      const next = target && !target.closest('.stack-idle') && labelFor(target) ? target : null
      if (next !== active) {
        if (next) {
          textEl.textContent = labelFor(next)
          // Jump to the pointer when appearing, rather than gliding in from wherever it last was.
          if (!active) gsap.set(tagEl, { x: lastX + 16, y: lastY + 16 })
        }
        if (!!next !== !!active) show(!!next)
        active = next
      }
      if (active) {
        moveX(lastX + 16)
        moveY(lastY + 16)
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    const onMove = (e: MouseEvent) => {
      lastX = e.clientX
      lastY = e.clientY
      hasPointer = true
      schedule()
    }
    // Scrolling moves content under a still cursor, so the hovered element can change without
    // any mousemove at all.
    const onScroll = () => {
      if (hasPointer) schedule()
    }
    // The cursor leaving the window, or the tab being backgrounded, fires no further mousemove.
    const onLeave = () => {
      hasPointer = false
      schedule()
    }
    const onVisibilityChange = () => {
      if (document.hidden) onLeave()
    }

    document.addEventListener('mousemove', onMove, { passive: true })
    window.addEventListener('scroll', onScroll, { passive: true })
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('mousemove', onMove)
      window.removeEventListener('scroll', onScroll)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  return (
    <div ref={tagRef} className="pointer-events-none fixed left-0 top-0 z-[999] opacity-0">
      <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full bg-accent-vivid px-3.5 py-1.5 text-xs font-bold text-accent-ink shadow-lg">
        <span className="size-1.5 shrink-0 rounded-full bg-accent-ink" />
        <span ref={textRef} />
      </span>
    </div>
  )
}
