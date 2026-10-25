/**
 * LocationPanel — pantalla modal para registrar / gestionar zonas de cobertura.
 *
 * Permite:
 *   1. Buscar un lugar por nombre (Nominatim vía backend geocode/search).
 *   2. Usar la geolocalización del navegador (navigator.geolocation).
 *   3. Ajustar el radio de cobertura (1–1000 km).
 *   4. Guardar la zona → POST /api/locations.
 *   5. Listar zonas existentes y borrarlas.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Search,
  Navigation,
  Save,
  X,
  Trash2,
  AlertCircle,
} from 'lucide-react'
import { Location, searchLocations, reverseGeocode } from '../services/api'

interface LocationPanelProps {
  isOpen: boolean
  onClose: () => void
  locations: Location[]
  onSave: (location: {
    name: string
    latitude: number
    longitude: number
    radiusKm: number
    shape?: 'circle' | 'polygon'
    polygon?: { type: 'Polygon'; coordinates: [number, number][][] }
  }) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// Códigos de GeolocationPositionError (1 permiso, 2 no disponible, 3 tiempo)
const GEO_ERRORS: Record<number, string> = {
  0: 'No se pudo obtener la ubicación. Busca tu ciudad por nombre.',
  1: 'El navegador bloqueó la ubicación. Permítela en el ícono del candado junto a la dirección, o busca tu ciudad por nombre.',
  2: 'El equipo no pudo determinar tu ubicación. En Windows revisa Configuración → Privacidad → Ubicación, o busca tu ciudad por nombre.',
  3: 'La ubicación tardó demasiado en responder. Inténtalo de nuevo o busca tu ciudad por nombre.',
}

interface SearchResult {
  name: string
  lat: number
  lon: number
  display_name: string
}

export default function LocationPanel({
  isOpen,
  onClose,
  locations,
  onSave,
  onDelete,
}: LocationPanelProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [radiusKm, setRadiusKm] = useState(50)
  const [shape, setShape] = useState<'circle' | 'polygon'>('circle')
  const [polygonPoints, setPolygonPoints] = useState<[number, number][]>([])
  const [coordInput, setCoordInput] = useState('')
  const [isGpsLoading, setIsGpsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // --- Búsqueda con debounce ---
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const handler = setTimeout(async () => {
      setIsSearching(true)
      setError(null)
      try {
        const data = await searchLocations(query.trim())
        setResults(data)
      } catch (err) {
        setError('No se pudo buscar la ubicación')
      } finally {
        setIsSearching(false)
      }
    }, 500)
    searchTimerRef.current = handler
    return () => clearTimeout(handler)
  }, [query])

  const handleGps = () => {
    if (!navigator.geolocation) {
      setError('Geolocalización no disponible en este navegador')
      return
    }
    setIsGpsLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude
        const lon = pos.coords.longitude
        try {
          const info = await reverseGeocode(lat, lon)
          setSelected({
            name: info.name || info.display_name.split(',')[0],
            lat,
            lon,
            display_name: info.display_name,
          })
          setQuery(info.name || info.display_name)
          setResults([])
        } catch {
          // Fallback: usar coords directamente
          setSelected({
            name: 'Mi ubicación',
            lat,
            lon,
            display_name: `${lat.toFixed(4)}, ${lon.toFixed(4)}`,
          })
          setQuery('Mi ubicación')
          setResults([])
        }
        setIsGpsLoading(false)
      },
      (err) => {
        setError(GEO_ERRORS[err.code] ?? GEO_ERRORS[0])
        setIsGpsLoading(false)
      },
      // En un PC sin GPS la alta precisión suele agotar el tiempo; para una
      // zona de alerta basta la ubicación por Wi-Fi/red.
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 }
    )
  }

  const handleSave = async () => {
    if (!selected) return
    const name = prompt('Nombre de la zona:', selected.name)
    if (!name || name.trim() === '') return
    setIsSaving(true)
    setError(null)
    try {
      const payload: {
        name: string
        latitude: number
        longitude: number
        radiusKm: number
        shape: 'circle' | 'polygon'
        polygon?: { type: 'Polygon'; coordinates: [number, number][][] }
      } = {
        name: name.trim(),
        latitude: selected.lat,
        longitude: selected.lon,
        radiusKm,
        shape,
      }
      if (shape === 'polygon' && polygonPoints.length >= 3) {
        // GeoJSONPolygon: coordinates = [ [ [lon, lat], ... ] ] (ring)
        const ring: [number, number][] = polygonPoints.map(([lat, lon]) => [lon, lat])
        const lats = polygonPoints.map(([lat]) => lat)
        const lons = polygonPoints.map(([, lon]) => lon)
        payload.latitude = lats.reduce((a, b) => a + b, 0) / lats.length
        payload.longitude = lons.reduce((a, b) => a + b, 0) / lons.length
        payload.polygon = { type: 'Polygon', coordinates: [ring] }
      }
      await onSave(payload)
      setSelected(null)
      setQuery('')
      setShape('circle')
      setPolygonPoints([])
      setCoordInput('')
    } catch (err) {
      setError('No se pudo guardar la zona')
    } finally {
      setIsSaving(false)
    }
  }

  const canSave =
    selected &&
    selected.lat !== 0 &&
    selected.lon !== 0 &&
    (shape === 'circle' || polygonPoints.length >= 3)

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className="w-full max-w-[420px] max-h-[85vh] flex flex-col rounded-2xl
                       bg-[#101d2a]/95 border border-white/10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ---------- Header ---------- */}
            <div className="flex items-center justify-between px-4 py-3
                            border-b border-white/[0.06] shrink-0">
              <h2 className="text-[15px] font-bold text-slate-200 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                Zona de alerta
              </h2>
              <button
                onClick={onClose}
                className="w-7 h-7 grid place-items-center rounded-lg text-slate-400
                           hover:text-slate-200 hover:bg-white/5 transition"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* ---------- Contenido ---------- */}
            <div className="overflow-y-auto px-4 py-3 space-y-4">
              {/* Buscador */}
              <div>
                <label className="text-[10px] font-bold tracking-[0.1em] text-slate-500">
                  Buscar lugar
                </label>
                <div className="relative mt-1.5">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ciudad, municipio..."
                    className="w-full pl-8 pr-3 py-2 rounded-xl text-[12.5px] text-slate-200
                               placeholder-slate-500 bg-[#0b131d] border border-white/[0.06]
                               focus:outline-none focus:border-cyan-400/40
                               focus:ring-1 focus:ring-cyan-400/30 transition"
                  />
                  {isSearching && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      <div className="w-3 h-3 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {/* Resultados de búsqueda */}
                {results.length > 0 && !selected && (
                  <div className="mt-2 max-h-40 overflow-y-auto rounded-xl
                                  bg-[#0b131d] border border-white/[0.06]">
                    {results.map((r, i) => (
                      <button
                        key={`${r.lat}-${r.lon}-${i}`}
                        onClick={() =>
                          setSelected({ ...r, display_name: r.display_name })
                        }
                        className="w-full text-left px-3 py-2 hover:bg-white/[0.05]
                                   transition first:rounded-t-xl last:rounded-b-xl"
                      >
                        <div className="text-[12px] font-medium text-slate-200 truncate">
                          {r.name || r.display_name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">
                          {r.display_name}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* GPS */}
              <button
                onClick={handleGps}
                disabled={isGpsLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                           text-[12.5px] font-medium text-cyan-300
                           bg-cyan-400/10 border border-cyan-400/30
                           hover:bg-cyan-400/15 transition disabled:opacity-50"
              >
                {isGpsLoading ? (
                  <div className="w-3.5 h-3.5 border border-cyan-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Navigation className="w-3.5 h-3.5" />
                )}
                {isGpsLoading ? 'Obteniendo ubicación...' : 'Usar mi ubicación actual'}
              </button>

              {/* Ubicación seleccionada */}
              {selected && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-500 mt-0.5 shrink-0" />
                    <div>
                      <div className="text-[12px] font-medium text-slate-200">
                        {selected.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {selected.display_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {selected.lat.toFixed(4)}°, {selected.lon.toFixed(4)}°
                      </div>
                    </div>
                  </div>

                  {/* Radio */}
                  <div>
                    <label className="text-[10px] font-bold tracking-[0.1em] text-slate-500">
                      Radio de cobertura: {radiusKm} km
                    </label>
                    <input
                      type="range"
                      min={1}
                      max={1000}
                      step={1}
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(Number(e.target.value))}
                      className="w-full h-1.5 mt-1.5 appearance-none rounded-full
                                 bg-white/10 accent-cyan-400 cursor-pointer
                                 [&::-webkit-slider-thumb]:appearance-none
                                 [&::-webkit-slider-thumb]:w-3.5
                                 [&::-webkit-slider-thumb]:h-3.5
                                 [&::-webkit-slider-thumb]:rounded-full
                                 [&::-webkit-slider-thumb]:bg-cyan-300
                                 [&::-webkit-slider-thumb]:shadow-[0_0_8px_rgba(34,211,238,.9)]"
                    />
                    <div className="flex justify-between mt-1 text-[9px] text-slate-600">
                      <span>1 km</span>
                      <span>1000 km</span>
                    </div>
                  </div>

                  {/* Tipo de zona: círculo o polígono */}
                  <div>
                    <label className="text-[10px] font-bold tracking-[0.1em] text-slate-500">
                      Tipo de zona
                    </label>
                    <div className="flex gap-2 mt-1.5">
                      <button
                        onClick={() => {
                          setShape('circle')
                          setPolygonPoints([])
                        }}
                        className={`flex-1 px-3 py-2 rounded-xl text-[12.5px] font-medium transition ${shape === 'circle' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400 bg-[#0b131d] border border-white/[0.06] hover:text-slate-200'}`}
                      >
                        Círculo
                      </button>
                      <button
                        onClick={() => {
                          setShape('polygon')
                          setCoordInput('')
                        }}
                        className={`flex-1 px-3 py-2 rounded-xl text-[12.5px] font-medium transition ${shape === 'polygon' ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40' : 'text-slate-400 bg-[#0b131d] border border-white/[0.06] hover:text-slate-200'}`}
                      >
                        Polígono
                      </button>
                    </div>
                  </div>

                  {/* Polígono: vértices (lat,lon) */}
                  {shape === 'polygon' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold tracking-[0.1em] text-slate-500">
                        Vértices del polígono (lat,lon) — mín. 3
                      </label>
                      <textarea
                        value={coordInput}
                        onChange={(e) => setCoordInput(e.target.value)}
                        placeholder="4.6097,-74.0817&#10;4.6100,-74.0800&#10;4.6080,-74.0810"
                        className="w-full h-24 px-2.5 py-2 rounded-xl text-[11px] text-slate-200 font-mono
                                   placeholder-slate-500 bg-[#0b131d] border border-white/[0.06]
                                   focus:outline-none focus:border-cyan-400/40
                                   focus:ring-1 focus:ring-cyan-400/30 transition resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            const pts = coordInput
                              .trim()
                              .split(/\n/)
                              .map((l) => l.trim())
                              .filter(Boolean)
                              .map((l) =>
                                l.split(',').map((n) => Number(n)) as [number, number]
                              )
                              .filter((p) => p.length === 2 && p.every((n) => !isNaN(n)))
                            setPolygonPoints(pts)
                            setCoordInput('')
                          }}
                          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-[12px]
                                     font-medium text-cyan-300 bg-cyan-400/10 border border-cyan-400/30
                                     hover:bg-cyan-400/15 transition"
                        >
                          Añadir vértices
                        </button>
                        {polygonPoints.length > 0 && (
                          <button
                            onClick={() => setPolygonPoints([])}
                            className="px-3 py-2 rounded-xl text-[12px] text-slate-400
                                       hover:text-slate-200 hover:bg-white/5 transition"
                          >
                            Limpiar
                          </button>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {polygonPoints.length} vértice(s) definido(s) (mín. 3)
                      </div>
                      {polygonPoints.length >= 3 && (
                        <div className="text-[10px] text-cyan-300">
                          ✓ Polígono válido — listo para guardar
                        </div>
                      )}
                    </div>
                  )}
                  <button
                    onClick={handleSave}
                    disabled={!canSave || isSaving}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl
                               text-[12.5px] font-semibold text-[#06222b]
                               bg-gradient-to-b from-cyan-300 to-cyan-400
                               shadow-[0_6px_20px_-6px_rgba(34,211,238,.8)]
                               hover:from-cyan-200 hover:to-cyan-300
                               disabled:opacity-60 transition-colors"
                  >
                    {isSaving ? (
                      <div className="w-3.5 h-3.5 border border-[#06222b] border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Guardar zona
                  </button>
                </div>
              )}

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl
                                text-[11px] text-amber-200
                                bg-[#2a2114]/90 border border-amber-400/30">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </div>
              )}

              {/* Zonas existentes */}
              {locations.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold tracking-[0.1em] text-slate-500">
                    Zonas registradas
                  </label>
                  <div className="mt-1.5 space-y-1.5">
                    {locations.map((loc) => (
                      <div
                        key={loc.id}
                        className="flex items-center justify-between px-2.5 py-2 rounded-xl
                                   bg-[#0b131d] border border-white/[0.05]"
                      >
                        <div>
                          <div className="text-[12px] font-medium text-slate-200">
                            {loc.name}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {loc.shape === 'polygon'
                              ? `Polígono (${loc.polygon?.coordinates?.[0]?.length ?? 0} vértices)`
                              : `${loc.radiusKm} km de radio`}
                          </div>
                        </div>
                        <button
                          onClick={() => onDelete(loc.id)}
                          className="w-6 h-6 grid place-items-center rounded-lg
                                     text-slate-500 hover:text-red-400 hover:bg-white/5
                                     transition"
                          title="Borrar zona"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {locations.length === 0 && !selected && !isSearching && (
                <div className="text-center py-6 text-slate-500">
                  <MapPin className="w-6 h-6 mx-auto mb-2 opacity-40" />
                  <p className="text-[11px]">
                    Busca un lugar o usa tu GPS para crear tu zona de alerta.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
