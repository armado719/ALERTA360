import { describe, expect, it } from 'vitest'
import { mapNHC } from '../src/services/ingestion'

describe('mapNHC (A4 — NHC Forecast Cone)', () => {
  const coneFeature = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      // anillo simple cuadrado cerca de Miami [lon, lat]
      coordinates: [[
        [-80.3, 25.5],
        [-80.1, 25.5],
        [-80.1, 25.7],
        [-80.3, 25.7],
        [-80.3, 25.5],
      ]],
    },
    properties: {
      STORMID: 'AL062026',
      STORMNAME: 'Fiona',
      BASIN: 'Atlantic',
      WIND_MAX_KTS: 80,
      ONDATE: '2026-09-10T12:00:00Z',
      ADATE: '2026091012',
    },
  }

  it('mapea un feature de cono a evento hurricane con polygon en rawData', () => {
    const mapped = mapNHC(coneFeature)
    expect(mapped).not.toBeNull()
    expect(mapped!.source).toBe('nhc')
    expect(mapped!.type).toBe('hurricane')
    expect(mapped!.severity).toBe('high') // 80 kts >= 64
    expect(mapped!.magnitude).toBe(80)
    expect(mapped!.title).toContain('Fiona')
    // centroide del cuadrado 25.6, -80.2
    expect(mapped!.latitude).toBeCloseTo(25.6, 1)
    expect(mapped!.longitude).toBeCloseTo(-80.2, 1)
    // rawData.cone preserva el GeoJSON
    expect(mapped!.rawData?.cone).toEqual(coneFeature.geometry)
  })

  it('retorna null cuando no hay geometría Polygon', () => {
    const noGeom = { type: 'Feature', geometry: null, properties: {} }
    expect(mapNHC(noGeom)).toBeNull()
  })

  it('escala severidad por viento (96+ critical, 34 medium, <34 low)', () => {
    const base = { type: 'Feature', geometry: coneFeature.geometry, properties: { STORMID: 'AL062026', STORMNAME: 'X' } }
    expect(mapNHC({ ...base, properties: { ...base.properties, WIND_MAX_KTS: 100 } })!.severity).toBe('critical')
    expect(mapNHC({ ...base, properties: { ...base.properties, WIND_MAX_KTS: 50 } })!.severity).toBe('medium')
    expect(mapNHC({ ...base, properties: { ...base.properties, WIND_MAX_KTS: 10 } })!.severity).toBe('low')
  })

  it('descarta null-island (coordenadas 0,0 sin sentido)', () => {
    const nullIsland = {
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[
          [0, 0], [0.0001, 0], [0.0001, 0.0001], [0, 0.0001], [0, 0],
        ]],
      },
      properties: { STORMID: 'AL012026', STORMNAME: 'Test' },
    }
    expect(mapNHC(nullIsland)).toBeNull()
  })
})
