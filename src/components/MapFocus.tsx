import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import maplibregl, { type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../map.css'
import { Icon } from './ui/Icon'
import { reverseGeocode, searchPlaces, type Place } from '../lib/geocode'

// The big, focused way to choose a spot: the map fills the screen, a pin stays fixed in the middle
// and you drag the map under it (your finger never covers the pin), with a search for a street,
// postcode or place, the address under the pin as you move, "Use my location" as a starting point,
// and one big "Use this spot" button in thumb reach. Escape or the close button leaves it unchanged.

const STYLE = 'https://tiles.openfreemap.org/styles/liberty' // darkened in dark mode by CSS, see MapPicker
const START: [number, number] = [-2.5, 54.0]

export interface FocusProps {
  /** Where to start: the spot chosen so far, if any. */
  start: { lat: number; lng: number } | null
  onPick: (spot: { lat: number; lng: number }) => void
  onClose: () => void
  title?: string
}

export function MapFocus({ start, onPick, onClose, title = 'Choose the spot' }: FocusProps) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [moving, setMoving] = useState(false)
  const [address, setAddress] = useState<string | null>(null)
  const [finding, setFinding] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Place[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchDown, setSearchDown] = useState(false)
  const [locating, setLocating] = useState(false)
  const [note, setNote] = useState<string | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const skipSearch = useRef(false)

  // The map, once.
  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: start ? [start.lng, start.lat] : START,
      zoom: start ? 17.5 : 5,
      maxZoom: 20,
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    })
    m.touchZoomRotate.disableRotation()
    map.current = m
    let t = 0
    const lookUp = () => {
      window.clearTimeout(t)
      if (m.getZoom() < 13) {
        setAddress(null)
        return
      }
      setFinding(true)
      // Waits until the map has been still for a moment (and the free address service asks for
      // no more than one look-up a second).
      t = window.setTimeout(async () => {
        const c = m.getCenter()
        const a = await reverseGeocode(c.lat, c.lng)
        setAddress(a)
        setFinding(false)
      }, 700)
    }
    m.on('movestart', () => setMoving(true))
    m.on('moveend', () => {
      setMoving(false)
      lookUp()
    })
    m.on('load', () => {
      m.resize()
      lookUp()
    })
    // The full-screen view can still be settling when the map is made: re-measure when it changes.
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      window.clearTimeout(t)
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Escape closes; the page behind does not scroll while this is open.
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', esc)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = overflow
    }
  }, [onClose])

  // Search as you type (after a short pause, from 3 characters).
  useEffect(() => {
    const text = query.trim()
    if (skipSearch.current) {
      skipSearch.current = false
      return
    }
    if (text.length < 3) {
      setResults(null)
      return
    }
    setSearching(true)
    setSearchDown(false)
    const t = window.setTimeout(async () => {
      const found = await searchPlaces(text)
      setSearchDown(found === null)
      setResults(found ?? [])
      setSearching(false)
    }, 550)
    return () => window.clearTimeout(t)
  }, [query])

  function go(p: Place) {
    skipSearch.current = true // showing the chosen name in the box is not a new search
    setResults(null)
    setQuery(p.label.split(',')[0])
    searchRef.current?.blur()
    map.current?.flyTo({ center: [p.lng, p.lat], zoom: p.zoom, duration: 1100, essential: true })
  }

  function locate() {
    if (!('geolocation' in navigator)) return setNote('This device cannot share its location. Search or drag the map instead.')
    setLocating(true)
    setNote(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        map.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 18, duration: 1100, essential: true })
      },
      () => {
        setLocating(false)
        setNote("We couldn't get your location. Search for the street, or drag the map to the spot.")
      },
      { enableHighAccuracy: true, timeout: 12000 },
    )
  }

  function useSpot() {
    const c = map.current?.getCenter()
    if (!c) return
    onPick({ lat: c.lat, lng: c.lng })
  }

  const zoomedOut = (map.current?.getZoom() ?? (start ? 18 : 5)) < 13

  return createPortal(
    <div className="map-focus fixed inset-0 z-[90] flex flex-col bg-bg" role="dialog" aria-modal="true" aria-label={title}>
      {/* Top: close, title, search */}
      <div className="map-focus-top relative z-20 border-b border-line px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-5">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <button type="button" className="back-link shrink-0" onClick={onClose}>
            <Icon name="chevron" className="size-4 rotate-90" /> Back
          </button>
          <p className="truncate font-semibold">{title}</p>
        </div>
        <div className="relative mx-auto mt-3 max-w-3xl">
          <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-soft" />
          <input
            ref={searchRef}
            id="map-focus-search"
            className="input pl-10"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Search a street, postcode or place"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results?.[0]) go(results[0])
            }}
            aria-controls="map-focus-results"
          />
          {(results || searching) && query.trim().length >= 3 && (
            <ul id="map-focus-results" className="card absolute inset-x-0 top-full z-30 mt-1.5 max-h-72 overflow-auto rounded-2xl p-1.5 shadow-xl" role="listbox">
              {searching && !results && <li className="px-3 py-3 text-sm text-soft">Searching…</li>}
              {results?.length === 0 && (
                <li className="px-3 py-3 text-sm text-soft">
                  {searchDown ? "Search isn't working right now. Drag the map or use your location instead." : 'Nothing found. Try a postcode, or a street and town.'}
                </li>
              )}
              {results?.map((p) => (
                <li key={`${p.lat},${p.lng}`}>
                  <button type="button" role="option" aria-selected="false" className="app-menu-item w-full items-start text-left" onClick={() => go(p)}>
                    <Icon name="pin" className="mt-0.5 size-4 shrink-0 text-accent" />
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.label.split(',')[0]}</span>
                      <span className="block truncate text-xs text-soft">{p.label.split(',').slice(1).join(',').trim()}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* The map, with the pin fixed in the middle */}
      <div className="relative min-h-0 flex-1">
        {/* A wrapper fills the space; the map library sets its own box to position: relative, which
            would undo absolute sizing set directly on it. */}
        <div className="absolute inset-0">
          <div ref={box} style={{ width: '100%', height: '100%' }} />
        </div>
        <div className={`map-focus-pin ${moving ? 'is-moving' : ''}`} aria-hidden="true">
          <svg viewBox="0 0 32 42" width="40" height="52">
            <path d="M16 41S2 27 2 15a14 14 0 0 1 28 0c0 12-14 26-14 26z" fill="currentColor" stroke="#fff" strokeWidth="2.5" />
            <circle cx="16" cy="15" r="5.5" fill="#fff" />
          </svg>
        </div>
        <span className={`map-focus-shadow ${moving ? 'is-moving' : ''}`} aria-hidden="true" />
        <div className="absolute right-3 top-3 z-10 grid gap-2">
          <button type="button" className="icon-btn bg-surface" onClick={() => map.current?.zoomIn()} aria-label="Zoom in">
            <Icon name="plus" className="size-4" />
          </button>
          <button type="button" className="icon-btn bg-surface" onClick={() => map.current?.zoomOut()} aria-label="Zoom out">
            <Icon name="minus" className="size-4" />
          </button>
        </div>
      </div>

      {/* Bottom: the address under the pin, and the two actions */}
      <div className="map-focus-bottom relative z-20 border-t border-line px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
        <div className="mx-auto grid max-w-3xl gap-3">
          <p className="flex min-h-[1.5rem] items-center gap-2 text-sm" aria-live="polite">
            <Icon name="pin" className="size-4 shrink-0 text-accent" />
            {zoomedOut && !address ? (
              <span className="text-soft">Zoom in or search, then drag the map so the pin sits on the spot.</span>
            ) : finding || moving ? (
              <span className="text-soft">Finding the address…</span>
            ) : address ? (
              <span className="min-w-0 truncate">
                Near <span className="font-semibold">{address}</span>
              </span>
            ) : (
              <span className="text-soft">Drag the map so the pin sits on the spot.</span>
            )}
          </p>
          {note && <p className="msg msg-info text-sm">{note}</p>}
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost shrink-0" onClick={locate} disabled={locating}>
              <Icon name="crosshair" className={`size-4 ${locating ? 'animate-pulse text-accent' : ''}`} />
              <span className="hidden sm:inline">{locating ? 'Finding you…' : 'Use my location'}</span>
            </button>
            <button type="button" className="btn btn-primary flex-1 text-base" onClick={useSpot} disabled={zoomedOut}>
              Use this spot <Icon name="check" className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
