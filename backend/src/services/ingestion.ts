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
// NASA EONET API
// ============================================================================
// https://eonet.gsfc.nasa.gov/api/v3/events
// Eventos naturales abiertos: inundaciones, deslizamientos, incendios,
// tormentas, volcanes, sequías, extremos térmicos. Sin clave API, público.
//
// NOTA DE MAPEO: EONET usa coordenadas [longitude, latitude] (GeoJSON)
// y un campo "geometry" (singular, array) en lugar de "geometries".
export interface EONETCategory {
  id: string
  title: string
}

export interface EONETGeometry {
  date: string
  type: string
  coordinates: [number, number] | [number, number, number]
  magnitudeValue?: number
  magnitudeUnit?: string
}

export interface EONETEvent {
  id: string
  title: string
  description: string | null
  link: string
  closed: string | null
  categories: EONETCategory[]
  sources: { id: string; url: string }[]
  geometry: EONETGeometry[]
}

interface EONETResponse {
  events: EONETEvent[]
}

/**
 * Mapea las categorías EONET a los tipos de ALERTA360.
 * Solo se incluyen categorías que representan desastres naturales
 * relevantes para alertas tempranas (se excluyen waterColor, manmade).
 */
const EONET_CATEGORY_MAP: Record<string, string> = {
  floods: 'flood',
  landslides: 'landslide',
  severeStorms: 'storm',
  volcanoes: 'volcanic',
  wildfires: 'wildfire',
  drought: 'drought',
  tempExtremes: 'heatwave',
  earthquakes: 'earthquake',
  dustHaze: 'dust',
  snow: 'snow',
}

/**
 * Asigna severidad basada en la categoría y magnitud disponible.
 * Para tormentas, usa la velocidad del viento (kts) como proxy de intensidad.
 * El resto se mapea por tipo — EONET no expone alert levels.
 */
function mapEONETSeverity(categoryId: string, magnitude?: number): string {
  if (categoryId === 'severeStorms' && magnitude !== undefined) {
    if (magnitude >= 64) return 'critical'
    if (magnitude >= 34) return 'high'
    return 'medium'
  }
  const defaults: Record<string, string> = {
    floods: 'medium',
    landslides: 'high',
    wildfires: 'medium',
    volcanoes: 'medium',
    severeStorms: 'medium',
    tempExtremes: 'medium',
    drought: 'low',
    earthquakes: 'low',
    dustHaze: 'low',
    snow: 'low',
  }
  return defaults[categoryId] ?? 'low'
}

async function fetchEONET(): Promise<EONETEvent[]> {
  try {
    const res = await axios.get<EONETResponse>('https://eonet.gsfc.nasa.gov/api/v3/events', {
      params: { days: 30, limit: 100, status: 'open' },
      timeout: 10000,
      headers: {
        'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)',
      },
    })
    return res.data.events || []
  } catch (error) {
    logger.error({ err: error }, 'EONET fetch failed')
    return []
  }
}

/**
 * Mapea un evento EONET a la estructura de ALERTA360.
 * Usa la geometría más reciente (última del array) como posición actual.
 * Retorna `null` si la categoría no está en el mapa o no hay geometría.
 */
export function mapEONET(event: EONETEvent) {
  const categoryId = event.categories[0]?.id
  const mappedType = EONET_CATEGORY_MAP[categoryId]
  if (!mappedType) return null

  if (!event.geometry || event.geometry.length === 0) return null
  const latest = event.geometry[event.geometry.length - 1]
  const coords = latest.coordinates
  if (coords.length < 2) return null

  const magnitude = latest.magnitudeValue
  const severity = mapEONETSeverity(categoryId, magnitude)
  const occurredAt = new Date(latest.date)
  const sourceName = event.sources?.[0]?.id ?? 'NASA EONET'
  const title = event.title || `${mappedType} event`

  // Para terremotos EONET no reporta magnitud; deja null y deja que
  // USGS aporte el valor con mayor precisión.
  const isEarthquake = mappedType === 'earthquake'

  return {
    type: mappedType,
    source: 'nasa_eonet',
    externalId: event.id,
    latitude: coords[1],
    longitude: coords[0],
    magnitude: isEarthquake ? (magnitude ?? null) : null,
    intensity: isEarthquake ? Math.round(magnitude || 5) : null,
    title,
    description: event.description || `${title} (${sourceName})`,
    severity,
    occurredAt,
    rawData: {
      link: event.link,
      categories: event.categories.map(c => c.id),
      source: sourceName,
      magnitudeValue: magnitude,
      magnitudeUnit: latest.magnitudeUnit,
    },
  }
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
): Promise<{ usgs: number; noaa: number; eonet: number }> {
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

  const eonetEvents = await fetchEONET()
  let eonetInserted = 0

  for (const event of eonetEvents) {
    try {
      const mapped = mapEONET(event)
      if (!mapped) continue

      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'nasa_eonet' },
      })
      if (existing) continue // deduplicate

      const created = await prisma.disasterEvent.create({
        data: {
          ...mapped,
          isActive: true,
        },
      })
      eonetInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'nasa_eonet' })
      logger.error({ err, eventId: event.id }, 'Error inserting EONET event')
    }
  }

  const total = usgsInserted + noaaInserted + eonetInserted

  // ---- métricas ----
  if (usgsInserted > 0) ingestionEventsTotal.inc({ source: 'usgs' }, usgsInserted)
  if (noaaInserted > 0) ingestionEventsTotal.inc({ source: 'noaa' }, noaaInserted)
  if (eonetInserted > 0) ingestionEventsTotal.inc({ source: 'nasa_eonet' }, eonetInserted)
  ingestionCycleDuration.set((Date.now() - startedAt) / 1000)
  markIngestionSuccess()

  try {
    activeEventsGauge.set(await prisma.disasterEvent.count({ where: { isActive: true } }))
  } catch (err) {
    logger.warn({ err }, '[INGESTION] No se pudo contar los eventos activos')
  }

  logger.info(`[INGESTION] Cycle #${cycle} complete — USGS: ${usgsInserted} new, NOAA: ${noaaInserted} new, EONET: ${eonetInserted} new (${total} total)`)
  return { usgs: usgsInserted, noaa: noaaInserted, eonet: eonetInserted }
}

// Schedule: every INGEST_INTERVAL ms
export function startIngestScheduler(prisma: PrismaClient, hooks?: IngestionHooks) {
  const enabledFlags = {
    usgs: config.USGS_ENABLED === 'true',
    noaa: config.NOAA_ENABLED === 'true',
    eonet: config.EONET_ENABLED === 'true',
  }
  const anyEnabled = Object.values(enabledFlags).some(Boolean)

  if (!anyEnabled) {
    logger.info('[INGESTION] Scheduler skipped — data sources disabled')
    return
  }

  const enabledList = Object.entries(enabledFlags)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(', ')

  const intervalMs = config.INGEST_INTERVAL

  // Run immediately on startup, then every intervalMs
  runIngestion(prisma, hooks).catch(err => logger.error({ err }, 'Initial ingestion failed'))

  setInterval(() => {
    runIngestion(prisma, hooks).catch(err => logger.error({ err }, 'Scheduled ingestion failed'))
  }, intervalMs)

  logger.info(`[INGESTION] Scheduler started — enabled: ${enabledList}, interval: ${intervalMs / 1000}s`)
}
