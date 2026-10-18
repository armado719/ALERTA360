import type { PrismaClient } from '@prisma/client'
import logger from '../../utils/logger'
import { notificationsDelivered } from '../../plugins/metrics'
import { sendEmail, type EmailMessage, type DeliveryResult } from './email'
import { sendSms, type SmsMessage } from './sms'

/**
 * Entrega de notificaciones por canales externos (email y SMS).
 *
 * El motor de matching deja las notificaciones en `pending`; este módulo las
 * envía al proveedor y actualiza el estado:
 *
 *   sent     → el proveedor aceptó el mensaje
 *   failed   → error del proveedor (se guarda el motivo en `error`)
 *   skipped  → falta configuración o datos (sin API key, sin teléfono…)
 *
 * Nunca lanza: un fallo de envío no puede tumbar la ingesta.
 */

export interface DispatchSummary {
  sent: number
  failed: number
  skipped: number
}

export interface DispatchDeps {
  sendEmail?: (message: EmailMessage) => Promise<DeliveryResult>
  sendSms?: (message: SmsMessage) => Promise<DeliveryResult>
}

const SEVERITY_LABEL: Record<string, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  critical: 'CRÍTICA',
}

interface PendingRow {
  id: string
  channel: string
  distanceKm: number
  user: { email: string; phone: string | null }
  event: {
    title: string
    description: string
    type: string
    severity: string
    occurredAt: Date
  }
  location: { name: string } | null
}

function buildEmail(row: PendingRow): EmailMessage {
  const { event, location } = row
  const severity = SEVERITY_LABEL[event.severity] ?? event.severity
  const place = location ? `«${location.name}»` : 'tu zona'

  return {
    to: row.user.email,
    subject: `[ALERTA360] ${event.title} — severidad ${severity}`,
    text: [
      event.title,
      '',
      `Tipo: ${event.type}`,
      `Severidad: ${severity}`,
      `Distancia: ${row.distanceKm} km de ${place}`,
      `Ocurrió: ${event.occurredAt.toISOString()}`,
      '',
      event.description,
      '',
      '— ALERTA360 · https://alerta360.com',
    ].join('\n'),
  }
}

function buildSms(row: PendingRow): SmsMessage {
  const severity = SEVERITY_LABEL[row.event.severity] ?? row.event.severity
  const place = row.location ? row.location.name : 'tu zona'
  return {
    to: row.user.phone as string,
    body: `ALERTA360 (${severity}): ${row.event.title} a ${row.distanceKm} km de ${place}.`,
  }
}

export async function dispatchEventNotifications(
  prisma: PrismaClient,
  eventId: string,
  deps: DispatchDeps = {}
): Promise<DispatchSummary> {
  const summary: DispatchSummary = { sent: 0, failed: 0, skipped: 0 }

  try {
    const rows = (await prisma.notification.findMany({
      where: { eventId, channel: { in: ['email', 'sms'] }, status: 'pending' },
      include: {
        user: { select: { email: true, phone: true } },
        event: {
          select: { title: true, description: true, type: true, severity: true, occurredAt: true },
        },
        location: { select: { name: true } },
      },
    })) as unknown as PendingRow[]

    if (rows.length === 0) return summary

    const mailer = deps.sendEmail ?? sendEmail
    const texter = deps.sendSms ?? sendSms

    for (const row of rows) {
      let result: DeliveryResult

      if (row.channel === 'email') {
        result = await mailer(buildEmail(row))
      } else if (row.channel === 'sms') {
        if (!row.user.phone) {
          result = { status: 'skipped', reason: 'El usuario no tiene teléfono' }
        } else {
          result = await texter(buildSms(row))
        }
      } else {
        continue
      }

      const status = result.status === 'sent' ? 'sent' : result.status
      const error = result.status === 'sent' ? null : 'reason' in result ? result.reason : result.error

      await prisma.notification.updateMany({
        where: { id: row.id },
        data: { status, error },
      })

      notificationsDelivered.inc({ channel: row.channel, status })
      if (result.status === 'sent') summary.sent++
      else if (result.status === 'failed') summary.failed++
      else summary.skipped++
    }

    logger.info(
      `[DISPATCH] evento ${eventId}: ${summary.sent} enviadas, ` +
        `${summary.failed} fallidas, ${summary.skipped} omitidas`
    )
    return summary
  } catch (err) {
    logger.error({ err, eventId }, '[DISPATCH] Fallo al entregar notificaciones')
    return summary
  }
}
