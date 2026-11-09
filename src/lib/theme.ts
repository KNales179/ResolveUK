import { useSyncExternalStore } from 'react'

// Follows the device's light or dark setting. The toggle only tries the other one for this visit;
// a refresh goes back to the device setting. Where the browser supports it, the switch plays as a
// circle growing from the button that was clicked until it covers the screen and reveals the new
// theme underneath it, instead of an instant flip.
export function toggleTheme(origin?: { x: number; y: number }): void {
  const root = document.documentElement
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'

  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    root.dataset.theme = next
    return
  }

  const x = origin?.x ?? window.innerWidth / 2
  const y = origin?.y ?? window.innerHeight / 2
  const endRadius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))

  const transition = document.startViewTransition(() => {
    root.dataset.theme = next
  })

  transition.ready.then(() => {
    root.animate(
      { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${endRadius}px at ${x}px ${y}px)`] },
      { duration: 650, easing: 'ease-in-out', pseudoElement: '::view-transition-new(root)' },
    )
  })
}

export type ThemeName = 'light' | 'dark'

const current = (): ThemeName => (document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

// The theme in use right now, for things that cannot be styled with CSS alone (like the map).
export function useThemeName(): ThemeName {
  return useSyncExternalStore(subscribe, current, () => 'light')
}
