import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Clock,
  Filter,
  ChevronDown,
  Activity,
  Radio,
  Activity as WaveIcon,
  Wind,
  Waves,
  CloudRain,
  Mountain,
  Flame,
} from 'lucide-react'
import { DisasterEvent, DisasterType } from '../types'
import { Sparkline, DonutChart } from './Sparkline'

interface DashboardProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  filters: {
    types: string[]
    timeRange: '1h' | '24h' | '7d'
  }
  onFiltersChange: (filters: any) => void
  loading: boolean
  demo?: boolean
}

const DISASTER_TYPES: { type: DisasterType; label: string; short: string }[] = [
  { type: 'earthquake', label: 'Terremotos', short: 'Sismos' },
  { type: 'storm', label: 'Tormentas', short: 'Tormentas' },
  { type: 'flood', label: 'Inundaciones', short: 'Inund.' },
  { type: 'rain', label: 'Lluvia', short: 'Lluvia' },
  { type: 'landslide', label: 'Avalanchas', short: 'Avalan.' },
  { type: 'volcanic', label: 'Volcánicos', short: 'Volcán' },
]

const SEVERITY = {
  critical: { color: '#f87171', label: 'CRÍTICO', bg: 'bg-red-400/10', text: 'text-red-300', border: 'border-red-400/30' },
  high: { color: '#fb923c', label: 'ALTO', bg: 'bg-orange-400/10', text: 'text-orange-300', border: 'border-orange-400/30' },
  medium: { color: '#fbbf24', label: 'MEDIO', bg: 'bg-amber-400/10', text: 'text-amber-300', border: 'border-amber-400/30' },
  low: { color: '#38bdf8', label: 'BAJO', bg: 'bg-sky-400/10', text: 'text-sky-300', border: 'border-sky-400/30' },
} as const

const TYPE_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  earthquake: WaveIcon,
  storm: Wind,
  flood: Waves,
  rain: CloudRain,
  landslide: Mountain,
  volcanic: Flame,
}

function TypeIcon({ type, className }: { type: string; className?: string }) {
  const Icon = TYPE_ICON[type] ?? Activity
  return <Icon className={className} />
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h`
  return `${Math.floor(hours / 24)} d`
}

export default function Dashboard({
  events,
  selectedEvent,
  onSelectEvent,
  filters,
  onFiltersChange,
  loading,
  demo = false,
}: DashboardProps) {
  const [query, setQuery] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const counts = useMemo(
    () => ({
      critical: events.filter((e) => e.severity === 'critical').length,
      high: events.filter((e) => e.severity === 'high').length,
      medium: events.filter((e) => e.severity === 'medium').length,
      low: events.filter((e) => e.severity === 'low').length,
    }),
    [events]
  )

  const statCards = [
    { label: 'CRÍTICOS', value: counts.critical, color: SEVERITY.critical.color, data: [1, 2, 1, 3, 1, 2, 1] },
    { label: 'ALTOS', value: counts.high, color: SEVERITY.high.color, data: [1, 2, 3, 2, 4, 3, 4] },
    { label: 'MEDIOS', value: counts.medium, color: SEVERITY.medium.color, data: [2, 3, 2, 4, 2, 3, 2] },
    { label: 'BAJOS', value: counts.low, color: SEVERITY.low.color, data: [5, 7, 6, 8, 6, 7, 9] },
  ]

  // Datos de la dona
  const donutData = DISASTER_TYPES.filter((dt) => filters.types.includes(dt.type)).map((dt) => ({
    label: dt.label,
    short: dt.short,
    value: events.filter((e) => e.type === dt.type).length,
  }))
  const donutTotal = donutData.reduce((acc, d) => acc + d.value, 0)
  const donutColors = ['#f87171', '#fb923c', '#38bdf8', '#fbbf24', '#a78bfa', '#f472b6']

  const visibleEvents = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return events
    return events.filter(
      (e) =>
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
    )
  }, [events, query])

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter((t) => t !== type)
      : [...filters.types, type]
    onFiltersChange({ ...filters, types: newTypes })
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      {/* ================= Cabecera: búsqueda + KPIs ================= */}
      <div className="shrink-0 p-3 pb-2.5">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar eventos..."
            className="w-full pl-9 pr-3 py-2 rounded-xl text-[12.5px] text-slate-200 placeholder-slate-500
                       bg-[#101d2a] border border-white/[0.06]
                       focus:outline-none focus:border-cyan-400/40 focus:ring-1 focus:ring-cyan-400/30 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {statCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="card px-3 py-2 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-semibold tracking-[0.1em] text-slate-400">
                  {card.label}
                </span>
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ background: card.color, boxShadow: `0 0 8px ${card.color}` }}
                />
              </div>
              <div className="mt-0.5 text-[23px] leading-none font-bold text-white tabular-nums">
                {card.value}
              </div>
              <div className="mt-1.5 h-5">
                <Sparkline data={card.data} color={card.color} />
              </div>
            </motion.div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
          <span>
            Total:{' '}
            <span className="text-slate-200 font-bold">{events.length}</span> eventos activos
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            Auto-refresh cada 5 min
          </span>
        </div>
      </div>

      <div className="h-px shrink-0 bg-white/[0.06]" />

      {/* ================= Distribución por tipo ================= */}
      <div className="shrink-0 px-3 pt-2.5 pb-2.5">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[10.5px] font-bold tracking-[0.16em] text-slate-400">
            DISTRIBUCIÓN POR TIPO
          </h3>
          <Activity className="w-3.5 h-3.5 text-slate-600" />
        </div>
        <div className="rounded-xl bg-[#101d2a] border border-white/[0.05] p-2 flex items-center gap-2">
          <div className="relative w-[112px] h-[112px] shrink-0">
            {donutData.some((d) => d.value > 0) ? (
              <DonutChart
                data={donutData.map((d) => d.value)}
                labels={donutData.map((d) => d.label)}
                colors={donutColors}
              />
            ) : (
              <div className="h-full grid place-items-center text-[10px] text-slate-600">
                Sin datos
              </div>
            )}
            <div className="absolute inset-0 grid place-content-center pointer-events-none">
              <span className="text-[15px] font-bold text-white leading-none tabular-nums">
                {donutTotal}
              </span>
              <span className="text-[8px] uppercase tracking-wider text-slate-500 text-center mt-0.5">
                total
              </span>
            </div>
          </div>

          <ul className="flex-1 min-w-0 space-y-[3px]">
            {donutData.map((d, i) => (
              <li key={d.label} className="flex items-center gap-1.5 text-[10px]">
                <span
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{ background: donutColors[i] }}
                />
                <span className="flex-1 min-w-0 truncate text-slate-400">{d.short}</span>
                <span className="text-slate-200 font-semibold tabular-nums">{d.value}</span>
                <span className="w-7 text-right text-slate-600 tabular-nums">
                  {donutTotal > 0 ? Math.round((d.value / donutTotal) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="h-px shrink-0 bg-white/[0.06]" />

      {/* ================= Filtros (compactos) ================= */}
      <div className="shrink-0 px-3 pt-2">
        <button
          onClick={() => setShowFilters((v) => !v)}
          className="w-full flex items-center justify-between group"
        >
          <span className="flex items-center gap-2 text-[10.5px] font-bold tracking-[0.16em] text-slate-400 group-hover:text-slate-300 transition">
            <Filter className="w-3.5 h-3.5" />
            FILTRAR POR TIPO
          </span>
          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-500 transition-transform ${showFilters ? 'rotate-180' : ''}`}
          />
        </button>

        <AnimatePresence initial={false}>
          {showFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap gap-1.5 pt-2.5">
                {DISASTER_TYPES.map(({ type, short }) => {
                  const active = filters.types.includes(type)
                  return (
                    <button
                      key={type}
                      onClick={() => handleTypeToggle(type)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-medium border transition
                        ${
                          active
                            ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/35'
                            : 'bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-slate-300'
                        }`}
                    >
                      {short}
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center gap-2 pt-2.5">
                {(['1h', '24h', '7d'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => onFiltersChange({ ...filters, timeRange: range })}
                    className={`flex-1 py-1.5 rounded-lg text-[11px] border transition
                      ${
                        filters.timeRange === range
                          ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/35'
                          : 'bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-slate-300'
                      }`}
                  >
                    {range === '1h' ? 'Última hora' : range === '24h' ? '24 h' : '7 días'}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ================= Lista de eventos ================= */}
      <div className="flex-1 min-h-[96px] overflow-y-auto px-3 py-2">
        {loading ? (
          <div className="py-10 flex flex-col items-center gap-3">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-[11px] text-slate-500">Cargando eventos…</p>
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="py-10 flex flex-col items-center gap-2 text-slate-600">
            <Radio className="w-6 h-6" />
            <p className="text-[11.5px] text-slate-500">No hay eventos para mostrar</p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {visibleEvents.map((event, idx) => {
              const sev = SEVERITY[event.severity as keyof typeof SEVERITY] ?? SEVERITY.low
              const isSelected = selectedEvent?.id === event.id
              return (
                <motion.button
                  key={event.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Math.min(idx * 0.015, 0.3) }}
                  onClick={() => onSelectEvent(event)}
                  className={`w-full text-left rounded-xl px-2.5 py-1.5 border transition group
                    ${
                      isSelected
                        ? 'bg-cyan-400/[0.07] border-cyan-400/40'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10'
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <TypeIcon type={event.type} className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="flex-1 text-[11.5px] font-medium text-slate-200 truncate group-hover:text-white">
                      {event.title}
                    </span>
                    <span
                      className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                      style={{ color: sev.color, background: `${sev.color}18` }}
                    >
                      {sev.label}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pl-[21px] text-[10px] text-slate-500">
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{timeAgo(event.detectedAt)}</span>
                      {event.magnitude && <span>M {event.magnitude.toFixed(1)}</span>}
                    </span>
                    <span className="uppercase tracking-wide">{event.source}</span>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>

      {/* ================= Pie ================= */}
      <div className="px-3 py-1.5 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-500">
        <span className="flex items-center gap-1.5">
          <Radio className="w-3 h-3 text-cyan-400" />
          {demo ? 'Datos de demostración' : 'Fuentes en vivo'}
        </span>
        <span>
          {loading ? 'Sincronizando…' : `${visibleEvents.length} eventos · act. ${timeAgo(new Date().toISOString())}`}
        </span>
      </div>
    </div>
  )
}
