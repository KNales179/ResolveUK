// Skeleton placeholders: grey shapes, with a soft shimmer, in the layout of what is about to load,
// so a page never shows a blank screen, a "Loading…" line or a spinner while it waits. They use
// the .skeleton class (index.css), which stays still for anyone who prefers less motion.

export function SkeletonLines({ lines = 3, className = '' }: { lines?: number; className?: string }) {
  const widths = ['w-3/4', 'w-full', 'w-2/3', 'w-5/6', 'w-1/2']
  return (
    <div className={`grid gap-2.5 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className={`skeleton h-3 ${widths[i % widths.length]}`} />
      ))}
    </div>
  )
}

export function SkeletonCard({ className = '', media = false }: { className?: string; media?: boolean }) {
  return (
    <div className={`card overflow-hidden rounded-2xl ${className}`} aria-hidden="true">
      {media && <div className="skeleton aspect-[4/3] w-full rounded-none" />}
      <div className="grid gap-3 p-5">
        <div className="skeleton h-4 w-1/3" />
        <SkeletonLines lines={2} />
      </div>
    </div>
  )
}

/** A whole page waiting to load: a heading, a line under it, then a few cards. */
export function PageSkeleton({ cards = 3, media = false, className = '' }: { cards?: number; media?: boolean; className?: string }) {
  return (
    <div className={`mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 ${className}`} aria-busy="true" aria-label="Loading">
      <div className="skeleton h-3 w-28" />
      <div className="skeleton mt-4 h-10 w-2/3 max-w-md" />
      <div className="skeleton mt-4 h-4 w-full max-w-xl" />
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: cards }, (_, i) => (
          <SkeletonCard key={i} media={media} />
        ))}
      </div>
    </div>
  )
}
