import { useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, CheckCheck, Mail, MessageSquare, X, Zap } from 'lucide-react'
import type { ServerNotification } from '../services/api'

interface NotificationsPanelProps {
  open: boolean
  onClose: () => void
  notifications: ServerNotification[]
  unread: number
  connected: boolean
  loading: boolean
  onOpenEvent: (notification: ServerNotification) => void
  onMarkRead: (id: string) => void
  onMarkAll: () => void
}

const SEVERITY_COLOR: Record<string, string> = {
  critical: 'bg-red-400',
  high: 'bg-orange-400',
  medium: 'bg-amber-300',
  low: 'bg-emerald-400',
}

const CHANNEL_ICON = {
  push: Zap,
  email: Mail,
  sms: MessageSquare,
} as const

const TYPE_LABEL: Record<string, string> = {
  earthquake: 'Sismo',
  storm: 'Tormenta',
  flood: 'Inundación',
  rain: 'Lluvia',
  landslide: 'Deslizamiento',
  volcanic: 'Volcán',
  hurricane: 'Huracán',
}

interface AlertGroup {
  key: string
  notification: ServerNotification
  /** Todos los registros del evento (uno por canal). */
  ids: string[]
  channels: string[]
  unread: boolean
  sentAt: string
}

/**
 * El motor crea una notificación por canal, así que un mismo evento puede
 * aparecer varias veces. En la bandeja se agrupa por evento.
 */
function groupByEvent(notifications: ServerNotification[]): AlertGroup[] {
  const groups = new Map<string, AlertGroup>()

  for (const notification of notifications) {
    const key = notification.event.id
    const existing = groups.get(key)

    if (!existing) {
      groups.set(key, {
        key,
        notification,
        ids: [notification.id],
        channels: [notification.channel],
        unread: !notification.readAt,
        sentAt: notification.sentAt,
      })
      continue
    }

    existing.ids.push(notification.id)
    if (!existing.channels.includes(notification.channel)) existing.channels.push(notification.channel)
    existing.unread = existing.unread || !notification.readAt
    if (notification.sentAt > existing.sentAt) existing.sentAt = notification.sentAt
  }

  return [...groups.values()].sort((a, b) => (a.sentAt < b.sentAt ? 1 : -1))
}

function relativeTime(iso: string): string {
  const diffMinutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (diffMinutes < 1) return 'ahora'
  if (diffMinutes < 60) return `hace ${diffMinutes} min`
  const hours = Math.round(diffMinutes / 60)
  if (hours < 24) return `hace ${hours} h`
  return `hace ${Math.round(hours / 24)} d`
}

/**
 * Bandeja de alertas del motor de matching. Se abre desde la campana del
 * header; cada fila enfoca el evento en el mapa y la marca como leída.
 */
export default function NotificationsPanel({
  open,
  onClose,
  notifications,
  unread,
  connected,
  loading,
  onOpenEvent,
  onMarkRead,
  onMarkAll,
}: NotificationsPanelProps) {
  const groups = useMemo(() => groupByEvent(notifications), [notifications])

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Capa para cerrar al hacer clic fuera */}
          <button
            aria-label="Cerrar notificaciones"
            onClick={onClose}
            className="fixed inset-0 z-40 cursor-default"
          />

          <motion.section
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute right-3 sm:right-5 top-[62px] z-50 w-[min(94vw,460px)]
                       max-h-[min(82vh,720px)] flex flex-col overflow-hidden rounded-2xl
                       bg-[#0f1a26]/95 border border-white/10 backdrop-blur-xl
                       shadow-[0_24px_60px_-20px_rgba(0,0,0,.95)]"
          >
            {/* ---------- Cabecera ---------- */}
            <header className="flex items-center justify-between gap-2 px-4 py-3 border-b border-white/[0.07]">
              <div className="flex items-center gap-2 min-w-0">
                <Bell className="w-4 h-4 text-amber-300 shrink-0" />
                <h2 className="text-[14px] font-semibold text-slate-100">Alertas</h2>
                {unread > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-orange-500/90 text-white">
                    {unread}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                <span
                  title={connected ? 'Recibiendo alertas en vivo' : 'Sin conexión en vivo (sondeo cada 30 s)'}
                  className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`}
                />
                <button
                  onClick={onClose}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/5 transition"
                  aria-label="Cerrar"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </header>

            {/* ---------- Lista ---------- */}
            <div className="flex-1 overflow-y-auto a360-scroll">
              {loading && notifications.length === 0 ? (
                <p className="px-4 py-10 text-center text-[13px] text-slate-500">Cargando alertas…</p>
              ) : notifications.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <BellOff className="w-7 h-7 mx-auto text-slate-600 mb-2.5" />
                  <p className="text-[13.5px] text-slate-400">Sin alertas por ahora</p>
                  <p className="text-[12px] text-slate-500 mt-1.5 leading-snug">
                    Recibirás un aviso cuando un evento entre en el radio de tus ubicaciones.
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-white/[0.05]">
                  {groups.map(group => {
                    const { notification } = group
                    const { event } = notification

                    return (
                      <li key={group.key}>
                        <button
                          onClick={() => {
                            for (const id of group.ids) onMarkRead(id)
                            onOpenEvent(notification)
                          }}
                          className={`w-full text-left px-4 py-3 transition flex gap-3
                                      hover:bg-white/[0.04] ${group.unread ? 'bg-cyan-400/[0.045]' : ''}`}
                        >
                          <span
                            className={`mt-[7px] w-2 h-2 rounded-full shrink-0 ${
                              SEVERITY_COLOR[event.severity] ?? 'bg-slate-400'
                            }`}
                          />

                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-2">
                              <span
                                className={`text-[13.5px] leading-snug line-clamp-2 ${
                                  group.unread ? 'text-slate-100 font-medium' : 'text-slate-300'
                                }`}
                              >
                                {event.title}
                              </span>
                              <span className="text-[11px] text-slate-500 shrink-0 mt-0.5">
                                {relativeTime(group.sentAt)}
                              </span>
                            </span>

                            <span className="mt-1 flex items-center gap-1.5 text-[11.5px] text-slate-500">
                              <span>{TYPE_LABEL[event.type] ?? event.type}</span>
                              <span aria-hidden>·</span>
                              <span className="tabular-nums">{notification.distanceKm} km</span>
                              <span aria-hidden>·</span>
                              {group.channels.map(channel => {
                                const Icon = CHANNEL_ICON[channel as keyof typeof CHANNEL_ICON] ?? Zap
                                return <Icon key={channel} className="w-3.5 h-3.5" />
                              })}
                              {group.unread && (
                                <span className="ml-auto text-[10.5px] font-bold text-cyan-300 uppercase tracking-wide">
                                  nueva
                                </span>
                              )}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>

            {/* ---------- Pie ---------- */}
            {notifications.length > 0 && (
              <footer className="flex items-center justify-between gap-2 px-4 py-2.5 border-t border-white/[0.07]">
                <span className="text-[11.5px] text-slate-500">
                  {groups.length} evento{groups.length === 1 ? '' : 's'}
                  {unread > 0 ? ` · ${unread} sin leer` : ' · todo leído'}
                </span>
                <button
                  onClick={onMarkAll}
                  disabled={unread === 0}
                  className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-lg
                             text-cyan-300 hover:bg-cyan-400/10 disabled:text-slate-600
                             disabled:hover:bg-transparent transition"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                  Marcar todas
                </button>
              </footer>
            )}
          </motion.section>
        </>
      )}
    </AnimatePresence>
  )
}
