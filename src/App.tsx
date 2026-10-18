import { useState, useEffect } from 'react'
import Map from './components/Map'
import Dashboard from './components/Dashboard'
import Header from './components/Header'
import AuthModal from './components/AuthModal'
import { DisasterEvent } from './types'
import { fetchDisasterEvents, getMe, setAuthToken, AuthUser } from './services/api'

function App() {
  const [events, setEvents] = useState<DisasterEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent | null>(null)
  const [filters, setFilters] = useState({
    types: ['earthquake', 'storm', 'flood', 'rain'] as string[],
    timeRange: '24h' as '1h' | '24h' | '7d',
  })
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showAuthModal, setShowAuthModal] = useState(false)

  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('alerta360_token')
      if (token) {
        try {
          const userData = await getMe()
          setUser(userData)
          setShowAuthModal(false)
        } catch {
          setAuthToken(null)
          setShowAuthModal(true)
        }
      } else {
        setShowAuthModal(true)
      }
    }
    initAuth()
  }, [])

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
    const interval = setInterval(loadEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [filters])

  return (
    <div className="flex flex-col h-screen bg-bg text-slate-200 antialiased overflow-hidden">
      {/* Ambient lighting blobs — SerQ reference */}
      <div className="ambient a1" />
      <div className="ambient a2" />
      <div className="ambient a3" />

      <div className="absolute inset-0 bg-grid-sm opacity-[0.085] pointer-events-none" />

      <Header
        user={user}
        onAuthClick={() => { setAuthMode('login'); setShowAuthModal(true) }}
        onLogout={() => { setUser(null); setAuthToken(null); setAuthMode('login'); setShowAuthModal(true) }}
      />

      <div className="relative flex flex-1 overflow-hidden p-4 gap-4">
        {error && (
          <div className="absolute top-20 left-4 right-4 max-w-md glass border border-severity-critical/50 rounded-xl p-4 text-sm flex items-center gap-3 animate-fade-in z-50 shadow-glow-red">
            <span className="text-severity-critical text-lg">⚠️</span>
            <span>{error}</span>
          </div>
        )}

        <div className="flex-1 relative">
          <div className="w-full h-full rounded-2xl overflow-hidden glass-dark border border-border">
            <Map
              events={events}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              loading={loading}
            />
          </div>
        </div>

        <div className="w-[420px] flex flex-col glass-dark border border-border rounded-2xl overflow-hidden">
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

      <AuthModal
        isOpen={showAuthModal}
        mode={authMode}
        onClose={() => setShowAuthModal(false)}
        onModeChange={setAuthMode}
        onAuthSuccess={(user) => {
          setUser(user)
          setShowAuthModal(false)
        }}
      />
    </div>
  )
}

export default App
