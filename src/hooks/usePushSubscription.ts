/**
 * Hook de suscripción Web Push (notificaciones offline).
 *
 * Registro del Service Worker → permiso de notificaciones → suscripción push
 * con la clave pública VAPID del backend → envío de la subscription a
 * `POST /api/notifications/subscribe`.
 *
 * Si el navegador no soporta Service Workers / Push, o el usuario rechaza el
 * permiso, simplemente se marca `supported=false` / `subscribed=false` y la
 * app sigue funcionando con las notificaciones en vivo vía WebSocket
 * (`useAlerts`).
 */
import { useCallback, useEffect, useState } from 'react'
import { fetchVapidKey, subscribeToPush, type PushSubscriptionInput } from '../services/api'

/** Convierte la clave pública base64url a Uint8Array (requiere PushManager). */
function urlBase64ToUint8Array(base64: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(raw)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes.buffer as ArrayBuffer
}

export interface PushState {
  supported: boolean
  ready: boolean
  subscribed: boolean
  permission: NotificationPermission
  enable: () => Promise<void>
}

export function usePushSubscription(enabled: boolean): PushState {
  const [supported, setSupported] = useState(false)
  const [ready, setReady] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return
    setReady(true)
    const reg = await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    if (existing) {
      setSubscribed(true)
      return
    }
    const publicKey = await fetchVapidKey()
    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    })
    const input: PushSubscriptionInput = {
      endpoint: sub.endpoint,
      expirationTime: sub.expirationTime ?? null,
      keys: sub.toJSON().keys as { p256dh: string; auth: string },
    }
    await subscribeToPush(input)
    setSubscribed(true)
  }, [])

  const enable = useCallback(async () => {
    if (!supported) return
    const perm = await Notification.requestPermission()
    setPermission(perm)
    if (perm === 'granted') {
      try {
        await subscribe()
      } catch (err) {
        console.warn('[PUSH] No se pudo suscribir:', err)
      }
    }
  }, [supported, subscribe])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setSupported(false)
      return
    }
    setSupported(true)
    setPermission(Notification.permission)

    let cancelled = false
    void (async () => {
      if (Notification.permission === 'granted') {
        try {
          await subscribe()
          if (!cancelled) setSubscribed(true)
        } catch (err) {
          if (!cancelled) console.warn('[PUSH] No se pudo suscribir:', err)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, subscribe])

  return { supported, ready, subscribed, permission, enable }
}
