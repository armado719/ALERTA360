/**
 * Envío de notificaciones push offline vía Web Push (VAPID).
 *
 * El motor de matching (`services/matching.ts`) llama a `sendPush` cuando el
 * usuario no tiene un WebSocket conectado. La subscription se guarda en
 * `User.pushSubscription` vía `POST /api/notifications/subscribe`.
 *
 * Nunca lanza: un fallo de la red del proveedor (suscripción caducada, endpoint
 * borrado…) se registra y se devuelve `false` para que el motor la marque como
 * `failed` y la entrega de email/SMS actúe en consecuencia.
 */
// `web-push` es CommonJS: en ESM sus funciones solo viven en el export por
// defecto (`import * as` deja `setVapidDetails` en undefined).
import webpush from 'web-push'
import { config } from '../utils/config'
import logger from '../utils/logger'

let configured = false
try {
  if (config.VAPID_PUBLIC_KEY && config.VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails('mailto:alertas@alerta360.com', config.VAPID_PUBLIC_KEY, config.VAPID_PRIVATE_KEY)
    configured = true
  }
} catch (err) {
  logger.warn({ err }, '[PUSH] VAPID no configurado — notificaciones offline omitidas')
}

export interface PushPayload {
  title: string
  body?: string
  icon?: string
  data?: Record<string, unknown>
}

/** Intenta enviar una notificación push. Devuelve `true` si el proveedor lo aceptó. */
export async function sendPush(
  subscription: unknown,
  payload: PushPayload
): Promise<boolean> {
  if (!configured) {
    logger.debug('[PUSH] Saltado: VAPID no configurado')
    return false
  }
  if (!subscription) {
    logger.debug('[PUSH] Saltado: el usuario no tiene subscription registrada')
    return false
  }
  try {
    await webpush.sendNotification(subscription as any, JSON.stringify(payload))
    logger.info('[PUSH] Entregado al proveedor')
    return true
  } catch (err: any) {
    // 404/410 = subscription caducada o endpoint borrado → el cliente debería re-subscribirse.
    const status = err?.statusCode
    if (status === 404 || status === 410) {
      logger.warn({ endpoint: (subscription as any)?.endpoint }, '[PUSH] Subscription caduca (404/410) — el cliente debe re-suscribirse')
    } else {
      logger.warn({ err, endpoint: (subscription as any)?.endpoint }, '[PUSH] No se pudo entregar')
    }
    return false
  }
}
