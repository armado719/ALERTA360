/**
 * Daily digest — resumen de alertas por email (B5).
 *
 * Reúne los eventos activos y no stale de las últimas 24 h, los cruza con las
 * ubicaciones/preferencias de cada usuario y envía un email resumen vía SendGrid
 * (reutiliza `services/notifications/email.ts`). El scheduler corre una vez al
 * día a la hora indicada por `DIGEST_HOUR` (UTC); en desarrollo está deshabilitado
 * por `DIGEST_ENABLED=false`.
 */
import type { PrismaClient } from '@prisma/client'
import logger from '../../utils/logger'
import { config } from '../../utils/config'
import { haversineKm, severityRank } from '../../utils/geo'
import { sendEmail, type EmailMessage, type DeliveryResult } from './email'
import { notificationsDelivered } from '../../plugins/metrics'

export interface DigestEvent {
  externalId: string
  type: string
  title: string
  description: string
  severity: string
  occurredAt: Date
  latitude: number
  longitude: number
}

interface DigestUserLocation {
  id: string
  name: string
  latitude: number
  longitude: number
  radiusKm: number
}

interface DigestUserPreferences {
  alertRadiusKm: number
  disasterTypes: string[]
  minSeverity: string
  emailEnabled: boolean
}

export interface DigestUser {
  id: string
  email: string | null
  preferences: DigestUserPreferences | null
  locations: DigestUserLocation[]
}

export interface DigestMatch {
  event: DigestEvent
  nearestKm: number
  locationName: string
}

export interface DigestDeps {
  sendEmail?: (message: EmailMessage) => Promise<DeliveryResult>
}

export interface DigestSummary {
  sent: number
  skipped: number
  failed: number
}

const DIGEST_WINDOW_MS = 24 * 3600_000

/** Eventos activos, no stale, dentro de la ventana de 24 h. */
export async function collectDigestEvents(
  prisma: PrismaClient,
  since: Date
): Promise<DigestEvent[]> {
  return (await prisma.disasterEvent.findMany({
    where: { isActive: true, stale: false, occurredAt: { gte: since } },
    orderBy: { occurredAt: 'desc' },
    select: {
      externalId: true,
      type: true,
      title: true,
      description: true,
      severity: true,
      occurredAt: true,
      latitude: true,
      longitude: true,
    },
  })) as unknown as DigestEvent[]
}

/**
 * Filtra los eventos relevantes para un usuario: tipo permitido, severidad
 * mínima y dentro del radio de alguna de sus ubicaciones.
 */
export function filterEventsForUser(
  user: DigestUser,
  events: DigestEvent[]
): DigestMatch[] {
  if (!user.preferences || !user.preferences.emailEnabled) return []
  const { disasterTypes, minSeverity, alertRadiusKm } = user.preferences

  const matches: DigestMatch[] = []
  for (const event of events) {
    if (!disasterTypes.includes(event.type)) continue
    if (severityRank(event.severity) < severityRank(minSeverity)) continue

    const match = user.locations.reduce<DigestMatch | null>((best, loc) => {
      const radius = loc.radiusKm > 0 ? loc.radiusKm : alertRadiusKm
      const km = haversineKm(loc, event)
      if (km > radius) return best
      const r = Math.round(km * 10) / 10
      return best && best.nearestKm <= r ? best : { event, nearestKm: r, locationName: loc.name }
    }, null)

    if (match) matches.push(match)
  }
  return matches
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('es-CO', { dateStyle: 'medium' })
}

function buildDigestEmail(user: DigestUser, matches: DigestMatch[]): EmailMessage {
  const date = formatDate(new Date())
  const lines = [`Resumen de alertas ALERTA360 — ${date}`, '']

  for (const m of matches) {
    lines.push(
      `• ${m.event.severity.toUpperCase()} · ${m.event.title} · ${m.event.type}` +
        ` · ${m.nearestKm} km de ${m.locationName}`
    )
  }

  lines.push(
    '',
    `(${matches.length} evento(s) relevante(s) en las últimas 24 h)`,
    'Abre la app para el detalle → https://alerta360.com',
    '— ALERTA360',
  )

  return {
    to: user.email ?? '',
    subject: `Resumen de alertas (${matches.length}) — ${date}`,
    text: lines.join('\n'),
  }
}

/** Envia el resumen diario a todos los usuarios con email habilitado. */
export async function sendDailyDigest(
  prisma: PrismaClient,
  deps: DigestDeps = {}
): Promise<DigestSummary> {
  const summary: DigestSummary = { sent: 0, skipped: 0, failed: 0 }

  if (config.DIGEST_ENABLED !== 'true') {
    return summary
  }

  const since = new Date(Date.now() - DIGEST_WINDOW_MS)
  const events = await collectDigestEvents(prisma, since)
  if (events.length === 0) return summary

  const users = (await prisma.user.findMany({
    where: { email: { not: null } } as any,
    include: {
      preferences: {
        select: {
          alertRadiusKm: true,
          disasterTypes: true,
          minSeverity: true,
          emailEnabled: true,
        },
      },
      locations: {
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          radiusKm: true,
        },
      },
    },
  })) as unknown as DigestUser[]

  const mailer = deps.sendEmail ?? sendEmail

  for (const user of users) {
    if (!user.email) {
      summary.skipped++
      continue
    }
    const matches = filterEventsForUser(user, events)
    if (matches.length === 0) {
      summary.skipped++
      continue
    }

    const result = await mailer(buildDigestEmail(user, matches))
    if (result.status === 'sent') {
      summary.sent++
    } else if (result.status === 'failed') {
      summary.failed++
    } else {
      summary.skipped++
    }
    notificationsDelivered.inc({
      channel: 'email',
      status: result.status === 'sent' ? 'sent' : result.status,
    })
  }

  logger.info(
    `[DIGEST] Daily digest — ${summary.sent} enviadas, ` +
      `${summary.skipped} omitidas, ${summary.failed} fallidas`
  )
  return summary
}

/** Calcula milisegundos hasta la próxima `hour` UTC. */
export function nextDigestDelay(hour: number): number {
  const now = new Date()
  const target = new Date(now)
  target.setUTCHours(hour, 0, 0, 0)
  if (target <= now) target.setUTCDate(target.getUTCDate() + 1)
  return target.getTime() - now.getTime()
}

/** Scheduler diario. Se inicia desde `index.ts`; es no-op si DIGEST_ENABLED!=true. */
export function startDigestScheduler(prisma: PrismaClient): void {
  if (config.DIGEST_ENABLED !== 'true') {
    logger.info('[DIGEST] Scheduler skipped — DIGEST_ENABLED != true')
    return
  }

  const run = () => {
    void sendDailyDigest(prisma).catch((err) =>
      logger.error({ err }, '[DIGEST] Fallo del resumen diario')
    )
  }

  const firstDelay = nextDigestDelay(config.DIGEST_HOUR)
  setTimeout(() => {
    run()
    setInterval(run, 24 * 3600_000)
  }, firstDelay)

  logger.info(`[DIGEST] Scheduler started — daily at ${config.DIGEST_HOUR}:00 UTC`)
}
