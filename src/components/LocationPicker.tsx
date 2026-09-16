import { useCallback, useState } from 'react'
import { MapContainer, Marker, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

// Leaflet's default marker icon URLs break under bundlers; point them at the bundled assets instead.
const defaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
})

const UK_CENTER: [number, number] = [54.5, -3]
const DEFAULT_ZOOM = 6
const PIN_ZOOM = 15

interface LocationPickerProps {
  position: { lat: number; lng: number } | null
  onChange: (position: { lat: number; lng: number }) => void
}

function ClickHandler({ onChange }: { onChange: LocationPickerProps['onChange'] }) {
  useMapEvents({
    click(e) {
      onChange({ lat: e.latlng.lat, lng: e.latlng.lng })
    },
  })
  return null
}

export function LocationPicker({ position, onChange }: LocationPickerProps) {
  const [locating, setLocating] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)

  const useMyLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported on this device. Tap the map to drop a pin instead.')
      return
    }
    setLocating(true)
    setGeoError(null)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        setGeoError('Could not get your location. Tap the map to drop a pin instead.')
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }, [onChange])

  return (
    <div className="location-picker">
      <button type="button" onClick={useMyLocation} disabled={locating} className="secondary-button">
        {locating ? 'Locating…' : 'Use my location'}
      </button>
      {geoError && <p className="field-error">{geoError}</p>}
      <div className="map-wrapper">
        <MapContainer
          center={position ? [position.lat, position.lng] : UK_CENTER}
          zoom={position ? PIN_ZOOM : DEFAULT_ZOOM}
          style={{ height: '260px', width: '100%', borderRadius: '8px' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <ClickHandler onChange={onChange} />
          {position && <Marker position={[position.lat, position.lng]} icon={defaultIcon} />}
        </MapContainer>
      </div>
      <p className="field-hint">
        {position
          ? `Pin set at ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}. Tap the map to adjust.`
          : 'Tap the map to drop a pin at the issue location.'}
      </p>
    </div>
  )
}
