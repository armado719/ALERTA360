import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  ideamBulletinDate,
  ideamTitleCase,
  mapIDEAMLandslide,
  parseIDEAMLandslideCsv,
  syncIDEAMLandslides,
  type IDEAMLandslideRow,
} from '../src/services/ingestion'
import { MUNICIPIOS_CO } from '../src/data/municipiosCo'

// Filas reales del boletín OSPA del 2026-10-28 (amenaza_idd.csv) más una
// MODERADA y una BAJA inventadas con el mismo formato.
const HEADER = 'OBJECTID;REGION;DEPARTAMENTO;MUNICIPIO;COD_DANE;TEXTO_AMENAZA;ACUMULADO_TRES;ACUMULADO_DIEZ;DIAS_LLUVIA;FECHA_EJECUCION'
const LINES = [
  '1;ANDINA;ANTIOQUIA;ABEJORRAL;05002;ALTA;47.9;101.3;26.0;28/10/2026',
  '2;ANDINA;ANTIOQUIA;ANORÍ;05040;ALTA;52.9;126.7;22.0;28/10/2026',
  '75;PACÍFICO;NARIÑO;SAN ANDRÉS DE TUMACO;52835;ALTA;81.1;167.1;30.0;28/10/2026',
  '80;AMAZONÍA;PUTUMAYO;MOCOA;86001;MODERADA;28.0;74.6;17.0;28/10/2026',
  '90;PACÍFICO;VALLE DEL CAUCA;BUENAVENTURA;76109;BAJA;12.0;40.0;9.0;28/10/2026',
]
// El archivo real viene en Latin-1 con saltos CRLF.
const csv = (lines: string[] = LINES, header = HEADER) =>
  Buffer.from([header, ...lines, ''].join('\r\n'), 'latin1')

const NOW = new Date('2026-10-28T22:00:00-05:00')

describe('parseIDEAMLandslideCsv (A6 — IDEAM OSPA)', () => {
  it('lee Latin-1 con tildes y eñes, CRLF y línea final vacía', () => {
    const rows = parseIDEAMLandslideCsv(csv())
    expect(rows).toHaveLength(5)
    expect(rows[1].municipio).toBe('ANORÍ')
    expect(rows[2]).toMatchObject({
      departamento: 'NARIÑO',
      municipio: 'SAN ANDRÉS DE TUMACO',
      dane: '52835',
      nivel: 'ALTA',
      acumulado3d: 81.1,
      acumulado10d: 167.1,
      diasLluvia: 30,
      fecha: '2026-10-28',
    })
  })

  it('ubica las columnas por nombre aunque cambien de orden', () => {
    const rows = parseIDEAMLandslideCsv(
      csv(['ALTA;05002;ABEJORRAL;ANTIOQUIA;28/10/2026'], 'TEXTO_AMENAZA;COD_DANE;MUNICIPIO;DEPARTAMENTO;FECHA_EJECUCION')
    )
    expect(rows[0]).toMatchObject({ nivel: 'ALTA', dane: '05002', municipio: 'ABEJORRAL', fecha: '2026-10-28' })
  })

  it('toma como fecha del boletín la de la mayoría de filas', () => {
    // Boletín real del 2026-10-29: 552 filas con el 29/10 y una sola con el 30/10.
    const rows = parseIDEAMLandslideCsv(csv([...LINES.slice(0, 3), '553;ANDINA;CALDAS;AGUADAS;17013;ALTA;30.0;90.0;20.0;29/10/2026']))
    expect(ideamBulletinDate(rows)).toBe('2026-10-28')
    expect(ideamBulletinDate([])).toBe('')
  })

  it('falla si faltan las columnas clave', () => {
    expect(() => parseIDEAMLandslideCsv(csv(['x;y'], 'FOO;BAR'))).toThrow(/COD_DANE/)
  })
})

describe('mapIDEAMLandslide', () => {
  const rows = parseIDEAMLandslideCsv(csv())
  const map = (row: IDEAMLandslideRow, min: 'BAJA' | 'MODERADA' | 'ALTA' = 'MODERADA') =>
    mapIDEAMLandslide(row, MUNICIPIOS_CO, min, NOW)

  it('ALTA → high con título, descripción y externalId del IDEAM', () => {
    const m = map(rows[2])!
    expect(m.type).toBe('landslide')
    expect(m.source).toBe('ideam')
    expect(m.severity).toBe('high')
    expect(m.externalId).toBe('ideam-desliz-52835-alta')
    expect(m.title).toBe('Amenaza alta por deslizamientos en San Andrés de Tumaco (Nariño)')
    expect(m.description).toBe(
      'Lluvia acumulada: 81,1 mm en 3 días y 167,1 mm en 10 días (30 días con lluvia). ' +
        'Boletín del IDEAM del 28 de octubre de 2026. ' +
        'Fuente: IDEAM — Oficina del Servicio de Pronósticos y Alertas (OSPA). ' +
        'Nivel orientativo para prepararse; no es una declaratoria oficial de alerta.'
    )
    expect(m.latitude).toBe(MUNICIPIOS_CO['52835'].lat)
    expect(m.longitude).toBe(MUNICIPIOS_CO['52835'].lon)
    expect(m.magnitude).toBe(167.1)
    expect(m.occurredAt).toEqual(NOW)
  })

  it('MODERADA → medium; BAJA se omite salvo con nivel mínimo BAJA', () => {
    expect(map(rows[3])!.severity).toBe('medium')
    expect(map(rows[4])).toBeNull()
    expect(map(rows[4], 'BAJA')!.severity).toBe('low')
    expect(map(rows[3], 'ALTA')).toBeNull()
  })

  it('descarta DANE inexistente o mal formado y fechas ilegibles', () => {
    expect(map({ ...rows[0], dane: '99999' })).toBeNull()
    expect(map({ ...rows[0], dane: '5002' })).toBeNull()
    expect(map({ ...rows[0], fecha: '' })).toBeNull()
    expect(map({ ...rows[0], nivel: 'NORMAL' })).toBeNull()
  })

  it('pone en formato título los nombres en español', () => {
    expect(ideamTitleCase('VALLE DEL CAUCA')).toBe('Valle del Cauca')
    expect(ideamTitleCase('EL CARMEN DE ATRATO')).toBe('El Carmen de Atrato')
    expect(ideamTitleCase('SAN PEDRO DE LOS MILAGROS')).toBe('San Pedro de los Milagros')
    expect(ideamTitleCase('PIENDAMÓ - TUNÍA')).toBe('Piendamó - Tunía')
  })
})

/** Base en memoria con lo justo que usa syncIDEAMLandslides. */
function memoryPrisma(seed: { externalId: string; isActive?: boolean }[] = []) {
  const rows = seed.map((s, i) => ({ id: `seed-${i}`, source: 'ideam', isActive: true, ...s }))
  let next = 0
  const prisma = {
    disasterEvent: {
      findMany: vi.fn(async ({ where }: any) =>
        rows.filter(
          (r) =>
            r.source === where.source &&
            r.isActive === where.isActive &&
            r.externalId.startsWith(where.externalId.startsWith)
        )
      ),
      findFirst: vi.fn(async ({ where }: any) =>
        rows.find((r) => r.externalId === where.externalId && r.source === where.source) ?? null
      ),
      create: vi.fn(async ({ data }: any) => {
        const row = { id: `evt-${++next}`, ...data }
        rows.push(row)
        return row
      }),
      update: vi.fn(async ({ where, data }: any) => {
        const row = rows.find((r) => r.id === where.id)!
        Object.assign(row, data)
        return row
      }),
      updateMany: vi.fn(async ({ where, data }: any) => {
        const hit = rows.filter((r) => where.id.in.includes(r.id))
        hit.forEach((r) => Object.assign(r, data))
        return { count: hit.length }
      }),
    },
  }
  return { prisma: prisma as unknown as PrismaClient, rows, mock: prisma }
}

const active = (rows: { externalId: string; isActive: boolean }[]) =>
  rows.filter((r) => r.isActive).map((r) => r.externalId).sort()

describe('syncIDEAMLandslides (ciclo de vida)', () => {
  const mapAll = (lines: string[]) =>
    parseIDEAMLandslideCsv(csv(lines))
      .map((r) => mapIDEAMLandslide(r, MUNICIPIOS_CO, 'MODERADA', NOW))
      .filter((m): m is NonNullable<typeof m> => m !== null)

  it('el primer ciclo crea y avisa; el segundo con los mismos datos actualiza sin avisar', async () => {
    const { prisma, mock } = memoryPrisma()
    const onEventCreated = vi.fn()

    const first = await syncIDEAMLandslides(prisma, mapAll(LINES), '2026-10-28', { onEventCreated }, NOW)
    expect(first).toEqual({ created: 4, updated: 0, deactivated: 0 })
    expect(onEventCreated).toHaveBeenCalledTimes(4)

    onEventCreated.mockClear()
    const second = await syncIDEAMLandslides(prisma, mapAll(LINES), '2026-10-28', { onEventCreated }, NOW)
    expect(second).toEqual({ created: 0, updated: 4, deactivated: 0 })
    expect(onEventCreated).not.toHaveBeenCalled()
    expect(mock.disasterEvent.create).toHaveBeenCalledTimes(4)
  })

  it('MODERADA → ALTA crea el nuevo, avisa y desactiva el de MODERADA', async () => {
    const { prisma, rows } = memoryPrisma([{ externalId: 'ideam-desliz-86001-moderada' }])
    const onEventCreated = vi.fn()
    const r = await syncIDEAMLandslides(
      prisma,
      mapAll(['80;AMAZONÍA;PUTUMAYO;MOCOA;86001;ALTA;60.0;140.0;20.0;28/10/2026']),
      '2026-10-28',
      { onEventCreated },
      NOW
    )
    expect(r).toEqual({ created: 1, updated: 0, deactivated: 1 })
    expect(onEventCreated).toHaveBeenCalledTimes(1)
    expect(active(rows)).toEqual(['ideam-desliz-86001-alta'])
  })

  it('ALTA → MODERADA crea el nuevo SIN avisar y desactiva el de ALTA', async () => {
    const { prisma, rows } = memoryPrisma([{ externalId: 'ideam-desliz-86001-alta' }])
    const onEventCreated = vi.fn()
    const r = await syncIDEAMLandslides(prisma, mapAll([LINES[3]]), '2026-10-28', { onEventCreated }, NOW)
    expect(r).toEqual({ created: 1, updated: 0, deactivated: 1 })
    expect(onEventCreated).not.toHaveBeenCalled()
    expect(active(rows)).toEqual(['ideam-desliz-86001-moderada'])
  })

  it('desactiva el municipio que sale del boletín y no toca la lluvia del IDEAM', async () => {
    const { prisma, rows } = memoryPrisma([
      { externalId: 'ideam-desliz-05002-alta' },
      { externalId: 'ideam-desliz-05040-alta' },
      { externalId: 'ideam-rain-0015017030-2026-10-27' },
    ])
    const r = await syncIDEAMLandslides(prisma, mapAll([LINES[0]]), '2026-10-28', undefined, NOW)
    expect(r).toEqual({ created: 0, updated: 1, deactivated: 1 })
    expect(active(rows)).toEqual(['ideam-desliz-05002-alta', 'ideam-rain-0015017030-2026-10-27'])
  })

  it('reactiva sin avisar un municipio que vuelve con el mismo nivel', async () => {
    const { prisma, rows } = memoryPrisma([{ externalId: 'ideam-desliz-05002-alta', isActive: false }])
    const onEventCreated = vi.fn()
    const r = await syncIDEAMLandslides(prisma, mapAll([LINES[0]]), '2026-10-28', { onEventCreated }, NOW)
    expect(r).toEqual({ created: 0, updated: 1, deactivated: 0 })
    expect(onEventCreated).not.toHaveBeenCalled()
    expect(active(rows)).toEqual(['ideam-desliz-05002-alta'])
  })

  it('con boletín vacío o de hace más de 3 días no crea, no actualiza ni desactiva', async () => {
    const { prisma, rows, mock } = memoryPrisma([{ externalId: 'ideam-desliz-05002-alta' }])

    expect(await syncIDEAMLandslides(prisma, [], '2026-10-28', undefined, NOW)).toEqual({
      created: 0,
      updated: 0,
      deactivated: 0,
    })
    expect(await syncIDEAMLandslides(prisma, mapAll([LINES[1]]), '2026-10-24', undefined, NOW)).toEqual({
      created: 0,
      updated: 0,
      deactivated: 0,
    })
    expect(mock.disasterEvent.create).not.toHaveBeenCalled()
    expect(mock.disasterEvent.updateMany).not.toHaveBeenCalled()
    expect(active(rows)).toEqual(['ideam-desliz-05002-alta'])
  })
})

describe('municipiosCo (DIVIPOLA)', () => {
  it('tiene los 1122 municipios con DANE de 5 dígitos y coordenadas en Colombia', () => {
    const entries = Object.entries(MUNICIPIOS_CO)
    expect(entries).toHaveLength(1122)
    for (const [dane, m] of entries) {
      expect(dane).toMatch(/^\d{5}$/)
      expect(m.lat).toBeGreaterThan(-5)
      expect(m.lat).toBeLessThan(14)
      expect(m.lon).toBeGreaterThan(-82)
      expect(m.lon).toBeLessThan(-66)
    }
  })
})
