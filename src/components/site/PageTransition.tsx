import { useEffect, useRef, useState } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { gsap, reducedMotion } from '../../lib/gsap'

const scrollForLocation = (hash: string) => {
  if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  else window.scrollTo(0, 0)
}

// A GSAP crossfade between routes: the outgoing page settles up and fades out, then the already-
// rendered incoming page (from useOutlet, which always reflects the current location) is swapped
// in and rises up from below. useOutlet's return value is captured in state rather than rendered
// directly so the outgoing page's DOM stays in place for its own exit animation instead of being
// replaced by React the instant the location changes. The scroll-to-top (or to a #hash target)
// that used to run separately on every location change now happens at the same moment as the
// swap, so the outgoing page fades out in place instead of jumping to the top mid-fade.
export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const [shown, setShown] = useState({ key: location.pathname, outlet })
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (location.pathname === shown.key) {
      // Same route, e.g. a hash change or a param swap within the same page — keep it live, no transition.
      setShown({ key: location.pathname, outlet })
      scrollForLocation(location.hash)
      return
    }
    const el = boxRef.current
    if (!el || reducedMotion()) {
      setShown({ key: location.pathname, outlet })
      scrollForLocation(location.hash)
      return
    }
    const tl = gsap.timeline({
      onComplete: () => {
        setShown({ key: location.pathname, outlet })
        scrollForLocation(location.hash)
      },
    })
    tl.to(el, { opacity: 0, y: -14, duration: 0.22, ease: 'power2.in' })
    return () => {
      tl.kill()
    }
    // location.key changes on every navigation, including a hash-only change (e.g. /#how from
    // /), which location.pathname alone would miss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  useEffect(() => {
    const el = boxRef.current
    if (!el || reducedMotion()) return
    gsap.fromTo(el, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' })
  }, [shown.key])

  return <div ref={boxRef}>{shown.outlet}</div>
}
