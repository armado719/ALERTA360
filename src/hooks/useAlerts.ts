import { useCallback, useEffect, useRef, useState } from 'react'
import {
  alertsSocketUrl,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type ServerNotification,
} from '../services/api'

/**
 * Alertas del usuario: carga la bandeja, la refresca cada 30 s y escucha el
 * WebSocket `/ws/alerts` para recibir en vivo lo que detecta el motor de
 * matching. Si el socket se cae, reintenta con espera creciente.
 */

const POLL_MS = 30_000
const MAX_RECONNECT_DELAY = 30_000

export interface LiveAlert {
  eventId: string
  title: string
  severity: string
  distanceKm: number
  channels: string[]
  occurredAt: string
  latitude: number
  longitude: number
}

export function useAlerts(enabled: boolean) {
  const [notifications, setNotifications] = useState<ServerNotification[]>([])
  const [unread, setUnread] = useState(0)
  const [connected, setConnected] = useState(false)
  const [lastAlert, setLastAlert] = useState<LiveAlert | null>(null)
  const [loading, setLoading] = useState(false)

  const socketRef = useRef<WebSocket | null>(null)
  const retryRef = useRef(0)
  const timerRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      const page = await fetchNotifications(50)
      setNotifications(page.notifications)
      setUnread(page.unread)
    } catch {
      // usuario sin sesión válida o backend caído: se mantiene lo que hubiera
    } finally {
      setLoading(false)
    }
  }, [enabled])

  // Carga inicial + sondeo de respaldo (el WebSocket puede no llegar)
  useEffect(() => {
    if (!enabled) {
      setNotifications([])
      setUnread(0)
      setConnected(false)
      return
    }
    void refresh()
    const id = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(id)
  }, [enabled, refresh])

  // WebSocket
  useEffect(() => {
    if (!enabled) return
    let closedByUs = false

    const connect = () => {
      const url = alertsSocketUrl()
      if (!url) return

      const socket = new WebSocket(url)
      socketRef.current = socket

      socket.onopen = () => {
        retryRef.current = 0
        setConnected(true)
      }

      socket.onmessage = event => {
        try {
          const message = JSON.parse(event.data)
          if (message.type !== 'alert') return
          setLastAlert(message as LiveAlert)
          // El servidor ya creó las notificaciones: se recargan para tener ids
          void refresh()
        } catch {
          /* mensaje no JSON: se ignora */
        }
      }

      socket.onclose = () => {
        setConnected(false)
        if (closedByUs) return
        const delay = Math.min(1000 * 2 ** retryRef.current, MAX_RECONNECT_DELAY)
        retryRef.current += 1
        timerRef.current = window.setTimeout(connect, delay)
      }

      socket.onerror = () => socket.close()
    }

    connect()

    return () => {
      closedByUs = true
      if (timerRef.current) window.clearTimeout(timerRef.current)
      socketRef.current?.close()
      socketRef.current = null
      setConnected(false)
    }
  }, [enabled, refresh])

  const markRead = useCallback(
    async (id: string) => {
      const target = notifications.find(n => n.id === id)
      if (!target || target.readAt) return

      // Optimista: la UI responde al instante
      setNotifications(current =>
        current.map(n => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
      )
      setUnread(current => Math.max(0, current - 1))

      try {
        await markNotificationRead(id)
      } catch {
        void refresh()
      }
    },
    [notifications, refresh]
  )

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString()
    setNotifications(current => current.map(n => ({ ...n, readAt: n.readAt ?? now })))
    setUnread(0)
    try {
      await markAllNotificationsRead()
    } catch {
      void refresh()
    }
  }, [refresh])

  return { notifications, unread, connected, lastAlert, loading, refresh, markRead, markAllRead }
}
