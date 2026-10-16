import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import { z } from 'zod'
import '@fastify/jwt'

const prisma = new PrismaClient()

function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  }
}

const CreateLocationSchema = z.object({
  name: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusKm: z.number().int().min(1).max(1000).optional().default(50),
})

export async function registerLocationRoutes(fastify: FastifyInstance) {
  // GET /api/locations — all locations for current user
  fastify.get('/locations', { preHandler: [requireAuth()] }, async (request: any, reply: FastifyReply) => {
    const locations = await prisma.location.findMany({
      where: { userId: request.user!.id },
      orderBy: { createdAt: 'desc' },
    })
    return reply.send(locations)
  })

  // POST /api/locations — create a location
  fastify.post('/locations', { preHandler: [requireAuth()] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const result = CreateLocationSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.errors })
    }
    const { name, latitude, longitude, radiusKm } = result.data as any

    const location = await prisma.location.create({
      data: {
        userId: (request as any).user.id,
        name,
        latitude,
        longitude,
        radiusKm,
      },
    })
    return reply.status(201).send(location)
  })

  // DELETE /api/locations/:id
  fastify.delete('/locations/:id', { preHandler: [requireAuth()] }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string }

    const existing = await prisma.location.findUnique({
      where: { id },
      select: { userId: true },
    })
    if (!existing) {
      return reply.status(404).send({ error: 'Location not found' })
    }
    if (existing.userId !== (request as any).user.id) {
      return reply.status(403).send({ error: 'Forbidden' })
    }

    await prisma.location.delete({ where: { id } })
    return reply.status(204).send()
  })
}
