import { useEffect, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../map.css'
import { useThemeName, type ThemeName } from '../lib/theme'
import type { Position } from '../types'
import { Icon } from './ui/Icon'

// Detailed vector maps from OpenFreeMap: free, no key, and made from OpenStreetMap data.
// Vector tiles stay sharp and can be zoomed in much closer than the standard picture tiles.
const STYLES: Record<ThemeName, string> = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
}

// Only where the map starts before a spot is known. It is not a statement about where the service runs.
const START_CENTER: [number, number] = [-2.5, 54.0]
const START_ZOOM = 5
const CLOSE_ZOOM = 17.5
const ACCURACY = 'accuracy'

// A circle on the ground, `radius` metres wide, as a shape the map can draw.
function circle(lng: number, lat: number, radius: number) {
  const steps = 64
  const dLat = radius / 111320
  const dLng = radius / (111320 * Math.cos((lat * Math.PI) / 180))
  const ring = Array.from({ length: steps + 1 }, (_, i) => {
    const a = (2 * Math.PI * i) / steps
    return [lng + dLng * Math.cos(a), lat + dLat * Math.sin(a)]
  })
  return { type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [ring] } }
}

function pinElement(): HTMLElement {
  const el = document.createElement('div')
  el.className = 'map-pin'
  el.setAttribute('aria-label', 'The spot of the problem. Drag it to move it.')
  el.innerHTML =
    '<svg viewBox="0 0 32 42" width="34" height="44" aria-hidden="true"><path d="M16 41S2 27 2 15a14 14 0 0 1 28 0c0 12-14 26-14 26z" fill="currentColor" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>'
  return el
}

interface Props {
  position: Position | null
  onChange: (position: Position) => void
  onLocate: () => void
  locating: boolean
}

export function MapPicker({ position, onChange, onLocate, locating }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<Marker | null>(null)
  const latest = useRef({ position, onChange })
  const theme = useThemeName()
  const firstTheme = useRef(theme)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    latest.current = { position, onChange }
  })

  // Draws (or clears) the circle showing how far out the phone's location might be.
  const drawAccuracy = () => {
    const m = map.current
    if (!m) return
    const p = latest.current.position
    const data = p && p.source === 'gps' && p.accuracy ? circle(p.lng, p.lat, p.accuracy) : { type: 'FeatureCollection' as const, features: [] }
    const existing = m.getSource(ACCURACY) as GeoJSONSource | undefined
    if (existing) {
      existing.setData(data)
      return
    }
    const accent = getComputedStyle(document.documentElement).getPropertyValue('--c-accent').trim() || '#0b8a5f'
    m.addSource(ACCURACY, { type: 'geojson', data })
    m.addLayer({ id: 'accuracy-fill', type: 'fill', source: ACCURACY, paint: { 'fill-color': accent, 'fill-opacity': 0.16 } })
    m.addLayer({ id: 'accuracy-line', type: 'line', source: ACCURACY, paint: { 'line-color': accent, 'line-width': 1.5, 'line-opacity': 0.7 } })
  }

  // Create the map once.
  useEffect(() => {
    if (!box.current) return
    let m: MapLibreMap
    try {
      m = new maplibregl.Map({
        container: box.current,
        style: STYLES[firstTheme.current],
        center: latest.current.position ? [latest.current.position.lng, latest.current.position.lat] : START_CENTER,
        zoom: latest.current.position ? CLOSE_ZOOM : START_ZOOM,
        maxZoom: 20,
        cooperativeGestures: true, // so scrolling the page does not zoom the map by accident
        attributionControl: { compact: true },
        dragRotate: false,
        pitchWithRotate: false,
      })
    } catch {
      setFailed(true)
      return
    }
    map.current = m
    m.touchZoomRotate.disableRotation()

    const pin = new maplibregl.Marker({ element: pinElement(), draggable: true, anchor: 'bottom' })
    marker.current = pin
    pin.on('dragend', () => {
      const { lng, lat } = pin.getLngLat()
      latest.current.onChange({ lat, lng, accuracy: null, source: 'manual' })
    })
    m.on('click', (e) => latest.current.onChange({ lat: e.lngLat.lat, lng: e.lngLat.lng, accuracy: null, source: 'manual' }))
    m.on('style.load', drawAccuracy)

    return () => {
      pin.remove()
      m.remove()
      map.current = null
      marker.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Switch between the day and night map.
  useEffect(() => {
    if (theme !== firstTheme.current && map.current) {
      firstTheme.current = theme
      map.current.setStyle(STYLES[theme])
    }
  }, [theme])

  // Show the pin and move to it: always for a phone location, and for a tapped spot only if it is off screen.
  useEffect(() => {
    const m = map.current
    const pin = marker.current
    if (!m || !pin) return
    if (position) {
      pin.setLngLat([position.lng, position.lat])
      if (!pin.getElement().isConnected) pin.addTo(m)
      const visible = m.getBounds().contains([position.lng, position.lat])
      if (position.source === 'gps' || !visible) {
        m.flyTo({ center: [position.lng, position.lat], zoom: Math.max(m.getZoom(), CLOSE_ZOOM), duration: 900, essential: true })
      }
    } else {
      pin.remove()
    }
    if (m.isStyleLoaded()) drawAccuracy()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [position])

  if (failed) {
    return (
      <div className="grid h-full min-h-[18rem] place-items-center bg-surface2 p-6 text-center">
        <div>
          <p className="font-semibold">The map could not load on this device.</p>
          <p className="mt-1 text-sm text-soft">You can still use “Use my location” and send your report.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full min-h-[18rem] w-full">
      {/* The map's own stylesheet controls the size of the element it draws into, so it gets a wrapper to fill. */}
      <div className="absolute inset-0">
        <div ref={box} style={{ width: '100%', height: '100%' }} />
      </div>
      <div className="absolute right-3 top-3 z-10 grid gap-2">
        <button type="button" className="icon-btn" onClick={() => map.current?.zoomIn()} aria-label="Zoom in">
          <Icon name="plus" className="size-4" />
        </button>
        <button type="button" className="icon-btn" onClick={() => map.current?.zoomOut()} aria-label="Zoom out">
          <Icon name="minus" className="size-4" />
        </button>
        <button type="button" className="icon-btn" onClick={onLocate} disabled={locating} aria-label="Go to my location" title="Go to my location">
          <Icon name="crosshair" className={`size-4 ${locating ? 'animate-pulse text-accent' : ''}`} />
        </button>
      </div>
    </div>
  )
}
