import { describe, it, expect } from 'vitest'
import { pointInPolygon, pointInPolygonAntimeridian } from '../src/utils/geo'

// Cuadrado GeoJSON de [lon, lat]: (0,0)→(10,10)
const SQUARE: [number, number][] = [
  [0, 0],
  [0, 10],
  [10, 10],
  [10, 0],
]

// Polígono que cruza el antimeridiano: desde 177°E hasta 178°W (-178)
const FIJI: [number, number][] = [
  [-178, -17],
  [177, -17],
  [177, -18],
  [-178, -18],
]

describe('pointInPolygon (D2 — zonas polígono)', () => {
  it('true punto dentro del cuadrado', () => {
    expect(pointInPolygon({ latitude: 5, longitude: 5 }, SQUARE)).toBe(true)
  })

  it('false punto fuera del cuadrado', () => {
    expect(pointInPolygon({ latitude: 50, longitude: 50 }, SQUARE)).toBe(false)
  })

  it('false en el borde exterior', () => {
    expect(pointInPolygon({ latitude: 11, longitude: 5 }, SQUARE)).toBe(false)
  })
})

describe('pointInPolygonAntimeridian (D2/D3 — cruce ±180°)', () => {
  it('dentro: 179°E (cruza antimeridiano)', () => {
    expect(pointInPolygonAntimeridian({ latitude: -17.5, longitude: 179 }, FIJI)).toBe(true)
  })

  it('dentro: 179°W (-179)', () => {
    expect(pointInPolygonAntimeridian({ latitude: -17.5, longitude: -179 }, FIJI)).toBe(true)
  })

  it('falso: lon 0 está fuera (no cruza al normalizar)', () => {
    expect(pointInPolygonAntimeridian({ latitude: -17.5, longitude: 0 }, FIJI)).toBe(false)
  })

  it('sin cruce delega a pointInPolygon (cuadrado normal)', () => {
    expect(pointInPolygonAntimeridian({ latitude: 5, longitude: 5 }, SQUARE)).toBe(true)
  })
})
