import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { WifiOff, X } from 'lucide-react'
import Map from './components/Map'
import Dashboard from './components/Dashboard'
import Header from './components/Header'
import AuthModal from './components/AuthModal'
import EventDetailCard from './components/EventDetailCard'
import NotificationsPanel from './components/NotificationsPanel'
import { useAlerts } from './hooks/useAlerts'
import { DisasterEvent } from './types'
import type { TimelineState } from './components/Map'
import {
  fetchDisasterEvents,
  getMe,
  setAuthToken,
  type AuthUser,
  type ServerNotification,
} from './services/api'
import { DEMO_EVENTS } from './data/demoEvents'

function App() {
  const [events, setEvents] = useState<DisasterEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [demo, setDemo] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<DisasterEvent | null>(null)
  const [filters, setFilters] = useState({
    types: ['earthquake', 'storm', 'flood', 'rain', 'landslide', 'volcanic'] as string[],
    timeRange: '24h' as '1h' | '24h' | '7d',
  })
  const [timeline, setTimeline] = useState<TimelineState>({
    enabled: false,
    hoursAgo: 0,
    playing: false,
  })
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [showAuthModal, setShowAuthModal] = useState(false)
  const [showErrorToast, setShowErrorToast] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)

  /* ---------- Auth ---------- */
  // Alertas del motor de matching: bandeja + push en vivo por WebSocket
  const alerts = useAlerts(!!user)

  const openAlertOnMap = useCallback((notification: ServerNotification) => {
    setSelectedEvent({
      id: notification.event.id,
      type: notification.event.type as DisasterEvent['type'],
      title: notification.event.title,
      description: '',
      latitude: notification.event.latitude,
      longitude: notification.event.longitude,
      severity: notification.event.severity,
      occurredAt: notification.event.occurredAt,
      detectedAt: notification.event.occurredAt,
      source: notification.event.source,
    })
    setNotificationsOpen(false)
  }, [])

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

  /* ---------- Eventos ---------- */
  const loadEvents = useCallback(async () => {
    try {
      setLoading(true)
      const data = await fetchDisasterEvents(filters)
      setEvents(data)
      setError(null)
      setDemo(false)
    } catch (err) {
      console.error('Error fetching events:', err)
      setDemo(true)
      setError('Sin conexión con el backend. Mostrando datos de demostración.')
      setEvents((prev) => (prev.length > 0 ? prev : DEMO_EVENTS))
    } finally {
      setLoading(false)
    }
  }, [filters])

  useEffect(() => {
    loadEvents()
    const interval = setInterval(loadEvents, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [loadEvents])

  // El aviso de backend se oculta solo a los 9 s
  useEffect(() => {
    if (!error) return
    setShowErrorToast(true)
    const t = setTimeout(() => setShowErrorToast(false), 9000)
    return () => clearTimeout(t)
  }, [error])

  /* ---------- Reproducción de la línea de tiempo ---------- */
  useEffect(() => {
    if (!timeline.playing) return
    const id = setInterval(() => {
      setTimeline((t) => {
        const next = +(t.hoursAgo - 0.25).toFixed(2)
        if (next <= 0) return { ...t, hoursAgo: 0, playing: false }
        return { ...t, hoursAgo: next }
      })
    }, 110)
    return () => clearInterval(id)
  }, [timeline.playing])

  /* ---------- Filtrado local (también en modo demo) ---------- */
  const visibleEvents = useMemo(() => {
    const byType = events.filter((e) => filters.types.includes(e.type))
    const now = Date.now()

    // Con la línea de tiempo activa: ventana [ahora-24h, ahora-hoursAgo]
    if (timeline.enabled) {
      const start = now - 24 * 3_600_000
      const cutoff = now - timeline.hoursAgo * 3_600_000
      return byType.filter((e) => {
        const t = new Date(e.detectedAt).getTime()
        return t >= start && t <= cutoff
      })
    }

    if (!demo) return byType
    const windowMs =
      filters.timeRange === '1h' ? 3_600_000 : filters.timeRange === '24h' ? 86_400_000 : 604_800_000
    return byType.filter((e) => now - new Date(e.detectedAt).getTime() <= windowMs)
  }, [events, demo, filters, timeline.enabled, timeline.hoursAgo])

  return (
    <div className="relative flex flex-col min-h-screen lg:h-screen bg-[#0b131d] text-slate-200 antialiased lg:overflow-hidden">
      {/* Lavados de luz de fondo (se ven detrás de los paneles translúcidos) */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          background:
            'radial-gradient(900px 520px at 12% -8%, rgba(34,211,238,.07), transparent 60%),' +
            'radial-gradient(820px 520px at 100% 0%, rgba(139,92,246,.06), transparent 55%)',
        }}
      />
      <Header
        user={user}
        demo={demo}
        onAuthClick={() => {
          setAuthMode('login')
          setShowAuthModal(true)
        }}
        onLogout={() => {
          setUser(null)
          setAuthToken(null)
          setAuthMode('login')
          setShowAuthModal(true)
          setNotificationsOpen(false)
        }}
        unread={alerts.unread}
        onNotificationsClick={() => setNotificationsOpen(open => !open)}
        notificationsOpen={notificationsOpen}
      />

      <NotificationsPanel
        open={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
        notifications={alerts.notifications}
        unread={alerts.unread}
        connected={alerts.connected}
        loading={alerts.loading}
        onOpenEvent={openAlertOnMap}
        onMarkRead={alerts.markRead}
        onMarkAll={alerts.markAllRead}
      />

      <div className="relative z-10 flex flex-col lg:flex-row flex-1 min-h-0 gap-3 p-3">
        {/* ---------- Mapa ---------- */}
        <section className="relative h-[46vh] min-h-[300px] lg:h-auto lg:flex-1 lg:min-h-0">
          <div className="panel w-full h-full overflow-hidden">
            <Map
              events={visibleEvents}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              loading={loading}
              timeline={timeline}
              onTimelineChange={(next) => setTimeline((t) => ({ ...t, ...next }))}
            />
            <EventDetailCard event={selectedEvent} onClose={() => setSelectedEvent(null)} />

            {/* Aviso de backend (se oculta solo a los 9 s) */}
            <AnimatePresence>
              {error && showErrorToast && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute left-1/2 -translate-x-1/2 top-4 z-50 flex items-center gap-2.5
                             max-w-[min(88%,420px)] px-3 py-2 rounded-xl text-[11.5px] text-amber-200
                             bg-[#2a2114]/95 border border-amber-400/30 backdrop-blur-md
                             shadow-[0_16px_40px_-16px_rgba(0,0,0,.9)]"
                >
                  <WifiOff className="w-3.5 h-3.5 shrink-0" />
                  <span className="leading-snug">{error}</span>
                  <button
                    onClick={() => setShowErrorToast(false)}
                    className="ml-1 text-amber-300/70 hover:text-amber-200"
                    aria-label="Cerrar aviso"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </section>

        {/* ---------- Panel lateral ---------- */}
        <aside className="w-full lg:w-[404px] shrink-0 h-[58vh] min-h-[420px] lg:h-auto lg:min-h-0">
          <div className="panel w-full h-full overflow-hidden flex flex-col">
            <Dashboard
              events={visibleEvents}
              selectedEvent={selectedEvent}
              onSelectEvent={setSelectedEvent}
              filters={filters}
              onFiltersChange={setFilters}
              loading={loading}
              demo={demo}
            />
          </div>
        </aside>
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
