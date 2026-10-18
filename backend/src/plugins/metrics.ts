import type { FastifyInstance } from 'fastify'
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client'

/**
 * Métricas Prometheus de ALERTA360.
 *
 * Se exponen en GET /metrics (solo red interna: Prometheus lo raspa dentro de
 * la red de Docker; nginx no publica esa ruta).
 */

export const registry = new Registry()

registry.setDefaultLabels({ app: 'alerta360-backend' })

// CPU, memoria, event loop, GC, handles abiertos…
collectDefaultMetrics({ register: registry, prefix: 'alerta360_' })

/** Duración de cada petición HTTP, por método, ruta y código de estado. */
export const httpRequestDuration = new Histogram({
  name: 'alerta360_http_request_duration_seconds',
  help: 'Duración de las peticiones HTTP en segundos',
  labelNames: ['method', 'route', 'status'] as const,
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  registers: [registry],
})

/** Peticiones HTTP totales. */
export const httpRequestsTotal = new Counter({
  name: 'alerta360_http_requests_total',
  help: 'Total de peticiones HTTP',
  labelNames: ['method', 'route', 'status'] as const,
  registers: [registry],
})

/** Marca de tiempo (epoch) de la última ingesta correcta. */
export const ingestionLastSuccess = new Gauge({
  name: 'alerta360_ingestion_last_success_timestamp_seconds',
  help: 'Epoch de la última ingesta completada sin errores',
  registers: [registry],
})

/** Última ingesta correcta (para /health). */
let lastIngestionTimestamp: number | null = null

export function markIngestionSuccess(): void {
  lastIngestionTimestamp = Date.now()
  ingestionLastSuccess.set(lastIngestionTimestamp / 1000)
}

export function getLastIngestionTimestamp(): number | null {
  return lastIngestionTimestamp
}

/** Duración del último ciclo de ingesta. */
export const ingestionCycleDuration = new Gauge({
  name: 'alerta360_ingestion_cycle_duration_seconds',
  help: 'Duración del último ciclo de ingesta en segundos',
  registers: [registry],
})

/** Eventos nuevos insertados, por fuente. */
export const ingestionEventsTotal = new Counter({
  name: 'alerta360_ingestion_events_total',
  help: 'Eventos nuevos insertados por fuente',
  labelNames: ['source'] as const,
  registers: [registry],
})

/** Errores de ingesta, por fuente. */
export const ingestionErrorsTotal = new Counter({
  name: 'alerta360_ingestion_errors_total',
  help: 'Errores de ingesta por fuente',
  labelNames: ['source'] as const,
  registers: [registry],
})

/** Número de eventos activos en la base de datos (se refresca en cada ingesta). */
export const activeEventsGauge = new Gauge({
  name: 'alerta360_active_events',
  help: 'Eventos activos almacenados',
  registers: [registry],
})

/**
 * Registra los hooks de instrumentación HTTP.
 * Se llama una sola vez, antes de registrar las rutas.
 */
export function registerHttpMetrics(app: FastifyInstance) {
  app.addHook('onResponse', async (request, reply) => {
    // Ruta normalizada (evita una serie por cada id)
    const route = request.routeOptions?.url ?? request.url.split('?')[0]
    const labels = {
      method: request.method,
      route,
      status: String(reply.statusCode),
    }

    const seconds = reply.elapsedTime / 1000
    httpRequestDuration.observe(labels, seconds)
    httpRequestsTotal.inc(labels)
  })
}

/** Expone GET /metrics. */
export async function registerMetricsRoute(app: FastifyInstance) {
  app.get('/metrics', async (_request, reply) => {
    reply.header('Content-Type', registry.contentType)
    return registry.metrics()
  })
}

// ============================================================================
// MOTOR DE ALERTAS
// ============================================================================

/** Notificaciones creadas, por canal. */
export const notificationsCreated = new Counter({
  name: 'alerta360_notifications_created_total',
  help: 'Notificaciones creadas por el motor de alertas, por canal',
  labelNames: ['channel'] as const,
  registers: [registry],
})

/** Eventos procesados por el motor (uno por evento nuevo). */
export const matchingRuns = new Counter({
  name: 'alerta360_matching_runs_total',
  help: 'Eventos evaluados por el motor de alertas',
  registers: [registry],
})

/** Eventos que coincidieron con al menos un usuario. */
export const matchingMatches = new Counter({
  name: 'alerta360_matching_matches_total',
  help: 'Eventos que coincidieron con al menos un usuario',
  registers: [registry],
})

/** Duración del matching de un evento. */
export const matchingDuration = new Histogram({
  name: 'alerta360_matching_duration_seconds',
  help: 'Duración del matching de un evento en segundos',
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2],
  registers: [registry],
})

/** Conexiones WebSocket abiertas (se actualiza al conectar/desconectar). */
export const wsConnections = new Gauge({
  name: 'alerta360_ws_connections',
  help: 'Conexiones WebSocket de alertas abiertas',
  registers: [registry],
})
