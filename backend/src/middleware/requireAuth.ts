import { FastifyRequest, FastifyReply } from 'fastify'
import { asyncHandler } from './errorHandler'
import '@fastify/jwt'

/**
 * Shared JWT auth middleware — nodebestpractices DRY principle.
 * Was previously duplicated across auth.ts and locations.ts.
 */
export const requireAuth = asyncHandler(
  async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired token' })
    }
  }
)
