import { useEffect, useRef } from 'react'
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet'
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
const TILE_ATTR = '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'

// --- Marker config ---
function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return { color: '#ef4444', size: 28, pulse: true, label: 'CRÍTICO' }
    case 'high':
      return { color: '#f97316', size: 24, pulse: true, label: 'ALTO' }
    case 'medium':
      return { color: '#eab308', size: 20, pulse: false, label: 'MEDIO' }
    case 'low':
      return { color: '#06b6d4', size: 18, pulse: false, label: 'BAJO' }
    default:
      return { color: '#64748b', size: 18, pulse: false, label: 'NORMAL' }
  }
}

function getIconLetter(type: string): string {
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

function createCustomIcon(event: DisasterEvent): L.DivIcon {
  const cfg = getSeverityConfig(event.severity)
  const iconHtml = `
    <div class="relative flex items-center justify-center">
      <div class="absolute inset-0 rounded-full"
           style="background-color: ${cfg.color}; width: ${cfg.size + 8}px; height: ${cfg.size + 8}px;
                  box-shadow: 0 0 8px ${cfg.color}, 0 0 16px ${cfg.color};
                  ${cfg.pulse ? 'animation: pulse 1.5s ease-in-out infinite;' : ''}"></div>
      <div class="relative flex items-center justify-center rounded-full border-2 border-white"
           style="background-color: ${cfg.color}; width: ${cfg.size}px; height: ${cfg.size}px;
                  box-shadow: 0 0 12px ${cfg.color};">
        <span style="font-size: ${cfg.size / 2.4}px; pointer-events: none;">${getIconLetter(event.type)}</span>
      </div>
    </div>
  `
  return L.divIcon({
    html: iconHtml,
    className: 'alerta360-marker',
    iconSize: [cfg.size + 8, cfg.size + 8],
    iconAnchor: [(cfg.size + 8) / 2, (cfg.size + 8) / 2],
    popupAnchor: [0, -12],
  })
}

// Auto-fit map bounds to all events
function FitBounds({ events }: { events: DisasterEvent[] }) {
  const map = useMap()
  const hasFit = useRef(false)

  useEffect(() => {
    if (events.length > 0 && !hasFit.current) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.latitude, e.longitude] as [number, number])
      )
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 5 })
        hasFit.current = true
      }
    }
  }, [map, events])

  return null
}

// Connection lines between nearby events of the same type
function EventConnections({ events }: { events: DisasterEvent[] }) {
  const map = useMap()

  useEffect(() => {
    const group = L.featureGroup().addTo(map)

    // Draw lines between events of same type within 500km
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const a = events[i]
        const b = events[j]
        if (a.type !== b.type) continue

        const dist = Math.sqrt(
          Math.pow(a.latitude - b.latitude, 2) +
          Math.pow(a.longitude - b.longitude, 2)
        )

        // Only connect if within ~5 degrees (~500km)
        if (dist > 0.5 && dist < 5) {
          const cfg = getSeverityConfig(a.severity)
          L.polyline(
            [
              [a.latitude, a.longitude],
              [b.latitude, b.longitude],
            ],
            {
              color: cfg.color,
              weight: 1.5,
              opacity: 0.3,
              dashArray: '5, 5',
              lineCap: 'round',
            }
          ).addTo(group)
        }
      }
    }

    return () => {
      map.removeLayer(group)
    }
  }, [map, events])

  return null
}

// Center crosshair
function Crosshair() {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10">
      <div className="w-5 h-5 rounded-full border border-slate-500/30 animate-pulse" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-0.5 h-5 -translate-y-1 bg-slate-500/20" />
      <div className="absolute top-1/2 left-0 -translate-y-1/2 w-5 h-0.5 bg-slate-500/20" />
    </div>
  )
}

// Map controls: zoom to fit, reset
function MapControls({ onFitBounds, onReset }: { onFitBounds: () => void; onReset: () => void }) {
  return (
    <div className="absolute top-4 right-4 z-40 flex flex-col gap-2">
      <button
        onClick={onFitBounds}
        className="glass-dark border border-border text-slate-300 hover:text-cyan-400 hover:border-cyan-400/50 rounded-xl p-2.5 transition-all duration-200 transform hover:scale-105 shadow-glow-cyan"
        title="Ajustar vista a todos los eventos"
      >
        <span className="text-lg">🔍</span>
      </button>
      <button
        onClick={onReset}
        className="glass-dark border border-border text-slate-300 hover:text-slate-100 hover:border-borderHover rounded-xl p-2.5 transition-all duration-200 transform hover:scale-105"
        title="Restablecer vista"
      >
        <span className="text-lg">🎯</span>
      </button>
    </div>
  )
}

export default function Map({ events, selectedEvent, onSelectEvent, loading }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)

  const handleFitBounds = () => {
    const map = mapRef.current
    if (map && events.length > 0) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.latitude, e.longitude] as [number, number])
      )
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [80, 80], maxZoom: 5 })
      }
    }
  }

  const handleReset = () => {
    const map = mapRef.current
    if (map) {
      map.setView([0, 0], 3, { animate: true })
    }
  }

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
        zoom={2.5}
        minZoom={1.5}
        maxZoom={10}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
        className="z-0"
      >
        {/* Dark premium tile layer */}
        <TileLayer
          url={TILE_URL}
          attribution={TILE_ATTR}
          maxZoom={19}
          tileSize={512}
          zoomOffset={-1}
        />

        {/* Custom zoom control */}
        <div className="leaflet-top leaflet-control z-40" style={{ marginTop: '60px' }}>
          <div className="flex flex-col glass-dark border border-border rounded-xl overflow-hidden">
            <button
              className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-surfaceElev transition"
              onClick={() => mapRef.current?.zoomIn()}
              title="Acercar"
            >
              +
            </button>
            <div className="w-10 h-px bg-border" />
            <button
              className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-cyan-400 hover:bg-surfaceElev transition"
              onClick={() => mapRef.current?.zoomOut()}
              title="Alejar"
            >
              −
            </button>
          </div>
        </div>

        {/* Fit bounds + connections */}
        <FitBounds events={events} />
        <EventConnections events={events} />

        {/* Custom markers */}
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
              zIndexOffset={selectedEvent?.id === event.id ? 1000 : 0}
            >
              <Popup>
                <div className="p-1 min-w-[240px]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{getIconLetter(event.type)}</span>
                    <h4 className="font-bold text-sm text-white">{event.title}</h4>
                  </div>
                  <p className="text-xs text-slate-300 mb-2 leading-relaxed">
                    {event.description}
                  </p>
                  {event.magnitude && (
                    <div className="text-xs text-slate-400 mb-1">
                      <strong className="text-slate-300">Magnitud:</strong> {event.magnitude.toFixed(1)}
                    </div>
                  )}
                  <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-border">
                    <span>{event.source}</span>
                    <span>{new Date(event.detectedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                  </div>
                </div>
              </Popup>
            </Marker>
          )
        })}
      </MapContainer>

      {/* Crosshair overlay */}
      <Crosshair />

      {/* Map Controls */}
      <MapControls onFitBounds={handleFitBounds} onReset={handleReset} />
    </div>
  )
}
