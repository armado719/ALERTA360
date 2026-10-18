import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import logger from '../utils/logger'
import { config } from '../utils/config'
import {
  activeEventsGauge,
  ingestionCycleDuration,
  ingestionErrorsTotal,
  ingestionEventsTotal,
  markIngestionSuccess,
} from '../plugins/metrics'

// ============================================================================
// USGS Earthquake API
// ============================================================================
interface USGSFeature {
  id: string
  properties: {
    place: string
    time: number
    url: string
    mag: number | null
  }
  geometry: {
    coordinates: [number, number, number]
  }
}

interface USGSResponse {
  features: USGSFeature[]
}

async function fetchUSGS(): Promise<USGSResponse['features']> {
  try {
    const res = await axios.get<USGSResponse>(
      'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)',
        },
      }
    )
    return res.data.features
  } catch (error) {
    logger.error({ err: error }, 'USGS fetch failed')
    return []
  }
}

function mapUSGS(feature: USGSFeature) {
  const coords = feature.geometry.coordinates
  // USGS magnitudes come in properties.mag
  const magnitude = feature.properties.mag || 0
  let severity = 'low'
  if (magnitude >= 6) severity = 'critical'
  else if (magnitude >= 5) severity = 'high'
  else if (magnitude >= 4) severity = 'medium'

  return {
    type: 'earthquake' as const,
    source: 'usgs',
    externalId: feature.id,
    latitude: coords[1],
    longitude: coords[0],
    magnitude: magnitude > 0 ? magnitude : null,
    title: feature.properties.place,
    description: `Terremoto de magnitud ${magnitude} - ${feature.properties.place}`,
    severity,
    occurredAt: new Date(feature.properties.time),
    rawData: { url: feature.properties.url, coords },
  }
}

// ============================================================================
// NOAA Weather Alerts API
// ============================================================================
interface NOAAAlertProperties {
  id: string
  event: string
  headline: string
  description: string
  severity: string
  starts: string
  ends?: string
  sender: string
  areaDesc: string
}

interface NOAAAlert {
  id: string
  properties: NOAAAlertProperties
}

interface NOAAResponse {
  features: NOAAAlert[]
}

async function fetchNOAA(): Promise<NOAAAlert[]> {
  try {
    const res = await axios.get<NOAAResponse>(
      'https://api.weather.gov/alerts/active',
      {
        timeout: 10000,
        headers: {
          'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)',
          'Accept': 'application/geo+json',
        },
      }
    )
    // NOAA sometimes returns single object; normalize to array
    const features = Array.isArray(res.data.features) ? res.data.features : [res.data.features]
    return features
  } catch (error) {
    logger.error({ err: error }, 'NOAA fetch failed')
    return []
  }
}

function mapNOAA(alert: NOAAAlert) {
  const areaDesc = alert.properties || {}
  const severityMap: Record<string, string> = {
    'Extreme': 'critical',
    'Severe': 'high',
    'Moderate': 'medium',
    'Minor': 'low',
  }
  const severity = severityMap[areaDesc.severity || ''] || 'medium'

  // Parse centroid from areaDesc if available
  // Note: NOAA provides areaDesc as text; would need geocoder for exact coords

  return {
    type: mapNOAAType(areaDesc.event),
    source: 'noaa',
    externalId: alert.id,
    latitude: 0, // NOAA provides areaDesc text; would need geocoder for exact coords
    longitude: 0,
    magnitude: null,
    title: areaDesc.event,
    description: areaDesc.description || areaDesc.headline || '',
    severity,
    occurredAt: new Date(areaDesc.starts),
    rawData: { headline: areaDesc.headline, region: areaDesc.sender },
  }
}

function mapNOAAType(event: string): string {
  const e = event.toLowerCase()
  if (e.includes('quake') || e.includes('sismo')) return 'earthquake'
  if (e.includes('flood') || e.includes('inund')) return 'flood'
  if (e.includes('rain') || e.includes('lluvia')) return 'rain'
  if (e.includes('storm') || e.includes('tormenta') || e.includes('hurricane')) return 'storm'
  if (e.includes('landslide') || e.includes('deslizamiento')) return 'landslide'
  if (e.includes('volcan') || e.includes('erupción')) return 'volcanic'
  return 'storm'
}

// ============================================================================
// Ingestion cycle
// ============================================================================
let ingestCounter = 0

/**
 * Enganches opcionales para no acoplar la ingesta al motor de alertas.
 * `onEventCreated` se llama por cada evento nuevo ya persistido; si falla,
 * se registra el error y se sigue con el siguiente evento.
 */
export interface IngestionHooks {
  onEventCreated?: (event: {
    id: string
    type: string
    latitude: number
    longitude: number
    severity: string
    isActive: boolean
    occurredAt: Date
    title: string
  }) => void | Promise<void>
}

async function notifyHooks(hooks: IngestionHooks | undefined, event: Parameters<NonNullable<IngestionHooks['onEventCreated']>>[0]) {
  if (!hooks?.onEventCreated) return
  try {
    await hooks.onEventCreated(event)
  } catch (err) {
    logger.error({ err, eventId: event.id }, '[INGESTION] onEventCreated failed')
  }
}

export async function runIngestion(
  prisma: PrismaClient,
  hooks?: IngestionHooks
): Promise<{ usgs: number; noaa: number }> {
  const cycle = ++ingestCounter
  const startedAt = Date.now()
  logger.info(`[INGESTION] Starting cycle #${cycle}`)

  const usgsEvents = await fetchUSGS()
  let usgsInserted = 0

  for (const feature of usgsEvents) {
    try {
      const mapped = mapUSGS(feature)
      if (!mapped) continue

      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'usgs' },
      })
      if (existing) continue // deduplicate

      const created = await prisma.disasterEvent.create({
        data: {
          ...mapped,
          isActive: true,
        },
      })
      usgsInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'usgs' })
      logger.error({ err, eventId: feature.id }, 'Error inserting USGS event')
    }
  }

  const noaaEvents = await fetchNOAA()
  let noaaInserted = 0

  for (const alert of noaaEvents) {
    try {
      const mapped = mapNOAA(alert)
      if (!mapped) continue

      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'noaa' },
      })
      if (existing) continue

      const created = await prisma.disasterEvent.create({
        data: {
          ...mapped,
          isActive: true,
        },
      })
      noaaInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'noaa' })
      logger.error({ err, alertId: alert.id }, 'Error inserting NOAA event')
    }
  }

  const total = usgsInserted + noaaInserted

  // ---- métricas ----
  if (usgsInserted > 0) ingestionEventsTotal.inc({ source: 'usgs' }, usgsInserted)
  if (noaaInserted > 0) ingestionEventsTotal.inc({ source: 'noaa' }, noaaInserted)
  ingestionCycleDuration.set((Date.now() - startedAt) / 1000)
  markIngestionSuccess()

  try {
    activeEventsGauge.set(await prisma.disasterEvent.count({ where: { isActive: true } }))
  } catch (err) {
    logger.warn({ err }, '[INGESTION] No se pudo contar los eventos activos')
  }

  logger.info(`[INGESTION] Cycle #${cycle} complete — USGS: ${usgsInserted} new, NOAA: ${noaaInserted} new (${total} total)`)
  return { usgs: usgsInserted, noaa: noaaInserted }
}

// Schedule: every 5 minutes (300 seconds)
export function startIngestScheduler(prisma: PrismaClient, hooks?: IngestionHooks) {
  const usgsEnabled = config.USGS_ENABLED === 'true'
  const noaaEnabled = config.NOAA_ENABLED === 'true'

  if (!usgsEnabled && !noaaEnabled) {
    logger.info('[INGESTION] Scheduler skipped — data sources disabled')
    return
  }

  const intervalMs = config.INGEST_INTERVAL

  // Run immediately on startup, then every intervalMs
  runIngestion(prisma, hooks).catch(err => logger.error({ err }, 'Initial ingestion failed'))

  setInterval(() => {
    runIngestion(prisma, hooks).catch(err => logger.error({ err }, 'Scheduled ingestion failed'))
  }, intervalMs)

  logger.info(`[INGESTION] Scheduler started — interval: ${intervalMs / 1000}s`)
}
