import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DisasterEvent } from '../types'

interface MapProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  loading: boolean
}

// --- Map tile: dark premium ---
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_ATTR = '&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'

// --- Severity marker config ---
const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case 'critical':
      return { color: '#ef4444', glow: 'red', pulse: true }
    case 'high':
      return { color: '#f97316', glow: 'orange', pulse: true }
    case 'medium':
      return { color: '#eab308', glow: 'amber', pulse: false }
    case 'low':
      return { color: '#06b6d4', glow: 'cyan', pulse: false }
    default:
      return { color: '#64748b', glow: '', pulse: false }
  }
}

const getIconLetter = (type: string): string => {
  switch (type) {
    case 'earthquake': return '🌍'
    case 'storm': return '⛈️'
    case 'flood': return '🌊'
    case 'rain': return '🌧️'
    case 'landslide': return '🏔️'
    case 'volcanic': return '🌋'
    default: return '⚠️'
  }
}

// Create a premium custom icon with neon glow
function createCustomIcon(event: DisasterEvent): L.DivIcon {
  const cfg = getSeverityConfig(event.severity)
  const pulseClass = cfg.pulse ? 'marker-pulse' : ''
  const size = event.severity === 'critical' ? 28 : 22

  const html = `
    <div class="relative flex items-center justify-center">
      <div class="absolute inset-0 rounded-full animate-ping opacity-30"
           style="background-color: ${cfg.color}; width: ${size + 6}px; height: ${size + 6}px; box-shadow: 0 0 12px ${cfg.color};"></div>
      <div class="relative flex items-center justify-center rounded-full border-2 border-white ${pulseClass}"
           style="
             background-color: ${cfg.color};
             width: ${size}px;
             height: ${size}px;
             box-shadow: 0 0 8px ${cfg.color}, 0 0 16px ${cfg.color};
             animation: ${cfg.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none'};
           ">
        <span style="font-size: ${size / 2.2}px; filter: drop-shadow(0 0 3px rgba(0,0,0,0.8))">${getIconLetter(event.type)}</span>
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'alerta360-marker',
    iconSize: [size + 6, size + 6],
    iconAnchor: [(size + 6) / 2, (size + 6) / 2],
    popupAnchor: [0, -16],
  })
}

// Component to fit map bounds to all event markers
function FitBounds({ events }: { events: DisasterEvent[] }) {
  const map = useMap()
  const boundsComputed = events.length > 0
  const bounds = L.latLngBounds(
    events.map(e => [e.latitude, e.longitude] as [number, number])
  )

  useEffect(() => {
    if (boundsComputed && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 6 })
    }
  }, [map, bounds, boundsComputed])

  return null
}

// Map controls overlay (top-right buttons)
function MapControls({ onLayerChange }: { onLayerChange: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
      <button
        onClick={onLayerChange}
        className="glass-dark border border-border text-slate-300 hover:text-cyan-400 hover:bg-surfaceElev rounded-xl p-2.5 transition-all duration-200 transform hover:scale-105"
        title="Cambiar capa"
      >
        🗺️
      </button>
    </div>
  )
}

export default function Map({ events, selectedEvent, onSelectEvent, loading }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-surfaceElev/60 backdrop-blur-sm z-10">
          <div className="glass-dark rounded-2xl p-6 flex items-center gap-4 shadow-2xl">
            <div className="animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <span className="text-slate-300">Cargando eventos...</span>
          </div>
        </div>
      )}

      <MapContainer
        center={[0, 0]}
        zoom={3}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        zoomControl={true}
        attributionControl={false}
        className="z-0"
      >
        {/* Dark premium tile layer */}
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={19} />

        {/* Fit bounds when events change */}
        <FitBounds events={events} />

        {/* Draw custom markers */}
        {events.map((event) => {
          const icon = createCustomIcon(event)
          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectEvent(event),
              }}
              title={event.title}
            >
              <Popup>
                <div className="p-2 min-w-[220px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getIconLetter(event.type)}</span>
                    <h4 className="font-bold text-sm text-white">{event.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-2">{event.description}</p>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">{event.source}</span>
                    {event.magnitude && (
                      <span className="text-slate-400">M: {event.magnitude}</span>
                    )}
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Highlight selected event with a circle */}
        {selectedEvent && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 400,
            }}
          >
            <div
              className="rounded-full border-2 animate-pulse"
              style={{
                width: '60px',
                height: '60px',
                borderColor: getSeverityConfig(selectedEvent.severity).color,
                boxShadow: `0 0 20px ${getSeverityConfig(selectedEvent.severity).color}`,
              }}
            />
          </div>
        )}
      </MapContainer>

      {/* Map Controls */}
      <MapControls onLayerChange={() => {}} />
    </div>
  )
}
