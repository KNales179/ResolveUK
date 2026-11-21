import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import '../../map.css'
import { useThemeName, type ThemeName } from '../../lib/theme'
import { useReports } from '../../lib/useReports'
import { useCategories } from '../../lib/categories'
import { STATUS_LABELS, statusGroup, type StatusGroup } from '../../lib/status'
import { timeAgo } from '../../lib/format'
import { Icon } from '../../components/ui/Icon'
import { useAppSession } from '../session'
import { areaAt, setAreas } from '../components/AreaMap'
import { useOrgs } from '../orgsData'

const STYLES: Record<ThemeName, string> = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/liberty', // darkened by a CSS filter, see MapPicker
}

const GROUPS: Array<{ id: StatusGroup; label: string }> = [
  { id: 'reported', label: 'Reported' },
  { id: 'progress', label: 'In progress' },
  { id: 'cleared', label: 'Cleared' },
  { id: 'verified', label: 'Verified' },
]

function pin(group: StatusGroup, label: string): HTMLElement {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = `report-pin report-pin-${group}`
  el.setAttribute('aria-label', label)
  el.setAttribute('data-no-tag', '')
  el.innerHTML = '<svg viewBox="0 0 32 42" width="30" height="40" aria-hidden="true"><path d="M16 41S2 27 2 15a14 14 0 0 1 28 0c0 12-14 26-14 26z" fill="currentColor" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="15" r="5.5" fill="#fff"/></svg>'
  return el
}

// The app's Map: every report pinned where it is, coloured by where it stands, with a list beside
// it, and (switchable) the areas community groups and clearance companies cover.
export function AppMap() {
  const s = useAppSession()
  const navigate = useNavigate()
  const theme = useThemeName()
  const categories = useCategories()
  const { reports, usingSamples } = useReports({ samplesOnly: s.demo })
  const [show, setShow] = useState<Record<StatusGroup, boolean>>({ reported: true, progress: true, cleared: true, verified: true, closed: false })
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const markers = useRef<Marker[]>([])
  const { orgs } = useOrgs()
  const [areas, setAreasOn] = useState(true)
  const areaState = useRef({ orgs: orgs ?? [], on: areas })
  areaState.current = { orgs: orgs ?? [], on: areas }

  const visible = useMemo(() => reports.filter((r) => show[statusGroup(r.current_status)]), [reports, show])
  const labelOf = (code: string) => categories.find((c) => c.code === code)?.label ?? code

  // The map itself, created once.
  useEffect(() => {
    if (!box.current || map.current) return
    const m = new maplibregl.Map({ container: box.current, style: STYLES[theme], center: [-2.5, 54.2], zoom: 5, attributionControl: { compact: true } })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.current = m
    // The map measures its box when it is created, which can be before the page has finished
    // laying out; re-measure once loaded and whenever the box changes size, so it always fills it.
    m.on('load', () => m.resize())
    // Areas are a map layer, which a theme change (a new map style) wipes; redraw them each time.
    m.on('style.load', () => setAreas(m, areaState.current.orgs, areaState.current.on))
    m.on('click', (e) => {
      const id = areaAt(m, e.point)
      if (id) navigate(`/app/community/${id}`)
    })
    m.on('mousemove', (e) => {
      m.getCanvas().style.cursor = areaAt(m, e.point) ? 'pointer' : ''
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
    if (m?.isStyleLoaded()) setAreas(m, orgs ?? [], areas)
  }, [orgs, areas])

  // Pins for whatever is shown, and the view fitted to them.
  useEffect(() => {
    const m = map.current
    if (!m) return
    markers.current.forEach((mk) => mk.remove())
    markers.current = visible.map((r) => {
      const g = statusGroup(r.current_status)
      const el = pin(g, `${labelOf(r.category_code)}: ${r.description}. ${STATUS_LABELS[r.current_status]}`)
      el.addEventListener('click', () => navigate(`/app/reports/${r.id}`))
      return new maplibregl.Marker({ element: el, anchor: 'bottom' }).setLngLat([r.lng, r.lat]).addTo(m)
    })
    if (visible.length) {
      const b = new maplibregl.LngLatBounds()
      visible.forEach((r) => b.extend([r.lng, r.lat]))
      m.fitBounds(b, { padding: 70, maxZoom: 14, duration: 600 })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, navigate])

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Every report</p>
          <h1 className="font-serif text-4xl sm:text-5xl">Map</h1>
          <p className="mt-2 text-soft">Every report, where it is and where it stands.</p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Show on the map">
          {GROUPS.map((g) => (
            <button key={g.id} type="button" aria-pressed={show[g.id]} className={`map-filter map-filter-${g.id}`} onClick={() => setShow((v) => ({ ...v, [g.id]: !v[g.id] }))}>
              <span className="map-filter-dot" /> {g.label}
            </button>
          ))}
          <button type="button" aria-pressed={areas} className="map-filter map-filter-areas" onClick={() => setAreasOn((v) => !v)}>
            <span className="area-swatch area-swatch-community" /> Group areas
          </button>
        </div>
      </div>

      {usingSamples && (
        <p className="msg msg-info mt-5" role="status">
          {s.demo ? 'Demo: these are sample reports.' : 'Showing sample reports. Live reports are not available right now.'}
        </p>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-[1fr_22rem]">
        <div className="card relative h-[62svh] min-h-[420px] overflow-hidden rounded-3xl p-0">
          {/* The map library sets its own box to position: relative, so the box sits inside a wrapper
              that fills the frame, and the map fills the wrapper. */}
          <div className="absolute inset-0">
            <div ref={box} className="size-full" aria-label="Map of reports" />
          </div>
          {areas && (
            <div className="card absolute bottom-3 left-3 flex flex-wrap gap-x-4 gap-y-1 rounded-xl px-3 py-2 text-xs font-semibold">
              <span className="inline-flex items-center gap-1.5"><span className="area-swatch area-swatch-community" /> Community group area</span>
              <span className="inline-flex items-center gap-1.5"><span className="area-swatch area-swatch-commercial" /> Clearance company area</span>
            </div>
          )}
        </div>
        <aside className="card max-h-[62svh] overflow-y-auto rounded-3xl p-5" data-lenis-prevent>
          <p className="text-sm font-semibold text-soft">
            {visible.length} {visible.length === 1 ? 'report' : 'reports'} shown
          </p>
          <ul className="mt-2 divide-y divide-line">
            {visible.map((r) => (
              <li key={r.id}>
                <Link to={`/app/reports/${r.id}`} className="flex items-start gap-3 py-3" data-no-tag>
                  <span className={`mt-1.5 size-2.5 shrink-0 rounded-full report-dot-${statusGroup(r.current_status)}`} />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-sm font-semibold">{r.description}</span>
                    <span className="mt-0.5 block text-xs text-soft">
                      {labelOf(r.category_code)} · {STATUS_LABELS[r.current_status]} · {timeAgo(r.created_at)}
                    </span>
                  </span>
                  <Icon name="chevron" className="mt-1 size-4 shrink-0 -rotate-90 text-soft" />
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  )
}
