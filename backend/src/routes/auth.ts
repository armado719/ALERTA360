import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcrypt'
import { z } from 'zod'
import '@fastify/jwt'

const prisma = new PrismaClient()

const RegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
})

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

// Reusable preHandler for JWT auth
function requireAuth() {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await request.jwtVerify()
    } catch (err) {
      reply.send(err)
    }
  }
}

export async function registerAuthRoutes(fastify: FastifyInstance) {
  // POST /auth/register
  fastify.post('/register', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = RegisterSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.errors })
    }
    const { email, username, password } = result.data

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return reply.status(409).send({ error: 'User already exists' })
    }

    const passwordHash = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: {
        email,
        username,
        passwordHash,
        preferences: { create: {} },
      },
      select: { id: true, email: true, username: true, createdAt: true, updatedAt: true },
    })

    return reply.status(201).send({ user })
  })

  // POST /auth/login
  fastify.post('/login', async (request: FastifyRequest, reply: FastifyReply) => {
    const result = LoginSchema.safeParse(request.body)
    if (!result.success) {
      return reply.status(400).send({ error: 'Invalid input', details: result.error.errors })
    }
    const { email, password } = result.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return reply.status(401).send({ error: 'Invalid credentials' })
    }

    const token = (fastify as any).jwt.sign(
      { id: user.id, email: user.email },
      { expiresIn: '7d' }
    )

    return reply.send({ token, user: { id: user.id, email: user.email, username: user.username } })
  })

  // GET /auth/me
  fastify.get('/me', { preHandler: [requireAuth()] }, async (request: any, reply: FastifyReply) => {
    const user = await prisma.user.findUnique({
      where: { id: request.user.id },
      include: { preferences: true, locations: true },
    })
    if (!user) {
      return reply.status(404).send({ error: 'User not found' })
    }
    return reply.send({ user })
  })
}
