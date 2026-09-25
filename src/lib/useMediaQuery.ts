import { useSyncExternalStore } from 'react'

// True while the screen matches a CSS media query, and updates when it changes (for example when a tablet is turned).
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => matchMedia(query).matches,
    () => false,
  )
}
