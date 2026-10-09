import { Link } from 'react-router-dom'
import { Icon } from '../components/ui/Icon'

// Marks a page as a concept sketch, not a real feature, without giving it a different shell from
// the rest of the site: everything else about the page (nav, footer, fonts, components) is the same.
export function ConceptBanner({ back }: { back?: boolean }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface2/60 px-5 py-3 text-sm">
      <p className="flex items-center gap-2 font-semibold">
        <Icon name="shield" className="size-4 shrink-0 text-accent" />
        Concept preview, not part of the live site.
      </p>
      {back ? (
        <Link to="/v2" className="font-semibold text-accent hover:underline">
          ← Concept overview
        </Link>
      ) : (
        <Link to="/" className="font-semibold text-soft hover:text-ink">
          Back to the real site
        </Link>
      )}
    </div>
  )
}
