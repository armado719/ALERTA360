import { describe, expect, it } from 'vitest'
import {
  mapEONET,
  type EONETEvent,
} from '../src/services/ingestion'

// ============================================================================
// Helpers
// ============================================================================

function eonetEvent(overrides: Partial<EONETEvent> = {}): EONETEvent {
  return {
    id: 'EONET_12345',
    title: 'Flood in Colombia',
    description: 'Heavy rainfall caused river overflow',
    link: 'https://eonet.gsfc.nasa.gov/api/v3/events/EONET_12345',
    closed: null,
    categories: [{ id: 'floods', title: 'Floods' }],
    sources: [{ id: 'NASA', url: 'https://example.com' }],
    geometry: [
      {
        date: '2026-10-17T12:00:00Z',
        type: 'Point',
        coordinates: [-74.0721, 4.711], // [lon, lat] → Bogotá
      },
    ],
    ...overrides,
  }
}

// ============================================================================
// mapEONET
// ============================================================================

describe('mapEONET', () => {
  it('mapea correctamente una alerta de inundación', () => {
    const mapped = mapEONET(eonetEvent())
    expect(mapped).not.toBeNull()
    expect(mapped!.type).toBe('flood')
    expect(mapped!.source).toBe('nasa_eonet')
    expect(mapped!.externalId).toBe('EONET_12345')
    expect(mapped!.latitude).toBe(4.711)
    expect(mapped!.longitude).toBe(-74.0721)
    expect(mapped!.severity).toBe('medium')
    // isActive se setea en el loop de inserción, no en el mapper
  })

  it('intercambia coordenadas de [lon,lat] a [lat,lon]', () => {
    // EONET usa GeoJSON: [longitude, latitude]
    const mapped = mapEONET(
      eonetEvent({
        geometry: [{ date: '2026-10-17T10:00:00Z', type: 'Point', coordinates: [-3.7, 40.4] }],
      })
    )
    expect(mapped!.latitude).toBe(40.4)
    expect(mapped!.longitude).toBe(-3.7)
  })

  it('usa la geometría más reciente (última del array)', () => {
    // Una tormenta que se mueve: las geometrías van en orden cronológico
    const mapped = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          { date: '2026-10-17T00:00:00Z', type: 'Point', coordinates: [-80.0, 5.0] },
          { date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-81.0, 6.0] },
          { date: '2026-10-18T00:00:00Z', type: 'Point', coordinates: [-82.5, 7.0] },
        ],
      })
    )
    // Debe usar la última: lat 7.0, lon -82.5
    expect(mapped!.latitude).toBe(7.0)
    expect(mapped!.longitude).toBe(-82.5)
  })

  it('mapea todas las categorías EONET conocidas', () => {
    const cases: Array<[string, string]> = [
      ['floods', 'flood'],
      ['landslides', 'landslide'],
      ['severeStorms', 'storm'],
      ['volcanoes', 'volcanic'],
      ['wildfires', 'wildfire'],
      ['drought', 'drought'],
      ['tempExtremes', 'heatwave'],
      ['earthquakes', 'earthquake'],
      ['dustHaze', 'dust'],
      ['snow', 'snow'],
    ]
    for (const [categoryId, expectedType] of cases) {
      const mapped = mapEONET(
        eonetEvent({
          categories: [{ id: categoryId, title: '' }],
          title: `${categoryId} event`,
        })
      )
      expect(mapped).not.toBeNull()
      expect(mapped!.type).toBe(expectedType)
      expect(mapped!.source).toBe('nasa_eonet')
    }
  })

  it('filtra categorías que no están en el mapa (waterColor, manmade)', () => {
    expect(mapEONET(eonetEvent({ categories: [{ id: 'waterColor', title: 'Water Color' }] }))).toBeNull()
    expect(mapEONET(eonetEvent({ categories: [{ id: 'manmade', title: 'Manmade' }] }))).toBeNull()
    expect(mapEONET(eonetEvent({ categories: [{ id: 'seaLakeIce', title: 'Sea and Lake Ice' }] }))).toBeNull()
  })

  it('filtra eventos sin geometría', () => {
    expect(mapEONET(eonetEvent({ geometry: [] }))).toBeNull()
  })

  it('filtra eventos con geometría vacía', () => {
    const event = eonetEvent()
    event.geometry = []
    expect(mapEONET(event)).toBeNull()
  })

  it('filtra eventos sin categorías', () => {
    expect(mapEONET(eonetEvent({ categories: [] }))).toBeNull()
  })

  it('usa el título del evento como title', () => {
    const mapped = mapEONET(eonetEvent({ title: 'Inundación en Sincelejo' }))
    expect(mapped!.title).toBe('Inundación en Sincelejo')
  })

  it('usa un title genérico cuando falta el título', () => {
    const mapped = mapEONET(eonetEvent({ title: '' }))
    // mapEONET uses `event.title || ...` so empty string is falsy → fallback
    expect(mapped!.title).toBe('flood event')
  })

  it('pone la descripción del evento o construye una', () => {
    // Con descripción
    const withDesc = mapEONET(eonetEvent({ description: 'River overflowed banks' }))
    expect(withDesc!.description).toBe('River overflowed banks')

    // Sin descripción (null) → construye una
    const withoutDesc = mapEONET(eonetEvent({ description: null }))
    expect(withoutDesc!.description).toContain('Flood in Colombia')
    expect(withoutDesc!.description).toContain('NASA')
  })

  it('guarda el nombre de la fuente en rawData', () => {
    const withSources = mapEONET(
      eonetEvent({
        sources: [{ id: 'JTWC', url: 'https://www.metoc.navy.mil' }],
        title: 'Huracán prueba',
        description: null,
      })
    )
    expect(withSources!.rawData.source).toBe('JTWC')
    expect(withSources!.description).toContain('JTWC')
  })

  it('pone "NASA EONET" como source en rawData cuando no hay sources', () => {
    const noSources = mapEONET(eonetEvent({ sources: [], description: null }))
    expect(noSources!.rawData.source).toBe('NASA EONET')
    expect(noSources!.description).toContain('NASA EONET')
  })

  it('parsea occurredAt desde la geometría más reciente', () => {
    const mapped = mapEONET(
      eonetEvent({
        geometry: [
          { date: '2026-10-15T08:00:00Z', type: 'Point', coordinates: [-74.0, 4.7] },
          { date: '2026-10-17T14:30:00Z', type: 'Point', coordinates: [-75.0, 5.0] },
        ],
      })
    )
    expect(mapped!.occurredAt).toEqual(new Date('2026-10-17T14:30:00Z'))
  })

  it('guarda magnitudeValue y magnitudeUnit en rawData', () => {
    const mapped = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          {
            date: '2026-10-17T12:00:00Z',
            type: 'Point',
            coordinates: [-101.3, 15.2],
            magnitudeValue: 130,
            magnitudeUnit: 'kts',
          },
        ],
      })
    )
    expect(mapped!.rawData.magnitudeValue).toBe(130)
    expect(mapped!.rawData.magnitudeUnit).toBe('kts')
  })

  it('solo guarda magnitude para terremotos (null para otros tipos)', () => {
    // Tormenta con magnitud: magnitude es null, pero va en rawData
    const storm = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          {
            date: '2026-10-17T12:00:00Z',
            type: 'Point',
            coordinates: [-101.3, 15.2],
            magnitudeValue: 130,
            magnitudeUnit: 'kts',
          },
        ],
      })
    )
    expect(storm!.magnitude).toBeNull()
    expect(storm!.rawData.magnitudeValue).toBe(130)

    // Terremoto: severity 'low' (USGS se encarga de la magnitud real)
    const quake = mapEONET(
      eonetEvent({
        categories: [{ id: 'earthquakes', title: 'Earthquakes' }],
        geometry: [{ date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-74.0, 4.7] }],
      })
    )
    expect(quake!.type).toBe('earthquake')
    expect(quake!.severity).toBe('low')
    // EONET no reporta magnitud para sismos, así que intensity usa 5 por defecto
    expect(quake!.intensity).toBe(5)
  })

  it('enlaza el evento a la página de EONET', () => {
    const mapped = mapEONET(eonetEvent())
    expect(mapped!.rawData.link).toBe('https://eonet.gsfc.nasa.gov/api/v3/events/EONET_12345')
  })
})

// ============================================================================
// mapEONETSeverity — lógica de severidad
// ============================================================================

describe('mapEONETSeverity', () => {
  // Tests indirectos a través de mapEONET para storms con wind speed
  it('tormenta con viento >= 64 kts → critical', () => {
    const mapped = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          { date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-100, 15], magnitudeValue: 130, magnitudeUnit: 'kts' },
        ],
      })
    )
    expect(mapped!.severity).toBe('critical')
  })

  it('tormenta con viento 34-63 kts → high', () => {
    const mapped = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          { date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-100, 15], magnitudeValue: 50, magnitudeUnit: 'kts' },
        ],
      })
    )
    expect(mapped!.severity).toBe('high')
  })

  it('tormenta con viento < 34 kts → medium', () => {
    const mapped = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          { date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-100, 15], magnitudeValue: 25, magnitudeUnit: 'kts' },
        ],
      })
    )
    expect(mapped!.severity).toBe('medium')
  })

  it('tormenta sin magnitud → medium (default)', () => {
    const mapped = mapEONET(
      eonetEvent({
        categories: [{ id: 'severeStorms', title: 'Severe Storms' }],
        geometry: [
          { date: '2026-10-17T12:00:00Z', type: 'Point', coordinates: [-100, 15] },
        ],
      })
    )
    expect(mapped!.severity).toBe('medium')
  })

  it('deslizamiento → high (siempre, sin importar magnitud)', () => {
    const mapped = mapEONET(eonetEvent({ categories: [{ id: 'landslides', title: 'Landslides' }] }))
    expect(mapped!.severity).toBe('high')
  })

  it('incendio → medium', () => {
    const mapped = mapEONET(eonetEvent({ categories: [{ id: 'wildfires', title: 'Wildfires' }] }))
    expect(mapped!.severity).toBe('medium')
  })

  it('inundación → medium', () => {
    const mapped = mapEONET(eonetEvent({ categories: [{ id: 'floods', title: 'Floods' }] }))
    expect(mapped!.severity).toBe('medium')
  })

  it('volcán → medium', () => {
    const mapped = mapEONET(eonetEvent({ categories: [{ id: 'volcanoes', title: 'Volcanoes' }] }))
    expect(mapped!.severity).toBe('medium')
  })

  it('sequía → low', () => {
    const mapped = mapEONET(eonetEvent({ categories: [{ id: 'drought', title: 'Drought' }] }))
    expect(mapped!.severity).toBe('low')
  })
})
