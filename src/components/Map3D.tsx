import { useEffect, useRef } from 'react'
import * as maplibreglNS from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { Plus, Minus, Compass } from 'lucide-react'
import { DisasterEvent } from '../types'

// Interop: con el dep-optimizer de Vite el build CJS expone la API en `default`;
// en ESM viene en el namespace. Cubrimos ambos casos.
const maplibregl: any = (maplibreglNS as any).default ?? maplibreglNS

interface Map3DProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  heatmap?: boolean
  buildings?: boolean
  showLabels?: boolean
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

function severityWeight(severity: string): number {
  switch (severity) {
    case 'critical': return 1
    case 'high': return 0.72
    case 'medium': return 0.45
    default: return 0.2
  }
}

function toGeoJSON(events: DisasterEvent[]) {
  return {
    type: 'FeatureCollection' as const,
    features: events.map((e) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [e.longitude, e.latitude] },
      properties: {
        id: e.id,
        weight: severityWeight(e.severity),
        severity: e.severity,
        color: severityColor(e.severity),
      },
    })),
  }
}


/**
 * Vista 3D tipo "Google Earth": satélite + relieve real (DEM) + edificios 3D
 * OpenStreetMap + mapa de calor de eventos. Sin API key.
 */
export default function Map3D({
  events,
  selectedEvent,
  onSelectEvent,
  heatmap = false,
  buildings = false,
  showLabels = true,
}: Map3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const fittedRef = useRef(false)
  const loadedRef = useRef(false)

  // opciones vivas para usar dentro de callbacks de map.on('load')
  const optsRef = useRef({ heatmap, buildings, showLabels })
  optsRef.current = { heatmap, buildings, showLabels }

  /* ---------------- init ---------------- */
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: {
        version: 8,
        glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
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
          // Vector tiles gratuitos (OpenFreeMap / OpenMapTiles) para edificios y topónimos
          osm: {
            type: 'vector',
            url: 'https://tiles.openfreemap.org/planet',
          },
          eventos: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] } as any,
          },
          eventosCluster: {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] } as any,
            cluster: true,
            clusterRadius: 46,
            clusterMaxZoom: 6,
          },
        },
        layers: [
          { id: 'fondo', type: 'background', paint: { 'background-color': '#0b131d' } },
          {
            id: 'satelite',
            type: 'raster',
            source: 'satelite',
            paint: {
              'raster-brightness-max': 0.92,
              'raster-saturation': 0.12,
              'raster-contrast': 0.05,
            },
          },
          {
            id: 'edificios',
            type: 'fill-extrusion',
            source: 'osm',
            'source-layer': 'building',
            minzoom: 13,
            filter: ['!=', ['get', 'hide_3d'], true],
            layout: { visibility: 'none' },
            paint: {
              'fill-extrusion-color': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'render_height'], 12],
                0, '#1d3448',
                25, '#28516b',
                80, '#2f7091',
                200, '#3c93b3',
              ],
              'fill-extrusion-height': [
                'coalesce',
                ['get', 'render_height'],
                ['*', ['coalesce', ['get', 'building:levels'], 3], 3],
              ],
              'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
              'fill-extrusion-opacity': 0.88,
              'fill-extrusion-vertical-gradient': true,
            },
          } as any,
          {
            id: 'calor',
            type: 'heatmap',
            source: 'eventos',
            maxzoom: 12,
            layout: { visibility: 'none' },
            paint: {
              'heatmap-weight': ['get', 'weight'],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 1.6, 4, 2.1, 8, 2.6, 12, 3.0],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 26, 4, 38, 8, 54, 12, 74],
              'heatmap-opacity': 0.9,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0, 'rgba(8,20,32,0)',
                0.2, 'rgba(14,165,233,0.55)',
                0.42, 'rgba(56,189,248,0.75)',
                0.6, 'rgba(251,191,36,0.85)',
                0.78, 'rgba(251,146,60,0.9)',
                1, 'rgba(248,113,113,0.95)',
              ],
            },
          },
          {
            id: 'clusters-halo',
            type: 'circle',
            source: 'eventosCluster',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#38bdf8',
              'circle-opacity': 0.16,
              'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 22, 20, 34, 100, 52],
            },
          } as any,
          {
            id: 'clusters',
            type: 'circle',
            source: 'eventosCluster',
            filter: ['has', 'point_count'],
            paint: {
              'circle-color': '#22d3ee',
              'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 13, 20, 18, 100, 24],
              'circle-stroke-color': 'rgba(255,255,255,.85)',
              'circle-stroke-width': 1.4,
              'circle-opacity': 0.95,
            },
          } as any,
          {
            id: 'clusters-count',
            type: 'symbol',
            source: 'eventosCluster',
            filter: ['has', 'point_count'],
            layout: {
              'text-field': ['get', 'point_count_abbreviated'] as any,
              'text-font': ['Open Sans Semibold'],
              'text-size': 12,
              'text-allow-overlap': true,
            },
            paint: { 'text-color': '#062630' },
          } as any,
          {
            id: 'eventos-glow',
            type: 'circle',
            source: 'eventosCluster',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': ['get', 'color'],
              'circle-opacity': 0.18,
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 10, 6, 16, 10, 22],
            },
          } as any,
          {
            id: 'eventos-punto',
            type: 'circle',
            source: 'eventosCluster',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': ['get', 'color'],
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 4, 6, 6, 10, 8],
              'circle-stroke-color': 'rgba(255,255,255,.9)',
              'circle-stroke-width': 1.2,
            },
          } as any,
          {
            id: 'etiquetas-lugar',
            type: 'symbol',
            source: 'osm',
            'source-layer': 'place',
            minzoom: 5,
            filter: ['match', ['get', 'class'], ['city', 'town'], true, false],
            layout: {
              'text-field': ['coalesce', ['get', 'name:latin'], ['get', 'name']] as any,
              'text-font': ['Noto Sans Regular'],
              'text-size': ['interpolate', ['linear'], ['zoom'], 5, 10, 9, 13, 14, 16],
              'text-allow-overlap': false,
              'text-ignore-placement': false,
              visibility: 'none',
            },
            paint: {
              'text-color': '#cfe3f7',
              'text-halo-color': 'rgba(6,14,22,0.95)',
              'text-halo-width': 1.4,
            },
          } as any,
        ],
      } as any,
      center: [10, 12],
      zoom: 2.15,
      pitch: 38,
      bearing: -12,
      maxPitch: 85,
      attributionControl: false,
      dragRotate: true,
    })

    mapRef.current = map

    // El canvas debe seguir al contenedor (paneles que cambian de tamaño)
    const ro = new ResizeObserver(() => map.resize())
    ro.observe(containerRef.current)

    map.on('load', () => {
      loadedRef.current = true
      if (import.meta.env.DEV) (window as any).__a360Map3D = map // depuración en dev

      // Proyección globo (se comporta como Google Earth)
      try {
        ;(map as any).setProjection?.({ type: 'globe' })
      } catch {
        /* versiones sin soporte: sigue en mercator */
      }

      // Terreno 3D (si el DEM no responde, se ignora)
      try {
        map.setTerrain({ source: 'terreno', exaggeration: 1.25 } as any)
      } catch (e) {
        console.warn('[Map3D] terreno no disponible', e)
      }

      // Estado inicial de las capas opcionales
      const apply = (id: string, on: boolean) => {
        try {
          map.setLayoutProperty(id, 'visibility', on ? 'visible' : 'none')
        } catch {
          /* capa ausente */
        }
      }
      // Click: cluster → acercarse · evento → seleccionar
      map.on('click', (e: any) => {
        const feats = map.queryRenderedFeatures(e.point, {
          layers: ['clusters', 'eventos-punto'],
        })
        if (!feats.length) return
        const f: any = feats[0]

        if (f.properties?.point_count) {
          const center = (f.geometry as any).coordinates
          let done = false

          const go = (zoom: number | null | undefined) => {
            if (done) return
            done = true
            map.easeTo({
              center,
              zoom: Math.min(zoom ?? map.getZoom() + 2, 12),
              duration: 750,
            })
          }

          // zoom exacto en el que el grupo se descompone (si la API responde)
          try {
            const src = map.getSource('eventosCluster') as any
            src?.getClusterExpansionZoom?.(f.properties.cluster_id, (err: any, zoom: number) => {
              if (!err && typeof zoom === 'number') go(zoom)
            })
          } catch {
            /* sin soporte: se usa la heurística de abajo */
          }

          // respaldo por tamaño del grupo
          const count = f.properties.point_count as number
          const step = count >= 50 ? 2.6 : count >= 10 ? 2.2 : 1.8
          window.setTimeout(() => go(map.getZoom() + step), 420)
          return
        }

        const id = f.properties?.id
        const ev = events.find((x) => x.id === id)
        if (ev) onSelectEvent(ev)
      })

      apply('calor', optsRef.current.heatmap)
      apply('edificios', optsRef.current.buildings)
      apply('etiquetas-lugar', optsRef.current.showLabels)
    })

    return () => {
      ro.disconnect()
      map.remove()
      mapRef.current = null
      loadedRef.current = false
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
        map.fitBounds(bounds, { padding: 40, maxZoom: 2.8, pitch: 38, duration: 900 })
        fittedRef.current = true
      }
    }

    if (map.loaded()) fit()
    else map.once('load', fit)
  }, [events])

  /* ---------------- datos del mapa de calor + marcadores ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const draw = () => {
      const geo = toGeoJSON(events) as any
      ;(map.getSource('eventos') as maplibregl.GeoJSONSource | undefined)?.setData(geo)
      ;(map.getSource('eventosCluster') as maplibregl.GeoJSONSource | undefined)?.setData(geo)
    }

    if (map.loaded()) draw()
    else map.once('load', draw)
  }, [events, selectedEvent, onSelectEvent])

  /* ---------------- toggles ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    try {
      map.setLayoutProperty('calor', 'visibility', heatmap ? 'visible' : 'none')
    } catch {
      /* capa aún no lista */
    }
    // con calor activo, los puntos bajan de opacidad para no saturar
    try {
      map.setPaintProperty('eventos-punto', 'circle-opacity', heatmap ? 0.35 : 1)
      map.setPaintProperty('eventos-glow', 'circle-opacity', heatmap ? 0.08 : 0.18)
      map.setPaintProperty('clusters', 'circle-opacity', heatmap ? 0.45 : 0.95)
    } catch {
      /* capas aún no listas */
    }
  }, [heatmap])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    try {
      map.setLayoutProperty('edificios', 'visibility', buildings ? 'visible' : 'none')
    } catch {
      /* capa aún no lista */
    }
  }, [buildings])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !loadedRef.current) return
    try {
      map.setLayoutProperty('etiquetas-lugar', 'visibility', showLabels ? 'visible' : 'none')
    } catch {
      /* capa aún no lista */
    }
  }, [showLabels])

  /* ---------------- al activar edificios, volar a una ciudad ---------------- */
  useEffect(() => {
    const map = mapRef.current
    if (!map || !buildings || !loadedRef.current) return
    if (map.getZoom() >= 12) return

    const center: [number, number] = selectedEvent
      ? [selectedEvent.longitude, selectedEvent.latitude]
      : [-74.0721, 4.711] // Bogotá por defecto

    map.flyTo({ center, zoom: 15, pitch: 62, bearing: 18, duration: 2400, essential: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildings])

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
      map.easeTo({ center: [10, 12], zoom: 2.15, pitch: 38, bearing: -12, duration: 700 })
      return
    }
    const bounds = new maplibregl.LngLatBounds()
    events.forEach((e) => bounds.extend([e.longitude, e.latitude]))
    map.fitBounds(bounds, { padding: 40, maxZoom: 2.8, pitch: 38, bearing: -12, duration: 800 })
  }

  return (
    <div className="relative w-full h-full bg-[#05080e] overflow-hidden">
      {/* “espacio” de fondo: el globo deja ver el cielo en la parte superior */}
      <div aria-hidden className="absolute inset-0 a360-space" />
      <div ref={containerRef} className="relative w-full h-full min-h-[300px]" />

      {/* Zoom */}
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

      <div className="a360-attrib absolute bottom-2 right-3 z-20 text-[9px] text-slate-400/70 pointer-events-none">
        © Esri · Edificios: OpenFreeMap / OpenStreetMap · Terreno: AWS · MapLibre
      </div>
    </div>
  )
}
