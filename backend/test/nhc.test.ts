import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { mapNHC, saveNHCEvent } from '../src/services/ingestion'

// Atributos con la forma real de la capa 7 de NHC_tropical_weather_summary
// (copiados de una respuesta del 2026-10-25). Ojo: no traen viento.
const vanceProps = {
  advdate: '900 AM CST Sun Oct 25 2026',
  advisnum: '17',
  basin: 'EP',
  binnumber: 'EP2',
  fcstprd: 120,
  idp_filedate: 1792944250000,
  idp_source: 'ep222026-017_5day_pgn',
  objectid: 49,
  stormname: 'Vance',
  stormnum: 22,
  stormtype: 'HU',
}

// Anillo cuadrado [lon, lat] con centroide en (25.6, -80.2)
const cone = {
  type: 'Polygon',
  coordinates: [[
    [-80.3, 25.5],
    [-80.1, 25.5],
    [-80.1, 25.7],
    [-80.3, 25.7],
    [-80.3, 25.5],
  ]],
}

const feature = (properties: Record<string, unknown>, geometry: any = cone) => ({
  type: 'Feature',
  geometry,
  properties,
})

describe('mapNHC (A4 — NHC Forecast Cone)', () => {
  it('mapea un cono real a un evento hurricane anclado al centroide', () => {
    const mapped = mapNHC(feature(vanceProps))
    expect(mapped).not.toBeNull()
    expect(mapped!.source).toBe('nhc')
    expect(mapped!.type).toBe('hurricane')
    expect(mapped!.externalId).toBe('nhc-EP222026')
    expect(mapped!.title).toBe('Huracán Vance')
    expect(mapped!.severity).toBe('high')
    expect(mapped!.description).toContain('aviso 17')
    expect(mapped!.description).toContain('Pacífico oriental')
    expect(mapped!.occurredAt.getTime()).toBe(1792944250000)
    expect(mapped!.latitude).toBeCloseTo(25.6, 1)
    expect(mapped!.longitude).toBeCloseTo(-80.2, 1)
    expect(mapped!.rawData?.cone).toEqual(cone)
  })

  it('el mismo ciclón conserva el externalId entre avisos (no se duplica)', () => {
    const aviso17 = mapNHC(feature(vanceProps))!
    const aviso18 = mapNHC(feature({ ...vanceProps, advisnum: '18', idp_source: 'ep222026-018_5day_pgn' }))!
    expect(aviso18.externalId).toBe(aviso17.externalId)
  })

  it('descarta el feature si no hay un identificador estable de tormenta', () => {
    const { idp_source, ...sinId } = vanceProps
    expect(mapNHC(feature(sinId))).toBeNull()
    expect(mapNHC(feature({ ...vanceProps, idp_source: 'cono-sin-formato' }))).toBeNull()
  })

  it('la severidad sale del tipo de tormenta', () => {
    const severity = (stormtype: string) => mapNHC(feature({ ...vanceProps, stormtype }))!.severity
    expect(severity('TD')).toBe('low')
    expect(severity('TS')).toBe('medium')
    expect(severity('HU')).toBe('high')
    expect(severity('MH')).toBe('critical')
    expect(mapNHC(feature({ ...vanceProps, stormtype: 'TD', stormname: 'Three-C' }))!.title).toBe(
      'Depresión tropical Three-C'
    )
  })

  it('retorna null sin geometría Polygon y descarta null-island', () => {
    expect(mapNHC(feature(vanceProps, null))).toBeNull()
    const nullIsland = {
      type: 'Polygon',
      coordinates: [[[0, 0], [0.0001, 0], [0.0001, 0.0001], [0, 0.0001], [0, 0]]],
    }
    expect(mapNHC(feature(vanceProps, nullIsland))).toBeNull()
  })
})

describe('saveNHCEvent', () => {
  function fakePrisma(existing: { id: string } | null) {
    const prisma = {
      disasterEvent: {
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(async ({ data }: any) => ({ id: 'evt-new', ...data })),
        update: vi.fn().mockResolvedValue({}),
      },
    }
    return prisma
  }

  it('crea el ciclón la primera vez y avisa al motor de alertas', async () => {
    const prisma = fakePrisma(null)
    const onEventCreated = vi.fn()
    const result = await saveNHCEvent(prisma as unknown as PrismaClient, mapNHC(feature(vanceProps))!, {
      onEventCreated,
    })
    expect(result).toBe('created')
    expect(prisma.disasterEvent.create).toHaveBeenCalledTimes(1)
    expect(onEventCreated).toHaveBeenCalledTimes(1)
  })

  it('en avisos siguientes actualiza el mismo evento sin volver a alertar', async () => {
    const prisma = fakePrisma({ id: 'evt-vance' })
    const onEventCreated = vi.fn()
    const aviso18 = mapNHC(feature({ ...vanceProps, advisnum: '18', stormtype: 'MH' }))!
    const result = await saveNHCEvent(prisma as unknown as PrismaClient, aviso18, { onEventCreated })

    expect(result).toBe('updated')
    expect(prisma.disasterEvent.create).not.toHaveBeenCalled()
    expect(onEventCreated).not.toHaveBeenCalled()
    const { where, data } = prisma.disasterEvent.update.mock.calls[0][0]
    expect(where).toEqual({ id: 'evt-vance' })
    expect(data.severity).toBe('critical')
    expect(data.stale).toBe(false)
    expect(data).not.toHaveProperty('externalId')
  })
})
