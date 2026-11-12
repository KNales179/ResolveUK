import { useEffect, useRef } from 'react'
import { gsap, reducedMotion } from '../../lib/gsap'

// Matches every link and button site-wide, plus the handful of <label> elements that act as a
// clickable control themselves (a category tile or the photo dropzone, each wrapping a hidden
// radio/file input) — except ones that opt out with data-no-tag and ones already inside their own
// richer version of this same idea (the hero card stack).
const SELECTOR = 'a:not([data-no-tag]), button:not([data-no-tag]):not(:disabled), label.tile:not([data-no-tag]), label.dropzone:not([data-no-tag])'

function labelFor(el: HTMLElement): string | null {
  const explicit = el.getAttribute('data-tag')
  if (explicit) return explicit
  const aria = el.getAttribute('aria-label')
  if (aria) return aria
  const text = el.textContent?.replace(/\s+/g, ' ').trim()
  return text || null
}

// A small branded tag that follows the cursor over any link or button, anywhere on the site —
// the nav, the footer, every page — saying what a click there does (its own label, read straight
// off the element). The hero card stack (.stack-idle) opts out here since it already runs a
// richer, per-element version of the same mechanic; this component is everything else.
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
    // quickTo for opacity/scale too, not plain .to() calls fired only on transitions — under fast
    // repeated toggling, several independent .to() tweens on the same properties can overlap and
    // leave the final rendered value stuck wherever the last-resolved one happened to land, even
    // after this component's own tracked state is correctly back to "nothing hovered". quickTo
    // reuses one persistent tween and just re-aims it, driven every frame below, so it always
    // converges on the current correct target regardless of how it got there.
    const showOpacity = gsap.quickTo(tagEl, 'opacity', { duration: 0.18, ease: 'power2.out' })
    const showScale = gsap.quickTo(tagEl, 'scale', { duration: 0.22, ease: 'back.out(1.7)' })

    let active: HTMLElement | null = null
    let lastX = 0
    let lastY = 0
    let hasPointer = false

    // Browsers coalesce mousemove to roughly one dispatched event per animation frame — during a
    // genuinely fast flick of the mouse, a brief pass over a small target can be dropped entirely
    // before it ever reaches this listener (real, documented browser behaviour, not a bug in this
    // code). Reacting only to whichever events happen to arrive left the tag able to miss a
    // hover-out (or hover-in) completely and get stuck. Instead, mousemove only ever records the
    // latest known position; a requestAnimationFrame loop re-checks what's actually under that
    // position every single frame, so the result can't depend on how many discrete events the
    // browser decided to deliver.
    const onMove = (e: MouseEvent) => {
      lastX = e.clientX
      lastY = e.clientY
      hasPointer = true
    }
    // The cursor leaving the browser window entirely fires no further mousemove to catch it.
    const onWindowLeave = () => {
      hasPointer = false
    }
    // Backgrounding the tab (switching apps/tabs) stops delivering mousemove too — the real
    // cursor may go on to move over other windows entirely, so lastX/lastY can go stale while
    // hidden. Treated the same as the cursor leaving: forget it, and wait for a fresh mousemove
    // once the tab is visible again rather than trusting a position from before it was hidden.
    const onVisibilityChange = () => {
      if (document.hidden) hasPointer = false
    }

    let rafId = 0
    const tick = () => {
      rafId = requestAnimationFrame(tick)
      const next = hasPointer
        ? (() => {
            const hit = document.elementFromPoint(lastX, lastY) as HTMLElement | null
            const target = hit?.closest<HTMLElement>(SELECTOR)
            return target && !target.closest('.stack-idle') && labelFor(target) ? target : null
          })()
        : null

      if (next !== active) {
        active = next
        if (active) textEl.textContent = labelFor(active)
      }
      showOpacity(active ? 1 : 0)
      showScale(active ? 1 : 0.85)
      if (active) {
        moveX(lastX + 16)
        moveY(lastY + 16)
      }
    }
    rafId = requestAnimationFrame(tick)

    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onWindowLeave)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onWindowLeave)
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
