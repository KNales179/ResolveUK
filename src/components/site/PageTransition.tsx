import { useEffect } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'

const scrollForLocation = (hash: string) => {
  if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  else window.scrollTo(0, 0)
}

// Renders the current route directly, no fade between pages — the earlier GSAP crossfade had a
// moment of near-zero opacity right at the swap, which read as a blink/flash rather than a smooth
// transition. Still handles the scroll-to-top (or to a #hash target) on every navigation.
export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => {
    scrollForLocation(location.hash)
    // location.key changes on every navigation, including a hash-only change (e.g. /#how from
    // /), which location.pathname alone would miss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  return outlet
}
