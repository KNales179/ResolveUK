const rtf = new Intl.RelativeTimeFormat('en-GB', { numeric: 'auto' })

// "2 hours ago", "yesterday", "3 weeks ago". Falls back to a plain date for anything older than a few months.
export function timeAgo(iso: string, now = Date.now()): string {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000)
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ['minute', 60],
    ['hour', 3600],
    ['day', 86400],
    ['week', 604800],
    ['month', 2629800],
  ]
  const abs = Math.abs(seconds)
  if (abs < 60) return 'just now'
  for (let i = steps.length - 1; i >= 0; i--) {
    const [unit, size] = steps[i]
    if (abs >= size) {
      if (unit === 'month' && abs >= size * 6) break
      return rtf.format(Math.round(seconds / size), unit)
    }
  }
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
