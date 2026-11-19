import { Link } from 'react-router-dom'
import { Icon } from './Icon'

// "Back to ..." as a real button: a clearly outlined target at least 44px tall, never small grey
// text that blends into the page and is easy to miss or mis-tap. A link with `to`, or a button
// with `onClick` (for steps inside one page, like leaving "forgot password" for sign in).
export function BackLink({ to, onClick, children, className = '' }: { to?: string; onClick?: () => void; children: string; className?: string }) {
  const cls = `back-link ${className}`
  const body = (
    <>
      <Icon name="chevron-left" className="size-[18px]" />
      {children}
    </>
  )
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls}>
      {body}
    </button>
  )
}
