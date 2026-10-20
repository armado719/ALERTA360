/**
 * Análisis de población expuesta (B1).
 *
 * `estimateExposedPopulation` suma la población de las ciudades cuyo centro
 * está dentro del radio de un evento. Reutiliza `haversineKm` (geo.ts). El
 * dataset es compacto (Top-15 áreas urbanas densas del mundo) — la lista puede
 * ampliarse sin tocar la lógica. Es on-the-fly: no requiere columna nueva en el
 * schema y se recomputa al servir el evento.
 */
import { haversineKm } from '../../utils/geo'

export interface City {
  name: string
  country: string
  latitude: number
  longitude: number
  population: number
}

/** Top-15 áreas urbanas densas del mundo (fuente: UN/World Urbanization Prospects 2022). */
export const CITIES: City[] = [
  { name: 'Tokyo', country: 'JP', latitude: 35.6762, longitude: 139.6503, population: 37_400_066 },
  { name: 'Delhi', country: 'IN', latitude: 28.6139, longitude: 77.209, population: 31_800_000 },
  { name: 'Shanghai', country: 'CN', latitude: 31.2304, longitude: 121.4737, population: 29_800_000 },
  { name: 'São Paulo', country: 'BR', latitude: -23.5505, longitude: -46.6333, population: 22_000_000 },
  { name: 'Ciudad de México', country: 'MX', latitude: 19.4326, longitude: -99.1332, population: 22_300_000 },
  { name: 'El Cairo', country: 'EG', latitude: 30.0444, longitude: 31.2357, population: 21_300_000 },
  { name: 'Dhaka', country: 'BD', latitude: 23.8103, longitude: 90.4125, population: 21_000_000 },
  { name: 'Mumbai', country: 'IN', latitude: 19.076, longitude: 72.8777, population: 20_700_000 },
  { name: 'Pekín', country: 'CN', latitude: 39.9042, longitude: 116.4074, population: 21_500_000 },
  { name: 'Osaka', country: 'JP', latitude: 34.6937, longitude: 135.5023, population: 19_300_000 },
  { name: 'Nueva York', country: 'US', latitude: 40.7128, longitude: -74.006, population: 18_800_000 },
  { name: 'Karachi', country: 'PK', latitude: 24.8607, longitude: 67.0099, population: 16_100_000 },
  { name: 'Buenos Aires', country: 'AR', latitude: -34.6037, longitude: -58.3816, population: 15_600_000 },
  { name: 'Kolkata', country: 'IN', latitude: 22.5726, longitude: 88.3639, population: 15_200_000 },
  { name: 'Islamabad', country: 'PK', latitude: 33.6844, longitude: 73.0479, population: 1_300_000 },
]

/**
 * Población total expuesta (ciudades dentro de `radiusKm`).
 * @param lat  latitud del evento
 * @param lon  longitud del evento
 * @param radiusKm radio de influencia (default 50 km)
 */
export function estimateExposedPopulation(lat: number, lon: number, radiusKm = 50): number {
  const event = { latitude: lat, longitude: lon }
  let total = 0
  for (const city of CITIES) {
    if (haversineKm({ latitude: city.latitude, longitude: city.longitude }, event) <= radiusKm) {
      total += city.population
    }
  }
  return total
}
