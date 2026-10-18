import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'

// ============================================================================
// Prisma en memoria — solo los métodos que usan las rutas bajo prueba
// ============================================================================

interface FakeNotification {
  id: string
  userId: string
  eventId: string
  channel: string
  status: string
  distanceKm: number
  sentAt: Date
  readAt: Date | null
  event: {
    id: string
    type: string
    title: string
    severity: string
    latitude: number
    longitude: number
    occurredAt: Date
    source: string
  }
}

const eventRow = (id: string) => ({
  id,
  type: 'earthquake',
  title: `Sismo ${id}`,
  severity: 'high',
  latitude: 4.711,
  longitude: -74.0721,
  occurredAt: new Date('2026-10-18T01:00:00Z'),
  source: 'usgs',
})

function createFakePrisma() {
  const notifications: FakeNotification[] = [
    {
      id: 'n1', userId: 'user-1', eventId: 'e1', channel: 'push', status: 'sent',
      distanceKm: 3.14159, sentAt: new Date('2026-10-18T01:00:00Z'), readAt: null, event: eventRow('e1'),
    },
    {
      id: 'n2', userId: 'user-1', eventId: 'e2', channel: 'email', status: 'sent',
      distanceKm: 12.5, sentAt: new Date('2026-10-17T22:00:00Z'), readAt: new Date('2026-10-17T23:00:00Z'),
      event: eventRow('e2'),
    },
    {
      id: 'n3', userId: 'user-2', eventId: 'e3', channel: 'push', status: 'pending',
      distanceKm: 1, sentAt: new Date('2026-10-17T20:00:00Z'), readAt: null, event: eventRow('e3'),
    },
  ]

  const preferences = new Map<string, Record<string, unknown>>()
  const phones = new Map<string, string | null>()

  const matches = (row: FakeNotification, where: Record<string, any>) =>
    (where.userId === undefined || row.userId === where.userId) &&
    (where.readAt === undefined || (where.readAt === null && row.readAt === null)) &&
    (where.id === undefined || row.id === where.id)

  const prisma = {
    notification: {
      findMany: async ({ where, take }: { where: Record<string, any>; take?: number }) =>
        notifications
          .filter(row => matches(row, where))
          .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime())
          .slice(0, take ?? 50),
      count: async ({ where }: { where: Record<string, any> }) =>
        notifications.filter(row => matches(row, where)).length,
      findFirst: async ({ where }: { where: Record<string, any> }) =>
        notifications.find(row => matches(row, where)) ?? null,
      updateMany: async ({ where, data }: { where: Record<string, any>; data: Record<string, any> }) => {
        const target = notifications.filter(row => matches(row, where))
        for (const row of target) Object.assign(row, data)
        return { count: target.length }
      },
      deleteMany: async ({ where }: { where: Record<string, any> }) => {
        const target = notifications.filter(row => matches(row, where))
        for (const row of target) notifications.splice(notifications.indexOf(row), 1)
        return { count: target.length }
      },
    },
    user: {
      findUnique: async ({ where }: { where: { id: string } }) => ({
        phone: phones.get(where.id) ?? null,
      }),
      update: async ({ where, data }: { where: { id: string }; data: { phone?: string | null } }) => {
        phones.set(where.id, data.phone ?? null)
        return { id: where.id, phone: data.phone ?? null }
      },
    },
    userPreference: {
      upsert: async ({
        where,
        update,
        create,
      }: {
        where: { userId: string }
        update: Record<string, unknown>
        create: Record<string, unknown>
      }) => {
        const existing = preferences.get(where.userId)
        const next = existing ? { ...existing, ...update } : { id: 'pref-1', ...create }
        preferences.set(where.userId, next)
        return next
      },
    },
  }

  return prisma as unknown as PrismaClient
}

// ============================================================================
// Suite
// ============================================================================

describe('API de notificaciones y preferencias', () => {
  let app: FastifyInstance
  let token: string
  let otherToken: string

  beforeAll(async () => {
    app = await buildApp({ prisma: createFakePrisma() })
    await app.ready()
    token = app.jwt.sign({ id: 'user-1', email: 'ana@alerta360.test' })
    otherToken = app.jwt.sign({ id: 'user-2', email: 'luis@alerta360.test' })
  })

  afterAll(async () => {
    await app.close()
  })

  const auth = (value = token) => ({ authorization: `Bearer ${value}` })

  it('rechaza sin token', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/notifications' })
    expect(res.statusCode).toBe(401)
  })

  it('devuelve solo las notificaciones del usuario, con el evento y los no leídos', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/notifications', headers: auth() })
    expect(res.statusCode).toBe(200)

    const body = res.json()
    expect(body.unread).toBe(1)
    expect(body.notifications).toHaveLength(2)
    expect(body.notifications[0].id).toBe('n1')
    expect(body.notifications[0].event.title).toBe('Sismo e1')
    expect(body.notifications[0].distanceKm).toBe(3.1) // redondeado a un decimal
  })

  it('filtra por no leídas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications?unreadOnly=true',
      headers: auth(),
    })
    expect(res.json().notifications).toHaveLength(1)
    expect(res.json().notifications[0].id).toBe('n1')
  })

  it('devuelve el contador de no leídas', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/notifications/unread-count',
      headers: auth(),
    })
    expect(res.json()).toEqual({ count: 1 })
  })

  it('marca una notificación como leída y es idempotente', async () => {
    const first = await app.inject({
      method: 'POST',
      url: '/api/notifications/n1/read',
      headers: auth(),
    })
    expect(first.statusCode).toBe(200)
    expect(first.json()).toEqual({ ok: true })

    const second = await app.inject({
      method: 'POST',
      url: '/api/notifications/n1/read',
      headers: auth(),
    })
    expect(second.json()).toEqual({ ok: true, alreadyRead: true })
  })

  it('no deja tocar notificaciones de otro usuario', async () => {
    const read = await app.inject({
      method: 'POST',
      url: '/api/notifications/n3/read',
      headers: auth(),
    })
    expect(read.statusCode).toBe(404)

    const del = await app.inject({
      method: 'DELETE',
      url: '/api/notifications/n3',
      headers: auth(),
    })
    expect(del.statusCode).toBe(404)
  })

  it('marca todas como leídas', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/notifications/read-all',
      headers: auth(otherToken),
    })
    expect(res.statusCode).toBe(200)
    expect(res.json().updated).toBe(1)
  })

  it('borra una notificación propia', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/notifications/n2', headers: auth() })
    expect(res.statusCode).toBe(204)

    const list = await app.inject({ method: 'GET', url: '/api/notifications', headers: auth() })
    expect(list.json().notifications.map((n: any) => n.id)).not.toContain('n2')
  })

  it('crea preferencias por defecto y permite actualizarlas', async () => {
    const initial = await app.inject({ method: 'GET', url: '/api/preferences', headers: auth() })
    expect(initial.statusCode).toBe(200)
    expect(initial.json().alertRadiusKm).toBe(50)
    expect(initial.json().minSeverity).toBe('low')
    expect(initial.json().pushEnabled).toBe(true)

    const updated = await app.inject({
      method: 'PUT',
      url: '/api/preferences',
      headers: auth(),
      payload: { alertRadiusKm: 120, minSeverity: 'high', smsEnabled: true },
    })
    expect(updated.statusCode).toBe(200)
    expect(updated.json().alertRadiusKm).toBe(120)
    expect(updated.json().minSeverity).toBe('high')
    expect(updated.json().smsEnabled).toBe(true)
    expect(updated.json().pushEnabled).toBe(true) // lo no enviado se conserva
  })

  it('guarda el teléfono para SMS y lo devuelve', async () => {
    const saved = await app.inject({
      method: 'PUT',
      url: '/api/preferences',
      headers: auth(),
      payload: { smsEnabled: true, phone: '+573001234567' },
    })
    expect(saved.statusCode).toBe(200)
    expect(saved.json().phone).toBe('+573001234567')
    expect(saved.json().smsEnabled).toBe(true)

    const read = await app.inject({ method: 'GET', url: '/api/preferences', headers: auth() })
    expect(read.json().phone).toBe('+573001234567')

    const invalid = await app.inject({
      method: 'PUT',
      url: '/api/preferences',
      headers: auth(),
      payload: { phone: '3001234567' }, // sin +57
    })
    expect(invalid.statusCode).toBe(400)
  })

  it('valida las preferencias', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/preferences',
      headers: auth(),
      payload: { minSeverity: 'apocalíptico', alertRadiusKm: 99999 },
    })
    expect(res.statusCode).toBe(400)
  })
})
