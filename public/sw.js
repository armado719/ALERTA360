/* ==========================================================================
 * Service Worker — notificaciones push offline (Web Push)
 *
 * Recibidas vía el motor de alertas del backend (`services/matching.ts` →
 * `services/push.ts` → `web-push`). El payload JSON entra en `event.data`.
 *
 * No usa vite-plugin-pwa: Vite sirve este archivo desde `/public/sw.js`,
 * accesible como `/sw.js`, y el hook `usePushSubscription` lo registra.
 * ========================================================================== */
const CACHE = 'alerta360-v1'

self.addEventListener('push', (event) => {
  let payload = {}
  try {
    payload = event.data ? JSON.parse(event.data.text()) : {}
  } catch {
    // payload no JSON: usamos valores por defecto
  }

  const title = payload.title || '🚨 Alerta ALERTA360'
  const options = {
    body: payload.body || `Evento ${payload.severity || 'activo'} a ${payload.distanceKm ?? '–'} km de tu zona`,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag: `alerta360-${payload.eventId || 'event'}`,
    data: {
      url: `/?event=${payload.eventId || ''}`,
      eventId: payload.eventId,
      severity: payload.severity,
    },
    requireInteraction: payload.severity === 'critical',
    actions: [{ action: 'open', title: 'Ver detalle', icon: '/favicon.svg' }],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  const notification = event.notification
  const target = notification.data?.url || '/'

  event.waitUntil(
    // Cierra la notificación y abre/foca la página de ALERTA360
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === target && 'focus' in client) return client.focus()
      }
      return clients.openWindow(target)
    })
  )

  notification.close()
})

self.addEventListener('install', (event) => {
  // ACTIVA inmediatamente sin esperar a recargar pestañas
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
})
