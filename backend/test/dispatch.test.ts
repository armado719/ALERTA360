import { describe, expect, it, vi } from 'vitest'
import type { PrismaClient } from '@prisma/client'
import { dispatchEventNotifications } from '../src/services/notifications/dispatch'

interface Row {
  id: string
  channel: 'email' | 'sms'
  distanceKm: number
  user: { email: string; phone: string | null }
  event: {
    title: string
    description: string
    type: string
    severity: string
    occurredAt: Date
  }
  location: { name: string } | null
}

const row = (overrides: Partial<Row> = {}): Row => ({
  id: 'n1',
  channel: 'email',
  distanceKm: 2.9,
  user: { email: 'ana@test.dev', phone: null },
  event: {
    title: 'Sismo cerca de Bogotá',
    description: 'Magnitud 5.2',
    type: 'earthquake',
    severity: 'high',
    occurredAt: new Date('2026-10-18T04:00:00Z'),
  },
  location: { name: 'Casa' },
  ...overrides,
})

function fakePrisma(rows: Row[]) {
  const updates: Array<{ id: string; status: string; error: string | null }> = []

  const prisma = {
    notification: {
      findMany: async () => rows,
      updateMany: async ({ where, data }: { where: { id: string }; data: any }) => {
        updates.push({ id: where.id, status: data.status, error: data.error ?? null })
        return { count: 1 }
      },
    },
  }

  return { prisma: prisma as unknown as PrismaClient, updates }
}

describe('dispatchEventNotifications', () => {
  it('envía el email y lo marca como enviado', async () => {
    const { prisma, updates } = fakePrisma([row()])
    const sendEmail = vi.fn(async () => ({ status: 'sent' as const }))

    const summary = await dispatchEventNotifications(prisma, 'evt-1', { sendEmail })

    expect(summary).toEqual({ sent: 1, failed: 0, skipped: 0 })
    expect(sendEmail).toHaveBeenCalledTimes(1)

    const message = sendEmail.mock.calls[0][0] as any
    expect(message.to).toBe('ana@test.dev')
    expect(message.subject).toContain('Sismo cerca de Bogotá')
    expect(message.text).toContain('2.9 km')
    expect(message.text).toContain('«Casa»')

    expect(updates[0]).toMatchObject({ id: 'n1', status: 'sent', error: null })
  })

  it('omite el SMS si el usuario no tiene teléfono', async () => {
    const { prisma, updates } = fakePrisma([row({ id: 'n2', channel: 'sms' })])
    const sendSms = vi.fn()

    const summary = await dispatchEventNotifications(prisma, 'evt-1', { sendSms })

    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 1 })
    expect(sendSms).not.toHaveBeenCalled()
    expect(updates[0].status).toBe('skipped')
    expect(updates[0].error).toContain('teléfono')
  })

  it('envía el SMS cuando hay teléfono', async () => {
    const { prisma } = fakePrisma([
      row({ id: 'n2', channel: 'sms', user: { email: 'ana@test.dev', phone: '+573001234567' } }),
    ])
    const sendSms = vi.fn(async () => ({ status: 'sent' as const }))

    const summary = await dispatchEventNotifications(prisma, 'evt-1', { sendSms })

    expect(summary.sent).toBe(1)
    const message = sendSms.mock.calls[0][0] as any
    expect(message.to).toBe('+573001234567')
    expect(message.body).toContain('ALERTA360')
  })

  it('guarda el motivo cuando el proveedor falla', async () => {
    const { prisma, updates } = fakePrisma([row()])
    const sendEmail = vi.fn(async () => ({ status: 'failed' as const, error: '401 Unauthorized' }))

    const summary = await dispatchEventNotifications(prisma, 'evt-1', { sendEmail })

    expect(summary).toEqual({ sent: 0, failed: 1, skipped: 0 })
    expect(updates[0]).toMatchObject({ status: 'failed', error: '401 Unauthorized' })
  })

  it('registra skipped cuando no hay proveedor configurado', async () => {
    const { prisma, updates } = fakePrisma([row()])
    const sendEmail = vi.fn(async () => ({
      status: 'skipped' as const,
      reason: 'SENDGRID_API_KEY no configurada',
    }))

    const summary = await dispatchEventNotifications(prisma, 'evt-1', { sendEmail })

    expect(summary.skipped).toBe(1)
    expect(updates[0].error).toContain('SENDGRID')
  })

  it('procesa varios destinatarios y canales en una sola pasada', async () => {
    const { prisma } = fakePrisma([
      row({ id: 'a' }),
      row({ id: 'b', channel: 'sms', user: { email: 'luis@test.dev', phone: '+573009998877' } }),
      row({ id: 'c', user: { email: 'sin@telefono.dev', phone: null }, channel: 'sms' }),
    ])
    const sendEmail = vi.fn(async () => ({ status: 'sent' as const }))
    const sendSms = vi.fn(async () => ({ status: 'sent' as const }))

    const summary = await dispatchEventNotifications(prisma, 'evt-1', { sendEmail, sendSms })

    expect(summary).toEqual({ sent: 2, failed: 0, skipped: 1 })
  })

  it('no lanza si Prisma falla', async () => {
    const prisma = {
      notification: {
        findMany: async () => {
          throw new Error('BD caída')
        },
        updateMany: async () => ({ count: 0 }),
      },
    } as unknown as PrismaClient

    const summary = await dispatchEventNotifications(prisma, 'evt-1')
    expect(summary).toEqual({ sent: 0, failed: 0, skipped: 0 })
  })
})
