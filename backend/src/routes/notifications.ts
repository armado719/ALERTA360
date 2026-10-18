import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth'

/**
 * Bandeja de alertas del usuario.
 *
 * Los registros los crea el motor de matching (`services/matching.ts`); aquí
 * solo se leen, se marcan como leídos y se borran.
 */

const ListSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  unreadOnly: z.enum(['true', 'false']).optional(),
})

const eventSelect = {
  id: true,
  type: true,
  title: true,
  severity: true,
  latitude: true,
  longitude: true,
  occurredAt: true,
  source: true,
} as const

interface NotificationRow {
  id: string
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

function serialize(row: NotificationRow) {
  return {
    id: row.id,
    channel: row.channel,
    status: row.status,
    distanceKm: Math.round(row.distanceKm * 10) / 10,
    sentAt: row.sentAt.toISOString(),
    readAt: row.readAt ? row.readAt.toISOString() : null,
    event: {
      id: row.event.id,
      type: row.event.type,
      title: row.event.title,
      severity: row.event.severity,
      latitude: row.event.latitude,
      longitude: row.event.longitude,
      occurredAt: row.event.occurredAt.toISOString(),
      source: row.event.source,
    },
  }
}

export async function registerNotificationRoutes(fastify: FastifyInstance) {
  // GET /api/notifications?limit=50&unreadOnly=true
  fastify.get(
    '/notifications',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = ListSchema.safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid query', details: parsed.error.errors })
      }
      const { limit, unreadOnly } = parsed.data
      const userId = (request as any).user.id as string

      const where: Record<string, unknown> = { userId }
      if (unreadOnly === 'true') where.readAt = null

      const [rows, unread] = await Promise.all([
        fastify.prisma.notification.findMany({
          where,
          orderBy: { sentAt: 'desc' },
          take: limit,
          include: { event: { select: eventSelect } },
        }),
        fastify.prisma.notification.count({ where: { userId, readAt: null } }),
      ])

      return reply.send({
        notifications: (rows as unknown as NotificationRow[]).map(serialize),
        unread,
      })
    }
  )

  // GET /api/notifications/unread-count
  fastify.get(
    '/notifications/unread-count',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const count = await fastify.prisma.notification.count({
        where: { userId: (request as any).user.id, readAt: null },
      })
      return reply.send({ count })
    }
  )

  // POST /api/notifications/:id/read
  fastify.post(
    '/notifications/:id/read',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id as string
      const { id } = request.params as { id: string }
      const { count } = await fastify.prisma.notification.updateMany({
        where: { id, userId, readAt: null },
        data: { readAt: new Date() },
      })

      if (count === 0) {
        const exists = await fastify.prisma.notification.findFirst({
          where: { id, userId },
          select: { id: true },
        })
        return exists
          ? reply.send({ ok: true, alreadyRead: true })
          : reply.status(404).send({ error: 'Notification not found' })
      }
      return reply.send({ ok: true })
    }
  )

  // POST /api/notifications/read-all
  fastify.post(
    '/notifications/read-all',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { count } = await fastify.prisma.notification.updateMany({
        where: { userId: (request as any).user.id, readAt: null },
        data: { readAt: new Date() },
      })
      return reply.send({ ok: true, updated: count })
    }
  )

  // DELETE /api/notifications/:id
  fastify.delete(
    '/notifications/:id',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string }
      const { count } = await fastify.prisma.notification.deleteMany({
        where: { id, userId: (request as any).user.id },
      })
      if (count === 0) return reply.status(404).send({ error: 'Notification not found' })
      return reply.status(204).send()
    }
  )
}
