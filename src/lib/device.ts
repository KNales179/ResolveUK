// A random id this phone or browser makes for itself, so one device can back a report only once.
// It is not a login and holds no personal details. If the browser blocks storage it lasts until the page closes.
const DEVICE_KEY = 'resolve.device'
const BACKED_KEY = 'resolve.backed'

let inMemoryToken: string | null = null
let inMemoryBacked = new Set<string>()

export function deviceToken(): string {
  try {
    const saved = localStorage.getItem(DEVICE_KEY)
    if (saved) return saved
    const created = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, created)
    return created
  } catch {
    inMemoryToken ??= crypto.randomUUID()
    return inMemoryToken
  }
}

// The reports this device has already backed, so the button can say so.
export function backedReportIds(): Set<string> {
  try {
    const saved = localStorage.getItem(BACKED_KEY)
    return new Set(saved ? (JSON.parse(saved) as string[]) : [])
  } catch {
    return new Set(inMemoryBacked)
  }
}

export function rememberBacked(reportId: string): void {
  const next = backedReportIds().add(reportId)
  inMemoryBacked = next
  try {
    localStorage.setItem(BACKED_KEY, JSON.stringify([...next]))
  } catch {
    // storage is blocked: the in-memory copy above still works for this visit
  }
}
