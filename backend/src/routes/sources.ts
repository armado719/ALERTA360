import type { FastifyInstance } from 'fastify'
import { getAllSourceHealth } from '../services/sources/health'
import { config } from '../utils/config'

/**
 * GET /api/sources/health
 *
 * Distintge "no hay eventos" de "el proveedor está caído".
 *
 * - `complete: true`  → todas las fuentes están en `ok`.
 * - `complete: false` → al menos una fuente está `degraded` o `down`.
 *   El mapa puede estar incompleto.
 */
export async function registerSourcesRoutes(app: FastifyInstance) {
  app.get('/sources/health', async (_request, _reply) => {
    const health = getAllSourceHealth()
    return {
      ...health,
      intervalMs: config.INGEST_INTERVAL,
    }
  })
}
