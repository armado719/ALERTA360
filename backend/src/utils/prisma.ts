import { PrismaClient } from '@prisma/client'
import { FastifyInstance } from 'fastify'
import 'fastify'

declare module 'fastify' {
  interface FastifyInstance {
    prisma: PrismaClient
  }
}

export const prismaPlugin = {
  // Marker for dependency injection of PrismaClient
  name: 'prisma',
}

// Helper type for routes that need Prisma access
export type FastifyPrisma = FastifyInstance
