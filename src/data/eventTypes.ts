// Tipos de desastre compartidos entre Dashboard y el Centro de eventos.
// Mantiene una única fuente de verdad para la lista de tipos y su color.

import type { DisasterType } from '../types'

export interface DisasterTypeInfo {
  type: DisasterType
  label: string
  short: string
  color: string
}

export const DISASTER_TYPES: DisasterTypeInfo[] = [
  { type: 'earthquake', label: 'Terremotos', short: 'Sismos', color: '#f87171' },
  { type: 'storm', label: 'Tormentas', short: 'Tormentas', color: '#fb923c' },
  { type: 'flood', label: 'Inundaciones', short: 'Inund.', color: '#38bdf8' },
  { type: 'rain', label: 'Lluvia', short: 'Lluvia', color: '#fbbf24' },
  { type: 'landslide', label: 'Avalanchas', short: 'Avalan.', color: '#a78bfa' },
  { type: 'volcanic', label: 'Volcánicos', short: 'Volcán', color: '#f472b6' },
  { type: 'hurricane', label: 'Huracanes', short: 'Huracán', color: '#ef4444' },
  { type: 'wildfire', label: 'Incendios', short: 'Incendios', color: '#f97316' },
  { type: 'drought', label: 'Sequía', short: 'Sequía', color: '#eab308' },
  { type: 'heatwave', label: 'Ola de calor', short: 'Calor', color: '#dc2626' },
  { type: 'snow', label: 'Nieve', short: 'Nieve', color: '#60a5fa' },
  { type: 'dust', label: 'Dust/Haze', short: 'Aire', color: '#94a3b8' },
]

export const ALL_DISASTER_TYPE_VALUES: string[] = DISASTER_TYPES.map((d) => d.type)

export function typeColor(type: string): string {
  return DISASTER_TYPES.find((d) => d.type === type)?.color ?? '#94a3b8'
}

export function typeLabel(type: string): string {
  return DISASTER_TYPES.find((d) => d.type === type)?.label ?? type
}

export const SOURCE_LABELS: Record<string, string> = {
  usgs: 'USGS',
  noaa: 'NOAA',
  nasa_eonet: 'NASA EONET',
  gdacs: 'GDACS',
  meteoalarm: 'Meteoalarm',
  nhc: 'NHC',
  ideam: 'IDEAM',
}

export const ALL_SOURCES: string[] = ['usgs', 'noaa', 'nasa_eonet', 'gdacs', 'meteoalarm', 'nhc', 'ideam']

export const SEVERITIES = ['critical', 'high', 'medium', 'low'] as const
export const SEVERITY_LABELS: Record<string, string> = {
  critical: 'Crítica',
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
}

export function severityRank(s: string): number {
  return ({ critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>)[s] ?? 0
}
