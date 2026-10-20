/**
 * Test de integración: motor de alertas push en vivo.
 *
 * No levanta un server HTTP ni conecta a PostgreSQL: enyecta un `fakePrisma`
 * (como los tests de matching) y simula un cliente WebSocket conectado al
 * hub real de `app.hub`. Así validamos el camino real:
 *
 *   matchEvent(prisma, event, app.hub)
 *      → matching haversine
 *      → notification.createMany (dedup)
 *      → AlertHub.sendToUser (push en vivo)
 *      → fakeSocket.send(AlertPayload JSON)
 *
 * El transporte WS/JWT (`/ws/alerts`) es un wrapper delgado sobre el hub; el
 * hub es el núcleo de push y aquí se prueba con un socket simulado cuyo
 * readyState===1 reproduce el comportamiento de un WS abierto.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'
import { matchEvent, type MatchableEvent } from '../src/services/matching'
import { sendPush } from '../src/services/push'
import type { AlertHub } from '../src/realtime/hub'

// sendPush se mockea: el fallback offline no debe tocar web-push en tests
vi.mock('../src/services/push', () => ({
  sendPush: vi.fn().mockResolvedValue(true),
}))

const BOGOTA = { id: 'loc-bogota', latitude: 4.711, longitude: -74.0721, radiusKm: 50 }

function makeEvent(overrides: Partial<MatchableEvent> = {}): MatchableEvent {
  return {
    id: 'evt-live-1',
    type: 'earthquake',
    latitude: 4.72,
    longitude: -74.08,
    severity: 'medium',
    isActive: true,
    occurredAt: new Date('2026-10-18T02:00:00Z'),
    title: 'Sismo cerca de Bogotá',
    ...overrides,
  }
}

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

interface FakePrismaResult {
  prisma: PrismaClient
  inserted: any[]
}

function fakePrisma(rows: unknown[]): FakePrismaResult {
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
      findMany: async () => inserted,
    },
  }
  return { prisma: prisma as unknown as PrismaClient, inserted }
}

function makeFakeSocket() {
  const sent: string[] = []
  const socket = {
    readyState: 1, // WebSocket.OPEN
    send: (data: string) => sent.push(data),
  }
  return { socket, sent }
}

describe('Motor de alertas push en vivo (integración con hub real)', () => {
  beforeEach(() => {
    vi.mocked(sendPush).mockClear()
  })

  it('empuja el AlertPayload al WS simulado cuando el evento entra en la zona', async () => {
    const { prisma } = fakePrisma([preferenceRow()])
    const app = await buildApp({ prisma })

    const { socket, sent } = makeFakeSocket()
    app.hub.add('user-1', socket as any)

    const summary = await matchEvent(app.prisma, makeEvent(), app.hub)

    expect(summary.matchedUsers).toBe(1)
    expect(summary.pushedLive).toBe(1)
    // El hub llamó a socket.send exactamente una vez con el payload
    expect(sent).toHaveLength(1)
    const payload = JSON.parse(sent[0])
    expect(payload.type).toBe('alert')
    expect(payload.eventId).toBe('evt-live-1')
    expect(payload.title).toBe('Sismo cerca de Bogotá')
    expect(payload.distanceKm).toBeLessThan(5)
    expect(payload.channels).toContain('push')
    expect(payload.occurredAt).toBe('2026-10-18T02:00:00.000Z')

    await app.close()
  })

  it('no duplica el push si el mismo evento se procesa de nuevo', async () => {
    const { prisma } = fakePrisma([preferenceRow()])
    const app = await buildApp({ prisma })

    const { socket, sent } = makeFakeSocket()
    app.hub.add('user-1', socket as any)

    await matchEvent(app.prisma, makeEvent(), app.hub)
    const second = await matchEvent(app.prisma, makeEvent(), app.hub)

    // La notificación en BD NO se duplica (@@unique + skipDuplicates)
    expect(second.created).toBe(0)
    // El WS recibe el alert de nuevo: el matching es stateless, por lo que
    // pushToSockets se vuelve a disparar. El cliente frontend dedupa por
    // eventId al refrescar la bandeja (GET /notifications).
    expect(second.pushedLive).toBe(1)
    expect(sent).toHaveLength(2)

    await app.close()
  })

  it('no push en vivo si nadie está conectado, pero persiste la notificación', async () => {
    const { prisma, inserted } = fakePrisma([preferenceRow()])
    const app = await buildApp({ prisma })

    const summary = await matchEvent(app.prisma, makeEvent(), app.hub)

    expect(summary.matchedUsers).toBe(1)
    expect(summary.created).toBe(2) // push + email
    expect(summary.pushedLive).toBe(0)
    // Las notificaciones quedan para que el cliente las polltee vía GET /notifications
    expect(inserted).toHaveLength(2)
    expect(inserted.map(r => r.channel).sort()).toEqual(['email', 'push'])

    await app.close()
  })

  it('no push si el evento cae fuera del radio de la zona', async () => {
    const { prisma } = fakePrisma([preferenceRow()])
    const app = await buildApp({ prisma })

    const { socket, sent } = makeFakeSocket()
    app.hub.add('user-1', socket as any)

    // evento en Medellín (a >500 km de Bogotá)
    const summary = await matchEvent(
      app.prisma,
      makeEvent({ latitude: 6.2442, longitude: -75.5812, id: 'evt-medellin' }),
      app.hub
    )

    expect(summary.matchedUsers).toBe(0)
    expect(sent).toHaveLength(0)

    await app.close()
  })

  it('fallback a push offline cuando el usuario no tiene WS conectado', async () => {
    const row = preferenceRow()
    row.user.pushSubscription = {
      endpoint: 'https://fcm/send/xyz',
      keys: { p256dh: 'a', auth: 'b' },
    }
    const { prisma } = fakePrisma([row])
    const app = await buildApp({ prisma })
    const hub = { size: 0, sendToUser: vi.fn(() => 0) } as unknown as AlertHub

    const summary = await matchEvent(app.prisma, makeEvent(), hub)

    expect(summary.pushedLive).toBe(0)
    expect(summary.created).toBe(2)
    expect(sendPush).toHaveBeenCalledTimes(1)
    expect(sendPush).toHaveBeenCalledWith(
      { endpoint: 'https://fcm/send/xyz', keys: { p256dh: 'a', auth: 'b' } },
      expect.objectContaining({ title: 'Sismo cerca de Bogotá' })
    )

    await app.close()
  })
})
