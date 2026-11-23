import { Suspense, useEffect, useRef, type ReactNode } from 'react'
import { useLocation, useOutlet } from 'react-router-dom'
import { usePageIntro } from '../../lib/usePageIntro'
import { PageSkeleton } from '../ui/Skeleton'

const scrollForLocation = (hash: string) => {
  if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  else window.scrollTo(0, 0)
}

// Renders the current route directly, no fade between pages — the earlier GSAP crossfade had a
// moment of near-zero opacity right at the swap, which read as a blink/flash rather than a smooth
// transition. Still handles the scroll-to-top (or to a #hash target) on every navigation.
/** A page's content with its entrance. It sits inside the page's own loading boundary, so the
 *  entrance plays when the page has actually arrived, never on the loading skeleton. */
export function PageIntro({ id, enabled = true, children }: { id: string; enabled?: boolean; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  usePageIntro(root, id, enabled)
  return (
    <div ref={root} className="contents">
      {children}
    </div>
  )
}

export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()

  useEffect(() => {
    scrollForLocation(location.hash)
    // location.key changes on every navigation, including a hash-only change (e.g. /#how from
    // /), which location.pathname alone would miss.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key])

  // Like Fico: each page has its own loading boundary, so while a page's code is still on its way
  // the header and footer stay put and only this area shows a skeleton, straight away, instead of
  // the old page sitting there unresponsive until the new one is ready.
  // display: contents, so the wrappers add nothing to the layout.
  return (
    <div className={`contents ${location.pathname !== '/' ? 'page-fx' : ''}`}>
      <Suspense
        key={location.pathname}
        fallback={
          <div className="min-h-svh pt-24">
            <PageSkeleton />
          </div>
        }
      >
        {/* Every public page gets the homepage's kind of entrance; the homepage keeps its own. */}
        <PageIntro id={location.pathname} enabled={location.pathname !== '/'}>
          {outlet}
        </PageIntro>
      </Suspense>
    </div>
  )
}
