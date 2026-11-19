import { useEffect, useRef, useState } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../../map.css'
import { useThemeName, type ThemeName } from '../../lib/theme'
import { centreOf, type Org, type Polygon } from '../../lib/orgs'

const STYLES: Record<ThemeName, string> = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/fiord',
}
const COLOR = { community: '#2f9e44', commercial: '#1d4ed8' }

function areasGeoJSON(orgs: Org[]) {
  return {
    type: 'FeatureCollection' as const,
    features: orgs.map((o) => ({ type: 'Feature' as const, properties: { id: o.id, name: o.name, kind: o.kind }, geometry: o.area })),
  }
}

function centresGeoJSON(orgs: Org[]) {
  return {
    type: 'FeatureCollection' as const,
    features: orgs.map((o) => ({ type: 'Feature' as const, properties: { id: o.id, name: o.name, kind: o.kind }, geometry: { type: 'Point' as const, coordinates: centreOf(o.area) } })),
  }
}

const kindColour = ['match', ['get', 'kind'], 'commercial', COLOR.commercial, COLOR.community] as unknown as string

// Adds (or refreshes) the organisations' areas on a map: shaded green for community groups, blue
// for clearance companies, each outlined. Zoomed out to the whole country an area is only a few
// pixels across, so there each one also shows as a ringed dot with its name; zoomed in, the dot
// fades out and the name sits on the area itself. Used by Community, the admin queue and the Map.
export function setAreas(m: MapLibreMap, orgs: Org[], visible = true) {
  const list = visible ? orgs : []
  const src = m.getSource('org-areas') as GeoJSONSource | undefined
  if (src) {
    src.setData(areasGeoJSON(list))
    ;(m.getSource('org-centres') as GeoJSONSource | undefined)?.setData(centresGeoJSON(list))
    return
  }
  m.addSource('org-areas', { type: 'geojson', data: areasGeoJSON(list) })
  m.addSource('org-centres', { type: 'geojson', data: centresGeoJSON(list) })
  m.addLayer({ id: 'org-areas-fill', type: 'fill', source: 'org-areas', paint: { 'fill-color': kindColour, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 6, 0.3, 10, 0.16] } })
  m.addLayer({ id: 'org-areas-line', type: 'line', source: 'org-areas', paint: { 'line-color': kindColour, 'line-width': ['interpolate', ['linear'], ['zoom'], 6, 1.2, 10, 2.2], 'line-dasharray': [2, 1.5] } })
  m.addLayer({
    id: 'org-centres-dot',
    type: 'circle',
    source: 'org-centres',
    maxzoom: 9,
    paint: { 'circle-radius': 6, 'circle-color': kindColour, 'circle-stroke-color': '#ffffff', 'circle-stroke-width': 2, 'circle-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 1, 9, 0], 'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 7.5, 1, 9, 0] },
  })
  m.addLayer({
    id: 'org-areas-label',
    type: 'symbol',
    source: 'org-centres',
    layout: { 'text-field': ['get', 'name'], 'text-size': 12, 'text-font': ['Noto Sans Bold'], 'text-variable-anchor': ['left', 'right', 'top', 'bottom'], 'text-radial-offset': 0.9, 'text-justify': 'auto' },
    // Names read dark-on-light on the light map and light-on-dark on the dark one (a theme change
    // swaps the map style, which re-adds these layers, so this is read fresh each time).
    paint: document.documentElement.dataset.theme === 'dark' ? { 'text-color': '#e8f3ee', 'text-halo-color': '#1b2a3a', 'text-halo-width': 1.6 } : { 'text-color': '#0b3d36', 'text-halo-color': '#ffffff', 'text-halo-width': 1.6 },
  })
}

// A map showing organisations' areas (and, with `onPick`, letting one be clicked). Fits to them.
export function AreaMap({ orgs, focus, onPick, className = '' }: { orgs: Org[]; focus?: Polygon | null; onPick?: (id: string) => void; className?: string }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const theme = useThemeName()
  const latest = useRef({ orgs, focus, onPick })
  latest.current = { orgs, focus, onPick }

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({ container: box.current, style: STYLES[theme], center: [-2.5, 54.2], zoom: 5, attributionControl: { compact: true } })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.current = m
    const draw = () => {
      const { orgs: o, focus: f } = latest.current
      setAreas(m, o)
      const shapes = f ? [f] : o.map((x) => x.area)
      if (shapes.length) {
        const b = new maplibregl.LngLatBounds()
        shapes.forEach((s) => s.coordinates[0].forEach((c) => b.extend(c as [number, number])))
        m.fitBounds(b, { padding: 50, maxZoom: 12, duration: 0 })
      }
    }
    m.on('style.load', draw)
    m.on('click', ['org-areas-fill', 'org-centres-dot'], (e) => {
      const id = e.features?.[0]?.properties?.id as string | undefined
      if (id) latest.current.onPick?.(id)
    })
    m.on('mouseenter', ['org-areas-fill', 'org-centres-dot'], () => {
      if (latest.current.onPick) m.getCanvas().style.cursor = 'pointer'
    })
    m.on('mouseleave', ['org-areas-fill', 'org-centres-dot'], () => {
      m.getCanvas().style.cursor = ''
    })
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setStyle(STYLES[theme])
  }, [theme])

  useEffect(() => {
    const m = map.current
    if (m?.isStyleLoaded()) setAreas(m, orgs)
  }, [orgs])

  return (
    <div className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0">
        <div ref={box} className="size-full" aria-label="Map of the areas groups and companies cover" />
      </div>
    </div>
  )
}

// Drawing an area: click points on the map to outline it; the shape closes itself. Undo and
// Clear buttons sit above the map. Calls onChange with the polygon once it has 3+ points.
export function AreaPicker({ value, onChange, start }: { value: Polygon | null; onChange: (p: Polygon | null) => void; start?: [number, number] }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const pts = useRef<number[][]>(value ? value.coordinates[0].slice(0, -1) : [])
  const theme = useThemeName()

  const render = () => {
    const m = map.current
    if (!m || !m.isStyleLoaded()) return
    const p = pts.current
    const data = {
      type: 'FeatureCollection' as const,
      features: [
        ...(p.length >= 3 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'Polygon' as const, coordinates: [[...p, p[0]]] } }] : []),
        ...(p.length >= 2 && p.length < 3 ? [{ type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates: p } }] : []),
        ...p.map((c) => ({ type: 'Feature' as const, properties: { point: true }, geometry: { type: 'Point' as const, coordinates: c } })),
      ],
    }
    const src = m.getSource('draw') as GeoJSONSource | undefined
    if (src) src.setData(data)
    else {
      m.addSource('draw', { type: 'geojson', data })
      m.addLayer({ id: 'draw-fill', type: 'fill', source: 'draw', filter: ['==', ['geometry-type'], 'Polygon'], paint: { 'fill-color': '#2f9e44', 'fill-opacity': 0.2 } })
      m.addLayer({ id: 'draw-line', type: 'line', source: 'draw', filter: ['!=', ['geometry-type'], 'Point'], paint: { 'line-color': '#1f6b4f', 'line-width': 2.5 } })
      m.addLayer({ id: 'draw-pts', type: 'circle', source: 'draw', filter: ['==', ['geometry-type'], 'Point'], paint: { 'circle-radius': 5, 'circle-color': '#ffffff', 'circle-stroke-color': '#1f6b4f', 'circle-stroke-width': 2.5 } })
    }
  }
  const emit = () => {
    const p = pts.current
    onChange(p.length >= 3 ? { type: 'Polygon', coordinates: [[...p, p[0]]] } : null)
    render()
  }

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({ container: box.current, style: STYLES[theme], center: start ?? [-2.5, 54.2], zoom: start ? 12 : 5.2, attributionControl: { compact: true } })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    m.doubleClickZoom.disable()
    map.current = m
    m.on('style.load', render)
    m.on('click', (e) => {
      pts.current = [...pts.current, [+e.lngLat.lng.toFixed(5), +e.lngLat.lat.toFixed(5)]]
      emit()
    })
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setStyle(STYLES[theme])
  }, [theme])

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-soft">Click the map to outline the area, point by point.</span>
        <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => { pts.current = pts.current.slice(0, -1); emit() }}>
          Undo point
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => { pts.current = []; emit() }}>
          Clear
        </button>
      </div>
      <div className="relative h-80 overflow-hidden rounded-2xl border border-line">
        <div className="absolute inset-0">
          <div ref={box} className="size-full" aria-label="Map to draw the area on" />
        </div>
      </div>
    </div>
  )
}

export { centreOf }

// Picking one spot: click the map (or use your location) to drop a pin; drag the map to fine-tune
// and click again to move it. Calls onChange with [lng, lat].
// With `readOnly` it only shows the pin (on a request's page, say).
export function PointPicker({ value, onChange, className = '', readOnly = false }: { value: [number, number] | null; onChange: (p: [number, number]) => void; className?: string; readOnly?: boolean }) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const marker = useRef<maplibregl.Marker | null>(null)
  const theme = useThemeName()
  const [locating, setLocating] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const place = (p: [number, number], fly = false) => {
    const m = map.current
    if (!m) return
    if (!marker.current) {
      const el = document.createElement('div')
      el.className = 'report-pin report-pin-reported'
      el.innerHTML = '<svg viewBox="0 0 32 42" width="30" height="40" aria-hidden="true"><path d="M16 41S2 27 2 15a14 14 0 0 1 28 0c0 12-14 26-14 26z" fill="currentColor" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>'
      marker.current = new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat(p).addTo(m)
    } else marker.current.setLngLat(p)
    if (fly) m.flyTo({ center: p, zoom: Math.max(m.getZoom(), 14), duration: 600 })
  }

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({ container: box.current, style: STYLES[theme], center: value ?? [-2.5, 54.2], zoom: value ? 14 : 5.2, attributionControl: { compact: true } })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.current = m
    m.on('load', () => {
      m.resize()
      if (value) place(value)
    })
    if (!readOnly)
      m.on('click', (e) => {
        const p: [number, number] = [+e.lngLat.lng.toFixed(5), +e.lngLat.lat.toFixed(5)]
        place(p)
        onChange(p)
      })
    const ro = new ResizeObserver(() => m.resize())
    ro.observe(box.current)
    return () => {
      ro.disconnect()
      marker.current = null
      m.remove()
      map.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    map.current?.setStyle(STYLES[theme])
  }, [theme])

  function locate() {
    setProblem(null)
    if (!navigator.geolocation) return setProblem("Your browser can't share your location. Click the map instead.")
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const p: [number, number] = [+pos.coords.longitude.toFixed(5), +pos.coords.latitude.toFixed(5)]
        place(p, true)
        onChange(p)
      },
      () => {
        setLocating(false)
        setProblem("Your location isn't available. Click the map to drop the pin instead.")
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  return (
    <div>
      {!readOnly && (
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <button type="button" className="btn btn-ghost btn-sm" onClick={locate} disabled={locating}>
            {locating ? 'Finding you…' : 'Use my location'}
          </button>
          <span className="text-sm text-soft">or click the map where it is.</span>
        </div>
      )}
      <div className={`relative overflow-hidden rounded-2xl border border-line ${className}`}>
        <div className="absolute inset-0">
          <div ref={box} className="size-full" aria-label={readOnly ? 'Map showing where it is' : 'Map: click to place the pin'} />
        </div>
      </div>
      {problem && (
        <p className="msg msg-error mt-2" role="alert">
          {problem}
        </p>
      )}
    </div>
  )
}
