import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Crosshair, Plus, Minus, Layers, Box, Tag, Check, Flame, Building2, Play, Pause, History } from 'lucide-react'
import { MapContainer, TileLayer, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet.heat'
import { DisasterEvent } from '../types'

const Map3D = lazy(() => import('./Map3D'))

export interface TimelineState {
  enabled: boolean
  hoursAgo: number   // 0 = ahora · 24 = hace 24 h
  playing: boolean
}

interface MapProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  loading: boolean
  timeline: TimelineState
  onTimelineChange: (next: Partial<TimelineState>) => void
}

/* ------------------------------------------------------------------ */
/*  Estilos de mapa (sin API key)                                     */
/* ------------------------------------------------------------------ */
type BasemapId = 'dark' | 'sat' | 'topo' | 'relief'

const BASEMAPS: Record<BasemapId, {
  label: string
  base: string
  overlay?: string
  swatch: string
}> = {
  dark: {
    label: 'Oscuro',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    swatch: 'linear-gradient(135deg,#16222f,#0b131d 70%)',
  },
  sat: {
    label: 'Satélite',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    overlay: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
    swatch: 'linear-gradient(135deg,#2f5d3a,#123047 45%,#0c1b2a 80%)',
  },
  topo: {
    label: 'Terreno',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    swatch: 'linear-gradient(135deg,#5b6b3f,#31425a 55%,#12202e 85%)',
  },
  relief: {
    label: 'Relieve',
    base: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Shaded_Relief/MapServer/tile/{z}/{y}/{x}',
    swatch: 'linear-gradient(135deg,#6b5b46,#3a4356 55%,#111a26 85%)',
  },
}

const TILE_ATTR = 'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics, OpenStreetMap'

/* ------------------------------------------------------------------ */
/*  Marcadores                                                        */
/* ------------------------------------------------------------------ */
function getSeverityConfig(severity: string) {
  switch (severity) {
    case 'critical': return { color: '#f87171', size: 30, animated: true, label: 'CRÍTICO' }
    case 'high':     return { color: '#fb923c', size: 26, animated: true, label: 'ALTO' }
    case 'medium':   return { color: '#fbbf24', size: 22, animated: true, label: 'MEDIO' }
    case 'low':      return { color: '#38bdf8', size: 18, animated: false, label: 'BAJO' }
    default:         return { color: '#64748b', size: 18, animated: false, label: 'NORMAL' }
  }
}

function severityWeight(severity: string): number {
  switch (severity) {
    case 'critical': return 1
    case 'high': return 0.72
    case 'medium': return 0.45
    default: return 0.2
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

/* ------------------------------------------------------------------ */
/*  Capas internas de Leaflet                                         */
/* ------------------------------------------------------------------ */
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
            [[a.latitude, a.longitude], [b.latitude, b.longitude]],
            { color: '#38bdf8', weight: 1, opacity: 0.14, dashArray: '4, 7', lineCap: 'round' }
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

/** Agrupa eventos en burbujas; al hacer clic se acerca a la zona. */
function ClusterLayer({
  events,
  selectedEvent,
  onSelectEvent,
  heatmap,
}: {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  heatmap: boolean
}) {
  const map = useMap()

  useEffect(() => {
    const Leaflet: any = L
    const group: any = Leaflet.layerGroup().addTo(map)

    const rebuild = () => {
      group.clearLayers()

      const zoom = map.getZoom()
      const cell = 56 // px
      const buckets = new globalThis.Map<string, DisasterEvent[]>()

      for (const ev of events) {
        const p: any = (map as any).project([ev.latitude, ev.longitude], zoom)
        const key = `${Math.floor(p.x / cell)}:${Math.floor(p.y / cell)}`
        const arr = buckets.get(key)
        if (arr) arr.push(ev)
        else buckets.set(key, [ev])
      }

      // fusiona grupos cuyos centroides quedan a menos de 40 px
      const groups = Array.from(buckets.values())
      const merged: DisasterEvent[][] = []
      const centroid = (arr: DisasterEvent[]) => [
        arr.reduce((sum, e) => sum + e.latitude, 0) / arr.length,
        arr.reduce((sum, e) => sum + e.longitude, 0) / arr.length,
      ]
      for (const arr of groups) {
        const [lat, lng] = centroid(arr)
        const p: any = (map as any).project([lat, lng], zoom)
        const host = merged.find((m) => {
          const [mlat, mlng] = centroid(m)
          const mp: any = (map as any).project([mlat, mlng], zoom)
          return Math.hypot(mp.x - p.x, mp.y - p.y) < 40
        })
        if (host) host.push(...arr)
        else merged.push([...arr])
      }

      merged.forEach((arr) => {
        if (arr.length === 1) {
          const ev = arr[0]
          const marker = Leaflet.marker([ev.latitude, ev.longitude], {
            icon: createCustomIcon(ev, selectedEvent?.id === ev.id),
            zIndexOffset: selectedEvent?.id === ev.id ? 1000 : 0,
            title: ev.title,
          })
          marker.on('click', () => onSelectEvent(ev))
          group.addLayer(marker)
          return
        }

        const lat = arr.reduce((sum, e) => sum + e.latitude, 0) / arr.length
        const lng = arr.reduce((sum, e) => sum + e.longitude, 0) / arr.length
        const hasHigh = arr.some((e) => e.severity === 'high' || e.severity === 'critical')
        const color = hasHigh ? '#fb923c' : '#22d3ee'
        const size = arr.length >= 50 ? 48 : arr.length >= 10 ? 40 : 34

        const icon = Leaflet.divIcon({
          className: 'a360-wrap',
          html: `<div class="a360-bubble" style="--c:${color};width:${size}px;height:${size}px">
                   <span>${arr.length}</span>
                 </div>`,
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        })

        const marker = Leaflet.marker([lat, lng], { icon, title: `${arr.length} eventos` })
        marker.on('click', () => {
          const bounds = Leaflet.latLngBounds(arr.map((e) => [e.latitude, e.longitude] as [number, number]))
          map.fitBounds(bounds, {
            padding: [60, 60],
            maxZoom: Math.min(zoom + 2.5, 10),
            animate: true,
            duration: 0.6,
          })
        })
        group.addLayer(marker)
      })

      // con calor activo, atenuar los marcadores
      group.eachLayer((layer: any) => {
        const el: HTMLElement | undefined = layer.getElement?.()
        if (el) {
          el.style.opacity = heatmap ? '0.35' : '1'
          el.style.transition = 'opacity .25s ease'
        }
      })
    }

    rebuild()
    map.on('zoomend', rebuild)
    map.on('moveend', rebuild)

    return () => {
      map.off('zoomend', rebuild)
      map.off('moveend', rebuild)
      map.removeLayer(group)
    }
  }, [map, events, selectedEvent, onSelectEvent, heatmap])

  return null
}

/** Mapa de calor de densidad (leaflet.heat), ponderado por severidad. */
function HeatLayer({ events, visible }: { events: DisasterEvent[]; visible: boolean }) {
  const map = useMap()
  const layerRef = useRef<any>(null)

  useEffect(() => {
    if (!visible) {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
      return
    }

    const points = events.map(
      (e) => [e.latitude, e.longitude, severityWeight(e.severity)] as [number, number, number]
    )

    const layer = (L as any).heatLayer(points, {
      radius: 30,
      blur: 24,
      maxZoom: 7,
      minOpacity: 0.22,
      max: 1.4,
      gradient: {
        0.15: '#0b3a55',
        0.35: '#0ea5e9',
        0.55: '#38bdf8',
        0.72: '#fbbf24',
        0.88: '#fb923c',
        1.0: '#f87171',
      },
    })

    layer.addTo(map)
    layerRef.current = layer

    return () => {
      if (layerRef.current) {
        map.removeLayer(layerRef.current)
        layerRef.current = null
      }
    }
  }, [map, events, visible])

  return null
}

/* ------------------------------------------------------------------ */
/*  Mapa                                                             */
/* ------------------------------------------------------------------ */
export default function Map({
  events,
  selectedEvent,
  onSelectEvent,
  loading,
  timeline,
  onTimelineChange,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null)
  const [basemap, setBasemap] = useState<BasemapId>('dark')
  const [showLabels, setShowLabels] = useState(true)
  const [is3D, setIs3D] = useState(false)
  const [heatmap, setHeatmap] = useState(false)
  const [buildings, setBuildings] = useState(false)
  const [layersOpen, setLayersOpen] = useState(false)

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

  const style = BASEMAPS[basemap]

  // ventana de la línea de tiempo, p. ej. "18:40 → ahora"
  const timelineWindow = (() => {
    if (!timeline.enabled) return ''
    const fmt = (d: Date) =>
      d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
    const start = new Date(Date.now() - 24 * 3_600_000)
    const end = new Date(Date.now() - timeline.hoursAgo * 3_600_000)
    return timeline.hoursAgo < 0.05 ? `${fmt(start)} → ahora` : `${fmt(start)} → ${fmt(end)}`
  })()

  return (
    <div
      className="relative w-full h-full"
      data-basemap={basemap}
      data-timeline={timeline.enabled ? 'true' : 'false'}
      data-3d={is3D ? 'on' : 'off'}
    >
      {/* ---------------- 2D ---------------- */}
      {!is3D && (
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
          <TileLayer key={`base-${basemap}`} url={style.base} attribution={TILE_ATTR} maxZoom={19} />

          {style.overlay && showLabels && (
            <TileLayer
              key={`ov-${basemap}`}
              url={style.overlay}
              maxZoom={19}
              opacity={basemap === 'sat' ? 0.55 : 0.85}
            />
          )}

          <FitBounds events={events} />
          <EventConnections events={events} />
          <HeatLayer events={events} visible={heatmap} />

          <ClusterLayer
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={onSelectEvent}
            heatmap={heatmap}
          />

        </MapContainer>
      )}

      {/* ---------------- 3D ---------------- */}
      {is3D && (
        <Suspense
          fallback={
            <div className="w-full h-full grid place-items-center bg-[#0b131d]">
              <div className="flex items-center gap-3 text-slate-400 text-sm">
                <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                Cargando vista 3D…
              </div>
            </div>
          }
        >
          <Map3D
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={onSelectEvent}
            heatmap={heatmap}
            buildings={buildings}
            showLabels={showLabels}
          />
        </Suspense>
      )}

      {/* Tinte azulado: sólo sobre el mapa oscuro */}
      {!is3D && basemap === 'dark' && (
        <div className="absolute inset-0 z-[400] pointer-events-none bg-[#0b2136]/25 mix-blend-screen" />
      )}

      {/* Retícula central (sólo 2D) */}
      {!is3D && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[410] opacity-40">
          <div className="relative w-6 h-6">
            <div className="absolute inset-0 rounded-full border border-slate-500/40" />
            <div className="absolute left-1/2 top-1/2 w-[1px] h-3 -translate-x-1/2 -translate-y-[26px] bg-slate-500/30" />
            <div className="absolute left-1/2 top-1/2 w-[1px] h-3 -translate-x-1/2 translate-y-[14px] bg-slate-500/30" />
            <div className="absolute top-1/2 left-1/2 h-[1px] w-3 -translate-y-1/2 -translate-x-[26px] bg-slate-500/30" />
            <div className="absolute top-1/2 left-1/2 h-[1px] w-3 -translate-y-1/2 translate-x-[14px] bg-slate-500/30" />
          </div>
        </div>
      )}

      {/* ---------------- Controles 2D ---------------- */}
      {!is3D && (
        <>
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-4 left-4 z-[500] flex flex-col rounded-xl overflow-hidden
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

          <div className="absolute top-4 right-4 z-[500] flex flex-col gap-2">
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
        </>
      )}

      {/* ---------------- Panel de capas ---------------- */}
      <div
        className={`absolute right-3 z-[600] flex flex-col items-end gap-2 transition-[bottom] duration-300 ${
          timeline.enabled ? 'bottom-[104px]' : 'bottom-3'
        }`}
      >
        <AnimatePresence>
          {layersOpen && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="w-[224px] rounded-2xl overflow-hidden
                         bg-[#0f1c29]/95 backdrop-blur-xl border border-white/10
                         shadow-[0_24px_60px_-20px_rgba(0,0,0,.95)]"
            >
              <div className="px-3 pt-2.5 pb-1.5 flex items-center justify-between">
                <span className="text-[9.5px] font-bold tracking-[0.16em] text-slate-400">
                  CAPAS DE MAPA
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 px-2">
                {(Object.keys(BASEMAPS) as BasemapId[]).map((id) => {
                  const active = basemap === id && !is3D
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setBasemap(id)
                        setIs3D(false)
                      }}
                      className={`group relative rounded-lg overflow-hidden border transition
                        ${active ? 'border-cyan-400/70' : 'border-white/10 hover:border-white/25'}`}
                    >
                      <span className="block h-9 w-full" style={{ background: BASEMAPS[id].swatch }} />
                      <span className="absolute inset-x-0 bottom-0 px-1.5 py-0.5 text-[9.5px] font-semibold
                                       text-slate-200 bg-black/45 backdrop-blur-sm text-left">
                        {BASEMAPS[id].label}
                      </span>
                      {active && (
                        <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-cyan-400 grid place-items-center">
                          <Check className="w-2.5 h-2.5 text-[#06222b]" strokeWidth={3} />
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="p-2 space-y-1.5">
                <Toggle
                  active={is3D}
                  onClick={() => setIs3D((v) => !v)}
                  icon={<Box className="w-3.5 h-3.5" />}
                  label="Vista 3D"
                />

                {!is3D && basemap !== 'topo' && basemap !== 'relief' && (
                  <Toggle
                    active={showLabels}
                    onClick={() => setShowLabels((v) => !v)}
                    icon={<Tag className="w-3.5 h-3.5" />}
                    label="Etiquetas"
                  />
                )}

                {is3D && (
                  <Toggle
                    active={showLabels}
                    onClick={() => setShowLabels((v) => !v)}
                    icon={<Tag className="w-3.5 h-3.5" />}
                    label="Ciudades"
                  />
                )}

                <Toggle
                  active={heatmap}
                  onClick={() => setHeatmap((v) => !v)}
                  icon={<Flame className="w-3.5 h-3.5" />}
                  label="Mapa de calor"
                />

                <Toggle
                  active={timeline.enabled}
                  onClick={() =>
                    onTimelineChange({
                      enabled: !timeline.enabled,
                      hoursAgo: 0,
                      playing: false,
                    })
                  }
                  icon={<History className="w-3.5 h-3.5" />}
                  label="Línea de tiempo"
                />

                {is3D && (
                  <>
                    <Toggle
                      active={buildings}
                      onClick={() => setBuildings((v) => !v)}
                      icon={<Building2 className="w-3.5 h-3.5" />}
                      label="Edificios 3D"
                    />
                    {buildings && (
                      <p className="px-1 pt-0.5 text-[9px] leading-snug text-slate-500">
                        Acércate a una ciudad (zoom 13+) para ver los edificios.
                      </p>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setLayersOpen((v) => !v)}
          title="Capas del mapa"
          className={`h-9 px-3 flex items-center gap-1.5 rounded-xl text-[11px] font-semibold
                     backdrop-blur-md border transition-colors
                     shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)]
                     ${layersOpen
                       ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-200'
                       : 'bg-[#0e1a26]/85 border-white/10 text-slate-300 hover:text-white'}`}
        >
          <Layers className="w-4 h-4" />
          {is3D ? '3D' : BASEMAPS[basemap].label}
        </motion.button>
      </div>

      {/* ---------------- Línea de tiempo ---------------- */}
      <AnimatePresence>
        {timeline.enabled && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="absolute bottom-3 left-3 right-3 z-[600]
                       rounded-2xl bg-[#0f1c29]/95 backdrop-blur-xl border border-white/10
                       shadow-[0_24px_60px_-20px_rgba(0,0,0,.95)] px-3 py-2.5 mx-auto max-w-[760px]"
          >
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (timeline.playing) {
                    onTimelineChange({ playing: false })
                  } else {
                    onTimelineChange({ playing: true, hoursAgo: timeline.hoursAgo <= 0 ? 24 : timeline.hoursAgo })
                  }
                }}
                title={timeline.playing ? 'Pausar' : 'Reproducir últimas 24 h'}
                className={`w-8 h-8 shrink-0 grid place-items-center rounded-lg border transition
                  ${timeline.playing
                    ? 'bg-cyan-400/15 border-cyan-400/50 text-cyan-300'
                    : 'bg-white/[0.04] border-white/10 text-slate-300 hover:text-white hover:border-white/25'}`}
              >
                {timeline.playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 text-[9.5px] text-slate-500 mb-1">
                  <span className="shrink-0">−24 h</span>
                  <span className="text-slate-300 font-semibold tabular-nums truncate">
                    {timelineWindow}
                  </span>
                  <span className="shrink-0">ahora</span>
                </div>

                <input
                  type="range"
                  min={0}
                  max={24}
                  step={0.25}
                  value={24 - timeline.hoursAgo}
                  onChange={(e) =>
                    onTimelineChange({
                      hoursAgo: 24 - Number(e.target.value),
                      playing: false,
                    })
                  }
                  onInput={(e) =>
                    onTimelineChange({
                      hoursAgo: 24 - Number((e.target as HTMLInputElement).value),
                      playing: false,
                    })
                  }
                  className="w-full h-1.5 appearance-none rounded-full bg-white/10 accent-cyan-400 cursor-pointer
                             [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3
                             [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full
                             [&::-webkit-slider-thumb]:bg-cyan-300 [&::-webkit-slider-thumb]:shadow-[0_0_10px_rgba(34,211,238,.9)]"
                  style={{
                    background: `linear-gradient(90deg, rgba(34,211,238,.75) 0%, rgba(34,211,238,.75) ${
                      ((24 - timeline.hoursAgo) / 24) * 100
                    }%, rgba(255,255,255,.10) ${((24 - timeline.hoursAgo) / 24) * 100}%, rgba(255,255,255,.10) 100%)`,
                  }}
                />
              </div>

              <button
                onClick={() => onTimelineChange({ enabled: false, playing: false })}
                title="Cerrar línea de tiempo"
                className="shrink-0 text-[10px] text-slate-500 hover:text-slate-300 px-1"
              >
                ✕
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Atribución */}
      {!is3D && (
        <div
          className={`absolute left-3 z-[420] text-[9px] text-slate-600/80 pointer-events-none transition-[bottom] duration-300 ${
            timeline.enabled ? 'bottom-[92px]' : 'bottom-2'
          }`}
        >
          © Esri · OpenStreetMap
        </div>
      )}

      {/* Carga */}
      {loading && (
        <div className="absolute inset-0 z-[700] flex items-center justify-center bg-[#0b131d]/55 backdrop-blur-[2px]">
          <div className="flex items-center gap-3 px-5 py-3.5 rounded-2xl bg-[#13202e]/90 border border-white/10 shadow-2xl">
            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-300">Cargando eventos…</span>
          </div>
        </div>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Switch reutilizable del panel                                     */
/* ------------------------------------------------------------------ */
function Toggle({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg border text-[10.5px] transition
        ${active
          ? 'bg-cyan-400/10 border-cyan-400/45 text-cyan-300'
          : 'bg-white/[0.03] border-white/10 text-slate-300 hover:border-white/25'}`}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {label}
      </span>
      <span className={`w-7 h-3.5 rounded-full relative transition ${active ? 'bg-cyan-400' : 'bg-white/15'}`}>
        <span
          className={`absolute top-0.5 w-2.5 h-2.5 rounded-full bg-white transition-all
            ${active ? 'left-[15px]' : 'left-0.5'}`}
        />
      </span>
    </button>
  )
}
