import type { ElementType, ReactNode } from 'react'

// A hover wrapper used on list rows across the homepage: a tinted background and four corner
// brackets that slide in from outside the row to frame it. Works for mouse hover and keyboard
// focus (any focusable child triggers it via :focus-within), no JS needed.
export function CornerHover({ as: Tag = 'div', className = '', children }: { as?: ElementType; className?: string; children: ReactNode }) {
  return (
    <Tag className={`corner-hover ${className}`}>
      <span className="ch-corner ch-tl" aria-hidden="true" />
      <span className="ch-corner ch-tr" aria-hidden="true" />
      <span className="ch-corner ch-bl" aria-hidden="true" />
      <span className="ch-corner ch-br" aria-hidden="true" />
      {children}
    </Tag>
  )
}
