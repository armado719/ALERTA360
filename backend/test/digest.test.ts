import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { config } from '../src/utils/config'
import {
  collectDigestEvents,
  filterEventsForUser,
  sendDailyDigest,
  nextDigestDelay,
} from '../src/services/notifications/digest'

const EVENT_NEAR = {
  externalId: 'e1',
  type: 'flood',
  title: 'Inundación Bogotá',
  description: 'lluvia intensa',
  severity: 'medium',
  occurredAt: new Date('2026-10-19T10:00:00Z'),
  latitude: 4.6,
  longitude: -74.0,
}

const EVENT_FAR = {
  ...EVENT_NEAR,
  externalId: 'e2',
  title: 'Inundación lejos',
  latitude: 10,
  longitude: -70,
}

const USER_WITH = {
  id: 'u1',
  email: 'a@x.com',
  preferences: {
    alertRadiusKm: 50,
    disasterTypes: ['flood', 'earthquake'],
    minSeverity: 'low',
    emailEnabled: true,
  },
  locations: [
    { id: 'l1', name: 'Bogotá', latitude: 4.7, longitude: -74.1, radiusKm: 50 },
  ],
}

describe('filterEventsForUser (B5)', () => {
  it('incluye eventos dentro del radio y tipo/severidad permitidos', () => {
    const matches = filterEventsForUser(USER_WITH as any, [
      EVENT_NEAR as any,
      EVENT_FAR as any,
    ])
    expect(matches).toHaveLength(1)
    expect(matches[0].event.externalId).toBe('e1')
    expect(matches[0].nearestKm).toBeGreaterThan(0)
    expect(matches[0].locationName).toBe('Bogotá')
  })

  it('excluye si el tipo no está en disasterTypes', () => {
    const matches = filterEventsForUser(USER_WITH as any, [
      { ...EVENT_NEAR, type: 'volcanic' } as any,
    ])
    expect(matches).toHaveLength(0)
  })

  it('excluye eventos por debajo de la severidad mínima', () => {
    const user: DigestUser = {
      ...USER_WITH,
      preferences: { ...USER_WITH.preferences!, minSeverity: 'high' },
    }
    const matches = filterEventsForUser(user, [EVENT_NEAR]) // 'medium' < 'high'
    expect(matches).toHaveLength(0)
  })

  it('excluye usuarios sin email habilitado', () => {
    const userNoEmail = { ...USER_WITH, preferences: { ...USER_WITH.preferences!, emailEnabled: false } }
    const matches = filterEventsForUser(userNoEmail as any, [EVENT_NEAR as any])
    expect(matches).toHaveLength(0)
  })
})

describe('sendDailyDigest (B5)', () => {
  const prevEnabled = config.DIGEST_ENABLED

  beforeEach(() => {
    config.DIGEST_ENABLED = 'true'
  })
  afterEach(() => {
    config.DIGEST_ENABLED = prevEnabled
  })

  function fakePrisma(events: any[], users: any[]) {
    return {
      disasterEvent: { findMany: vi.fn().mockResolvedValue(events) },
      user: { findMany: vi.fn().mockResolvedValue(users) },
    }
  }

  it('envía email a usuarios con eventos y omite los sin eventos relevantes', async () => {
    // userFar con radiusKm=1 → EVENT_NEAR (~12 km) está fuera de su zona
    const userFar: DigestUser = {
      ...USER_WITH,
      id: 'u2',
      email: 'b@x.com',
      locations: [{ id: 'l1', name: 'Bogotá', latitude: 4.7, longitude: -74.1, radiusKm: 1 }],
    }
    const prisma = fakePrisma([EVENT_NEAR, EVENT_FAR], [USER_WITH, userFar])
    const mailer = vi.fn().mockResolvedValue({ status: 'sent' })

    const summary = await sendDailyDigest(prisma as any, { sendEmail: mailer })

    expect(summary.sent).toBe(1)
    expect(summary.skipped).toBe(1) // u2 está fuera de zona → 0 relevantes
    expect(mailer).toHaveBeenCalledTimes(1)
    const email = mailer.mock.calls[0][0]
    expect(email.to).toBe('a@x.com')
    expect(email.text).toContain('Inundación Bogotá')
  })

  it('retorna 0/0/0 si DIGEST_ENABLED=false', async () => {
    config.DIGEST_ENABLED = 'false'
    const prisma = fakePrisma([EVENT_NEAR as any], [USER_WITH as any])
    const summary = await sendDailyDigest(prisma as any)
    expect(summary).toEqual({ sent: 0, skipped: 0, failed: 0 })
  })

  it('marca failed si el proveedor falla', async () => {
    const prisma = fakePrisma([EVENT_NEAR as any], [USER_WITH as any])
    const mailer = vi.fn().mockResolvedValue({ status: 'failed', error: 'boom' } as any)
    const summary = await sendDailyDigest(prisma as any, { sendEmail: mailer })
    expect(summary.failed).toBe(1)
  })
})

describe('nextDigestDelay (B5 scheduler)', () => {
  it('calcula el delay hasta la próxima hora UTC', () => {
    const d = nextDigestDelay(8)
    expect(d).toBeGreaterThan(0)
    expect(d).toBeLessThanOrEqual(24 * 3600_000)
  })
})
