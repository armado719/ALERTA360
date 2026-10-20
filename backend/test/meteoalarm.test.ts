import { describe, it, expect } from 'vitest'
import { mapMeteoalarm } from '../src/services/ingestion'
import type { MeteoalarmFeature as _M } from '../src/services/ingestion'

type MeteoalarmFeature = _M

const fixture: MeteoalarmFeature = {
  type: 'flood_alert',
  severity: 'Severe',
  area: 'Cundinamarca',
  city: 'Bogotá',
  lat: 4.6,
  lon: -74.0,
  onset: '2026-10-19T08:00:00Z',
  expires: '2026-10-20T08:00:00Z',
  title: 'Alerta de lluvia',
  description: 'lluvia intensa',
}

describe('mapMeteoalarm (A3)', () => {
  it('mapea un aviso Europa a la estructura ALERTA360', () => {
    const mapped = mapMeteoalarm(fixture)
    expect(mapped).not.toBeNull()
    expect(mapped!.source).toBe('meteoalarm')
    expect(mapped!.type).toBe('flood')
    expect(mapped!.severity).toBe('high') // 'Severe' → high
    expect(mapped!.latitude).toBe(4.6)
    expect(mapped!.longitude).toBe(-74.0)
    expect(mapped!.title).toBe('Alerta de lluvia')
  })

  it('retorna null si faltan coordenadas', () => {
    expect(mapMeteoalarm({ ...fixture, lat: NaN, lon: NaN })).toBeNull()
  })

  it('usa medium como severity default cuando es desconocida', () => {
    expect(mapMeteoalarm({ ...fixture, severity: 'UNKNOWN' })!.severity).toBe('medium')
  })

  it('genera externalId sin colisión para el mismo onset', () => {
    const a = mapMeteoalarm(fixture)
    const b = mapMeteoalarm({ ...fixture, lat: 5.0 })
    expect(a!.externalId).not.toBe(b!.externalId)
  })
})
