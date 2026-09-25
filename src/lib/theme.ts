import { useSyncExternalStore } from 'react'

// Follows the device's light or dark setting. The toggle only tries the other one for this visit;
// a refresh goes back to the device setting.
export function toggleTheme(): void {
  const root = document.documentElement
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark'
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
