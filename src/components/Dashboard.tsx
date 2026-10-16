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
  { type: 'rain', label: 'Lluvia Extrema', icon: '🌧️' },
  { type: 'landslide', label: 'Avalanchas', icon: '🏔️' },
  { type: 'volcanic', label: 'Volcanes', icon: '🌋' },
]

const getSeverityBg = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'bg-red-100 border-l-4 border-red-500'
    case 'high':
      return 'bg-orange-100 border-l-4 border-orange-500'
    case 'medium':
      return 'bg-yellow-100 border-l-4 border-yellow-500'
    case 'low':
      return 'bg-green-100 border-l-4 border-green-500'
    default:
      return 'bg-gray-100'
  }
}

const getSeverityColor = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return 'text-red-700'
    case 'high':
      return 'text-orange-700'
    case 'medium':
      return 'text-yellow-700'
    case 'low':
      return 'text-green-700'
    default:
      return 'text-gray-700'
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Stats Header */}
      <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-red-50 to-orange-50">
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-red-100 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Críticos</p>
            <p className="text-2xl font-bold text-red-600">{criticalCount}</p>
          </div>
          <div className="bg-orange-100 p-3 rounded-lg">
            <p className="text-xs text-gray-600">Altos</p>
            <p className="text-2xl font-bold text-orange-600">{highCount}</p>
          </div>
        </div>
        <div className="text-sm text-gray-600">
          <p><strong>Total:</strong> {events.length} eventos</p>
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Filtrar por tipo</h3>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {DISASTER_TYPES.map(({ type, label, icon }) => (
            <button
              key={type}
              onClick={() => handleTypeToggle(type)}
              className={`p-2 rounded text-xs font-medium transition ${
                filters.types.includes(type)
                  ? 'bg-red-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold text-gray-700 mb-2">Rango de tiempo</div>
        <select
          value={filters.timeRange}
          onChange={(e) => onFiltersChange({ ...filters, timeRange: e.target.value })}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
        >
          <option value="1h">Última hora</option>
          <option value="24h">Últimas 24 horas</option>
          <option value="7d">Últimos 7 días</option>
        </select>
      </div>

      {/* Selected Event Detail */}
      {selectedEvent && (
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-bold text-gray-900">{selectedEvent.title}</h3>
            <button
              onClick={() => onSelectEvent(null)}
              className="text-gray-500 hover:text-gray-700 text-lg"
            >
              ✕
            </button>
          </div>
          <p className="text-sm text-gray-700 mb-2">{selectedEvent.description}</p>
          <div className="text-xs text-gray-600 space-y-1">
            <p>
              <strong>Severidad:</strong> <span className={getSeverityColor(selectedEvent.severity)}>{selectedEvent.severity.toUpperCase()}</span>
            </p>
            {selectedEvent.magnitude && (
              <p><strong>Magnitud:</strong> {selectedEvent.magnitude}</p>
            )}
            <p>
              <strong>Coordenadas:</strong> {selectedEvent.latitude.toFixed(2)}, {selectedEvent.longitude.toFixed(2)}
            </p>
            <p><strong>Fuente:</strong> {selectedEvent.source}</p>
            <p>
              <strong>Detectado:</strong> {new Date(selectedEvent.detectedAt).toLocaleString('es-ES')}
            </p>
          </div>
        </div>
      )}

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-gray-500">Cargando eventos...</div>
        ) : events.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No hay eventos para mostrar</div>
        ) : (
          <div className="divide-y">
            {events.map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className={`p-4 cursor-pointer hover:bg-gray-50 transition ${
                  selectedEvent?.id === event.id ? 'bg-blue-50 border-l-4 border-blue-500' : getSeverityBg(event.severity)
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h4 className="font-semibold text-sm text-gray-900">{event.title}</h4>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${
                    event.severity === 'critical' ? 'bg-red-500 text-white' :
                    event.severity === 'high' ? 'bg-orange-500 text-white' :
                    event.severity === 'medium' ? 'bg-yellow-500 text-white' :
                    'bg-green-500 text-white'
                  }`}>
                    {event.severity.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mb-2">{event.description}</p>
                {event.magnitude && (
                  <p className="text-xs text-gray-500 mb-1">📊 Magnitud: {event.magnitude}</p>
                )}
                <p className="text-xs text-gray-400">
                  {new Date(event.detectedAt).toLocaleTimeString('es-ES')}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
        <p>Actualización automática cada 5 minutos</p>
      </div>
    </div>
  )
}
