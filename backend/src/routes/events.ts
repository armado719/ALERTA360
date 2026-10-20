import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'

const EventsQuerySchema = z.object({
  types: z.string().optional(),
  timeRange: z.enum(['1h', '24h', '7d']).optional().default('24h'),
})

function getTimeRangeFilter(timeRange: string): Date {
  const now = new Date()
  switch (timeRange) {
    case '1h': return new Date(now.getTime() - 60 * 60 * 1000)
    case '24h': return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    default: return new Date(now.getTime() - 24 * 60 * 60 * 1000)
  }
}

export async function registerEventRoutes(fastify: FastifyInstance) {
  // GET /api/events?types=earthquake,storm&timeRange=24h
  fastify.get('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = EventsQuerySchema.safeParse(request.query)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid query', details: result.error.errors })
    }
    const { types, timeRange } = result.data

    const sinceDate = getTimeRangeFilter(timeRange)

    const where: any = {
      isActive: true,
      occurredAt: { gte: sinceDate },
    }

    if (types && types.length > 0) {
      where.type = { in: types.split(',') }
    }

    const events = await fastify.prisma.disasterEvent.findMany({
      where,
      orderBy: { occurredAt: 'desc' },
    })

    // Map Prisma model to frontend type
    const response = events.map((e: any) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      latitude: e.latitude,
      longitude: e.longitude,
      magnitude: e.magnitude ?? undefined,
      intensity: e.intensity ?? undefined,
      severity: e.severity,
      occurredAt: e.occurredAt.toISOString(),
      detectedAt: e.detectedAt.toISOString(),
      source: e.source,
      fetchedAt: e.fetchedAt.toISOString(),
      stale: e.stale,
      rawData: e.rawData ?? undefined,
    }))

    return reply.send(response)
  })

  // GET /api/events/:id
  fastify.get('/events/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params

    const event = await fastify.prisma.disasterEvent.findUnique({
      where: { id },
    })

    if (!event || !event.isActive) {
      return reply.status(404).send({ error: 'Event not found' })
    }

    return reply.send({
      id: event.id,
      type: event.type,
      title: event.title,
      description: event.description,
      latitude: event.latitude,
      longitude: event.longitude,
      magnitude: event.magnitude ?? undefined,
      intensity: event.intensity ?? undefined,
      severity: event.severity,
      occurredAt: event.occurredAt.toISOString(),
      detectedAt: event.detectedAt.toISOString(),
      source: event.source,
      fetchedAt: event.fetchedAt.toISOString(),
      stale: event.stale,
      rawData: event.rawData ?? undefined,
    })
  })
}
