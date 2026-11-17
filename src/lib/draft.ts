import type { Position } from '../types'

// An unsent report kept on this device, so switching apps to take the photo, a phone call or a
// reload doesn't lose it. The text and pin go in localStorage; the photo, too large for that, goes
// in IndexedDB. Cleared once the report is sent, and ignored after a day.

export interface Draft {
  category: string
  description: string
  position: Position | null
  savedAt: number
}

const KEY = 'resolve.reportDraft'
const MAX_AGE = 24 * 60 * 60 * 1000

export function loadDraft(): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || 'null') as Draft | null
    if (!d || Date.now() - d.savedAt > MAX_AGE) return null
    return d
  } catch {
    return null
  }
}

export function saveDraft(d: Omit<Draft, 'savedAt'>): void {
  try {
    const empty = !d.category && !d.description.trim() && !d.position
    if (empty) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, JSON.stringify({ ...d, savedAt: Date.now() }))
  } catch {
    // storage blocked: the form still works, it just isn't kept
  }
}

// ---- The photo, in IndexedDB ----
function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('resolve-draft', 1)
    req.onupgradeneeded = () => req.result.createObjectStore('files')
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function run<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | undefined> {
  try {
    const d = await db()
    return await new Promise((resolve, reject) => {
      const req = fn(d.transaction('files', mode).objectStore('files'))
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  } catch {
    return undefined
  }
}

export const saveDraftPhoto = (file: File | null) => (file ? run('readwrite', (s) => s.put(file, 'photo')) : run('readwrite', (s) => s.delete('photo')))
export const loadDraftPhoto = async (): Promise<File | null> => {
  const f = await run<File>('readonly', (s) => s.get('photo') as IDBRequest<File>)
  return f instanceof Blob ? (f as File) : null
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
  void saveDraftPhoto(null)
}
