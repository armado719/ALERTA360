import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet'
import L from 'leaflet'
import { DisasterEvent } from '../types'

interface MapProps {
  events: DisasterEvent[]
  selectedEvent: DisasterEvent | null
  onSelectEvent: (event: DisasterEvent | null) => void
  loading: boolean
}

const getMarkerColor = (type: string): string => {
  switch (type) {
    case 'earthquake':
      return '#C7352F' // Rojo
    case 'storm':
      return '#B7791F' // Naranja
    case 'flood':
      return '#1e40af' // Azul oscuro
    case 'rain':
      return '#0891b2' // Cian
    case 'landslide':
      return '#9333ea' // Púrpura
    case 'volcanic':
      return '#dc2626' // Rojo vivo
    default:
      return '#6366f1' // Índigo
  }
}

const getSeverityIcon = (severity: string): string => {
  switch (severity) {
    case 'critical':
      return '🔴'
    case 'high':
      return '🟠'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}

export default function Map({ events, selectedEvent, onSelectEvent, loading }: MapProps) {
  const createCustomIcon = (color: string) => {
    return L.divIcon({
      html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);" />`,
      className: '',
      iconSize: [24, 24],
      popupAnchor: [0, -12],
    })
  }

  return (
    <div className="relative w-full h-full">
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-20 z-40">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <div className="animate-spin h-8 w-8 border-4 border-red-500 border-t-transparent rounded-full" />
            <p className="mt-2 text-gray-700">Cargando eventos...</p>
          </div>
        </div>
      )}

      <MapContainer
        center={[0, 0]}
        zoom={3}
        style={{ width: '100%', height: '100%' }}
        className="z-10"
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
          maxZoom={19}
        />

        {events.map((event) => {
          const color = getMarkerColor(event.type)
          const icon = createCustomIcon(color)

          return (
            <Marker
              key={event.id}
              position={[event.latitude, event.longitude]}
              icon={icon}
              eventHandlers={{
                click: () => onSelectEvent(event),
              }}
              title={event.title}
            >
              <Popup>
                <div className="p-2 text-sm">
                  <div className="font-bold text-base mb-1 flex items-center gap-2">
                    <span>{getSeverityIcon(event.severity)}</span>
                    <span>{event.title}</span>
                  </div>
                  <p className="text-gray-700 mb-1">{event.description}</p>
                  {event.magnitude && (
                    <p className="text-gray-600">
                      <strong>Magnitud:</strong> {event.magnitude}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-2">
                    {new Date(event.detectedAt).toLocaleTimeString('es-ES')}
                  </p>
                </div>
              </Popup>
            </Marker>
          )
        })}

        {/* Draw circles around selected event if it's critical */}
        {selectedEvent && selectedEvent.severity === 'critical' && (
          <CircleMarker
            center={[selectedEvent.latitude, selectedEvent.longitude]}
            radius={50}
            fill={false}
            color="#C7352F"
            weight={2}
            dashArray="5, 5"
            opacity={0.7}
          />
        )}
      </MapContainer>
    </div>
  )
}
