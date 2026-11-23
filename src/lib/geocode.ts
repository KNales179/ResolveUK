// Street, postcode and place search, and "what's the address here?", for the big map picker.
// Uses OpenStreetMap's free Nominatim service (no key; allowed in the site's security headers in
// vercel.json). Its rules ask for light use (about one request a second), so the picker waits for a
// pause in typing or moving before it asks, and answers are remembered for this visit.
// Results are limited to the UK. To switch to Ordnance Survey's OS Places later, only this file
// (and the connect-src in vercel.json) needs to change.

export interface Place {
  label: string
  lat: number
  lng: number
  /** How close to zoom for this kind of result: a building is closer than a town. */
  zoom: number
}

const BASE = 'https://nominatim.openstreetmap.org'
const memory = new Map<string, unknown>()

async function get<T>(url: string): Promise<T | null> {
  if (memory.has(url)) return memory.get(url) as T
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json', 'Accept-Language': 'en-GB' } })
    if (!res.ok) return null
    const data = (await res.json()) as T
    memory.set(url, data)
    return data
  } catch {
    return null
  }
}

type Hit = { display_name: string; lat: string; lon: string; addresstype?: string; type?: string }

const zoomFor = (h: Hit) => {
  const t = h.addresstype ?? h.type ?? ''
  if (/house|building|amenity|shop|postcode/.test(t)) return 18
  if (/road|street|path|footway/.test(t)) return 17
  if (/suburb|neighbourhood|village|hamlet/.test(t)) return 15
  if (/town|city/.test(t)) return 13
  return 14
}

/** Up to 5 places in the UK matching a street, postcode or place name. Empty if none; null if the search failed. */
export async function searchPlaces(text: string): Promise<Place[] | null> {
  const q = encodeURIComponent(text.trim())
  const hits = await get<Hit[]>(`${BASE}/search?format=jsonv2&countrycodes=gb&limit=5&q=${q}`)
  if (!hits) return null
  // A long street is stored as several pieces (each with its own postcode): show each street and
  // area once.
  const seen = new Set<string>()
  const key = (h: Hit) => h.display_name.split(',').slice(0, 2).join(',')
  return hits
    .filter((h) => !seen.has(key(h)) && seen.add(key(h)))
    .map((h) => ({ label: h.display_name, lat: +h.lat, lng: +h.lon, zoom: zoomFor(h) }))
}

/** A short, readable address for a spot, like "14 Albert Terrace, Kendal". Null if unknown. */
export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const r = await get<{ address?: Record<string, string> }>(`${BASE}/reverse?format=jsonv2&zoom=18&lat=${lat.toFixed(5)}&lon=${lng.toFixed(5)}`)
  const a = r?.address
  if (!a) return null
  const street = a.road ?? a.pedestrian ?? a.footway ?? a.path ?? a.neighbourhood ?? a.hamlet
  const line1 = [a.house_number, street].filter(Boolean).join(' ')
  const town = a.town ?? a.city ?? a.village ?? a.suburb ?? a.county
  return [line1 || a.amenity || a.building, town].filter(Boolean).join(', ') || null
}
