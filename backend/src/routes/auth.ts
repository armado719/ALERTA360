import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import '@fastify/jwt'
import { requireAuth } from '../middleware/requireAuth'

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// Campos del usuario que pueden salir al cliente (nunca `passwordHash`).
const PUBLIC_USER = { id: true, email: true, username: true, phone: true } as const

export async function registerAuthRoutes(fastify: FastifyInstance) {
  const signToken = (user: { id: string; email: string }) =>
    (fastify as any).jwt.sign({ id: user.id, email: user.email }, { expiresIn: '7d' })

  // POST /auth/register — crea la cuenta y deja la sesión iniciada
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.errors })
    }
    const { email, username, password } = result.data

    const existing = await fastify.prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'User already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await fastify.prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        preferences: { create: {} },
      },
      select: { id: true, email: true, username: true },
    })

    return reply.status(201).send({ token: signToken(user), user })
  })

  // POST /auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.errors })
    }
    const { email, password } = result.data

    const user = await fastify.prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    return reply.send({
      token: signToken(user),
      user: { id: user.id, email: user.email, username: user.username },
    })
  })

  // GET /auth/me
  fastify.get('/me', { preHandler: requireAuth }, async (request: any, reply: FastifyReply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.id },
      select: PUBLIC_USER,
    })
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }
    return reply.send({ user })
  })
}
