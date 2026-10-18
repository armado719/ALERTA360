import { describe, expect, it } from 'vitest'
import {
  haversineKm,
  highestSeverity,
  isNullIsland,
  isSeverity,
  severityRank,
} from '../src/utils/geo'

describe('haversineKm', () => {
  it('devuelve 0 para el mismo punto', () => {
    const bogota = { latitude: 4.711, longitude: -74.0721 }
    expect(haversineKm(bogota, bogota)).toBe(0)
  })

  it('calcula Bogotá → Medellín (~240 km)', () => {
    const bogota = { latitude: 4.711, longitude: -74.0721 }
    const medellin = { latitude: 6.2442, longitude: -75.5812 }
    const distance = haversineKm(bogota, medellin)
    expect(distance).toBeGreaterThan(230)
    expect(distance).toBeLessThan(250)
  })

  it('calcula distancias intercontinentales', () => {
    const madrid = { latitude: 40.4168, longitude: -3.7038 }
    const nuevaYork = { latitude: 40.7128, longitude: -74.006 }
    const distance = haversineKm(madrid, nuevaYork)
    expect(distance).toBeGreaterThan(5700)
    expect(distance).toBeLessThan(5900)
  })

  it('es simétrica', () => {
    const a = { latitude: -33.45, longitude: -70.66 }
    const b = { latitude: 4.71, longitude: -74.07 }
    expect(haversineKm(a, b)).toBeCloseTo(haversineKm(b, a), 6)
  })
})

describe('severidades', () => {
  it('ordena de low a critical', () => {
    expect(severityRank('low')).toBeLessThan(severityRank('medium'))
    expect(severityRank('medium')).toBeLessThan(severityRank('high'))
    expect(severityRank('high')).toBeLessThan(severityRank('critical'))
  })

  it('trata valores desconocidos como low', () => {
    expect(severityRank('catastrophic')).toBe(severityRank('low'))
  })

  it('valida el tipo', () => {
    expect(isSeverity('critical')).toBe(true)
    expect(isSeverity('critical!')).toBe(false)
  })

  it('devuelve la severidad más alta', () => {
    expect(highestSeverity('medium', 'critical')).toBe('critical')
    expect(highestSeverity('high', 'low')).toBe('high')
  })
})

describe('isNullIsland', () => {
  it('detecta la coordenada 0,0 de las fuentes sin geolocalización', () => {
    expect(isNullIsland({ latitude: 0, longitude: 0 })).toBe(true)
    expect(isNullIsland({ latitude: 0.005, longitude: -0.004 })).toBe(true)
  })

  it('no descarta coordenadas reales cercanas al ecuador', () => {
    const quito = { latitude: -0.18, longitude: -78.47 }
    expect(isNullIsland(quito)).toBe(false)
  })
})
