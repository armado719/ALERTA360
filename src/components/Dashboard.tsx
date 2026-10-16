import { useState, useEffect } from 'react'
import { DisasterEvent, DisasterType } from '../types'

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

const DISASTER_TYPES: { type: DisasterType; label: string; icon: string }[] = [
  { type: 'earthquake', label: 'Terremotos', icon: '🌍' },
  { type: 'storm', label: 'Tormentas', icon: '⛈️' },
  { type: 'flood', label: 'Inundaciones', icon: '🌊' },
  { type: 'rain', label: 'Lluvia', icon: '🌧️' },
  { type: 'landslide', label: 'Avalanchas', icon: '🏔️' },
  { type: 'volcanic', label: 'Volcánicos', icon: '🌋' },
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

// Simple SVG sparkline for trend visualization
function Sparkline({ data }: { data: number[] }) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data, 1)
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / maxVal) * 100}`)
    .join(' ')
  return (
    <svg width="80" height="20" className="inline-block">
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        points={points}
        className="text-cyan-400/40"
      />
    </svg>
  )
}

// Format time elapsed (e.g. "2m", "1h", "3d")
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

  // Find the most critical/urgent event
  const urgentEvent = events
    .filter(e => e.severity === 'critical' || e.severity === 'high')
    .sort((a, b) => {
      const aTime = new Date(a.detectedAt).getTime()
      const bTime = new Date(b.detectedAt).getTime()
      const aSev = a.severity === 'critical' ? 2 : 1
      const bSev = b.severity === 'critical' ? 2 : 1
      return bSev - aSev || aTime - bTime
    })[0]

  const statCards = [
    { label: 'CRÍTICOS', value: criticalCount, severity: 'critical', data: [2, 3, 1, 4, 2, 5, 3] },
    { label: 'ALTOS', value: highCount, severity: 'high', data: [1, 2, 1, 0, 2, 3, 1] },
    { label: 'MEDIOS', value: mediumCount, severity: 'medium', data: [3, 4, 2, 5, 3, 4, 2] },
    { label: 'BAJOS', value: lowCount, severity: 'low', data: [5, 7, 6, 5, 8, 6, 7] },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Stats Header */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-2 gap-3 stagger">
          {statCards.map((card) => {
            const sc = getSeverityClasses(card.severity)
            return (
              <div
                key={card.label}
                className={`
                  relative overflow-hidden rounded-xl p-3
                  glass-dark border transition-all duration-200
                  ${sc.border} hover:border-${sc.color.replace('#', 'severity-')}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-400">{card.label}</span>
                  <span className={`text-sm ${sc.text}`}>{sc.icon}</span>
                </div>
                <div className="text-2xl font-bold text-white">{card.value}</div>
                <div className="mt-1 opacity-40">
                  <Sparkline data={card.data} />
                </div>
              </div>
            )
          })}
        </div>

        <div className="mt-3 text-xs text-slate-400">
          Total: <span className="text-white font-bold">{events.length}</span> eventos activos
        </div>
      </div>

      {/* Urgent Alert Card */}
      {urgentEvent && (
        <div className="p-4 border-b border-border animate-fade-in">
          <div
            className={`
              rounded-xl p-4 border-2 overflow-hidden
              ${getSeverityClasses(urgentEvent.severity).border}
              ${getSeverityClasses(urgentEvent.severity).glow}
            `}
            style={{
              background: `linear-gradient(135deg, ${getSeverityClasses(urgentEvent.severity).color}15 0%, transparent 50%)`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl animate-pulse"
                style={{ backgroundColor: getSeverityClasses(urgentEvent.severity).color + '30' }}
              >
                {getSeverityClasses(urgentEvent.severity).icon}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className="px-2 py-0.5 text-xs font-bold rounded-full"
                    style={{
                      backgroundColor: getSeverityClasses(urgentEvent.severity).color + '30',
                      color: getSeverityClasses(urgentEvent.severity).color,
                    }}
                  >
                    {urgentEvent.severity === 'critical' ? '🚨 CRÍTICO' : '⚠️ ALTO'}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    hace {timeAgo(urgentEvent.detectedAt)}
                  </span>
                </div>
                <h3 className="font-bold text-white text-sm mb-1 leading-tight">
                  {urgentEvent.title}
                </h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-2">
                  {urgentEvent.description}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs text-slate-500">
                    <span>📍 {urgentEvent.latitude.toFixed(2)}, {urgentEvent.longitude.toFixed(2)}</span>
                    <span>📡 {urgentEvent.source}</span>
                  </div>
                  <button
                    onClick={() => onSelectEvent(urgentEvent)}
                    className="px-3 py-1 text-xs font-medium text-white bg-severity-critical hover:bg-severity-critical/80 rounded-lg transition"
                    style={{ backgroundColor: getSeverityClasses(urgentEvent.severity).color }}
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="p-4 border-b border-border">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
          Filtrar por tipo
        </h3>
        <div className="grid grid-cols-3 gap-2 stagger">
          {DISASTER_TYPES.map(({ type, label, icon }) => {
            const isActive = filters.types.includes(type)
            return (
              <button
                key={type}
                onClick={() => handleTypeToggle(type)}
                className={`
                  relative p-2.5 rounded-xl text-xs font-medium transition-all duration-200
                  ${isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-2 border-cyan-400/50 shadow-glow-cyan'
                    : 'glass-dark text-slate-300 hover:text-white hover:bg-surfaceElev'
                  }
                `}
              >
                <span className="block text-center">
                  <span className="text-sm block mb-0.5">{icon}</span>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        <div className="mt-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          Rango de tiempo
        </div>
        <select
          value={filters.timeRange}
          onChange={(e) => onFiltersChange({ ...filters, timeRange: e.target.value })}
          className="w-full px-3 py-2 glass-dark border border-border rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
        >
          <option value="1h" className="bg-surfaceElev">Última hora</option>
          <option value="24h" className="bg-surfaceElev">Últimas 24 horas</option>
          <option value="7d" className="bg-surfaceElev">Últimos 7 días</option>
        </select>
      </div>

      {/* Selected Event Detail */}
      {selectedEvent && (
        <div className="p-4 border-b border-border animate-fade-in">
          {(() => {
            const classes = getSeverityClasses(selectedEvent.severity)
            return (
              <div className={`
                ${classes.bg} ${classes.border} border-l-4 rounded-xl p-4
                ${classes.glow}
              `}>
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-base text-white">{selectedEvent.title}</h3>
                  <button
                    onClick={() => onSelectEvent(null)}
                    className="text-slate-500 hover:text-slate-300 text-lg transition"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-sm text-slate-300 mb-3 leading-relaxed">
                  {selectedEvent.description}
                </p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="glass-dark rounded-lg p-2">
                    <span className="text-slate-500">Severidad</span>
                    <div className={`font-bold mt-0.5 ${classes.text}`}>
                      {selectedEvent.severity.toUpperCase()}
                    </div>
                  </div>

                  {selectedEvent.magnitude && (
                    <div className="glass-dark rounded-lg p-2">
                      <span className="text-slate-500">Magnitud</span>
                      <div className="font-bold text-white mt-0.5">
                        M {selectedEvent.magnitude.toFixed(1)}
                      </div>
                    </div>
                  )}

                  <div className="glass-dark rounded-lg p-2 col-span-2">
                    <span className="text-slate-500">Coordenadas</span>
                    <div className="font-mono text-xs text-slate-300 mt-0.5">
                      {selectedEvent.latitude.toFixed(4)}, {selectedEvent.longitude.toFixed(4)}
                    </div>
                  </div>

                  <div className="glass-dark rounded-lg p-2">
                    <span className="text-slate-500">Fuente</span>
                    <div className="font-bold text-cyan-400 mt-0.5 uppercase">
                      {selectedEvent.source}
                    </div>
                  </div>

                  <div className="glass-dark rounded-lg p-2">
                    <span className="text-slate-500">Detectado</span>
                    <div className="font-mono text-xs text-slate-300 mt-0.5">
                      {new Date(selectedEvent.detectedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

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
          <div className="p-3 space-y-2 stagger">
            {events.map((event, idx) => {
              const classes = getSeverityClasses(event.severity)
              const elapsed = timeAgo(event.detectedAt)
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`
                    relative cursor-pointer rounded-xl p-3 border transition-all duration-200 overflow-hidden
                    ${selectedEvent?.id === event.id
                      ? 'bg-cyan-500/15 border-cyan-400/50 shadow-glow-cyan'
                      : 'glass-dark border-border hover:bg-surfaceElev hover:border-borderHover'
                    }
                    ${selectedEvent?.id !== event.id ? classes.border : ''}
                  `}
                  style={{ animationDelay: idx * 0.03 + 's' }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-lg ${classes.text}`}>{classes.icon}</span>
                      <h4
                        className={`font-semibold text-sm line-clamp-1 ${
                          selectedEvent?.id === event.id
                            ? 'text-cyan-300'
                            : 'text-slate-200'
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

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex gap-3 text-slate-500">
                      {event.magnitude && (
                        <span className="flex items-center gap-1">
                          📊 M: {event.magnitude.toFixed(1)}
                        </span>
                      )}
                      <span className="font-mono">{elapsed}</span>
                    </div>
                    <span className="text-slate-500">
                      {event.source.toUpperCase()}
                    </span>
                  </div>

                  {/* Severity progress bar */}
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
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border glass-dark text-xs text-slate-400 text-center">
        <p>Actualización cada 5 min · {events.length} eventos activos · Última sync: {new Date(currentTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })}</p>
      </div>
    </div>
  )
}
