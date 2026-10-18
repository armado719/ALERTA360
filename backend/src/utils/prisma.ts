import { PrismaClient } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import type { AlertHub } from '../realtime/hub'
import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    /** Cliente Prisma compartido (se inyecta en `buildApp`). */
    prisma: PrismaClient
    /** Conexiones WebSocket por usuario, para empujar alertas en vivo. */
    hub: AlertHub
  }
}

export const prismaPlugin = {
  // Marker for dependency injection of PrismaClient
  name: 'prisma',
}

// Helper type for routes that need Prisma access
export type FastifyPrisma = FastifyInstance
