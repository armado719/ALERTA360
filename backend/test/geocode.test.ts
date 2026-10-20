import { describe, it, expect } from 'vitest'
import Fastify from 'fastify'
import { config } from '../src/utils/config'
import { registerGeocodeRoutes, mapNominatimResults } from '../src/routes/geocode'

const NOMINATIM_FIXTURE = [
  { display_name: 'Bogotá, Cundinamarca, Colombia', lat: '4.6097', lon: '-74.0818', type: 'city' },
  { display_name: 'Sin coordenadas, Nowhere', lat: 'abc', lon: 'xyz', type: 'unknown' },
]

describe('mapNominatimResults (D1 directa — pura)', () => {
  it('mapea coords de Nominatim a GeocodeResult[] y filtra ítems sin coords', () => {
    const results = mapNominatimResults(NOMINATIM_FIXTURE as any)
    expect(results).toHaveLength(1)
    expect(results[0].name).toBe('Bogotá')
    expect(results[0].lat).toBeCloseTo(4.6097)
    expect(results[0].lon).toBeCloseTo(-74.0818)
  })

  it('retorna [] si no hay items', () => {
    expect(mapNominatimResults([])).toEqual([])
  })
})

describe('GET /geocode/search guard (D1)', () => {
  const prevEnabled = config.GEOCODE_ENABLED

  it('retorna 503 si GEOCODE_ENABLED=false', async () => {
    config.GEOCODE_ENABLED = 'false'
    const app = Fastify()
    await registerGeocodeRoutes(app)
    const res = await app.inject({ method: 'GET', url: '/geocode/search?q=Bogota' })
    expect(res.statusCode).toBe(503)
    config.GEOCODE_ENABLED = prevEnabled
  })
})
