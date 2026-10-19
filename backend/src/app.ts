import Fastify, { type FastifyInstance } from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import websocket from '@fastify/websocket'
import { PrismaClient } from '@prisma/client'
import { config } from './utils/config'
import logger from './utils/logger'
import { setupErrorHandler } from './middleware/errorHandler'
import { registerAuthRoutes } from './routes/auth'
import { registerEventRoutes } from './routes/events'
import { registerLocationRoutes } from './routes/locations'
import { registerNotificationRoutes } from './routes/notifications'
import { registerPreferenceRoutes } from './routes/preferences'
import { registerSourcesRoutes } from './routes/sources'
import { registerGeocodeRoutes } from './routes/geocode'
import { registerRealtimeRoutes } from './realtime/ws'
import { registerDocsRoutes } from './routes/docs'
import { AlertHub } from './realtime/hub'
import {
  getLastIngestionTimestamp,
  registerHttpMetrics,
  registerMetricsRoute,
  wsConnections,
} from './plugins/metrics'

// Augmentations de Fastify (`prisma`, `hub`)
import './utils/prisma'
import '@fastify/jwt'

const ALLOWED_ORIGINS = config.CORS_ORIGIN.split(',')
  .map(origin => origin.trim())
  .filter(Boolean)

const IS_DEV = config.NODE_ENV !== 'production'

/** localhost / 127.0.0.1 / [::1] con cualquier puerto (Vite, previews…). */
const DEV_LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/
/** IP de la red local, para probar desde el móvil en desarrollo. */
const DEV_LAN_ORIGIN = /^https?:\/\/(\d{1,3}\.){3}\d{1,3}(:\d+)?$/

function corsOrigin(origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) {
  // Sin cabecera Origin: curl, health checks, server-to-server o mismo origen.
  if (!origin) return callback(null, true)

  if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
    return callback(null, true)
  }

  if (IS_DEV && (DEV_LOCAL_ORIGIN.test(origin) || DEV_LAN_ORIGIN.test(origin))) {
    return callback(null, true)
  }

  logger.warn({ origin }, '[CORS] Origen no permitido — revisa CORS_ORIGIN')
  return callback(null, false)
}

export interface BuildAppOptions {
  /** Cliente Prisma inyectado (tests). Si no se pasa, la app crea y libera el suyo. */
  prisma?: PrismaClient
}

/**
 * Construye la aplicación Fastify sin escuchar en ningún puerto.
 *
 * Separar `buildApp()` del arranque (`index.ts`) permite testear las rutas con
 * `app.inject()` y un Prisma falso, sin base de datos ni red.
 */
export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const ownsPrisma = options.prisma === undefined
  const prisma = options.prisma ?? new PrismaClient({ log: ['error', 'warn'] })
  const hub = new AlertHub()

  const app = Fastify({ logger: false })

  // CORS: lista separada por comas + comodines de desarrollo.
  // Sin esto, abrir el front en 127.0.0.1:5173 (o en 5174 cuando Vite cambia
  // de puerto) fallaba aunque localhost:5173 sí estuviera permitido.
  await app.register(cors, {
    origin: corsOrigin,
    credentials: true,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    maxAge: 86400, // cachea el preflight 24 h
    optionsSuccessStatus: 204,
  })

  await app.register(jwt, {
    secret: config.JWT_SECRET,
  })

  // Debe registrarse antes que cualquier ruta con `{ websocket: true }`
  await app.register(websocket)

  app.decorate('prisma', prisma)
  app.decorate('hub', hub)

  setupErrorHandler(app)

  // ==========================================================================
  // OBSERVABILIDAD
  // ==========================================================================
  registerHttpMetrics(app)
  await registerMetricsRoute(app)

  // ==========================================================================
  // HEALTH CHECK — usado por nginx, Docker y el monitor externo
  // ==========================================================================
  app.get('/health', async (_request, reply) => {
    const startedAt = Date.now()

    let database: { status: 'up' | 'down'; latencyMs?: number; error?: string } = { status: 'up' }
    try {
      await prisma.$queryRaw`SELECT 1`
      database.latencyMs = Date.now() - startedAt
    } catch (err) {
      database = { status: 'down', error: (err as Error).message }
      reply.status(503)
    }

    const lastIngestion = getLastIngestionTimestamp()
    const ageSeconds = lastIngestion ? Math.round((Date.now() - lastIngestion) / 1000) : null

    return {
      status: database.status === 'up' ? 'ok' : 'degraded',
      version: process.env.npm_package_version ?? '0.1.0',
      uptimeSeconds: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
      checks: {
        database,
        ingestion: {
          status: ageSeconds === null ? 'unknown' : ageSeconds < 900 ? 'ok' : 'stale',
          lastSuccess: lastIngestion ? new Date(lastIngestion).toISOString() : null,
          ageSeconds,
        },
      },
    }
  })

  // ==========================================================================
  // RUTAS
  // ==========================================================================
  await app.register(registerAuthRoutes, { prefix: '/api/auth' })
  await app.register(registerEventRoutes, { prefix: '/api' })
  await app.register(registerLocationRoutes, { prefix: '/api' })
  await app.register(registerNotificationRoutes, { prefix: '/api' })
  await app.register(registerPreferenceRoutes, { prefix: '/api' })
  await app.register(registerSourcesRoutes, { prefix: '/api' })
  await app.register(registerGeocodeRoutes, { prefix: '/api' })

  // WebSocket de alertas en vivo
  await registerRealtimeRoutes(app)

  // Documentación: /docs (Swagger UI) y /openapi.json
  await registerDocsRoutes(app)

  app.addHook('onClose', async () => {
    hub.closeAll()
    wsConnections.set(0)
    if (ownsPrisma) await prisma.$disconnect()
  })

  return app
}
