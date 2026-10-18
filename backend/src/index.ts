import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import { config } from './utils/config'
import logger from './utils/logger'
import { setupErrorHandler } from './middleware/errorHandler'
import { registerAuthRoutes } from './routes/auth'
import { registerEventRoutes } from './routes/events'
import { registerLocationRoutes } from './routes/locations'
import { startIngestScheduler } from './services/ingestion'

// Import type augmentations for Fastify plugins
import '@fastify/jwt'

// ============================================================================
// SINGLETON: One PrismaClient instance shared across all modules
// nodebestpractices: avoid multiple DB pool instances per request
// ============================================================================
const prisma = new PrismaClient({
  log: ['error', 'warn'],
})

// ============================================================================
// FASTIFY SERVER
// ============================================================================
const fastify = Fastify({
  logger: false, // We use our own pino logger instance for consistent output
})

// ============================================================================
// PLUGINS
// ============================================================================
await fastify.register(cors, {
  origin: config.CORS_ORIGIN,
  credentials: true,
})

await fastify.register(jwt, {
  secret: config.JWT_SECRET,
})

// Attach Prisma to Fastify instance (decorator pattern)
fastify.decorate('prisma', prisma)

// ============================================================================
// ERROR HANDLING (centralized)
// ============================================================================
setupErrorHandler(fastify)

// ============================================================================
// HEALTH CHECK
// ============================================================================
fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// ============================================================================
// ROUTES
// ============================================================================
await fastify.register(registerAuthRoutes, { prefix: '/api/auth' })
await fastify.register(registerEventRoutes, { prefix: '/api' })
await fastify.register(registerLocationRoutes, { prefix: '/api' })

// ============================================================================
// START SERVER
// ============================================================================
const start = async () => {
  try {
    // Start ingestion scheduler in background
    startIngestScheduler(prisma)
    await fastify.listen({ port: config.PORT, host: '0.0.0.0' })
    logger.info(`Server running on http://localhost:${config.PORT}`)
  } catch (err) {
    logger.error(err, 'Failed to start server')
    await prisma.$disconnect()
    process.exit(1)
  }
}

start()

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...')
  await prisma.$disconnect()
  await fastify.close()
  process.exit(0)
})
