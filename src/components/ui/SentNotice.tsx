// The "Report sent" message after sending a report: a tick that draws itself inside a circle that
// pops in, beside the message. The tick and pop are CSS (.sent-*), and stay still for anyone who
// prefers less motion.
export function SentNotice({ text, className = '' }: { text: string; className?: string }) {
  return (
    <p className={`msg msg-ok sent-notice flex items-center gap-3 ${className}`} role="status">
      <svg viewBox="0 0 32 32" className="sent-badge size-8 shrink-0" aria-hidden="true">
        <circle cx="16" cy="16" r="14" className="sent-circle" />
        <path d="M9.5 16.5l4.5 4.5 8.5-9" className="sent-tick" />
      </svg>
      <span>{text}</span>
    </p>
  )
}
