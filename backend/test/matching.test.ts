import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import {
  channelsFor,
  findMatches,
  matchCandidate,
  matchEvent,
  type MatchCandidate,
  type MatchableEvent,
  type MatchPreferences,
} from '../src/services/matching'
import type { AlertHub } from '../src/realtime/hub'

const BOGOTA = { id: 'loc-bogota', latitude: 4.711, longitude: -74.0721, radiusKm: 50 }
const MEDELLIN = { id: 'loc-medellin', latitude: 6.2442, longitude: -75.5812, radiusKm: 50 }

const prefs: MatchPreferences = {
  alertRadiusKm: 50,
  disasterTypes: ['earthquake', 'flood'],
  minSeverity: 'low',
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
}

const event = (overrides: Partial<MatchableEvent> = {}): MatchableEvent => ({
  id: 'evt-1',
  type: 'earthquake',
  latitude: 4.72,
  longitude: -74.08,
  severity: 'medium',
  isActive: true,
  occurredAt: new Date('2026-10-18T02:00:00Z'),
  title: 'Sismo en Bogotá',
  ...overrides,
})

const candidate = (overrides: Partial<MatchCandidate> = {}): MatchCandidate => ({
  userId: 'user-1',
  preferences: { ...prefs },
  locations: [{ ...BOGOTA }],
  ...overrides,
})

describe('channelsFor', () => {
  it('incluye los canales habilitados', () => {
    expect(channelsFor(prefs, 'medium')).toEqual(['push', 'email'])
  })

  it('solo manda SMS a partir de high', () => {
    const withSms = { ...prefs, smsEnabled: true }
    expect(channelsFor(withSms, 'medium')).toEqual(['push', 'email'])
    expect(channelsFor(withSms, 'high')).toEqual(['push', 'email', 'sms'])
    expect(channelsFor(withSms, 'critical')).toContain('sms')
  })

  it('no devuelve canales si todos están apagados', () => {
    const off = { ...prefs, pushEnabled: false, emailEnabled: false, smsEnabled: false }
    expect(channelsFor(off, 'critical')).toEqual([])
  })
})

describe('matchCandidate', () => {
  it('acepta un evento dentro del radio', () => {
    const result = matchCandidate(event(), candidate())
    expect(result).not.toBeNull()
    expect(result?.userId).toBe('user-1')
    expect(result?.locationId).toBe('loc-bogota')
    expect(result?.distanceKm).toBeLessThan(5)
    expect(result?.channels).toEqual(['push', 'email'])
  })

  it('rechaza si el evento cae fuera del radio', () => {
    const medellinOnly = candidate({ locations: [{ ...MEDELLIN }] })
    expect(matchCandidate(event(), medellinOnly)).toBeNull()
  })

  it('descarta tipos que el usuario no sigue', () => {
    expect(matchCandidate(event({ type: 'volcanic' }), candidate())).toBeNull()
  })

  it('respeta la severidad mínima', () => {
    const strict = candidate({ preferences: { ...prefs, minSeverity: 'high' } })
    expect(matchCandidate(event({ severity: 'medium' }), strict)).toBeNull()
    expect(matchCandidate(event({ severity: 'high' }), strict)).not.toBeNull()
  })

  it('ignora eventos inactivos', () => {
    expect(matchCandidate(event({ isActive: false }), candidate())).toBeNull()
  })

  it('ignora la coordenada 0,0 de fuentes sin geolocalización', () => {
    const noGeo = event({ latitude: 0, longitude: 0 })
    expect(matchCandidate(noGeo, candidate())).toBeNull()
  })

  it('usa la ubicación más cercana cuando varias entran en el radio', () => {
    const both = candidate({ locations: [{ ...BOGOTA }, { ...BOGOTA, id: 'loc-cerca', latitude: 4.712 }] })
    const result = matchCandidate(event(), both)
    expect(result?.locationId).toBe('loc-cerca')
    // ~1,2 km frente a los ~1,6 km de la otra ubicación
    expect(result!.distanceKm).toBeLessThan(1.5)
  })

  it('usa alertRadiusKm cuando la ubicación no define radio', () => {
    const noRadius = candidate({ locations: [{ ...BOGOTA, radiusKm: 0 }] })
    expect(matchCandidate(event(), noRadius)).not.toBeNull()

    const tiny = candidate({
      locations: [{ ...BOGOTA, radiusKm: 0 }],
      preferences: { ...prefs, alertRadiusKm: 0 },
    })
    expect(matchCandidate(event(), tiny)).toBeNull()
  })

  it('no genera match si el usuario no tiene ubicaciones', () => {
    expect(matchCandidate(event(), candidate({ locations: [] }))).toBeNull()
  })

  it('acepta un evento dentro de un polígono (D2)', () => {
    const POLY: [number, number][] = [[-75, 4], [-73, 4], [-73, 5], [-75, 5]]
    const polyLoc = { ...BOGOTA, id: 'loc-poly', shape: 'polygon', polygon: { coordinates: [POLY] } }
    const result = matchCandidate(event(), candidate({ locations: [polyLoc] }))
    expect(result).not.toBeNull()
    expect(result?.locationId).toBe('loc-poly')
    expect(result?.distanceKm).toBe(0)
  })

  it('rechaza evento fuera del polígono (D2)', () => {
    const POLY: [number, number][] = [[-75, 4], [-73, 4], [-73, 5], [-75, 5]]
    const polyLoc = { ...BOGOTA, id: 'loc-poly', shape: 'polygon', polygon: { coordinates: [POLY] } }
    const result = matchCandidate(event({ latitude: 0, longitude: 0 }), candidate({ locations: [polyLoc] }))
    expect(result).toBeNull()
  })
})

describe('findMatches', () => {
  it('devuelve solo a los candidatos que cumplen todas las reglas', () => {
    const results = findMatches(event(), [
      candidate({ userId: 'a' }),
      candidate({ userId: 'b', locations: [{ ...MEDELLIN }] }),
      candidate({ userId: 'c', preferences: { ...prefs, disasterTypes: ['flood'] } }),
    ])
    expect(results.map(r => r.userId)).toEqual(['a'])
  })
})

// ============================================================================
// matchEvent — con Prisma y hub falsos
// ============================================================================

function preferenceRow(overrides: Record<string, unknown> = {}) {
  return {
    userId: 'user-1',
    alertRadiusKm: 50,
    disasterTypes: ['earthquake'],
    minSeverity: 'low',
    pushEnabled: true,
    emailEnabled: true,
    smsEnabled: false,
    user: { locations: [{ ...BOGOTA }] },
    ...overrides,
  }
}

function fakePrisma(rows: unknown[]) {
  const inserted: any[] = []
  const seen = new Set<string>()

  const prisma = {
    userPreference: { findMany: async () => rows },
    notification: {
      createMany: async ({ data }: { data: any[] }) => {
        let count = 0
        for (const row of data) {
          const key = `${row.userId}|${row.eventId}|${row.channel}`
          if (seen.has(key)) continue // simula @@unique + skipDuplicates
          seen.add(key)
          inserted.push(row)
          count++
        }
        return { count }
      },
      updateMany: async () => ({ count: 0 }),
    },
  }

  return { prisma: prisma as unknown as PrismaClient, inserted }
}

describe('matchEvent', () => {
  it('crea una notificación por canal y las empuja en vivo', async () => {
    const { prisma, inserted } = fakePrisma([preferenceRow()])
    const sendToUser = vi.fn(() => 1)
    const hub = { size: 1, sendToUser } as unknown as AlertHub

    const summary = await matchEvent(prisma, event(), hub)

    expect(summary.matchedUsers).toBe(1)
    expect(summary.created).toBe(2) // push + email
    expect(summary.byChannel).toEqual({ push: 1, email: 1, sms: 0 })
    expect(inserted.map(row => row.channel).sort()).toEqual(['email', 'push'])
    expect(sendToUser).toHaveBeenCalledTimes(1)
  })

  it('no duplica notificaciones si el evento se procesa dos veces', async () => {
    const { prisma, inserted } = fakePrisma([preferenceRow()])

    await matchEvent(prisma, event())
    const second = await matchEvent(prisma, event())

    expect(inserted).toHaveLength(2)
    expect(second.created).toBe(0)
    expect(second.matchedUsers).toBe(1)
  })

  it('no inserta nada si nadie coincide', async () => {
    const { prisma, inserted } = fakePrisma([
      preferenceRow({ disasterTypes: ['flood'] }),
      preferenceRow({ userId: 'user-2', user: { locations: [{ ...MEDELLIN }] } }),
    ])

    const summary = await matchEvent(prisma, event())
    expect(summary).toEqual({ matchedUsers: 0, created: 0, byChannel: { push: 0, email: 0, sms: 0 }, pushedLive: 0 })
    expect(inserted).toHaveLength(0)
  })

  it('no falla si Prisma revienta (la ingesta debe seguir)', async () => {
    const prisma = {
      userPreference: { findMany: async () => { throw new Error('DB caída') } },
      notification: { createMany: async () => ({ count: 0 }), updateMany: async () => ({ count: 0 }) },
    } as unknown as PrismaClient

    const summary = await matchEvent(prisma, event())
    expect(summary.created).toBe(0)
  })
})
