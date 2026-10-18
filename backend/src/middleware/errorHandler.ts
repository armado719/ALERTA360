import { FastifyError, FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import logger from '../utils/logger'

/**
 * Centralized error handler — nodebestpractices #2.4
 * All unhandled errors in async route handlers funnel here.
 * Returns a consistent JSON error shape.
 */
export function setupErrorHandler(fastify: FastifyInstance) {
  fastify.setErrorHandler((error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Fastify's own validation errors (from Zod schemas, etc.)
    if (error.statusCode === 400) {
      return reply.status(400).send({
        error: 'Bad Request',
        message: error.message,
        ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
      })
    }

    // JWT errors
    if (error.statusCode === 401) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: error.message,
      })
    }

    // Everything else → 500
    logger.error(error, `${request.method} ${request.url}`)

    reply.status(500).send({
      error: 'Internal Server Error',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong',
      ...(process.env.NODE_ENV === 'development' && { stack: error.stack }),
    })
  })
}

/**
 * Wraps an async route handler so rejections are auto-forwarded
 * to Fastify's error handler instead of being swallowed.
 * Usage: fastify.get('/', asyncHandler(async (req, reply) => { ... }))
 */
export function asyncHandler(
  fn: (request: FastifyRequest, reply: FastifyReply) => Promise<unknown>
) {
  return (request: FastifyRequest, reply: FastifyReply) => {
    fn(request, reply).catch((err) => {
      logger.error(err, 'Unhandled error in route handler')
      reply.send(err)
    })
  }
}
