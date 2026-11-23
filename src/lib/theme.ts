import { useSyncExternalStore } from 'react'
import { onOtherTab, tellOtherTabs } from './tabSync'

// Switching the theme in one tab switches every other open tab of the site too (no animation
// there: the change happens while that tab is in the background).
onOtherTab((msg) => {
  if (msg.type === 'theme') document.documentElement.dataset.theme = msg.theme
})

// Follows the device's light or dark setting. The toggle only tries the other one for this visit;
// a refresh goes back to the device setting. Where the browser supports it, the switch plays as a
// circle growing from the button that was clicked until it covers the screen and reveals the new
// theme underneath it, instead of an instant flip.
// Switching light and dark: a quick, light crossfade (about a third of a second) from the old look
// to the new one, and the sun/moon icon gives a small spin. Only opacity changes during the fade,
// which the graphics chip does on its own, so it stays smooth on a phone (the earlier growing
// circle redrew a full-page picture every frame). Instant for anyone who prefers less motion, and
// in browsers without view transitions. `_origin` (where the tap was) is kept so callers needn't change.
export function toggleTheme(_origin?: { x: number; y: number }): void {
  const root = document.documentElement
  const next = root.dataset.theme === 'dark' ? 'light' : 'dark'
  tellOtherTabs({ type: 'theme', theme: next })

  const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  // The icon's spin is switched on at the same moment as the new theme, so the outgoing icon is
  // never caught mid-spin.
  const apply = () => {
    if (!still) {
      root.classList.add('theme-switching')
      window.setTimeout(() => root.classList.remove('theme-switching'), 600)
    }
    root.dataset.theme = next
  }
  if (!document.startViewTransition || still) apply()
  else document.startViewTransition(apply)
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
