import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Search, Crosshair, Plus, Minus } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import { DisasterEvent } from '../types'

interface MapProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  loading: boolean
}

// --- Teselas oscuras sin API key (Esri Dark Gray Canvas) ---
const TILE_URL =
  'https://services.arcgisonline.com/arcgis/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}'
const TILE_ATTR = 'Tiles &copy; Esri &mdash; Esri, HERE, Garmin, OpenStreetMap'

// --- Configuración visual por severidad ---
function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical':
      return { color: '#f87171', size: 30, animated: true, label: 'CRÍTICO' }
    case 'high':
      return { color: '#fb923c', size: 26, animated: true, label: 'ALTO' }
    case 'medium':
      return { color: '#fbbf24', size: 22, animated: true, label: 'MEDIO' }
    case 'low':
      return { color: '#38bdf8', size: 18, animated: false, label: 'BAJO' }
    default:
      return { color: '#64748b', size: 18, animated: false, label: 'NORMAL' }
  }
}

function createCustomIcon(event: DisasterEvent, selected: boolean): L.DivIcon {
  const cfg = getSeverityConfig(event.severity)
  const size = selected ? cfg.size + 8 : cfg.size

  const html = `
    <div class="a360-wrap">
      <div class="a360-marker ${selected ? 'is-selected' : ''} ${cfg.animated ? '' : 'is-static'}"
           style="--c:${cfg.color}">
        <span class="a360-halo"></span>
        ${cfg.animated ? '<span class="a360-ring"></span><span class="a360-ring"></span>' : ''}
        <span class="a360-dot"></span>
      </div>
    </div>
  `

  return L.divIcon({
    html,
    className: 'a360-wrap',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  })
}

// Auto-encuadre inicial
function FitBounds({ events }: { events: DisasterEvent[] }) {
  const map = useMap()
  const hasFit = useRef(false)

  useEffect(() => {
    if (events.length > 0 && !hasFit.current) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.latitude, e.longitude] as [number, number])
      )
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [70, 70], maxZoom: 4 })
        hasFit.current = true
      }
    }
  }, [map, events])

  return null
}

// Líneas de conexión sutiles entre eventos del mismo tipo
function EventConnections({ events }: { events: DisasterEvent[] }) {
  const map = useMap()

  useEffect(() => {
    const group = L.featureGroup().addTo(map)
    const maxPairs = 400
    let pairs = 0

    for (let i = 0; i < events.length && pairs < maxPairs; i++) {
      for (let j = i + 1; j < events.length && pairs < maxPairs; j++) {
        const a = events[i]
        const b = events[j]
        if (a.type !== b.type) continue

        const dist = Math.sqrt(
          Math.pow(a.latitude - b.latitude, 2) + Math.pow(a.longitude - b.longitude, 2)
        )
        if (dist > 0.4 && dist < 4) {
          L.polyline(
            [
              [a.latitude, a.longitude],
              [b.latitude, b.longitude],
            ],
            {
              color: '#38bdf8',
              weight: 1,
              opacity: 0.14,
              dashArray: '4, 7',
              lineCap: 'round',
            }
          ).addTo(group)
          pairs++
        }
      }
    }

    return () => {
      map.removeLayer(group)
    }
  }, [map, events])

  return null
}

export default function Map({ events, selectedEvent, onSelectEvent, loading }: MapProps) {
  const mapRef = useRef<L.Map | null>(null)

  const handleFitBounds = () => {
    const map = mapRef.current
    if (map && events.length > 0) {
      const bounds = L.latLngBounds(
        events.map((e) => [e.latitude, e.longitude] as [number, number])
      )
      if (bounds.isValid()) map.fitBounds(bounds, { padding: [70, 70], maxZoom: 4 })
    }
  }

  const handleReset = () => {
    mapRef.current?.setView([20, 10], 2, { animate: true })
  }

  return (
    <div className="relative w-full h-full">
      {/* ---------- Mapa ---------- */}
      <MapContainer
        center={[20, 10]}
        zoom={2}
        minZoom={1.5}
        maxZoom={16}
        style={{ width: '100%', height: '100%' }}
        ref={mapRef}
        zoomControl={false}
        attributionControl={false}
        className="z-0"
      >
        <TileLayer url={TILE_URL} attribution={TILE_ATTR} maxZoom={19} />

        <FitBounds events={events} />
        <EventConnections events={events} />

        {events.map((event) => (
          <Marker
            key={event.id}
            position={[event.latitude, event.longitude]}
            icon={createCustomIcon(event, selectedEvent?.id === event.id)}
            eventHandlers={{ click: () => onSelectEvent(event) }}
            title={event.title}
            zIndexOffset={selectedEvent?.id === event.id ? 1000 : 0}
          >
            <Popup>
              <div className="min-w-[250px]">
                <div className="flex items-start gap-2 mb-2">
                  <span
                    className="mt-0.5 w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ background: getSeverityConfig(event.severity).color, boxShadow: `0 0 8px ${getSeverityConfig(event.severity).color}` }}
                  />
                  <div>
                    <h4 className="font-bold text-[13px] text-white leading-snug">{event.title}</h4>
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider"
                      style={{ color: getSeverityConfig(event.severity).color }}
                    >
                      {getSeverityConfig(event.severity).label}
                    </span>
                  </div>
                </div>
                <p className="text-[11.5px] text-slate-400 leading-relaxed mb-2">
                  {event.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-white/10">
                  <span className="font-mono">{event.source}</span>
                  <span>
                    {new Date(event.detectedAt).toLocaleTimeString('es-ES', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </span>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* ---------- Tinte azulado sobre el mapa ---------- */}
      <div className="absolute inset-0 z-[5] pointer-events-none bg-[#0b2136]/25 mix-blend-screen" />

      {/* ---------- Retícula central ---------- */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 opacity-40">
        <div className="relative w-6 h-6">
          <div className="absolute inset-0 rounded-full border border-slate-500/40" />
          <div className="absolute left-1/2 top-1/2 w-[1px] h-3 -translate-x-1/2 -translate-y-[26px] bg-slate-500/30" />
          <div className="absolute left-1/2 top-1/2 w-[1px] h-3 -translate-x-1/2 translate-y-[14px] bg-slate-500/30" />
          <div className="absolute top-1/2 left-1/2 h-[1px] w-3 -translate-y-1/2 -translate-x-[26px] bg-slate-500/30" />
          <div className="absolute top-1/2 left-1/2 h-[1px] w-3 -translate-y-1/2 translate-x-[14px] bg-slate-500/30" />
        </div>
      </div>

      {/* ---------- Zoom (arriba-izquierda, como el mockup) ---------- */}
      <motion.div
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        className="absolute top-4 left-4 z-30 flex flex-col rounded-xl overflow-hidden
                   bg-[#0e1a26]/85 backdrop-blur-md border border-white/10
                   shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)]"
      >
        <button
          onClick={() => mapRef.current?.zoomIn()}
          title="Acercar"
          className="w-9 h-9 grid place-items-center text-slate-300 hover:text-cyan-300 hover:bg-white/5 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-white/10" />
        <button
          onClick={() => mapRef.current?.zoomOut()}
          title="Alejar"
          className="w-9 h-9 grid place-items-center text-slate-300 hover:text-cyan-300 hover:bg-white/5 transition"
        >
          <Minus className="w-4 h-4" />
        </button>
      </motion.div>

      {/* ---------- Acciones (arriba-derecha) ---------- */}
      <div className="absolute top-4 right-4 z-30 flex flex-col gap-2">
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleFitBounds}
          title="Ajustar vista a todos los eventos"
          className="w-9 h-9 grid place-items-center rounded-xl
                     bg-[#0e1a26]/85 backdrop-blur-md border border-white/10
                     text-slate-300 hover:text-cyan-300 hover:border-cyan-300/40
                     shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)] transition-colors"
        >
          <Search className="w-4 h-4" />
        </motion.button>
        <motion.button
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.95 }}
          onClick={handleReset}
          title="Restablecer vista"
          className="w-9 h-9 grid place-items-center rounded-xl
                     bg-[#0e1a26]/85 backdrop-blur-md border border-white/10
                     text-slate-300 hover:text-slate-100 hover:border-white/25
                     shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)] transition-colors"
        >
          <Crosshair className="w-4 h-4" />
        </motion.button>
      </div>

      {/* ---------- Atribución discreta ---------- */}
      <div className="absolute bottom-2 right-3 z-20 text-[9px] text-slate-600/80 pointer-events-none">
        © Esri · OpenStreetMap
      </div>

      {/* ---------- Overlay de carga ---------- */}
      {loading && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-[#0b131d]/55 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#13202e]/90 border border-white/10 shadow-2xl">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-300">Cargando eventos…</span>
          </div>
        </div>
      )}
    </div>
  )
}
