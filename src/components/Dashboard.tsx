import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Filter, Clock, AlertTriangle, Zap, Thermometer, Wind } from 'lucide-react'
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
}

const DISASTER_TYPES: { type: DisasterType; label: string; icon: React.ReactNode }[] = [
  { type: 'earthquake', label: 'Terremotos', icon: <Thermometer className="w-3 h-3" /> },
  { type: 'storm', label: 'Tormentas', icon: <Wind className="w-3 h-3" /> },
  { type: 'flood', label: 'Inundaciones', icon: <Zap className="w-3 h-3" /> },
  { type: 'rain', label: 'Lluvia', icon: <Wind className="w-3 h-3" /> },
  { type: 'landslide', label: 'Avalanchas', icon: <AlertTriangle className="w-3 h-3" /> },
  { type: 'volcanic', label: 'Volcánicos', icon: <Thermometer className="w-3 h-3" /> },
]

function getSeverityClasses(severity: string) {
  switch (severity) {
    case 'critical':
      return {
        bg: 'bg-severity-critical/15',
        border: 'border-severity-critical/40',
        text: 'text-severity-critical',
        icon: '🔴',
        glow: 'shadow-glow-red',
        color: '#ef4444',
      }
    case 'high':
      return {
        bg: 'bg-severity-high/15',
        border: 'border-severity-high/40',
        text: 'text-severity-high',
        icon: '🟠',
        glow: 'shadow-glow-orange',
        color: '#f97316',
      }
    case 'medium':
      return {
        bg: 'bg-severity-medium/15',
        border: 'border-severity-medium/40',
        text: 'text-severity-medium',
        icon: '🟡',
        glow: 'shadow-glow-amber',
        color: '#eab308',
      }
    case 'low':
      return {
        bg: 'bg-severity-low/15',
        border: 'border-severity-low/40',
        text: 'text-severity-low',
        icon: '🔵',
        glow: 'shadow-glow-cyan',
        color: '#06b6d4',
      }
    default:
      return {
        bg: 'bg-slate-500/15',
        border: 'border-slate-500/40',
        text: 'text-slate-400',
        icon: '⚪',
        glow: '',
        color: '#64748b',
      }
  }
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'ahora'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return `${Math.floor(hours / 24)}d`
}

export default function Dashboard({
  events,
  selectedEvent,
  onSelectEvent,
  filters,
  onFiltersChange,
  loading,
}: DashboardProps) {
  const [currentTime, setCurrentTime] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 30000)
    return () => clearInterval(timer)
  }, [])

  const handleTypeToggle = (type: string) => {
    const newTypes = filters.types.includes(type)
      ? filters.types.filter(t => t !== type)
      : [...filters.types, type]
    onFiltersChange({ ...filters, types: newTypes })
  }

  const criticalCount = events.filter(e => e.severity === 'critical').length
  const highCount = events.filter(e => e.severity === 'high').length
  const mediumCount = events.filter(e => e.severity === 'medium').length
  const lowCount = events.filter(e => e.severity === 'low').length

  const statCards = [
    { label: 'CRÍTICOS', value: criticalCount, severity: 'critical', color: '#ef4444', data: [2, 3, 1, 4, 2, 5, 3] },
    { label: 'ALTOS', value: highCount, severity: 'high', color: '#f97316', data: [1, 2, 1, 0, 2, 3, 1] },
    { label: 'MEDIOS', value: mediumCount, severity: 'medium', color: '#eab308', data: [3, 4, 2, 5, 3, 4, 2] },
    { label: 'BAJOS', value: lowCount, severity: 'low', color: '#06b6d4', data: [5, 7, 6, 5, 8, 6, 7] },
  ]

  // Donut chart data for event type distribution
  const eventTypeCounts = DISASTER_TYPES
    .filter(dt => filters.types.includes(dt.type))
    .map(dt => events.filter(e => e.type === dt.type).length)
    .filter(c => c > 0)
  const eventTypeLabels = DISASTER_TYPES
    .filter(dt => filters.types.includes(dt.type))
    .map(dt => dt.label)
  const eventTypeColors = ['#ef4444', '#f97316', '#06b6d4', '#eab308', '#a855f7', '#dc2626']

  return (
    <div className="flex flex-col h-full">
      {/* Search + Stats Header */}
      <div className="p-4 border-b border-border stagger">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar eventos..."
            className="w-full pl-10 pr-4 py-2.5 glass-dark border border-border rounded-xl text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 stagger">
          {statCards.map((card) => {
            const sc = getSeverityClasses(card.severity)
            return (
              <motion.div
                key={card.label}
                whileHover={{ scale: 1.02 }}
                className={`
                  relative overflow-hidden rounded-xl p-3
                  glass-dark border transition-all duration-200
                  ${sc.border}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{card.label}</span>
                  <span className={`text-sm ${sc.text}`}>{sc.icon}</span>
                </div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <div className="mt-1 h-5 opacity-50">
                  <Sparkline data={card.data} color={card.color} />
                </div>
              </motion.div>
            )
          })}
        </div>

        <div className="mt-3 text-xs text-slate-400 flex items-center justify-between">
          <span>Total: <span className="text-white font-bold">{events.length}</span> eventos activos</span>
          <div className="flex items-center gap-2">
            <Clock className="w-3 h-3" />
            <span>Auto-refresh cada 5 min</span>
          </div>
        </div>
      </div>

      {/* Donut Chart — Distribution */}
      {eventTypeCounts.some(c => c > 0) && (
        <div className="p-4 border-b border-border">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Distribución por tipo
          </h3>
          <div className="glass-dark rounded-xl p-3">
            <DonutChart
              data={eventTypeCounts}
              labels={eventTypeLabels}
              colors={eventTypeColors}
            />
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Filtrar por tipo
          </h3>
        </div>
        <div className="grid grid-cols-3 gap-2 stagger">
          {DISASTER_TYPES.map(({ type, label, icon }) => {
            const isActive = filters.types.includes(type)
            return (
              <motion.button
                key={type}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => handleTypeToggle(type)}
                className={`
                  relative p-2.5 rounded-xl text-xs font-medium transition-all duration-200
                  flex items-center justify-center gap-1
                  ${isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400/50 shadow-glow-cyan'
                    : 'glass-dark text-slate-300 hover:text-white hover:bg-surfaceElev'
                  }
                `}
              >
                {icon}
                {label}
              </motion.button>
            )
          })}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          <Clock className="w-3 h-3" />
          Rango de tiempo
        </div>
        <select
          value={filters.timeRange}
          onChange={(e) => onFiltersChange({ ...filters, timeRange: e.target.value })}
          className="w-full px-3 py-2 glass-dark border border-border rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
        >
          <option value="1h" className="bg-surfaceElev">Última hora</option>
          <option value="24h" className="bg-surfaceElev">Últimas 24h</option>
          <option value="7d" className="bg-surfaceElev">Últimos 7 días</option>
        </select>
      </div>

      {/* Selected Event Detail */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            layoutId={`event-${selectedEvent.id}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 border-b border-border"
          >
            {(() => {
              const classes = getSeverityClasses(selectedEvent.severity)
              return (
                <motion.div
                  className={`
                    ${classes.bg} ${classes.border} border-l-4 rounded-xl p-4
                    ${classes.glow}
                  `}
                  style={{
                    background: `linear-gradient(135deg, ${classes.color}10 0%, transparent 50%)`,
                  }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-base text-white">{selectedEvent.title}</h3>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      onClick={() => onSelectEvent(null)}
                      className="text-slate-500 hover:text-slate-300 text-lg transition"
                    >
                      ✕
                    </motion.button>
                  </div>

                  <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                    {selectedEvent.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <motion.div whileHover={{ scale: 1.02 }} className="glass-dark rounded-lg p-2">
                      <span className="text-slate-500">Severidad</span>
                      <div className={`font-bold mt-0.5 ${classes.text}`}>
                        {selectedEvent.severity.toUpperCase()}
                      </div>
                    </motion.div>

                    {selectedEvent.magnitude && (
                      <motion.div whileHover={{ scale: 1.02 }} className="glass-dark rounded-lg p-2">
                        <span className="text-slate-500">Magnitud</span>
                        <div className="font-bold text-white mt-0.5">
                          M {selectedEvent.magnitude.toFixed(1)}
                        </div>
                      </motion.div>
                    )}

                    <motion.div whileHover={{ scale: 1.02 }} className="glass-dark rounded-lg p-2 col-span-2">
                      <span className="text-slate-500">Coordenadas</span>
                      <div className="font-mono text-xs text-slate-300 mt-0.5">
                        {selectedEvent.latitude.toFixed(4)}, {selectedEvent.longitude.toFixed(4)}
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} className="glass-dark rounded-lg p-2">
                      <span className="text-slate-500">Fuente</span>
                      <div className="font-bold text-cyan-400 mt-0.5 uppercase">
                        {selectedEvent.source}
                      </div>
                    </motion.div>

                    <motion.div whileHover={{ scale: 1.02 }} className="glass-dark rounded-lg p-2">
                      <span className="text-slate-500">Detectado</span>
                      <div className="font-mono text-xs text-slate-300 mt-0.5">
                        {new Date(selectedEvent.detectedAt).toLocaleTimeString('es-ES', {
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              )
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center">
            <div className="inline-block animate-spin w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full" />
            <p className="mt-2 text-sm text-slate-400">Cargando eventos...</p>
          </div>
        ) : events.length === 0 ? (
          <div className="p-6 text-center">
            <div className="text-3xl mb-2">📭</div>
            <p className="text-sm text-slate-400">No hay eventos para mostrar</p>
          </div>
        ) : (
          <motion.div
            className="p-3 space-y-2 stagger"
            initial="hide"
            animate="show"
            variants={{
              hide: { opacity: 1 },
              show: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.03,
                },
              },
            }}
          >
            {events.map((event, idx) => {
              const classes = getSeverityClasses(event.severity)
              const elapsed = timeAgo(event.detectedAt)
              return (
                <motion.div
                  key={event.id}
                  layoutId={`event-${event.id}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => onSelectEvent(event)}
                  className={`
                    relative cursor-pointer rounded-xl p-3 border transition-all duration-200 overflow-hidden group
                    ${selectedEvent?.id === event.id
                      ? 'bg-cyan-500/15 border-cyan-400/50 shadow-glow-cyan'
                      : 'glass-dark border-border hover:bg-surfaceElev hover:border-borderHover'
                    }
                    ${selectedEvent?.id !== event.id ? classes.border : ''}
                  `}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${classes.text}`}>{classes.icon}</span>
                      <h4
                        className={`font-semibold text-sm line-clamp-1 transition-colors ${
                          selectedEvent?.id === event.id
                            ? 'text-cyan-300'
                            : 'text-slate-200 group-hover:text-slate-100'
                        }`}
                      >
                        {event.title}
                      </h4>
                    </div>
                    <span
                      className={`
                        text-xs font-bold px-2 py-0.5 rounded-full
                        ${classes.bg} ${classes.text} ${classes.border}
                      `}
                    >
                      {event.severity === 'critical' ? 'CRÍTICO' :
                       event.severity === 'high' ? 'ALTO' :
                       event.severity === 'medium' ? 'MEDIO' : 'BAJO'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      {event.magnitude && (
                        <span className="flex items-center gap-1">
                          📊 M: {event.magnitude.toFixed(1)}
                        </span>
                      )}
                      <span className="font-mono">{elapsed}</span>
                    </div>
                    <span className="text-slate-600">
                      {event.source.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-2 h-1 rounded-full overflow-hidden bg-border">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: event.severity === 'critical' ? '100%' :
                               event.severity === 'high' ? '75%' :
                               event.severity === 'medium' ? '50%' : '25%',
                        backgroundColor: classes.color,
                      }}
                    />
                  </div>
                </motion.div>
              )
            })}
          </motion.div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border glass-dark text-xs text-slate-400 text-center">
        <p>Actualización cada 5 min · {events.length} eventos activos · Última sync: {new Date(currentTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
      </div>
    </div>
  )
}
