import type { PrismaClient } from '@prisma/client'
import logger from '../utils/logger'
import {
  haversineKm,
  isNullIsland,
  pointInPolygonAntimeridian,
  severityRank,
  type Severity,
} from '../utils/geo'
import {
  matchingDuration,
  matchingMatches,
  matchingRuns,
  notificationsCreated,
} from '../plugins/metrics'
import type { AlertHub, AlertPayload } from '../realtime/hub'
import { dispatchEventNotifications } from './notifications/dispatch'
import { sendPush } from './push'

/**
 * Motor de alertas: decide qué usuarios deben recibir un evento y crea las
 * notificaciones correspondientes.
 *
 * Reglas (en orden):
 *   1. El evento debe estar activo y tener coordenadas reales (no `0,0`).
 *   2. El tipo debe estar en `disasterTypes` del usuario.
 *   3. La severidad debe ser >= `minSeverity` del usuario.
 *   4. Debe existir una ubicación del usuario a menos de su radio
 *      (`Location.radiusKm`, con `UserPreference.alertRadiusKm` de reserva).
 *   5. Al menos un canal debe estar habilitado; SMS solo para `high`+
 *      (tiene coste real por mensaje).
 *
 * Si varias ubicaciones entran en el radio se usa la más cercana, de modo que
 * cada usuario recibe una sola notificación por evento y canal.
 */

export type Channel = 'push' | 'email' | 'sms'

/** Severidad mínima para enviar SMS (coste por mensaje). */
export const SMS_MIN_SEVERITY: Severity = 'high'

export interface MatchableEvent {
  id: string
  type: string
  latitude: number
  longitude: number
  severity: string
  isActive: boolean
  occurredAt: Date
  title?: string
}

export interface MatchLocation {
  id: string
  latitude: number
  longitude: number
  radiusKm: number
  shape?: string
  polygon?: unknown
}

export interface MatchPreferences {
  alertRadiusKm: number
  disasterTypes: string[]
  minSeverity: string
  pushEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
}

export interface MatchCandidate {
  userId: string
  preferences: MatchPreferences
  locations: MatchLocation[]
  pushSubscription: unknown | null
}

export interface MatchResult {
  userId: string
  locationId: string
  distanceKm: number
  channels: Channel[]
}

export interface MatchSummary {
  /** Usuarios que cumplen todas las reglas. */
  matchedUsers: number
  /** Filas de notificación realmente insertadas (sin duplicados). */
  created: number
  byChannel: Record<Channel, number>
  /** Usuarios con un WebSocket abierto en el momento del envío. */
  pushedLive: number
}

const EMPTY_SUMMARY: MatchSummary = {
  matchedUsers: 0,
  created: 0,
  byChannel: { push: 0, email: 0, sms: 0 },
  pushedLive: 0,
}

const round1 = (value: number): number => Math.round(value * 10) / 10

/** Canales habilitados para una severidad concreta. */
export function channelsFor(preferences: MatchPreferences, severity: string): Channel[] {
  const channels: Channel[] = []
  if (preferences.pushEnabled) channels.push('push')
  if (preferences.emailEnabled) channels.push('email')
  if (preferences.smsEnabled && severityRank(severity) >= severityRank(SMS_MIN_SEVERITY)) {
    channels.push('sms')
  }
  return channels
}

/** Extrae el primer anillo [lon, lat][] de un GeoJSON Polygon/MultiPolygon. */
function normalizePolygonCoords(polygon: unknown): [number, number][] | null {
  if (!polygon || typeof polygon !== 'object') return null
  const coords = (polygon as { coordinates?: unknown }).coordinates
  if (Array.isArray(coords) && Array.isArray(coords[0])) return coords[0] as [number, number][]
  return null
}

/**
 * Evalúa un evento contra un usuario y sus ubicaciones.
 * Devuelve `null` si no aplica ninguna regla.
 */
export function matchCandidate(
  event: MatchableEvent,
  candidate: MatchCandidate
): MatchResult | null {
  if (!event.isActive) return null
  if (isNullIsland(event)) return null
  if (candidate.locations.length === 0) return null

  const { preferences } = candidate
  if (!preferences.disasterTypes.includes(event.type)) return null
  if (severityRank(event.severity) < severityRank(preferences.minSeverity)) return null

  let closest: { location: MatchLocation; distanceKm: number } | null = null
  for (const location of candidate.locations) {
    const isPolygon = location.shape === 'polygon' && location.polygon
    if (isPolygon) {
      const ring = normalizePolygonCoords(location.polygon)
      if (!ring || !pointInPolygonAntimeridian(event, ring)) continue
      const distanceKm = 0
      if (!closest || distanceKm < closest.distanceKm) {
        closest = { location, distanceKm }
      }
    } else {
      const distanceKm = haversineKm(location, event)
      const radiusKm =
        location.radiusKm > 0 ? location.radiusKm : preferences.alertRadiusKm
      if (distanceKm > radiusKm) continue
      if (!closest || distanceKm < closest.distanceKm) {
        closest = { location, distanceKm }
      }
    }
  }
  if (!closest) return null

  const channels = channelsFor(preferences, event.severity)
  if (channels.length === 0) return null

  return {
    userId: candidate.userId,
    locationId: closest.location.id,
    distanceKm: round1(closest.distanceKm),
    channels,
  }
}

/** Versión pura sobre una lista de candidatos (la que usan los tests). */
export function findMatches(
  event: MatchableEvent,
  candidates: MatchCandidate[]
): MatchResult[] {
  const results: MatchResult[] = []
  for (const candidate of candidates) {
    const result = matchCandidate(event, candidate)
    if (result) results.push(result)
  }
  return results
}

interface PreferenceRow {
  userId: string
  alertRadiusKm: number
  disasterTypes: string[]
  minSeverity: string
  pushEnabled: boolean
  emailEnabled: boolean
  smsEnabled: boolean
  user: {
    locations: Array<{ id: string; latitude: number; longitude: number; radiusKm: number; shape?: string; polygon?: unknown }>
    pushSubscription: unknown | null
  }
}

/**
 * Ejecuta el matching de un evento contra todos los usuarios con preferencias
 * y ubicaciones, inserta las notificaciones y las empuja por WebSocket.
 *
 * Nunca lanza: un fallo del motor no debe romper el ciclo de ingesta.
 */
export async function matchEvent(
  prisma: PrismaClient,
  event: MatchableEvent,
  hub?: AlertHub
): Promise<MatchSummary> {
  const startedAt = Date.now()
  matchingRuns.inc()

  try {
    if (!event.isActive || isNullIsland(event)) return EMPTY_SUMMARY

    const rows = (await prisma.userPreference.findMany({
      include: {
        user: {
          select: {
            locations: {
              select: { id: true, latitude: true, longitude: true, radiusKm: true, shape: true, polygon: true },
            },
            pushSubscription: true,
          },
        },
      },
    })) as unknown as PreferenceRow[]

    const candidates: MatchCandidate[] = rows
      .filter(row => row.user?.locations?.length)
      .map(row => ({
        userId: row.userId,
        preferences: {
          alertRadiusKm: row.alertRadiusKm,
          disasterTypes: row.disasterTypes,
          minSeverity: row.minSeverity,
          pushEnabled: row.pushEnabled,
          emailEnabled: row.emailEnabled,
          smsEnabled: row.smsEnabled,
        },
        locations: row.user.locations,
        pushSubscription: row.user.pushSubscription ?? null,
      }))

    const results = findMatches(event, candidates)
    matchingMatches.inc(results.length)
    if (results.length === 0) return EMPTY_SUMMARY

    const data = results.flatMap(result =>
      result.channels.map(channel => ({
        userId: result.userId,
        eventId: event.id,
        locationId: result.locationId,
        distanceKm: result.distanceKm,
        channel,
        status: 'pending',
      }))
    )

    const { count } = await prisma.notification.createMany({ data, skipDuplicates: true })

    const byChannel: Record<Channel, number> = { push: 0, email: 0, sms: 0 }
    for (const row of data) byChannel[row.channel as Channel]++
    for (const channel of Object.keys(byChannel) as Channel[]) {
      if (byChannel[channel] > 0) notificationsCreated.inc({ channel }, byChannel[channel])
    }

    const liveUserIds = pushToSockets(event, results, candidates, hub)
    const pushedLive = liveUserIds.length

    // Si el usuario tenía el socket abierto, su push ya salió. Solo el canal
    // push: email y SMS siguen `pending` para que el despachador los envíe.
    if (pushedLive > 0) {
      await prisma.notification
        .updateMany({
          where: { eventId: event.id, userId: { in: liveUserIds }, channel: 'push' },
          data: { status: 'sent' },
        })
        .catch(err => logger.warn({ err }, '[MATCHING] No se pudo marcar como enviada'))
    }

    logger.info(
      `[MATCHING] ${event.type} ${event.severity} → ${results.length} usuario(s), ` +
        `${count} notificación(es), ${pushedLive} en vivo`
    )

    // Email y SMS salen fuera del ciclo de ingesta: si el proveedor tarda o
    // falla, la ingesta no se bloquea.
    if (count > 0) {
      void dispatchEventNotifications(prisma, event.id).catch(err =>
        logger.warn({ err, eventId: event.id }, '[MATCHING] Fallo al despachar email/SMS')
      )
    }

    return { matchedUsers: results.length, created: count, byChannel, pushedLive }
  } catch (err) {
    logger.error({ err, eventId: event.id }, '[MATCHING] Fallo del motor de alertas')
    return EMPTY_SUMMARY
  } finally {
    matchingDuration.observe((Date.now() - startedAt) / 1000)
  }
}

/** Empuja la alerta por WebSocket; devuelve los usuarios que la recibieron en vivo. */
function pushToSockets(
  event: MatchableEvent,
  results: MatchResult[],
  candidates: MatchCandidate[],
  hub?: AlertHub
): string[] {
  if (!hub) return []

  const subs = new Map<string, unknown>(candidates.map((c) => [c.userId, c.pushSubscription]))
  const delivered: string[] = []
  for (const result of results) {
    const payload: AlertPayload = {
      type: 'alert',
      eventId: event.id,
      title: event.title ?? event.type,
      severity: event.severity,
      distanceKm: result.distanceKm,
      channels: result.channels,
      occurredAt: event.occurredAt.toISOString(),
      latitude: event.latitude,
      longitude: event.longitude,
    }
    const live = hub.sendToUser(result.userId, payload)
    if (live > 0) {
      delivered.push(result.userId)
      continue
    }
    // Sin WebSocket conectado: fallback a push offline (Web Push).
    void sendPush(subs.get(result.userId), {
      title: payload.title,
      body: `Evento ${payload.severity} a ${payload.distanceKm} km de tu zona`,
      data: {
        eventId: payload.eventId,
        latitude: payload.latitude,
        longitude: payload.longitude,
        url: `/events/${payload.eventId}`,
      },
    }).catch((err) => logger.warn({ err, userId: result.userId }, '[PUSH] Fallo en fallback offline'))
  }
  return delivered
}
