import type { ElementType, ReactNode } from 'react'

// Four corner brackets, always visible (not a hover state) — a small framing flourish for a
// single standout card, distinct from CornerHover's hover-only version used on list rows.
export function StaticCorners({ as: Tag = 'div', className = '', children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return (
    <Tag className={`static-corners ${className}`}>
      <span className="sc-corner sc-tl" aria-hidden="true" />
      <span className="sc-corner sc-tr" aria-hidden="true" />
      <span className="sc-corner sc-bl" aria-hidden="true" />
      <span className="sc-corner sc-br" aria-hidden="true" />
      {children}
    </Tag>
  )
}
