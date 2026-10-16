import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@prisma/client'
import dotenv from 'dotenv'

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
  secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
})

await fastify.register(websocket)

// ============================================================================
// HEALTH CHECK
// ============================================================================

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() }
})

// ============================================================================
// ROUTES
// ============================================================================

// Import routes (will be added)
// await fastify.register(import('./routes/events.js'))
// await fastify.register(import('./routes/auth.js'))
// await fastify.register(import('./routes/users.js'))

// ============================================================================
// START SERVER
// ============================================================================

const start = async () => {
  try {
    await fastify.listen({ port: Number(process.env.PORT) || 3000, host: '0.0.0.0' })
    console.log(`🚀 Server running on http://localhost:${process.env.PORT || 3000}`)
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
