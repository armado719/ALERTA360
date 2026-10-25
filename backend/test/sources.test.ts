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
  // Forma real de la API actual (geteventlist/SEARCH), tifón del 2026-10-25
  function gdacsFeature(properties: Partial<GDACSFeature['properties']> = {}, geometry?: any): GDACSFeature {
    return {
      type: 'Feature',
      properties: {
        eventid: 1001343,
        eventtype: 'TC',
        alertlevel: 'Green',
        name: 'Tropical Cyclone IN-FA-26',
        description: 'Tropical Cyclone IN-FA-26',
        fromdate: '2026-10-25T06:00:00',
        country: 'Marshall Islands',
        iscurrent: 'true',
        severitydata: {
          severity: 231.48,
          severitytext: 'Hurricane/Typhoon > 74 mph (maximum wind speed of 231 km/h)',
          severityunit: 'km/h',
        },
        url: { report: 'https://www.gdacs.org/report.aspx?eventid=1001343&eventtype=TC' },
        ...properties,
      },
      geometry: geometry ?? { type: 'Point', coordinates: [163.9, 13.4] }, // [lon, lat]
    }
  }

  it('mapea un ciclón real (TC) a storm con los campos de la API actual', () => {
    const mapped = mapGDACS(gdacsFeature())
    expect(mapped).not.toBeNull()
    expect(mapped!.type).toBe('storm')
    expect(mapped!.source).toBe('gdacs')
    expect(mapped!.externalId).toBe('gdacs-TC-1001343')
    expect(mapped!.latitude).toBe(13.4)
    expect(mapped!.longitude).toBe(163.9)
    expect(mapped!.title).toBe('Tropical Cyclone IN-FA-26')
    expect(mapped!.description).toContain('231 km/h')
    expect(mapped!.magnitude).toBe(231.48)
  })

  it('interpreta fromdate (sin zona horaria) como UTC', () => {
    expect(mapGDACS(gdacsFeature())!.occurredAt.toISOString()).toBe('2026-10-25T06:00:00.000Z')
    const invalida = mapGDACS(gdacsFeature({ fromdate: 'no-es-fecha' }))
    expect(Number.isNaN(invalida!.occurredAt.getTime())).toBe(false)
  })

  it('el externalId distingue el tipo (eventid solo es único por tipo)', () => {
    const tc = mapGDACS(gdacsFeature({ eventid: 1000, eventtype: 'TC' }))!
    const wf = mapGDACS(gdacsFeature({ eventid: 1000, eventtype: 'WF' }))!
    expect(tc.externalId).not.toBe(wf.externalId)
  })

  it('descarta eventos ya terminados (iscurrent "false")', () => {
    expect(mapGDACS(gdacsFeature({ iscurrent: 'false' }))).toBeNull()
  })

  it('intercambia coordenadas de [lon,lat] a [lat,lon]', () => {
    const mapped = mapGDACS(gdacsFeature({}, { type: 'Point', coordinates: [-3.7, 40.4] }))
    expect(mapped!.latitude).toBe(40.4)
    expect(mapped!.longitude).toBe(-3.7)
  })

  it('filtra sismos (EQ) — los cubre USGS — y tipos desconocidos', () => {
    expect(mapGDACS(gdacsFeature({ eventtype: 'EQ' }))).toBeNull()
    expect(mapGDACS(gdacsFeature({ eventtype: 'XX' }))).toBeNull()
  })

  it('filtra eventos sin geometría', () => {
    expect(mapGDACS(gdacsFeature({}, { type: 'Point', coordinates: [] }))).toBeNull()
  })

  it('severidad por alertlevel: Green → low, Orange → medium, Red → critical', () => {
    expect(mapGDACS(gdacsFeature({ alertlevel: 'Green' }))!.severity).toBe('low')
    expect(mapGDACS(gdacsFeature({ alertlevel: 'Orange' }))!.severity).toBe('medium')
    expect(mapGDACS(gdacsFeature({ alertlevel: 'Red' }))!.severity).toBe('critical')
    expect(mapGDACS(gdacsFeature({ alertlevel: '' }))!.severity).toBe('medium')
  })

  it('guarda alertlevel, eventtype, país y enlace al reporte en rawData', () => {
    const { rawData } = mapGDACS(gdacsFeature({ alertlevel: 'Orange' }))!
    expect(rawData.alertlevel).toBe('Orange')
    expect(rawData.eventtype).toBe('TC')
    expect(rawData.country).toBe('Marshall Islands')
    expect(rawData.report).toContain('eventid=1001343')
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
        // Fechas como las publica el NWS (no existe `starts`)
        sent: '2026-10-18T09:55:00-05:00',
        effective: '2026-10-18T09:55:00-05:00',
        onset: '2026-10-18T10:00:00-05:00',
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
        sent: '2026-10-18T09:55:00-05:00',
        effective: '2026-10-18T09:55:00-05:00',
        onset: '2026-10-18T10:00:00-05:00',
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

  it('toma occurredAt de onset, y si falta, de effective o sent', () => {
    expect(mapNOAA(noaaAlert())!.occurredAt.toISOString()).toBe('2026-10-18T15:00:00.000Z')
    const sinOnset = mapNOAA(noaaAlert({ properties: { onset: null } as any }))
    expect(sinOnset!.occurredAt.toISOString()).toBe('2026-10-18T14:55:00.000Z')
  })

  it('nunca devuelve una fecha inválida (antes tumbaba el insert)', () => {
    const mapped = mapNOAA(
      noaaAlert({ properties: { onset: 'no-es-fecha', effective: null, sent: undefined } as any })
    )
    expect(Number.isNaN(mapped!.occurredAt.getTime())).toBe(false)
  })
})
