import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { z } from 'zod'
import { requireAuth } from '../middleware/requireAuth'
import { E164 } from '../services/notifications/sms'

/**
 * Preferencias de alerta del usuario: radio, tipos, severidad mínima y canales.
 * El motor de matching las lee en cada evento (`services/matching.ts`).
 */

export const DISASTER_TYPES = [
  'earthquake',
  'storm',
  'flood',
  'rain',
  'landslide',
  'volcanic',
  'hurricane',
] as const

const UpdateSchema = z
  .object({
    alertRadiusKm: z.number().int().min(1).max(2000),
    disasterTypes: z.array(z.enum(DISASTER_TYPES)).max(DISASTER_TYPES.length),
    minSeverity: z.enum(['low', 'medium', 'high', 'critical']),
    pushEnabled: z.boolean(),
    emailEnabled: z.boolean(),
    smsEnabled: z.boolean(),
    // El teléfono vive en User, pero se gestiona desde aquí: es donde el
    // usuario decide si quiere SMS. Formato E.164 (+573001234567).
    phone: z
      .string()
      .regex(E164, 'El teléfono debe tener formato E.164, por ejemplo +573001234567')
      .nullable(),
  })
  .partial()

const DEFAULTS = {
  alertRadiusKm: 50,
  disasterTypes: ['earthquake', 'storm', 'flood', 'rain'],
  minSeverity: 'low',
  pushEnabled: true,
  emailEnabled: true,
  smsEnabled: false,
}

export async function registerPreferenceRoutes(fastify: FastifyInstance) {
  // GET /api/preferences — crea las de defecto si el usuario no tiene
  fastify.get(
    '/preferences',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = (request as any).user.id as string
      const preferences = await fastify.prisma.userPreference.upsert({
        where: { userId },
        update: {},
        create: { userId, ...DEFAULTS },
      })
      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      })
      return reply.send({ ...preferences, phone: user?.phone ?? null })
    }
  )

  // PUT /api/preferences — actualización parcial
  fastify.put(
    '/preferences',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const parsed = UpdateSchema.safeParse(request.body ?? {})
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Invalid input', details: parsed.error.errors })
      }

      const userId = (request as any).user.id as string
      const { phone, ...preferencesData } = parsed.data

      const preferences = await fastify.prisma.userPreference.upsert({
        where: { userId },
        update: preferencesData,
        create: { userId, ...DEFAULTS, ...preferencesData },
      })

      if (phone !== undefined) {
        await fastify.prisma.user.update({ where: { id: userId }, data: { phone } })
      }

      const user = await fastify.prisma.user.findUnique({
        where: { id: userId },
        select: { phone: true },
      })
      return reply.send({ ...preferences, phone: user?.phone ?? null })
    }
  )
}
