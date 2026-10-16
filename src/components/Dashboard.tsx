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
      }
    case 'high':
      return {
        bg: 'bg-severity-high/15',
        border: 'border-severity-high/40',
        text: 'text-severity-high',
        icon: '🟠',
        glow: 'shadow-glow-orange',
      }
    case 'medium':
      return {
        bg: 'bg-severity-medium/15',
        border: 'border-severity-medium/40',
        text: 'text-severity-medium',
        icon: '🟡',
        glow: 'shadow-glow-amber',
      }
    case 'low':
      return {
        bg: 'bg-severity-low/15',
        border: 'border-severity-low/40',
        text: 'text-severity-low',
        icon: '🔵',
        glow: 'shadow-glow-cyan',
      }
    default:
      return {
        bg: 'bg-slate-500/15',
        border: 'border-slate-500/40',
        text: 'text-slate-400',
        icon: '⚪',
        glow: '',
      }
  }
}

export default function Dashboard({
  events,
  selectedEvent,
  onSelectEvent,
  filters,
  onFiltersChange,
  loading,
}: DashboardProps) {
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
    { label: 'CRÍTICOS', value: criticalCount, color: 'severe', icon: '🔴' },
    { label: 'ALTOS', value: highCount, color: 'high', icon: '🟠' },
    { label: 'MEDIOS', value: mediumCount, color: 'medium', icon: '🟡' },
    { label: 'BAJOS', value: lowCount, color: 'low', icon: '🔵' },
  ]

  return (
    <div className="flex flex-col h-full">
      {/* Stats Header */}
      <div className="p-4 border-b border-border">
        <div className="grid grid-cols-2 gap-3 stagger">
          {statCards.map((card) => (
            <div
              key={card.label}
              className="glass-dark rounded-xl p-3 text-center transition-all duration-200"
            >
              <div className="text-xs text-slate-400 mb-1 flex items-center justify-center gap-1">
                {card.icon} {card.label}
              </div>
              <div className="text-2xl font-bold text-white">{card.value}</div>
              {card.value > 0 && (
                <div className="mt-1 h-1 bg-border rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      card.color === 'severe' ? 'bg-severity-critical' :
                      card.color === 'high' ? 'bg-severity-high' :
                      card.color === 'medium' ? 'bg-severity-medium' :
                      'bg-severity-low'
                    }`}
                    style={{ width: Math.min(100, card.value * 15) + '%' }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-3 text-xs text-slate-400">
          Total: <span className="text-white font-bold">{events.length}</span> eventos activos
        </div>
      </div>

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
                    ? 'bg-accent/20 text-white border-2 border-accent/50 shadow-glow-cyan'
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
          className="w-full px-3 py-2 glass-dark border border-border rounded-xl text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-accent transition"
        >
          <option value="1h" className="bg-surfaceElev">Última hora</option>
          <option value="24h" className="bg-surfaceElev">Últimas 24h</option>
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
                  <h3 className={`font-bold text-base ${classes.text}`}>
                    {selectedEvent.title}
                  </h3>
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
                    <div className={`font-bold ${classes.text} mt-0.5`}>
                      {selectedEvent.severity.toUpperCase()}
                    </div>
                  </div>

                  {selectedEvent.magnitude && (
                    <div className="glass-dark rounded-lg p-2">
                      <span className="text-slate-500">Magnitud</span>
                      <div className="font-bold text-white mt-0.5">
                        {selectedEvent.magnitude}
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
                    <div className="font-bold text-cyan-400 mt-0.5">
                      {selectedEvent.source.toUpperCase()}
                    </div>
                  </div>

                  <div className="glass-dark rounded-lg p-2">
                    <span className="text-slate-500">Detectado</span>
                    <div className="font-mono text-xs text-slate-300 mt-0.5">
                      {new Date(selectedEvent.detectedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
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
              return (
                <div
                  key={event.id}
                  onClick={() => onSelectEvent(event)}
                  className={`
                    relative cursor-pointer rounded-xl p-3 border transition-all duration-200
                    ${selectedEvent?.id === event.id
                      ? 'bg-accent/15 border-accent/50 shadow-glow-cyan scale-[1.01]'
                      : 'glass-dark border-border hover:bg-surfaceElev hover:border-borderHover'
                    }
                    ${selectedEvent?.id !== event.id && classes.border}
                  `}
                  style={{ animationDelay: idx * 0.05 + 's' }}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h4 className={`font-semibold text-sm line-clamp-1 ${
                      selectedEvent?.id === event.id ? 'text-cyan-300' : 'text-slate-200'
                    }`}>
                      {event.title}
                    </h4>
                    <span className={`
                      text-xs font-bold px-2 py-0.5 rounded-full
                      ${classes.bg} ${classes.text} border ${classes.border}
                    `}>
                      {event.severity === 'critical' ? 'CRÍTICO' :
                       event.severity === 'high' ? 'ALTO' :
                       event.severity === 'medium' ? 'MEDIO' :
                       event.severity === 'low' ? 'BAJO' : 'NORMAL'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mb-2 line-clamp-2">
                    {event.description}
                  </p>

                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500 flex items-center gap-1">
                      {classes.icon} {event.source}
                    </span>
                    {event.magnitude && (
                      <span className="text-slate-500">
                        M: {event.magnitude}
                      </span>
                    )}
                    <span className="text-slate-600">
                      {new Date(event.detectedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: false,
                      })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-border glass-dark text-xs text-slate-400 text-center">
        <p>Actualización automática cada 5 minutos · {events.length} eventos activos</p>
      </div>
    </div>
  )
}
