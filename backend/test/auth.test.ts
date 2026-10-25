import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'

// ============================================================================
// Prisma en memoria — solo `user.findUnique` y `user.create`, respetando
// `select` para poder comprobar qué campos salen al cliente
// ============================================================================

type UserRow = {
  id: string
  email: string
  username: string
  passwordHash: string
  phone: string | null
}

function pick(row: UserRow, select?: Record<string, boolean>) {
  if (!select) return { ...row }
  return Object.fromEntries(Object.keys(select).filter((k) => select[k]).map((k) => [k, (row as any)[k]]))
}

function createFakePrisma() {
  const users: UserRow[] = []
  const prisma = {
    user: {
      findUnique: async ({ where, select }: { where: { id?: string; email?: string }; select?: Record<string, boolean> }) => {
        const row = users.find((u) => (where.id ? u.id === where.id : u.email === where.email))
        return row ? pick(row, select) : null
      },
      create: async ({ data, select }: { data: Omit<UserRow, 'id' | 'phone'>; select?: Record<string, boolean> }) => {
        const row: UserRow = {
          id: `user-${users.length + 1}`,
          email: data.email,
          username: data.username,
          passwordHash: data.passwordHash,
          phone: null,
        }
        users.push(row)
        return pick(row, select)
      },
    },
  }
  return prisma as unknown as PrismaClient
}

// ============================================================================
// Suite
// ============================================================================

describe('API de autenticación', () => {
  let app: FastifyInstance
  const credentials = { email: 'ana@alerta360.test', username: 'ana', password: 'clave-de-prueba' }

  beforeAll(async () => {
    app = await buildApp({ prisma: createFakePrisma() })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('el registro devuelve un token válido (la sesión queda iniciada)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials })
    expect(res.statusCode).toBe(201)
    const body = res.json()
    expect(body.user).toEqual({ id: 'user-1', email: credentials.email, username: 'ana' })
    expect(typeof body.token).toBe('string')

    const me = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${body.token}` },
    })
    expect(me.statusCode).toBe(200)
  })

  it('rechaza un registro con el correo repetido (409)', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/auth/register', payload: credentials })
    expect(res.statusCode).toBe(409)
  })

  it('el login devuelve token y usuario; con clave errónea responde 401', async () => {
    const ok = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: credentials.email, password: credentials.password },
    })
    expect(ok.statusCode).toBe(200)
    expect(ok.json().user.username).toBe('ana')

    const bad = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: { email: credentials.email, password: 'otra-clave' },
    })
    expect(bad.statusCode).toBe(401)
  })

  it('/auth/me nunca expone el hash de la contraseña', async () => {
    const token = app.jwt.sign({ id: 'user-1', email: credentials.email })
    const res = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: { authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const { user } = res.json()
    expect(user).toEqual({ id: 'user-1', email: credentials.email, username: 'ana', phone: null })
    expect(user).not.toHaveProperty('passwordHash')
  })
})
