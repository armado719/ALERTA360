import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'
import { registerAuthRoutes } from './routes/auth'
import { registerEventRoutes } from './routes/events'
import { registerLocationRoutes } from './routes/locations'
import { startIngestScheduler } from './services/ingestion'

// Import type augmentations for Fastify plugins
import '@fastify/jwt'

dotenv.config()

const prisma = new PrismaClient()

const fastify = Fastify({
  logger: true,
})

// ============================================================================
// PLUGINS
// ============================================================================
await fastify.register(cors, {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
})

await fastify.register(jwt, {
  secret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
})

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
const PORT = Number(process.env.PORT) || 3000

const start = async () => {
  try {
    // Start ingestion scheduler in background
    startIngestScheduler()

    await fastify.listen({ port: PORT, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

start()

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect()
  await fastify.close()
  process.exit(0)
})
