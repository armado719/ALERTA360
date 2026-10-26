import { describe, expect, it } from 'vitest'
import {
  ideamCleanStation,
  ideamTargetDay,
  mapIDEAMRain,
  pickStationTotals,
  type IDEAMRow,
  type IDEAMStationTotal,
} from '../src/services/ingestion'

// Fixtures copiados de la respuesta real de datos.gov.co (2026-10-24).
const mincaRow: IDEAMStationTotal = {
  codigoestacion: '0015017030',
  codigosensor: '0240',
  nombreestacion: 'MINCA  - AUT [15017030]',
  municipio: 'Santa Marta',
  departamento: 'Magdalena',
  latitud: '11.142548',
  longitud: '-74.111813',
  mm: 122.2,
}

const rioIroRow: IDEAMStationTotal = {
  codigoestacion: '0054027050',
  codigosensor: '0240',
  nombreestacion: 'RIO IRO - AUT  [54027050]',
  municipio: 'Rio Iró (Santa Rita)',
  departamento: 'Choco',
  latitud: '5.116622222',
  longitud: '-76.665580556',
  mm: 288.6,
}

describe('pickStationTotals', () => {
  it('Armenia con 0240 y 0257 → una sola fila, NO el doble', () => {
    const rows: IDEAMRow[] = [
      {
        codigoestacion: '0026125061', codigosensor: '0240',
        nombreestacion: 'AEROPUERTO EL EDÉN - AUT [26125061]',
        municipio: 'Armenia', departamento: 'Quindío',
        latitud: '4.454722222', longitud: '-75.76638889', mm: '44.272',
      },
      {
        codigoestacion: '0026125061', codigosensor: '0257',
        nombreestacion: 'AEROPUERTO EL EDÉN - AUT [26125061]',
        municipio: 'Armenia', departamento: 'Quindío',
        latitud: '4.454722222', longitud: '-75.76638889', mm: '44.272',
      },
    ]
    const totals = pickStationTotals(rows)
    expect(totals.length).toBe(1)
    expect(totals[0].mm).toBe(44.272)
    expect(totals[0].codigosensor).toBe('0240')
  })
})

describe('mapIDEAMRain umbrales', () => {
  const base: IDEAMStationTotal = { ...mincaRow, mm: 0 }
  function mk(mm: number) { return { ...base, mm } }
  it('49.9 → null', () => {
    expect(mapIDEAMRain(mk(49.9), '2026-10-24')).toBeNull()
  })
  it('50 → medium', () => {
    const m = mapIDEAMRain(mk(50), '2026-10-24')
    expect(m).not.toBeNull()
    expect(m!.severity).toBe('medium')
  })
  it('100 → high', () => {
    const m = mapIDEAMRain(mk(100), '2026-10-24')
    expect(m!.severity).toBe('high')
  })
  it('200 → critical', () => {
    const m = mapIDEAMRain(mk(200), '2026-10-24')
    expect(m!.severity).toBe('critical')
  })
  it('501 → null', () => {
    expect(mapIDEAMRain(mk(501), '2026-10-24')).toBeNull()
  })
})

describe('mapIDEAMRain externalId y título', () => {
  it('externalId estable: misma estación y día → mismo id', () => {
    const a = mapIDEAMRain(mincaRow, '2026-10-24')!
    const b = mapIDEAMRain(mincaRow, '2026-10-24')!
    expect(a.externalId).toBe(b.externalId)
    expect(a.externalId).toBe('ideam-rain-0015017030-2026-10-24')
  })

  it('título con "ayer" cuando el día es ayer', () => {
    const now = new Date('2026-10-25T13:00:00Z') // 08:00 Colombia
    const day = '2026-10-24'
    const m = mapIDEAMRain(mincaRow, day, now)!
    expect(m.title).toContain('ayer')
    expect(m.title).toContain('122 mm')
    expect(m.title).toContain('Minca')
    expect(m.title).toContain('Santa Marta')
    expect(m.title).toContain('Magdalena')
  })

  it('título sin "ayer" cuando el día es anteayer', () => {
    const now = new Date('2026-10-25T13:00:00Z') // 08:00 Colombia
    const day = '2026-10-23'
    const m = mapIDEAMRain(mincaRow, day, now)!
    expect(m.title).not.toContain('ayer')
    expect(m.title).toContain(' el ')
  })

  it('occurredAt = <DIA>T23:59:00-05:00', () => {
    const m = mapIDEAMRain(mincaRow, '2026-10-24')!
    expect(m.occurredAt.toISOString()).toBe('2026-10-25T04:59:00.000Z')
  })
})

describe('mapIDEAMRain coordenadas', () => {
  it('coordenadas inválidas o null-island → null', () => {
    expect(mapIDEAMRain({ ...mincaRow, latitud: 'abc' }, '2026-10-24')).toBeNull()
    expect(mapIDEAMRain({ ...mincaRow, latitud: '0', longitud: '0' }, '2026-10-24')).toBeNull()
    expect(mapIDEAMRain({ ...mincaRow, latitud: '100' }, '2026-10-24')).toBeNull()
  })
})

describe('ideamTargetDay', () => {
  it('a las 07:59 Colombia → anteayer', () => {
    // 07:59 Colombia = 12:59 UTC
    const now = new Date('2026-10-25T12:59:00Z')
    expect(ideamTargetDay(now)).toBe('2026-10-23')
  })
  it('a las 08:00 Colombia → ayer', () => {
    const now = new Date('2026-10-25T13:00:00Z')
    expect(ideamTargetDay(now)).toBe('2026-10-24')
  })
})


describe('ideamCleanStation', () => {
  it('AEROPUERTO EL EDÉN - AUT [26125061] → Aeropuerto El Edén', () => {
    expect(ideamCleanStation('AEROPUERTO EL EDÉN - AUT [26125061]')).toBe('Aeropuerto El Edén')
  })
  it('ESCUELA LA UNIÓN [21201200] → Escuela La Unión', () => {
    expect(ideamCleanStation('ESCUELA LA UNIÓN [21201200]')).toBe('Escuela La Unión')
  })
  it('nombre truncado sin ] → quita desde [', () => {
    expect(ideamCleanStation('AEROPUERTO BARACOA [2502')).toBe('Aeropuerto Baracoa')
  })
})
