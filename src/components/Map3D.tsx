import { useEffect, useRef } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Plus, Minus, Compass } from 'lucide-react'
import { DisasterEvent } from '../types'

interface Map3DProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
}

/* ---------- paleta por severidad ---------- */
function severityColor(severity: string): string {
  switch (severity) {
    case 'critical': return '#f87171'
    case 'high': return '#fb923c'
    case 'medium': return '#fbbf24'
    default: return '#38bdf8'
  }
}

function markerElement(event: DisasterEvent, selected: boolean): HTMLElement {
  const c = severityColor(event.severity)
  const size = selected ? 26 : event.severity === 'high' ? 20 : 16
  const el = document.createElement('div')
  el.className = 'a360-gl-marker'
  el.style.setProperty('--c', c)
  el.style.width = `${size}px`
  el.style.height = `${size}px`
  el.innerHTML = `
    <span class="a360-gl-halo"></span>
    <span class="a360-gl-dot"></span>
  `
  el.title = `${event.title} — ${event.source}`
  return el
}

/**
 * Vista 3D tipo "Google Earth": satélite + modelo digital del terreno
 * (MapLibre GL + proyección globo). Sin API key.
 */
export default function Map3D({ events, selectedEvent, onSelectEvent }: Map3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const markersRef = useRef<maplibregl.Marker[]>([])
  const fittedRef = useRef(false)

  /* ---------------- init ---------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        sources: {
          satelite: {
            type: 'raster',
            tiles: [
              'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            ],
            tileSize: 256,
            maxzoom: 17,
            attribution: '© Esri, Maxar, Earthstar Geographics',
          },
          terreno: {
            type: 'raster-dem',
            tiles: [
              'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png',
            ],
            encoding: 'terrarium',
            tileSize: 256,
            maxzoom: 13,
          },
        },
        layers: [
          { id: 'fondo', type: 'background', paint: { 'background-color': '#0b131d' } },
          {
            id: 'satelite',
            type: 'raster',
            source: 'satelite',
            paint: { 'raster-brightness-max': 0.92, 'raster-saturation': 0.12, 'raster-contrast': 0.05 },
          },
        ],
      } as any,
      center: [8, 22],
      zoom: 1.7,
      pitch: 52,
      bearing: -14,
      maxPitch: 85,
      attributionControl: false,
      dragRotate: true,
    })

    mapRef.current = map

    map.on('load', () => {
      // Proyección globo (se comporta como Google Earth)
      try {
        ;(map as any).setProjection?.({ type: 'globe' })
      } catch {
        /* versiones sin soporte: sigue en mercator */
      }

      // Terreno 3D (puede fallar si el DEM no responde: se ignora)
      try {
        map.setTerrain({ source: 'terreno', exaggeration: 1.25 } as any)
      } catch (e) {
        console.warn('[Map3D] terreno no disponible', e)
      }

      // Cielo / horizonte
      try {
        map.addLayer({
          id: 'cielo',
          type: 'sky',
          paint: {
            'sky-color': '#0a1a2b',
            'sky-horizon-blend': 0.7,
            'horizon-color': '#12314f',
            'horizon-fog-blend': 0.55,
            'fog-color': '#0b131d',
            'fog-ground-blend': 0.35,
          },
        } as any)
      } catch {
        /* opcional */
      }
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.remove()
      mapRef.current = null
    }
  }, [])

  /* ---------------- encuadre inicial ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || fittedRef.current || events.length === 0) return

    const fit = () => {
      const bounds = new maplibregl.LngLatBounds()
      events.forEach((e) => bounds.extend([e.longitude, e.latitude]))
      if (!bounds.isEmpty()) {
        map.fitBounds(bounds, { padding: 90, maxZoom: 3.2, pitch: 55, duration: 900 })
        fittedRef.current = true
      }
    }

    if (map.loaded()) fit()
    else map.once('load', fit)
  }, [events])

  /* ---------------- marcadores ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const draw = () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []

      events.slice(0, 500).forEach((ev) => {
        const el = markerElement(ev, selectedEvent?.id === ev.id)
        el.addEventListener('click', (e) => {
          e.stopPropagation()
          onSelectEvent(ev)
        })
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([ev.longitude, ev.latitude])
          .addTo(map)
        markersRef.current.push(marker)
      })
    }

    if (map.loaded()) draw()
    else map.once('load', draw)
  }, [events, selectedEvent, onSelectEvent])

  /* ---------------- volar al evento seleccionado ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedEvent) return
    map.flyTo({
      center: [selectedEvent.longitude, selectedEvent.latitude],
      zoom: Math.max(map.getZoom(), 4),
      duration: 1200,
      essential: true,
    })
  }, [selectedEvent])

  /* ---------------- controles ---------------- */
  const zoomIn = () => mapRef.current?.zoomIn({ duration: 300 })
  const zoomOut = () => mapRef.current?.zoomOut({ duration: 300 })
  const reset = () => {
    const map = mapRef.current
    if (!map) return
    if (events.length === 0) {
      map.easeTo({ center: [8, 22], zoom: 1.7, pitch: 52, bearing: -14, duration: 700 })
      return
    }
    const bounds = new maplibregl.LngLatBounds()
    events.forEach((e) => bounds.extend([e.longitude, e.latitude]))
    map.fitBounds(bounds, { padding: 90, maxZoom: 3.2, pitch: 52, bearing: -14, duration: 800 })
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0" />

      {/* Zoom + brújula */}
      <div className="absolute top-4 left-4 z-30 flex flex-col rounded-xl overflow-hidden
                      bg-[#0e1a26]/85 backdrop-blur-md border border-white/10
                      shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)]">
        <button onClick={zoomIn} title="Acercar" className="w-9 h-9 grid place-items-center text-slate-300 hover:text-cyan-300 hover:bg-white/5 transition">
          <Plus className="w-4 h-4" />
        </button>
        <div className="h-px bg-white/10" />
        <button onClick={zoomOut} title="Alejar" className="w-9 h-9 grid place-items-center text-slate-300 hover:text-cyan-300 hover:bg-white/5 transition">
          <Minus className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={reset}
        title="Centrar en los eventos"
        className="absolute top-4 right-4 z-30 w-9 h-9 grid place-items-center rounded-xl
                   bg-[#0e1a26]/85 backdrop-blur-md border border-white/10 text-slate-300
                   hover:text-cyan-300 hover:border-cyan-300/40 transition-colors
                   shadow-[0_10px_30px_-10px_rgba(0,0,0,.8)]"
      >
        <Compass className="w-4 h-4" />
      </button>

      <div className="absolute bottom-2 right-3 z-20 text-[9px] text-slate-400/70 pointer-events-none">
        © Esri · Terreno: AWS Terrain Tiles · MapLibre
      </div>
    </div>
  )
}
