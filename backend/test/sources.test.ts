import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  canFetch,
  getSourceStatus,
  reportFailure,
  reportSuccess,
  getAllSourceHealth,
  registerSource,
  type SourceStatus,
} from '../src/services/sources/health'
import { mapGDACS, mapNOAA, type GDACSFeature, type NOAAAlert } from '../src/services/ingestion'

// ============================================================================
// Helpers
// ============================================================================
// El circuit breaker usa un estado global por nombre de fuente. Para aislar
// tests usamos nombres únicos por cada uno, evitando interferencias.

// ============================================================================
// Circuit breaker (health.ts)
// ============================================================================
describe('circuit breaker (health.ts)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('canFetch', () => {
    it('retorna true en estado unknown (nunca fetchado)', () => {
      registerSource('circuit-test-1')
      expect(canFetch('circuit-test-1')).toBe(true)
    })

    it('retorna true después de un fetch exitoso', () => {
      const src = 'circuit-test-2'
      registerSource(src)
      reportSuccess(src)
      expect(canFetch(src)).toBe(true)
    })

    it('retorna false cuando el circuito está abierto (3 fallos + cooldown)', () => {
      const src = 'circuit-test-3'
      registerSource(src)
      reportFailure(src)
      reportFailure(src)
      reportFailure(src) // 3º fallo → down
      expect(getSourceStatus(src)).toBe('down')
      expect(canFetch(src)).toBe(false) // cooldown de 5 min no expirado
    })

    it('retorna true tras expirar el cooldown (modo semi-abierto → degraded)', () => {
      const src = 'circuit-test-4'
      registerSource(src)
      reportFailure(src)
      reportFailure(src)
      reportFailure(src) // 3º → down
      expect(getSourceStatus(src)).toBe('down')
      expect(canFetch(src)).toBe(false) // cooldown de 5 min no expirado

      // Avanzamos el reloj 6 min: el cooldown expira y el circuito se
      // vuelve semi-abierto (degraded), permitiendo un nuevo intento.
      vi.advanceTimersByTime(6 * 60 * 1000)
      expect(canFetch(src)).toBe(true)
      expect(getSourceStatus(src)).toBe('degraded')
    })
  })

  describe('reportSuccess', () => {
    it('resetea el contador de fallos y marca ok', () => {
      const src = 'circuit-test-5'
      registerSource(src)
      reportFailure(src)
      expect(getSourceStatus(src)).toBe('degraded')
      reportSuccess(src)
      expect(getSourceStatus(src)).toBe('ok')
    })
  })

  describe('reportFailure', () => {
    it('2 fallos → degraded (no abre el circuito)', () => {
      const src = 'circuit-test-6'
      registerSource(src)
      reportFailure(src)
      reportFailure(src)
      expect(getSourceStatus(src)).toBe('degraded')
    })

    it('3 fallos consecutivos → down (circuito abierto)', () => {
      const src = 'circuit-test-7'
      registerSource(src)
      reportFailure(src)
      reportFailure(src)
      reportFailure(src)
      expect(getSourceStatus(src)).toBe('down')
      expect(canFetch(src)).toBe(false)
    })
  })

  describe('getAllSourceHealth', () => {
    it('incluye fuentes registradas aunque no hayan sido fetchadas', () => {
      registerSource('health-test-unknown')
      const health = getAllSourceHealth()
      const entry = health.sources.find(s => s.source === 'health-test-unknown')
      expect(entry).toBeDefined()
      expect(entry!.status).toBe('unknown')
      expect(health.complete).toBe(false) // hay al menos una no-ok
    })
  })
})

// ============================================================================
// mapGDACS (ingestion.ts)
// ============================================================================
describe('mapGDACS', () => {
  function gdacsFeature(overrides: Partial<GDACSFeature> = {}): GDACSFeature {
    return {
      type: 'Feature',
      properties: {
        eventid: 'GDACS_001',
        eventtype: 'TC',
        alertlevel: 'Orange',
        name: 'Cyclone near Mumbai',
        date: '2026-10-17T12:00:00Z',
        description: 'Severe cyclonic storm',
        severity: 65,
      },
      geometry: {
        type: 'Point',
        coordinates: [72.8, 18.9], // [lon, lat] → Mumbai
      },
      ...overrides,
    }
  }

  it('mapea correctamente un ciclón (TC) a storm', () => {
    const mapped = mapGDACS(gdacsFeature())
    expect(mapped).not.toBeNull()
    expect(mapped!.type).toBe('storm')
    expect(mapped!.source).toBe('gdacs')
    expect(mapped!.externalId).toBe('GDACS_001')
    expect(mapped!.latitude).toBe(18.9)
    expect(mapped!.longitude).toBe(72.8)
    expect(mapped!.title).toBe('Cyclone near Mumbai')
  })

  it('intercambia coordenadas de [lon,lat] a [lat,lon]', () => {
    const mapped = mapGDACS(
      gdacsFeature({
        geometry: { type: 'Point', coordinates: [-3.7, 40.4] },
      })
    )
    expect(mapped!.latitude).toBe(40.4)
    expect(mapped!.longitude).toBe(-3.7)
  })

  it('filtra sismos (EQ) — los cubre USGS', () => {
    expect(mapGDACS(gdacsFeature({ properties: { eventid: 'G1', eventtype: 'EQ', alertlevel: 'Red', name: 'Quake', date: '2026-10-17T12:00:00Z' } }))).toBeNull()
  })

  it('filtra tipos desconocidos', () => {
    expect(mapGDACS(gdacsFeature({ properties: { eventid: 'G1', eventtype: 'XX', alertlevel: 'Green', name: 'Unknown', date: '2026-10-17T12:00:00Z' } }))).toBeNull()
  })

  it('filtra eventos sin geometría', () => {
    expect(
      mapGDACS(
        gdacsFeature({
          geometry: { type: 'Point', coordinates: [] as unknown as [number, number] },
        })
      )
    ).toBeNull()
  })

  it('usa severidad por alertlevel: Green → low, Orange → medium', () => {
    const green = mapGDACS(gdacsFeature({ properties: { eventid: 'G1', eventtype: 'FL', alertlevel: 'Green', name: 'Flood', date: '2026-10-17T12:00:00Z' } }))
    expect(green!.severity).toBe('low')

    const orange = mapGDACS(gdacsFeature({ properties: { eventid: 'G2', eventtype: 'TC', alertlevel: 'Orange', name: 'Cyclone', date: '2026-10-17T12:00:00Z' } }))
    expect(orange!.severity).toBe('medium')
  })

  it('usa severidad numérica como fallback cuando no hay alertlevel', () => {
    // Sin alertlevel → usa mapGDACSSeverity → 'medium' (default para TC)
    const mapped = mapGDACS(
      gdacsFeature({
        properties: {
          eventid: 'G3',
          eventtype: 'TC',
          alertlevel: '',
          name: 'Storm',
          date: '2026-10-17T12:00:00Z',
          severity: 70,
        },
      })
    )
    expect(mapped).not.toBeNull()
  })

  it('guarda alertlevel y eventtype en rawData', () => {
    const mapped = mapGDACS(gdacsFeature())
    expect(mapped!.rawData.alertlevel).toBe('Orange')
    expect(mapped!.rawData.eventtype).toBe('TC')
  })
})

// ============================================================================
// mapNOAA — geometría real (Point / Polygon / descarte sin geometría)
// ============================================================================
describe('mapNOAA', () => {
  function noaaAlert(overrides: Partial<NOAAAlert> = {}): NOAAAlert {
    return {
      id: 'ALERT-001',
      geometry: {
        type: 'Point',
        coordinates: [-74.0721, 4.711], // [lon, lat] → Bogotá
      },
      properties: {
        id: 'ALERT-001',
        event: 'Flood Warning',
        headline: 'Flood Warning issued',
        description: 'River flooding is imminent',
        severity: 'Severe',
        starts: '2026-10-18T10:00:00Z',
        sender: 'US-WS',
        areaDesc: 'Bogota',
      },
      ...overrides,
      // Merge profundo de properties para que overrides parciales de properties
      // no borren los campos por defecto.
      properties: {
        id: 'ALERT-001',
        event: 'Flood Warning',
        headline: 'Flood Warning issued',
        description: 'River flooding is imminent',
        severity: 'Severe',
        starts: '2026-10-18T10:00:00Z',
        sender: 'US-WS',
        areaDesc: 'Bogota',
        ...overrides.properties,
      },
    }
  }

  it('mapea Point correctamente: [lon,lat] → lat/lon', () => {
    const mapped = mapNOAA(noaaAlert())
    expect(mapped).not.toBeNull()
    expect(mapped!.latitude).toBe(4.711)
    expect(mapped!.longitude).toBe(-74.0721)
    expect(mapped!.type).toBe('flood')
    expect(mapped!.severity).toBe('high')
    expect(mapped!.source).toBe('noaa')
  })

  it('mapea Polygon a su centroide', () => {
    // Polígono cuadrado: (0,0), (2,0), (2,2), (0,2) → centroide (1,1)
    const mapped = mapNOAA(
      noaaAlert({
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [0, 0],
            [2, 0],
            [2, 2],
            [0, 2],
            [0, 0],
          ]],
        },
      })
    )
    expect(mapped).not.toBeNull()
    expect(mapped!.latitude).toBeCloseTo(1, 3)
    expect(mapped!.longitude).toBeCloseTo(1, 3)
  })

  it('descarta alertas sin geometría (retorna null)', () => {
    expect(mapNOAA(noaaAlert({ geometry: null }))).toBeNull()
  })

  it('descarta coordenadas (0,0) — null island', () => {
    expect(
      mapNOAA(
        noaaAlert({
          geometry: { type: 'Point', coordinates: [0, 0] },
        })
      )
    ).toBeNull()
  })

  it('descarta coordenadas NaN', () => {
    expect(
      mapNOAA(
        noaaAlert({
          geometry: { type: 'Point', coordinates: [NaN, NaN] },
        })
      )
    ).toBeNull()
  })

  it('mapea severidad Extreme → critical', () => {
    const mapped = mapNOAA(noaaAlert({ properties: { severity: 'Extreme' } }))
    expect(mapped!.severity).toBe('critical')
  })
})
