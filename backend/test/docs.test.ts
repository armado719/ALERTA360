import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app'

describe('Documentación de la API', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    // /docs y /openapi.json no tocan la base de datos
    app = await buildApp({ prisma: {} as PrismaClient })
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('sirve la especificación OpenAPI', async () => {
    const res = await app.inject({ method: 'GET', url: '/openapi.json' })
    expect(res.statusCode).toBe(200)

    const spec = res.json()
    expect(spec.openapi).toMatch(/^3\./)
    expect(spec.info.title).toBe('ALERTA360 API')
    expect(Object.keys(spec.paths).length).toBeGreaterThanOrEqual(12)
  })

  it('documenta los endpoints del motor de alertas', async () => {
    const spec = (await app.inject({ method: 'GET', url: '/openapi.json' })).json()

    for (const path of [
      '/health',
      '/api/events',
      '/api/notifications',
      '/api/notifications/unread-count',
      '/api/notifications/read-all',
      '/api/preferences',
    ]) {
      expect(spec.paths[path], `falta ${path}`).toBeDefined()
    }

    expect(spec.components.securitySchemes.bearerAuth.scheme).toBe('bearer')
  })

  it('sirve Swagger UI en /docs', async () => {
    const res = await app.inject({ method: 'GET', url: '/docs' })
    expect([200, 302]).toContain(res.statusCode)
    if (res.statusCode === 200) {
      expect(res.headers['content-type']).toContain('text/html')
    }
  })
})
