/**
 * Contrato compartido por todos los adaptadores de fuentes externas.
 *
 * Cada fuente (USGS, NOAA, EONET, GDACS) produce un `MappedEvent` que
 * el motor de ingesta inserta como `DisasterEvent`. Mantener este
 * contrato en un solo lugar evita que cada adaptador inventing su propio
 * formato de coordenadas o severidad.
 */
import type { Severity } from '../../utils/geo'

export type Source = 'usgs' | 'noaa' | 'nasa_eonet' | 'gdacs'

/** Un evento normalizado listo para insertar en la BD. */
export interface MappedEvent {
  externalId: string
  source: Source
  type: string
  severity: Severity
  latitude: number
  longitude: number
  /** Magnitud real (sismo M5.2, viento 130 kts…). null para no aplica. */
  magnitude?: number | null
  intensity?: number | null
  /** Título legible en la UI. */
  title: string
  /** Texto informativo de 1–2 frases. */
  description: string
  /** Fecha del evento (del feed, no de inserción). */
  occurredAt: Date
  /** Metadata sin procesar: link, source interno, magnitude unit… */
  rawData: Record<string, unknown>
}

/**
 * Coordenada "0,0" (golfo de Guinea) que usan algunas fuentes cuando no
 * conocen la posición real (p. ej. alertas NOAA que solo traen texto).
 * No debe generar notificaciones.
 */
export function isNullIsland(lat: number, lon: number): boolean {
  return Math.abs(lat) < 0.01 && Math.abs(lon) < 0.01
}

/**
 * Valida que un par de coordenadas sea utilizables.
 *
 * - No NaN
 * - Latitud entre -90 y +90
 * - Longitud entre -180 y +180
 * - No (0,0)
 */
export function isValidPoint(lat: number, lon: number): boolean {
  return (
    !Number.isNaN(lat) &&
    !Number.isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180 &&
    !isNullIsland(lat, lon)
  )
}