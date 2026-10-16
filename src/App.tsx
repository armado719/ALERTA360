import { useState, useEffect } from 'react'
import Map from './components/Map'
import Dashboard from './components/Dashboard'
import Header from './components/Header'
import { DisasterEvent } from './types'
import { fetchDisasterEvents } from './services/api'

function App() {
  const [events, setEvents] = useState<DisasterEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent | null>(null)
  const [filters, setFilters] = useState({
    types: ['earthquake', 'storm', 'flood', 'rain'] as string[],
    timeRange: '24h' as '1h' | '24h' | '7d',
  })

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setLoading(true)
        const data = await fetchDisasterEvents(filters)
        setEvents(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading events')
        console.error('Error fetching events:', err)
      } finally {
        setLoading(false)
      }
    }

    loadEvents()
    // Refresh every 5 minutes
    const interval = setInterval(loadEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [filters])

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Main map area */}
        <div className="flex-1 relative">
          {error && (
            <div className="absolute top-4 left-4 right-4 bg-red-500 text-white px-4 py-3 rounded-lg shadow-lg z-50">
              ⚠️ {error}
            </div>
          )}
          <Map 
            events={events} 
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            loading={loading}
          />
        </div>

        {/* Sidebar */}
        <div className="w-96 bg-white shadow-lg overflow-y-auto">
          <Dashboard 
            events={events}
            selectedEvent={selectedEvent}
            onSelectEvent={setSelectedEvent}
            filters={filters}
            onFiltersChange={setFilters}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}

export default App
