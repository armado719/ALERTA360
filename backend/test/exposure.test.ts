import { describe, it, expect } from 'vitest'
import { estimateExposedPopulation, CITIES } from '../src/services/analysis/exposure'

describe('estimateExposedPopulation (B1)', () => {
  const TOKYO = { lat: 35.6762, lon: 139.6503, pop: 37_400_066 }

  it('expone la población de ciudades dentro del radio', () => {
    // Un evento justo en Tokio → Tokio está a 0 km
    expect(estimateExposedPopulation(TOKYO.lat, TOKYO.lon)).toBe(TOKYO.pop)
  })

  it('retorna 0 si no hay ciudades dentro del radio', () => {
    // Punto medio del océano Pacífico (sin ciudades cercanas)
    expect(estimateExposedPopulation(0, -150, 50)).toBe(0)
  })

  it('respeta el radio configurable', () => {
    // Tokyo → Osaka ~405 km: fuera de 50 km, dentro de 500 km
    const EXPOSURE_50 = estimateExposedPopulation(TOKYO.lat, TOKYO.lon, 50)
    const EXPOSURE_500 = estimateExposedPopulation(TOKYO.lat, TOKYO.lon, 500)
    expect(EXPOSURE_500).toBeGreaterThan(EXPOSURE_50)
    // A 1 km sólo Tokio (centro exacto)
    expect(estimateExposedPopulation(TOKYO.lat, TOKYO.lon, 1)).toBe(TOKYO.pop)
  })

  it('el dataset incluye las 15 ciudades esperadas', () => {
    expect(CITIES).toHaveLength(15)
    expect(CITIES.find((c) => c.name === 'Tokyo')?.population).toBe(TOKYO.pop)
  })
})
