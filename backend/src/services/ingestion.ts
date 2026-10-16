import { PrismaClient } from '@prisma/client'
import axios from 'axios'

const prisma = new PrismaClient()

// ============================================================================
// USGS Earthquake API
// ============================================================================
interface USGSFeature {
  id: string
  properties: {
    place: string
    time: number
    url: string
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
      { timeout: 10000 }
    )
    return res.data.features
  } catch (error) {
    console.error('USGS fetch failed:', error)
    return []
  }
}

function mapUSGS(feature: USGSFeature) {
  const coords = feature.geometry.coordinates
  // USGS magnitudes come in the URL/properties; use a heuristic for severity
  const magnitude = parseFloat(feature.properties.url.split('/')[0] || '0') || 0
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
      { timeout: 10000 }
    )
    // NOAA sometimes returns single object; normalize to array
    const features = Array.isArray(res.data.features) ? res.data.features : [res.data.features]
    return features
  } catch (error) {
    console.error('NOAA fetch failed:', error)
    return []
  }
}

function mapNOAA(alert: NOAAAlert) {
  // NOAA doesn't always have lat/lon; use center of affected area if available
  const areaDesc = alert.properties || {}
  const severityMap: Record<string, string> = {
    'Extreme': 'critical',
    'Severe': 'high',
    'Moderate': 'medium',
    'Minor': 'low',
  }
  const severity = severityMap[areaDesc.severity || ''] || 'medium'

  return {
    type: mapNOAAType(areaDesc.event),
    source: 'noaa',
    externalId: alert.id,
    latitude: 0, // NOAA provides areaDesc; would need geocoder for exact coords
    longitude: 0,
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
// Ingestion job
// ============================================================================
let ingestCounter = 0

export async function runIngestion(): Promise<{ usgs: number; noaa: number }> {
  console.log(`[INGESTION] Starting cycle #${++ingestCounter} at ${new Date().toISOString()}`)

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

      await prisma.disasterEvent.create({
        data: {
          ...mapped,
          isActive: true,
        },
      })
      usgsInserted++
    } catch (err) {
      console.error('Error inserting USGS event:', err)
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

      await prisma.disasterEvent.create({
        data: {
          ...mapped,
          isActive: true,
        },
      })
      noaaInserted++
    } catch (err) {
      console.error('Error inserting NOAA event:', err)
    }
  }

  console.log(`[INGESTION] Done. USGS: ${usgsInserted} new, NOAA: ${noaaInserted} new`)
  return { usgs: usgsInserted, noaa: noaaInserted }
}

// Schedule: every 5 minutes (300 seconds)
export function startIngestScheduler() {
  if (process.env.USGS_ENABLED !== 'true' && process.env.NOAA_ENABLED !== 'true') {
    console.log('[INGESTION] Skipping scheduler — data sources disabled')
    return
  }

  const intervalMs = parseInt(process.env.INGEST_INTERVAL || '300000', 10)

  // Run immediately on startup, then every intervalMs
  runIngestion().catch(console.error)

  setInterval(() => {
    runIngestion().catch(console.error)
  }, intervalMs)

  console.log(`[INGESTION] Scheduler started — interval: ${intervalMs / 1000}s`)
}
