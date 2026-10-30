import { useEffect, useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, SlidersHorizontal } from 'lucide-react'
import { DisasterEvent } from '../types'
import { DISASTER_TYPES, SOURCE_LABELS, ALL_SOURCES, SEVERITY_LABELS, severityRank, magnitudeText } from '../data/eventTypes'
import TypeBadge from './TypeBadge'

export default function EventsExplorer({
  events,
  filters,
  onFiltersChange,
  selectedEvent,
  onSelectEvent,
  onClose,
}: {
  events: DisasterEvent[]
  filters: any
  onFiltersChange: (f: any) => void
  selectedEvent: DisasterEvent | null
  onSelectEvent: (e: DisasterEvent) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<'severity' | 'newest' | 'oldest'>('severity')
  const [limit, setLimit] = useState(50)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  useEffect(() => { searchRef.current?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const typeCounts = useMemo(() => {
    const m: Record<string, number> = {}
    DISASTER_TYPES.forEach((d) => (m[d.type] = 0))
    events.forEach((e) => { if (m[e.type] !== undefined) m[e.type]++ })
    return m
  }, [events])
  const sevCounts = useMemo(() => {
    const m: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 }
    events.forEach((e) => { if (m[e.severity] !== undefined) m[e.severity]++ })
    return m
  }, [events])
  const sourceCounts = useMemo(() => {
    const m: Record<string, number> = {}
    ALL_SOURCES.forEach((s) => (m[s] = 0))
    events.forEach((e) => {
      if (m[e.source] !== undefined) m[e.source]++
      else m[e.source] = (m[e.source] ?? 0) + 1
    })
    return m
  }, [events])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = events.filter((e) =>
      filters.types.includes(e.type) &&
      filters.severities.includes(e.severity) &&
      (filters.sources.includes(e.source) || !ALL_SOURCES.includes(e.source))
    )
    if (q) list = list.filter((e) =>
      e.title.toLowerCase().includes(q) ||
      e.description.toLowerCase().includes(q) ||
      e.source.toLowerCase().includes(q)
    )
    list = [...list].sort((a, b) => {
      if (sort === 'severity') {
        const sa = severityRank(a.severity); const sb = severityRank(b.severity)
        if (sb !== sa) return sb - sa
        return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      }
      if (sort === 'newest') return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime()
      return new Date(a.detectedAt).getTime() - new Date(b.detectedAt).getTime()
    })
    return list
  }, [events, filters, query, sort])

  const visible = filtered.slice(0, limit)
  const remaining = filtered.length - visible.length

  const toggleType = (t: string) => {
    const next = filters.types.includes(t) ? filters.types.filter((x: string) => x !== t) : [...filters.types, t]
    onFiltersChange({ ...filters, types: next })
  }
  const toggleSev = (s: string) => {
    const next = filters.severities.includes(s) ? filters.severities.filter((x: string) => x !== s) : [...filters.severities, s]
    onFiltersChange({ ...filters, severities: next })
  }
  const toggleSource = (s: string) => {
    const next = filters.sources.includes(s) ? filters.sources.filter((x: string) => x !== s) : [...filters.sources, s]
    onFiltersChange({ ...filters, sources: next })
  }
  const reset = () => {
    onFiltersChange({ types: DISASTER_TYPES.map((d) => d.type), timeRange: filters.timeRange, severities: ['critical','high','medium','low'], sources: ALL_SOURCES })
    setQuery('')
  }
  const allTypesSelected = filters.types.length === DISASTER_TYPES.length
  const toggleAllTypes = () => {
    onFiltersChange({ ...filters, types: allTypesSelected ? [] : DISASTER_TYPES.map((d) => d.type) })
  }

  const SEV_COLORS: Record<string, string> = { critical: '#f87171', high: '#fb923c', medium: '#fbbf24', low: '#38bdf8' }
  return (
    <AnimatePresence>
      <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-2 sm:p-4"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} role="dialog" aria-modal="true" aria-label="Centro de eventos">
        <motion.div className="w-full h-full sm:w-[90vw] sm:h-[85vh] sm:max-w-[1200px] bg-[#0b131d] border border-white/10 rounded-none sm:rounded-2xl flex flex-col overflow-hidden"
          initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}>
          <div className="shrink-0 px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 flex-wrap">
            <SlidersHorizontal className="w-4 h-4 text-cyan-400 shrink-0" />
            <h2 className="text-[14px] font-bold text-white">Centro de eventos</h2>
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input ref={searchRef} type="text" value={query} onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en el centro..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-[12.5px] text-slate-200 placeholder-slate-500 bg-[#101d2a] border border-white/[0.06] focus:outline-none focus:border-cyan-400/40" />
            </div>
            <select value={sort} onChange={(e) => setSort(e.target.value as any)}
              className="px-2 py-2 rounded-xl text-[12px] bg-[#101d2a] border border-white/[0.06] text-slate-200">
              <option value="severity">Más graves</option>
              <option value="newest">Más recientes</option>
              <option value="oldest">Más antiguos</option>
            </select>
            <span className="text-[11px] text-slate-400 tabular-nums">{filtered.length} eventos</span>
            <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5" aria-label="Cerrar">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col md:flex-row">
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              className="md:hidden shrink-0 mx-3 mt-3 py-2 rounded-xl text-[12px] font-medium text-slate-200 border border-white/[0.06] bg-[#101d2a]"
            >
              Filtros (
              {(DISASTER_TYPES.length - filters.types.length) +
                (4 - filters.severities.length) +
                (ALL_SOURCES.length - filters.sources.length) +
                (filters.timeRange !== '24h' ? 1 : 0)}{' '}
              activos)
            </button>
            <aside
              className={`${filtersOpen ? 'block' : 'hidden'} md:block w-full md:w-[280px] shrink-0 border-b md:border-b-0 md:border-r border-white/[0.06] overflow-y-auto p-3 space-y-4 max-h-[60vh] md:max-h-none`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10.5px] font-bold tracking-[0.16em] text-slate-400">FILTROS</span>
                <button onClick={reset} className="text-[10.5px] text-cyan-300 hover:text-cyan-200">Restablecer</button>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-semibold text-slate-300">Tipo</span>
                  <button onClick={toggleAllTypes} className="text-[10px] text-slate-500 hover:text-slate-300">{allTypesSelected ? 'Ninguno' : 'Todos'}</button>
                </div>
                <div className="space-y-1">
                  {DISASTER_TYPES.map((dt) => (
                    <label key={dt.type} className="flex items-center gap-2 text-[11.5px] text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={filters.types.includes(dt.type)} onChange={() => toggleType(dt.type)} className="accent-cyan-400" />
                      <TypeBadge type={dt.type} size={18} />
                      <span className="flex-1 truncate">{dt.label}</span>
                      <span className="text-slate-500 tabular-nums">{typeCounts[dt.type] ?? 0}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">Severidad</span>
                <div className="space-y-1">
                  {(['critical','high','medium','low'] as const).map((s) => (
                    <label key={s} className="flex items-center gap-2 text-[11.5px] text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={filters.severities.includes(s)} onChange={() => toggleSev(s)} className="accent-cyan-400" />
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ background: SEV_COLORS[s] }} />
                      <span className="flex-1">{SEVERITY_LABELS[s]}</span>
                      <span className="text-slate-500 tabular-nums">{sevCounts[s] ?? 0}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">Fuente</span>
                <div className="space-y-1">
                  {ALL_SOURCES.map((s) => (
                    <label key={s} className="flex items-center gap-2 text-[11.5px] text-slate-300 cursor-pointer">
                      <input type="checkbox" checked={filters.sources.includes(s)} onChange={() => toggleSource(s)} className="accent-cyan-400" />
                      <span className="flex-1">{SOURCE_LABELS[s] ?? s}</span>
                      <span className="text-slate-500 tabular-nums">{sourceCounts[s] ?? 0}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-300 block mb-1.5">Período</span>
                <div className="flex gap-1.5">
                  {(['1h','24h','7d'] as const).map((r) => (
                    <button key={r === '1h' ? 'Última hora' : r === '24h' ? '24 h' : '7 días'} onClick={() => onFiltersChange({ ...filters, timeRange: r })}
                      className={`flex-1 py-1.5 rounded-lg text-[11px] border transition ${filters.timeRange === r ? 'bg-cyan-400/10 text-cyan-300 border-cyan-400/35' : 'bg-white/[0.02] text-slate-500 border-white/[0.06] hover:text-slate-300'}`}>
                      {r === '1h' ? 'Última hora' : r === '24h' ? '24 h' : '7 días'}
                    </button>
                  ))}
                </div>
              </div>
            </aside>
            <main className="flex-1 min-h-0 overflow-y-auto p-3">
              {filtered.length === 0 ? (
                <div className="py-16 flex flex-col items-center gap-2 text-slate-500">
                  <SlidersHorizontal className="w-6 h-6" />
                  <p className="text-[12px]">No hay eventos con los filtros actuales</p>
                  <button onClick={reset} className="text-[11px] text-cyan-300 hover:text-cyan-200 mt-1">Restablecer filtros</button>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    {visible.map((event: DisasterEvent) => {
                      const isSelected = selectedEvent?.id === event.id
                      return (
                        <button key={event.id} onClick={() => { onSelectEvent(event); onClose() }}
                          className={`w-full text-left rounded-xl px-2.5 py-1.5 border transition group ${isSelected ? 'bg-cyan-400/[0.07] border-cyan-400/40' : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.04] hover:border-white/10'}`}>
                          <div className="flex items-center gap-2">
                            <TypeBadge type={event.type} size={20} />
                            <span className="flex-1 text-[11.5px] font-medium text-slate-200 truncate group-hover:text-white">{event.title}</span>
                            <span className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded"
                              style={{ color: SEV_COLORS[event.severity] ?? '#94a3b8', background: `${SEV_COLORS[event.severity] ?? '#94a3b8'}18` }}>
                              {{ critical: 'CRÍTICO', high: 'ALTO', medium: 'MEDIO', low: 'BAJO' }[event.severity] ?? event.severity}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 pl-4 text-[10px] text-slate-500">
                            <span className="flex items-center gap-2">
                              <span className="font-mono">{new Date(event.detectedAt).toLocaleString('es-CO', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}</span>
                              {event.magnitude && <span>{magnitudeText(event.type, event.magnitude)}</span>}
                            </span>
                            <span className="uppercase tracking-wide">{SOURCE_LABELS[event.source] ?? event.source}</span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                  {remaining > 0 && (
                    <button onClick={() => setLimit((l) => l + 50)}
                      className="w-full mt-2 py-2 rounded-xl text-[11px] font-medium text-cyan-300 border border-cyan-400/25 hover:bg-cyan-400/10 transition">
                      Cargar más ({remaining} restantes)
                    </button>
                  )}
                </>
              )}
            </main>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
