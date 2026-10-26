import { PrismaClient } from '@prisma/client'
import axios from 'axios'
import logger from '../utils/logger'
import { config } from '../utils/config'
import { canFetch, registerSource, reportFailure, reportSuccess } from './sources/health'
import { isNullIsland, polygonCentroid } from '../utils/geo'
import {
  activeEventsGauge,
  ingestionCycleDuration,
  ingestionErrorsTotal,
  ingestionEventsTotal,
  markIngestionSuccess,
} from '../plugins/metrics'

// Registramos todas las fuentes para que aparezcan en /api/sources/health
// aun cuando aún no hayan tenido su primer fetch.
registerSource('usgs')
registerSource('noaa')
registerSource('nasa_eonet')
registerSource('gdacs')
registerSource('meteoalarm')
registerSource('nhc')
registerSource('ideam', { staleAfterMs: 3 * 60 * 60 * 1000 })

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
  // Lanza en error: el circuit breaker del ciclo de ingesta decide si
  // saltar la fuente o registrar el fallo. Un [] vacío significa éxito.
  const res = await axios.get<USGSResponse>(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson',
    {
      timeout: 10000,
      headers: {
        'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)',
      },
    }
  )
  return res.data.features ?? []
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
export interface NOAAAlertProperties {
  id: string
  event: string
  headline: string
  description: string
  severity: string
  // El NWS no publica `starts`: el inicio está en `onset` (o `effective`/`sent`)
  onset?: string | null
  effective?: string | null
  sent?: string | null
  ends?: string | null
  sender: string
  areaDesc: string
}

export interface NOAAGeometry {
  type: 'Point' | 'Polygon' | 'MultiPolygon' | string
  coordinates: unknown
}

export interface NOAAAlert {
  id: string
  geometry: NOAAGeometry | null
  properties: NOAAAlertProperties
}

interface NOAAResponse {
  features: NOAAAlert[]
}

async function fetchNOAA(): Promise<NOAAAlert[]> {
  // Lanza en error: el circuit breaker del ciclo de ingesta lo catcha.
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
}

/**
 * Extrae lat/lon de la geometría de una alerta NOAA.
 * - Point: coordinates = [lon, lat]
 * - Polygon: coordinates[0] = anillo exterior → centroide geométrico
 * - MultiPolygon: coordinates[0][0] = anillo del primer polígono
 */
function extractNOAACoords(
  geometry: NOAAGeometry | null
): { latitude: number; longitude: number } | null {
  if (!geometry || geometry.coordinates == null) return null
  const { type, coordinates } = geometry

  if (type === 'Point' && Array.isArray(coordinates)) {
    const [lon, lat] = coordinates as [number, number]
    if (typeof lon === 'number' && typeof lat === 'number') {
      return { latitude: lat, longitude: lon }
    }
  }

  if (type === 'Polygon' && Array.isArray(coordinates)) {
    const ring = (coordinates as number[][][])[0]
    if (!ring || ring.length === 0) return null
    const points = ring.map((c) => [c[0], c[1]] as [number, number])
    return polygonCentroid(points)
  }

  if (type === 'MultiPolygon' && Array.isArray(coordinates)) {
    const ring = (coordinates as number[][][][])[0]?.[0]
    if (!ring || ring.length === 0) return null
    const points = ring.map((c) => [c[0], c[1]] as [number, number])
    return polygonCentroid(points)
  }

  return null
}

export function mapNOAA(alert: NOAAAlert) {
  const props = alert.properties || {}
  const severityMap: Record<string, string> = {
    Extreme: 'critical',
    Severe: 'high',
    Moderate: 'medium',
    Minor: 'low',
  }
  const severity = severityMap[props.severity || ''] || 'medium'

  // Extraer coordenadas reales de geometry. Si NOAA no provee geometría
  // (solo texto de área), descartamos en lugar de emitir (0,0) que el
  // matching tendría que filtrar después.
  const coords = extractNOAACoords(alert.geometry)
  if (!coords) return null

  // Validar rango y descartar coordenadas nulas/inválidas
  if (Number.isNaN(coords.latitude) || Number.isNaN(coords.longitude)) return null
  if (coords.latitude < -90 || coords.latitude > 90) return null
  if (coords.longitude < -180 || coords.longitude > 180) return null
  if (isNullIsland(coords)) return null

  // Primera fecha válida; una inválida hacía fallar el insert de toda alerta
  const occurredAt =
    [props.onset, props.effective, props.sent]
      .map((value) => (value ? new Date(value) : null))
      .find((date): date is Date => !!date && !Number.isNaN(date.getTime())) ?? new Date()

  return {
    type: mapNOAAType(props.event),
    source: 'noaa',
    externalId: alert.id,
    latitude: coords.latitude,
    longitude: coords.longitude,
    magnitude: null,
    title: props.event,
    description: props.description || props.headline || '',
    severity,
    occurredAt,
    rawData: { headline: props.headline, region: props.sender },
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
  // Lanza en error: el circuit breaker del ciclo de ingesta lo catcha.
  const params: Record<string, string | number> = {
    days: config.EONET_DAYS,
    limit: 100,
    status: 'open',
  }
  // bbox opcional: limita la consulta a la región de interés.
  // Vacío = cobertura mundial.
  if (config.EONET_BBOX) {
    params.bbox = config.EONET_BBOX
  }
  const res = await axios.get<EONETResponse>('https://eonet.gsfc.nasa.gov/api/v3/events', {
    params,
    timeout: 10000,
    headers: {
      'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)',
    },
  })
  return res.data.events ?? []
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
// GDACS (Global Alert for Disaster) API
// ============================================================================
// https://www.gdacs.org/gdacsapi/api/events/geteventlist/SEARCH (config.GDACS_URL)
// Eventos multi-riesgo globales: ciclones (TC), inundaciones (FL),
// sismos (EQ), volcanes (VO), incendios (WF), sequías (DR). Sin clave API.
//
// NOTA: GDACS usa [longitude, latitude] (GeoJSON) en geometry.coordinates.
// Las fechas (`fromdate`) vienen en UTC sin zona horaria.

interface GDACSProperties {
  eventid: number | string
  eventtype: string
  alertlevel: string
  name: string
  fromdate?: string
  description?: string
  country?: string
  // La API devuelve el texto "true"/"false"
  iscurrent?: string | boolean
  severitydata?: { severity?: number; severitytext?: string; severityunit?: string }
  url?: { report?: string }
}

interface GDACSGeometry {
  type: string
  coordinates: [number, number] | [number, number, number] | [number, number, number, number, number][]
}

export interface GDACSFeature {
  type: string
  properties: GDACSProperties
  geometry: GDACSGeometry
}

interface GDACSResponse {
  type: string
  features: GDACSFeature[]
}

/** GDACS eventtype → tipo ALERTA360 */
const GDACS_TYPE_MAP: Record<string, string> = {
  EQ: 'earthquake',
  TC: 'storm',
  FL: 'flood',
  VO: 'volcanic',
  WF: 'wildfire',
  DR: 'drought',
}

/** GDACS alertlevel → severidad ALERTA360 (green→low, orange→medium, red→critical) */
const GDACS_SEVERITY_MAP: Record<string, string> = {
  Green: 'low',
  Orange: 'medium',
  // Rojo = impacto humanitario severo previsto
  Red: 'critical',
}

/**
 * GDACS no siempre incluye alertlevel (p. ej. para sismos).
 * Usa la severidad numérica como fallback.
 */
function mapGDACSSeverity(eventtype: string, severityNum?: number): string {
  // Sismos: severidad ≈ magnitud del evento (mayor = más severo)
  if (eventtype === 'EQ') {
    if (severityNum && severityNum >= 6) return 'high'
    if (severityNum && severityNum >= 5) return 'high'
    return 'medium'
  }
  // Para otros tipos, si no hay alertlevel, usa medium como default conservador
  return 'medium'
}

// La API pagina de a 100 eventos (no admite otro tamaño); los incendios (WF)
// suelen llenar la primera página, así que se piden unas cuantas más.
const GDACS_PAGE_SIZE = 100
const GDACS_MAX_PAGES = 3

async function fetchGDACS(): Promise<GDACSFeature[]> {
  const day = (d: Date) => d.toISOString().slice(0, 10)
  const params = {
    eventlist: 'TC;FL;VO;DR;WF', // sin EQ: los sismos los cubre USGS
    alertlevel: 'Green;Orange;Red',
    fromDate: day(new Date(Date.now() - config.GDACS_DAYS * 86_400_000)),
    toDate: day(new Date()),
  }
  const byId = new Map<string, GDACSFeature>()
  for (let page = 1; page <= GDACS_MAX_PAGES; page++) {
    let features: GDACSFeature[]
    try {
      const res = await axios.get<GDACSResponse>(config.GDACS_URL, {
        params: { ...params, pagenumber: page },
        // GDACS es lento e irregular (5 s a >30 s por página)
        timeout: 45000,
        headers: { 'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)' },
      })
      features = res.data?.features ?? []
    } catch (err) {
      // La primera página lanza: el circuit breaker del ciclo lo registra.
      // Si falla una posterior, se usa lo que ya llegó. GDACS responde 400
      // cuando se pide una página más allá del final: no es un fallo.
      if (page === 1) throw err
      if ((err as { response?: { status?: number } }).response?.status !== 400) {
        logger.warn({ page, err: (err as Error).message }, '[INGESTION] GDACS: página incompleta')
      }
      break
    }
    for (const f of features) byId.set(`${f.properties.eventtype}-${f.properties.eventid}`, f)
    if (features.length < GDACS_PAGE_SIZE) break
  }
  return [...byId.values()]
}

/**
 * Mapea un evento GDACS a la estructura de ALERTA360.
 * Filtra sismos (los cubre USGS con mayor precisión) si ya vienen de EONET,
 * pero los mantiene si no hay duplicado. Retorna null si no se puede mapear.
 */
export function mapGDACS(feature: GDACSFeature) {
  const props = feature.properties
  const eventType = props.eventtype
  const mappedType = GDACS_TYPE_MAP[eventType]
  if (!mappedType) return null

  // GDACS: sismos ya vienen de USGS con mayor precisión → los filtramos
  // para evitar duplicados. Si no hay USGS, se pueden habilitar.
  if (eventType === 'EQ') return null
  // Evento ya terminado: no debe disparar alertas nuevas
  if (String(props.iscurrent) === 'false') return null

  if (!feature.geometry) return null
  const coords = feature.geometry.coordinates
  // Coordenadas lineales [lon, lat]
  if (!Array.isArray(coords) || coords.length < 2) return null
  const lon = Array.isArray(coords[0]) ? coords[0][0] : coords[0]
  const lat = Array.isArray(coords[0]) ? coords[0][1] : coords[1]
  if (typeof lon !== 'number' || typeof lat !== 'number') return null

  const severityValue = props.severitydata?.severity
  const severity = GDACS_SEVERITY_MAP[props.alertlevel] ?? mapGDACSSeverity(eventType, severityValue)
  // `fromdate` viene sin zona horaria y es UTC
  const fromdate = props.fromdate && !/[zZ]|[+-]\d\d:\d\d$/.test(props.fromdate) ? `${props.fromdate}Z` : props.fromdate
  const parsed = fromdate ? new Date(fromdate) : null
  const occurredAt = parsed && !Number.isNaN(parsed.getTime()) ? parsed : new Date()
  const title = props.name || `${mappedType} event`

  return {
    type: mappedType,
    source: 'gdacs' as const,
    // eventid solo es único dentro de cada tipo de evento
    externalId: `gdacs-${eventType}-${props.eventid}`,
    latitude: lat,
    longitude: lon,
    magnitude: severityValue ?? null,
    intensity: null,
    title,
    description: props.severitydata?.severitytext || props.description || title,
    severity,
    occurredAt,
    rawData: {
      alertlevel: props.alertlevel,
      eventtype: eventType,
      fromdate: props.fromdate,
      country: props.country,
      report: props.url?.report,
    },
  }
}

// ============================================================================
// Meteoalarm (Europa / Asia-Pacific) — A3
// ============================================================================
export interface MeteoalarmFeature {
  type: string
  severity: string
  area?: string
  city?: string
  lat: number
  lon: number
  onset: string
  expires: string
  title?: string
  description?: string
  [key: string]: unknown
}

const METEOALARM_TYPE_MAP: Record<string, string> = {
  flood_alert: 'flood',
  flood: 'flood',
  storm: 'storm',
  windstorm: 'storm',
  wind: 'wind',
  snow: 'snow',
  wildfire: 'wildfire',
  earthquakedam: 'earthquake',
  earthquake: 'earthquake',
}

/**
 * Mapea la severidad textual de Meteoalarm al escalado ALERTA360
 * (usa la misma escala de severidad del schema).
 */
function mapMeteoalarmSeverity(severity: string): string {
  const s = (severity || '').toLowerCase()
  if (s.includes('extreme') || s.includes('severe')) return 'high'
  if (s.includes('moderate')) return 'medium'
  if (s.includes('minor')) return 'low'
  return 'medium'
}

/**
 * El endpoint `METEOALARM_URL` es configurable (no hay un JSON público estable
 * para toda Europa). El contrato esperado: un array de objetos con
 * `type, severity, lat, lon, onset, area, title, description`.
 */
async function fetchMeteoalarm(): Promise<MeteoalarmFeature[]> {
  const res = await axios.get<MeteoalarmFeature[]>(config.METEOALARM_URL, {
    timeout: config.METEOALARM_TIMEOUT,
    params:
      config.METEOALARM_COUNTRIES !== 'ALL'
        ? { countries: config.METEOALARM_COUNTRIES }
        : undefined,
    headers: {
      'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)',
    },
  })
  return res.data ?? []
}

export function mapMeteoalarm(feature: MeteoalarmFeature) {
  if (Number.isNaN(feature.lat) || Number.isNaN(feature.lon)) return null
  const mappedType = METEOALARM_TYPE_MAP[feature.type] ?? 'flood'
  const title = feature.title || `${mappedType} alerta — ${feature.area || feature.city || ''}`.trim()

  return {
    type: mappedType,
    source: 'meteoalarm' as const,
    externalId: [feature.onset, feature.lat, feature.lon].join('|'),
    latitude: feature.lat,
    longitude: feature.lon,
    magnitude: null,
    intensity: null,
    title,
    description: feature.description || title,
    severity: mapMeteoalarmSeverity(feature.severity),
    occurredAt: feature.onset ? new Date(feature.onset) : new Date(),
    rawData: { ...feature } as any,
  }
}

// ============================================================================
// NHC Forecast Cone / ciclones tropicales — A4
// ============================================================================
// Fuente pública del ArcGIS REST de NOAA (capa "Forecast Cone"):
// https://mapservices.weather.noaa.gov/tropical/rest/services/tropical/NHC_tropical_weather_summary/MapServer/7/query
// Cada feature es el cono de incertidumbre (Polygon) de un ciclón tropical activo.
// El cono se persiste en `rawData.cone`; el evento se ancla a su centroide.
interface NHCResponseFeature {
  type: string
  properties: Record<string, unknown>
  geometry: { type: string; coordinates: number[][][] } | null
}
interface NHCResponse { type: string; features: NHCResponseFeature[] }

async function fetchNHC(): Promise<NHCResponseFeature[]> {
  const res = await axios.get<NHCResponse>(config.NHC_URL, {
    timeout: config.NHC_TIMEOUT,
    params: { where: '1=1', outFields: '*', f: 'geojson' },
    headers: { 'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)' },
  })
  return res.data?.features ?? []
}

const NHC_BASIN_MAP: Record<string, string> = {
  AL: 'Atlántico',
  EP: 'Pacífico oriental',
  CP: 'Pacífico central',
}

// `stormtype` de la capa: sin viento en los atributos, el tipo es la mejor
// señal de intensidad (TD < 34 kt, TS 34-63 kt, HU >= 64 kt, MH = categoría 3+).
const NHC_STORM_TYPES: Record<string, { label: string; severity: string }> = {
  TD: { label: 'Depresión tropical', severity: 'low' },
  STD: { label: 'Depresión subtropical', severity: 'low' },
  PTC: { label: 'Potencial ciclón tropical', severity: 'low' },
  TS: { label: 'Tormenta tropical', severity: 'medium' },
  STS: { label: 'Tormenta subtropical', severity: 'medium' },
  HU: { label: 'Huracán', severity: 'high' },
  MH: { label: 'Huracán mayor', severity: 'critical' },
}

/**
 * Mapea un feature del cono NHC a un evento ALERTA360.
 * - Un evento por tormenta: `externalId = nhc-<stormId>` (p. ej. `nhc-EP222026`),
 *   sacado de `idp_source` (`ep222026-017_5day_pgn`). Cada aviso nuevo actualiza
 *   ese evento en vez de crear otro.
 * - Sin identificador estable se descarta: un id basado en la hora duplicaba el
 *   ciclón en cada ciclo de ingesta.
 * - severity por `stormtype`; rawData.cone = GeoJSON Polygon del cono.
 */
export function mapNHC(feature: NHCResponseFeature) {
  if (!feature.geometry || feature.geometry.type !== 'Polygon') return null
  if (!Array.isArray(feature.geometry.coordinates?.[0])) return null

  const ring = feature.geometry.coordinates[0]
  // GeoJSON ring es [lon, lat]; polygonCentroid también espera [lon, lat]
  const points = ring.map((c) => [c[0], c[1]] as [number, number])
  const centroid = polygonCentroid(points)
  if (!centroid || isNullIsland(centroid)) return null

  const props = feature.properties || {}
  const match = /^([a-z]{2}\d{6})-(\d+)/i.exec(String(props.idp_source ?? ''))
  if (!match) return null
  const stormId = match[1].toUpperCase()
  const advisory = String(props.advisnum ?? Number(match[2]))

  const kind = NHC_STORM_TYPES[String(props.stormtype ?? '').toUpperCase()] ?? {
    label: 'Ciclón tropical',
    severity: 'medium',
  }
  const name = String(props.stormname ?? stormId)
  const basin = NHC_BASIN_MAP[String(props.basin ?? stormId.slice(0, 2)).toUpperCase()] ?? 'zona tropical'
  const issued = Number(props.idp_filedate)
  const occurredAt = Number.isFinite(issued) && issued > 0 ? new Date(issued) : new Date()

  return {
    type: 'hurricane' as const,
    source: 'nhc' as const,
    externalId: `nhc-${stormId}`,
    latitude: centroid.latitude,
    longitude: centroid.longitude,
    magnitude: null,
    intensity: null,
    title: `${kind.label} ${name}`,
    description: `${kind.label} ${name} — aviso ${advisory} del NHC (${basin}). Cono de incertidumbre a 5 días.`,
    severity: kind.severity,
    occurredAt,
    rawData: { ...props, stormId, advisory, cone: feature.geometry } as any,
  }
}

/**
 * Guarda un ciclón: la primera vez lo crea (y avisa al motor de alertas); en
 * los avisos siguientes actualiza posición, cono, severidad y `fetchedAt` del
 * mismo evento, sin volver a alertar.
 */
export async function saveNHCEvent(
  prisma: PrismaClient,
  mapped: NonNullable<ReturnType<typeof mapNHC>>,
  hooks?: IngestionHooks
): Promise<'created' | 'updated'> {
  const existing = await prisma.disasterEvent.findFirst({
    where: { externalId: mapped.externalId, source: 'nhc' },
  })
  if (existing) {
    const { externalId, source, ...changes } = mapped
    await prisma.disasterEvent.update({
      where: { id: existing.id },
      data: { ...changes, isActive: true, stale: false, fetchedAt: new Date() },
    })
    return 'updated'
  }
  const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
  await notifyHooks(hooks, created)
  return 'created'
}

// ============================================================================
// IDEAM — Lluvia diaria (Colombia)
// ============================================================================
export interface IDEAMRow {
  codigoestacion: string
  codigosensor: string
  nombreestacion: string
  municipio: string
  departamento: string
  latitud: string
  longitud: string
  mm: string
}

export interface IDEAMStationTotal {
  codigoestacion: string
  codigosensor: string
  nombreestacion: string
  municipio: string
  departamento: string
  latitud: string
  longitud: string
  mm: number
}

const IDEAM_MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

export function ideamCleanStation(name: string): string {
  let s = String(name ?? '')
  // quita todo desde el primer '[' hasta el final
  const idx = s.indexOf('[')
  if (idx >= 0) s = s.slice(0, idx)
  s = s.replace(/\s*-\s*AUT\b/gi, '')
  s = s.trim()
  // capitaliza por palabras (soporta tildes)
  s = s
    .split(/\s+/)
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
  return s
}

function ideamLongDate(day: string): string {
  const [y, m, d] = day.split('-')
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  return `${Number(d)} de ${months[Number(m) - 1]} de ${y}`
}

function ideamShortDate(day: string): string {
  const [, m, d] = day.split('-')
  return `${Number(d)} ${IDEAM_MONTHS_ES[Number(m) - 1]}`
}

export function ideamTargetDay(now: Date): string {
  const colombiaMs = now.getTime() - 5 * 60 * 60 * 1000
  const col = new Date(colombiaMs)
  const hour = col.getUTCHours()
  const base = new Date(Date.UTC(col.getUTCFullYear(), col.getUTCMonth(), col.getUTCDate()))
  const target = new Date(base)
  if (hour >= 8) {
    target.setUTCDate(target.getUTCDate() - 1)
  } else {
    target.setUTCDate(target.getUTCDate() - 2)
  }
  const y = target.getUTCFullYear()
  const m = String(target.getUTCMonth() + 1).padStart(2, '0')
  const d = String(target.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function pickStationTotals(rows: IDEAMRow[]): IDEAMStationTotal[] {
  const byStation = new Map<string, IDEAMStationTotal>()
  for (const r of rows) {
    const mm = Number(r.mm)
    if (!Number.isFinite(mm)) continue
    const candidate: IDEAMStationTotal = {
      codigoestacion: r.codigoestacion,
      codigosensor: r.codigosensor,
      nombreestacion: r.nombreestacion,
      municipio: r.municipio,
      departamento: r.departamento,
      latitud: r.latitud,
      longitud: r.longitud,
      mm,
    }
    const prev = byStation.get(r.codigoestacion)
    if (!prev || mm > prev.mm) {
      byStation.set(r.codigoestacion, candidate)
    }
  }
  return [...byStation.values()]
}

export function mapIDEAMRain(row: IDEAMStationTotal, day: string, now: Date = new Date()) {
  const mm = row.mm
  const minMm = config.IDEAM_RAIN_MIN_MM
  if (!Number.isFinite(mm)) return null
  if (mm < minMm) return null
  if (mm > 500) return null

  const lat = Number(row.latitud)
  const lon = Number(row.longitud)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  if (isNullIsland({ latitude: lat, longitude: lon })) return null

  let severity = 'medium'
  let label = 'Lluvia fuerte'
  if (mm >= 200) { severity = 'critical'; label = 'Lluvia extrema' }
  else if (mm >= 100) { severity = 'high'; label = 'Lluvia muy fuerte' }

  const stationClean = ideamCleanStation(row.nombreestacion)

  // ¿el día consultado es "ayer" en Colombia?
  const nowColombia = new Date(now.getTime() - 5 * 60 * 60 * 1000)
  const todayCol = new Date(Date.UTC(nowColombia.getUTCFullYear(), nowColombia.getUTCMonth(), nowColombia.getUTCDate()))
  const yesterdayCol = new Date(todayCol)
  yesterdayCol.setUTCDate(yesterdayCol.getUTCDate() - 1)
  const yStr = `${yesterdayCol.getUTCFullYear()}-${String(yesterdayCol.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterdayCol.getUTCDate()).padStart(2, '0')}`
  const isYesterday = day === yStr

  const mmRounded = Math.round(mm)
  const mmOne = mm.toFixed(1)

  const titleDate = ideamShortDate(day)
  const title = isYesterday
    ? `${label} ayer (${titleDate}): ${mmRounded} mm en ${stationClean}, ${row.municipio} (${row.departamento})`
    : `${label} el ${titleDate}: ${mmRounded} mm en ${stationClean}, ${row.municipio} (${row.departamento})`

  const description = `Lluvia acumulada el ${ideamLongDate(day)} en la estación ${row.nombreestacion.trim()} del IDEAM: ${mmOne} mm. Dato diario publicado con un día de retraso; no es una alerta temprana.`

  const occurredAt = new Date(`${day}T23:59:00-05:00`)

  return {
    type: 'rain' as const,
    source: 'ideam' as const,
    externalId: `ideam-rain-${row.codigoestacion}-${day}`,
    latitude: lat,
    longitude: lon,
    magnitude: Number(mmOne),
    intensity: null,
    title,
    description,
    severity,
    occurredAt,
    rawData: {
      estacion: row.nombreestacion,
      codigoestacion: row.codigoestacion,
      codigosensor: row.codigosensor,
      mm,
      dia: day,
      municipio: row.municipio,
      departamento: row.departamento,
      fuente: 'IDEAM (datos.gov.co)',
    } as any,
  }
}

export async function fetchIDEAMRain(day: string): Promise<IDEAMRow[]> {
  const url = config.IDEAM_RAIN_URL
  const minMm = config.IDEAM_RAIN_MIN_MM
  const params = new URLSearchParams()
  params.set('$select', 'codigoestacion,codigosensor,nombreestacion,municipio,departamento,latitud,longitud,sum(valorobservado) as mm')
  params.set('$where', `fechaobservacion between '${day}T00:00:00' and '${day}T23:59:59'`)
  params.set('$group', 'codigoestacion,codigosensor,nombreestacion,municipio,departamento,latitud,longitud')
  params.set('$having', `sum(valorobservado) >= ${minMm}`)
  params.set('$limit', '5000')
  const res = await axios.get<IDEAMRow[]>(`${url}?${params.toString()}`, {
    timeout: config.IDEAM_TIMEOUT,
    headers: { 'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)' },
  })
  return res.data ?? []
}

// Throttle: consultar como máximo una vez por hora.
let lastIDEAMSuccessAt: number | null = null
export function _resetIDEAMThrottle() { lastIDEAMSuccessAt = null }
export function _getLastIDEAMSuccessAt() { return lastIDEAMSuccessAt }
export function _setLastIDEAMSuccessAt(v: number | null) { lastIDEAMSuccessAt = v }

// ============================================================================
// Ingestion cycle
// ============================================================================
let ingestCounter = 0

/**
 * Un evento se marca `stale` cuando su fetchedAt supera este umbral.
 * Evita servir (y alertar) sobre un evento que no se ha re-ingestado. (C1/C2)
 */
const STALE_AFTER_MS = (config.STALE_AFTER_MINUTES ?? 30) * 60_000

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

/**
 * Marca como `stale` los eventos activos cuyo `fetchedAt` supera el umbral.
 * (C1/C2 freshness: un falso "sin eventos" es peor que una caída.)
 */
export async function runFreshnessSweep(
  prisma: PrismaClient,
  staleAfterMs?: number
): Promise<number> {
  const cutoff = new Date(Date.now() - (staleAfterMs ?? STALE_AFTER_MS))
  try {
    const { count } = await prisma.disasterEvent.updateMany({
      where: { stale: false, fetchedAt: { lt: cutoff }, isActive: true },
      data: { stale: true },
    })
    logger.info(`[INGESTION] Freshness sweep — ${count} evento(s) marcados stale`)
    return count
  } catch (err) {
    logger.warn({ err }, '[INGESTION] Freshness sweep falló')
    return 0
  }
}

export async function runIngestion(
  prisma: PrismaClient,
  hooks?: IngestionHooks
): Promise<{ usgs: number; noaa: number; eonet: number; gdacs: number; meteoalarm: number; nhc: number; ideam: number }> {
  const cycle = ++ingestCounter
  const startedAt = Date.now()
  logger.info(`[INGESTION] Starting cycle #${cycle}`)

  // ---- USGS ----
  let usgsEvents: USGSResponse['features'] = []
  if (canFetch('usgs')) {
    try {
      usgsEvents = await fetchUSGS()
      reportSuccess('usgs')
    } catch (err) {
      reportFailure('usgs', err)
    }
  } else {
    logger.warn('ⓘ [INGESTION] USGS skipped — circuit breaker abierto')
  }
  let usgsInserted = 0
  for (const feature of usgsEvents) {
    try {
      const mapped = mapUSGS(feature)
      if (!mapped) continue
      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'usgs' },
      })
      if (existing) continue // deduplicate
      const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
      usgsInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'usgs' })
      logger.error({ err, eventId: feature.id }, 'Error inserting USGS event')
    }
  }

  // ---- NOAA ----
  let noaaEvents: NOAAAlert[] = []
  if (canFetch('noaa')) {
    try {
      noaaEvents = await fetchNOAA()
      reportSuccess('noaa')
    } catch (err) {
      reportFailure('noaa', err)
    }
  } else {
    logger.warn('ⓘ [INGESTION] NOAA skipped — circuit breaker abierto')
  }
  let noaaInserted = 0
  for (const alert of noaaEvents) {
    try {
      const mapped = mapNOAA(alert)
      if (!mapped) continue
      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'noaa' },
      })
      if (existing) continue
      const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
      noaaInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'noaa' })
      logger.error({ err, alertId: alert.id }, 'Error inserting NOAA event')
    }
  }

  // ---- NASA EONET ----
  let eonetEvents: EONETEvent[] = []
  if (canFetch('nasa_eonet')) {
    try {
      eonetEvents = await fetchEONET()
      reportSuccess('nasa_eonet')
    } catch (err) {
      reportFailure('nasa_eonet', err)
    }
  } else {
    logger.warn('ⓘ [INGESTION] EONET skipped — circuit breaker abierto')
  }
  let eonetInserted = 0
  for (const event of eonetEvents) {
    try {
      const mapped = mapEONET(event)
      if (!mapped) continue
      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'nasa_eonet' },
      })
      if (existing) continue // deduplicate
      const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
      eonetInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'nasa_eonet' })
      logger.error({ err, eventId: event.id }, 'Error inserting EONET event')
    }
  }

  // ---- GDACS ----
  let gdacsEvents: GDACSFeature[] = []
  if (canFetch('gdacs')) {
    try {
      gdacsEvents = await fetchGDACS()
      reportSuccess('gdacs')
    } catch (err) {
      reportFailure('gdacs', err)
    }
  } else {
    logger.warn('ⓘ [INGESTION] GDACS skipped — circuit breaker abierto')
  }
  let gdacsInserted = 0
  for (const feature of gdacsEvents) {
    try {
      const mapped = mapGDACS(feature)
      if (!mapped) continue
      const existing = await prisma.disasterEvent.findFirst({
        where: { externalId: mapped.externalId, source: 'gdacs' },
      })
      if (existing) continue // deduplicate
      const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
      gdacsInserted++
      await notifyHooks(hooks, created)
    } catch (err) {
      ingestionErrorsTotal.inc({ source: 'gdacs' })
      logger.error({ err, eventId: feature.properties?.eventid }, 'Error inserting GDACS event')
    }
  }

  // ---- Meteoalarm (Europe/APAC) ----
  let meteoalarmInserted = 0
  if (config.METEOALARM_ENABLED === 'true' && canFetch('meteoalarm')) {
    let meteoalarmEvents: MeteoalarmFeature[] = []
    try {
      meteoalarmEvents = await fetchMeteoalarm()
      reportSuccess('meteoalarm')
    } catch (err) {
      reportFailure('meteoalarm', err)
    }
    for (const feature of meteoalarmEvents) {
      try {
        const mapped = mapMeteoalarm(feature)
        if (!mapped) continue
        const existing = await prisma.disasterEvent.findFirst({
          where: { externalId: mapped.externalId, source: 'meteoalarm' },
        })
        if (existing) continue
        const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
        meteoalarmInserted++
        await notifyHooks(hooks, created)
      } catch (err) {
        ingestionErrorsTotal.inc({ source: 'meteoalarm' })
        logger.error({ err, eventId: feature.onset }, 'Error inserting Meteoalarm event')
      }
    }
  } else if (config.METEOALARM_ENABLED === 'true') {
    logger.warn('ⓘ [INGESTION] Meteoalarm skipped — circuit breaker abierto')
  }

  // ---- NHC Forecast Cone (A4) ----
  let nhcInserted = 0
  if (config.NHC_ENABLED === 'true' && canFetch('nhc')) {
    let nhcEvents: NHCResponseFeature[] = []
    try {
      nhcEvents = await fetchNHC()
      reportSuccess('nhc')
    } catch (err) {
      reportFailure('nhc', err)
    }
    for (const feature of nhcEvents) {
      try {
        const mapped = mapNHC(feature)
        if (!mapped) continue
        if ((await saveNHCEvent(prisma, mapped, hooks)) === 'created') nhcInserted++
      } catch (err) {
        ingestionErrorsTotal.inc({ source: 'nhc' })
        logger.error({ err }, '[INGESTION] Error inserting NHC event')
      }
    }
  } else if (config.NHC_ENABLED === 'true') {
    logger.warn('ⓘ [INGESTION] NHC skipped — circuit breaker abierto')
  }

  // ---- IDEAM: lluvia diaria (Colombia) ----
  let ideamInserted = 0
  if (config.IDEAM_ENABLED === 'true' && canFetch('ideam')) {
    // Throttle: como máximo una consulta por hora.
    const nowMs = Date.now()
    if (lastIDEAMSuccessAt !== null && nowMs - lastIDEAMSuccessAt < 60 * 60 * 1000) {
      logger.debug('[INGESTION] IDEAM omitido — aún no pasó 1 h desde la última consulta exitosa')
    } else {
      let ideamRows: IDEAMRow[] = []
      try {
        const day = ideamTargetDay(new Date())
        ideamRows = await fetchIDEAMRain(day)
        const totals = pickStationTotals(ideamRows)
        // map con el día
        const mappedList = totals
          .map((t) => mapIDEAMRain(t, day))
          .filter((m): m is NonNullable<typeof m> => m !== null)
        reportSuccess('ideam')
        lastIDEAMSuccessAt = Date.now()
        for (const mapped of mappedList) {
          try {
            const existing = await prisma.disasterEvent.findFirst({
              where: { externalId: mapped.externalId, source: 'ideam' },
            })
            if (existing) continue
            const created = await prisma.disasterEvent.create({ data: { ...mapped, isActive: true } })
            ideamInserted++
            await notifyHooks(hooks, created)
          } catch (err) {
            ingestionErrorsTotal.inc({ source: 'ideam' })
            logger.error({ err, eventId: mapped.externalId }, 'Error inserting IDEAM event')
          }
        }
      } catch (err) {
        reportFailure('ideam', err)
      }
    }
  } else if (config.IDEAM_ENABLED === 'true') {
    logger.warn('ⓘ [INGESTION] IDEAM skipped — circuit breaker abierto')
  }

  const total = usgsInserted + noaaInserted + eonetInserted + gdacsInserted + meteoalarmInserted + nhcInserted + ideamInserted

  // ---- métricas ----
  if (usgsInserted > 0) ingestionEventsTotal.inc({ source: 'usgs' }, usgsInserted)
  if (noaaInserted > 0) ingestionEventsTotal.inc({ source: 'noaa' }, noaaInserted)
  if (eonetInserted > 0) ingestionEventsTotal.inc({ source: 'nasa_eonet' }, eonetInserted)
  if (gdacsInserted > 0) ingestionEventsTotal.inc({ source: 'gdacs' }, gdacsInserted)
  if (meteoalarmInserted > 0) ingestionEventsTotal.inc({ source: 'meteoalarm' }, meteoalarmInserted)
  if (nhcInserted > 0) ingestionEventsTotal.inc({ source: 'nhc' }, nhcInserted)
  if (ideamInserted > 0) ingestionEventsTotal.inc({ source: 'ideam' }, ideamInserted)
  ingestionCycleDuration.set((Date.now() - startedAt) / 1000)
  markIngestionSuccess()

  try {
    activeEventsGauge.set(await prisma.disasterEvent.count({ where: { isActive: true } }))
  } catch (err) {
    logger.warn({ err }, 'ⓘ [INGESTION] No se pudo contar los eventos activos')
  }

  logger.info(
    `[INGESTION] Cycle #${cycle} complete — USGS: ${usgsInserted} new, ` +
      `NOAA: ${noaaInserted} new, EONET: ${eonetInserted} new, GDACS: ${gdacsInserted} new, ` +
      `METEOALARM: ${meteoalarmInserted} new, NHC: ${nhcInserted} new, IDEAM: ${ideamInserted} new (${total} total)`
  )
  return { usgs: usgsInserted, noaa: noaaInserted, eonet: eonetInserted, gdacs: gdacsInserted, meteoalarm: meteoalarmInserted, nhc: nhcInserted, ideam: ideamInserted }
}

// Schedule: every INGEST_INTERVAL ms
export function startIngestScheduler(prisma: PrismaClient, hooks?: IngestionHooks) {
  const enabledFlags = {
    usgs: config.USGS_ENABLED === 'true',
    noaa: config.NOAA_ENABLED === 'true',
    eonet: config.EONET_ENABLED === 'true',
    gdacs: config.GDACS_ENABLED === 'true',
    meteoalarm: config.METEOALARM_ENABLED === 'true',
    nhc: config.NHC_ENABLED === 'true',
    ideam: config.IDEAM_ENABLED === 'true',
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
  void runFreshnessSweep(prisma).catch(err => logger.warn({ err }, '[INGESTION] Freshness sweep falló'))

  setInterval(() => {
    runIngestion(prisma, hooks).catch(err => logger.error({ err }, 'Scheduled ingestion failed'))
    void runFreshnessSweep(prisma).catch(err => logger.warn({ err }, '[INGESTION] Freshness sweep falló'))
  }, intervalMs)

  logger.info(`[INGESTION] Scheduler started — enabled: ${enabledList}, interval: ${intervalMs / 1000}s`)
}
