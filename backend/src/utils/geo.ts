/**
 * Utilidades geográficas del motor de alertas.
 *
 * Se mantienen sin dependencias y sin Prisma a propósito: son la parte más
 * fácil de testear y la que decide si un usuario recibe o no una alerta.
 */

/** Radio medio terrestre en kilómetros (WGS-84). */
export const EARTH_RADIUS_KM = 6371.0088

export interface Coordinates {
  latitude: number
  longitude: number
}

export const SEVERITIES = ['low', 'medium', 'high', 'critical'] as const
export type Severity = (typeof SEVERITIES)[number]

export const SEVERITY_RANK: Record<Severity, number> = {
  low: 1,
  medium: 2,
  high: 3,
  critical: 4,
}

export function isSeverity(value: string): value is Severity {
  return (SEVERITIES as readonly string[]).includes(value)
}

/** Rango numérico de una severidad; los valores desconocidos cuentan como `low`. */
export function severityRank(value: string): number {
  return isSeverity(value) ? SEVERITY_RANK[value] : SEVERITY_RANK.low
}

/** Devuelve la severidad más alta de las dos. */
export function highestSeverity(a: string, b: string): Severity {
  return severityRank(a) >= severityRank(b) ? (isSeverity(a) ? a : 'low') : (isSeverity(b) ? b : 'low')
}

const toRad = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * Distancia en kilómetros entre dos coordenadas (fórmula del semiverseno).
 *
 * Precisión suficiente para radios de decenas o cientos de km y mucho más
 * barata que PostGIS. Para distancias > 1.000 km el error frente a Vincenty
 * es despreciable a efectos de alertas.
 */
export function haversineKm(a: Coordinates, b: Coordinates): number {
  const dLat = toRad(b.latitude - a.latitude)
  const dLon = toRad(b.longitude - a.longitude)
  const lat1 = toRad(a.latitude)
  const lat2 = toRad(b.latitude)

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/**
 * Coordenada "0,0" (golfo de Guinea) que usan algunas fuentes cuando no
 * conocen la posición real — p. ej. alertas NOAA que solo traen texto.
 * No debe generar notificaciones.
 */
export function isNullIsland({ latitude, longitude }: Coordinates): boolean {
  return Math.abs(latitude) < 0.01 && Math.abs(longitude) < 0.01
}

/**
 * Calcula el centroide geométrico (teorema del polígono) de un anillo
 * GeoJSON (array de [lon, lat]). Usado para alertas NOAA con `Polygon`.
 *
 * Fórmula del centroide geométrico — preciso para polígonos convexos
 * y no convexos. NO es el centroide de los vértices (incorrecto).
 */
export function polygonCentroid(coords: [number, number][]): Coordinates {
  let signedArea = 0
  let cx = 0
  let cy = 0

  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length
    const [xi, yi] = coords[i] // lon, lat
    const [xj, yj] = coords[j]
    const cross = xi * yj - xj * yi
    signedArea += cross
    cx += (xi + xj) * cross
    cy += (yi + yj) * cross
  }

  signedArea *= 0.5
  if (signedArea === 0) return { latitude: coords[0][1], longitude: coords[0][0] }

  cx /= 6 * signedArea
  cy /= 6 * signedArea

  return { latitude: cy, longitude: cx }
}

/**
 * Ray-casting: ¿el punto está dentro del polígono?
 * `polygon` es un anillo GeoJSON de [lon, lat]. O(n) sin deps.
 */
export function pointInPolygon(point: Coordinates, polygon: [number, number][]): boolean {
  const { latitude, longitude } = point
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i] // lon, lat
    const [xj, yj] = polygon[j]
    const intersect =
      yi > latitude !== yj > latitude &&
      longitude < ((xj - xi) * (latitude - yi)) / (yj - yi) + xi
    if (intersect) inside = !inside
  }
  return inside
}

/**
 * `pointInPolygon` que maneja polígonos cruzando el antimeridiano (±180°).
 *
 * Detecta cruce cuando max(lon) - min(lon) > 180 y, en ese caso, normaliza
 * las longitudes negativas a [0, 360) antes del ray-casting. Sin cruce delega
 * a `pointInPolygon` (costo ~0 para zonas normales).
 */
export function pointInPolygonAntimeridian(
  point: Coordinates,
  polygon: [number, number][]
): boolean {
  const lons = polygon.map(([lon]) => lon)
  const crossesAntimeridian = Math.max(...lons) - Math.min(...lons) > 180
  if (!crossesAntimeridian) return pointInPolygon(point, polygon)

  const shiftedPolygon = polygon.map(([lon, lat]) => [
    lon < 0 ? lon + 360 : lon,
    lat,
  ]) as [number, number][]
  const shiftedPoint = {
    latitude: point.latitude,
    longitude: point.longitude < 0 ? point.longitude + 360 : point.longitude,
  }
  return pointInPolygon(shiftedPoint, shiftedPolygon)
}
