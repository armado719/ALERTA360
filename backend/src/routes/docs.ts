import type { FastifyInstance } from 'fastify'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { openApiDocument } from '../docs/openapi'
import { config } from '../utils/config'

/**
 * Documentación de la API.
 *
 * - `/openapi.json` → especificación OpenAPI 3.0
 * - `/docs`         → Swagger UI
 *
 * Se apaga con `DOCS_ENABLED=false` (útil si no quieres exponerla).
 */
export async function registerDocsRoutes(app: FastifyInstance) {
  if (config.DOCS_ENABLED !== 'true') return

  await app.register(swagger, {
    mode: 'static',
    specification: { document: openApiDocument as never },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      persistAuthorization: true,
    },
  })

  app.get('/openapi.json', async () => openApiDocument)
}
