/**
 * Rutas de geocodificación (Nominatim).
 *
 * - GET /api/geocode/search?q=<ciudad>   — búsqueda directa (nombre → coords)
 * - GET /api/geocode/reverse?lat=&lon=   — búsqueda inversa (coords → nombre)
 *
 * Políticas:
 *   - Caché en memoria con TTL de 30 días (evita reconsultas repetidas).
 *   - Rate limit estricto de 1 request/segundo (política de Nominatim).
 *     Se procesa con cola FIFO: si llegan requests simultáneos se atienden
 *     con 1 s de spacing.
 *   - Desactivable vía GEOCODE_ENABLED=false (por defecto: true).
 */
import type { FastifyInstance } from 'fastify'
import type { FastifyRequest } from 'fastify'
import axios from 'axios'
import { z } from 'zod'
import { config } from '../utils/config'

export interface GeocodeResult {
  name: string
  lat: number
  lon: number
  display_name: string
  type?: string
}

/** Respuesta de reverse geocoding: coords → nombre legible. */
export interface ReverseResult {
  name: string
  display_name: string
  lat: number
  lon: number
}

const CACHE_TTL = 30 * 24 * 60 * 60 * 1000 // 30 días
const RATE_INTERVAL_MS = 1100 // Nominatim pide mínimo 1 req/s

// Estado de caché + rate limit global (un solo proceso backend)
const cache = new Map<string, { result: unknown; expiry: number }>()
let lastRequestAt = 0
let pending: Promise<unknown> = Promise.resolve()

/**
 * Serializa requests a Nominatim respetando el rate limit de 1 req/s.
 * Si un request llega antes de que el spacing expire, se encola.
 */
function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  pending = pending.then(async () => {
    const now = Date.now()
    const elapsed = now - lastRequestAt
    if (elapsed < RATE_INTERVAL_MS) {
      await new Promise((r) => setTimeout(r, RATE_INTERVAL_MS - elapsed))
    }
    lastRequestAt = Date.now()
    return fn()
  })
  return pending as unknown as Promise<T>
}

function fromCache<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && entry.expiry > Date.now()) {
    return entry.result as T
  }
  if (entry) cache.delete(key)
  return null
}

function setCache(key: string, result: unknown): void {
  cache.set(key, { result, expiry: Date.now() + CACHE_TTL })
}

/** Mapea la respuesta cruda de Nominatim a GeocodeResult[], filtrando ítems sin coordenadas. (pura — testeable sin red) */
export function mapNominatimResults(items: Array<Record<string, unknown>>): GeocodeResult[] {
  return items
    .map(
      (item): GeocodeResult => ({
        name: String(item.display_name || '').split(',')[0].trim(),
        lat: parseFloat(String(item.lat)),
        lon: parseFloat(String(item.lon)),
        display_name: String(item.display_name || ''),
        type: typeof item.type === 'string' ? item.type : undefined,
      })
    )
    .filter((r) => !Number.isNaN(r.lat) && !Number.isNaN(r.lon))
}

export async function registerGeocodeRoutes(app: FastifyInstance) {
  // GET /api/geocode/search?q=ciudad
  app.get(
    '/geocode/search',
    { preHandler: requireGeocodeEnabled },
    async (request: FastifyRequest, reply) => {
      const parsed = z.object({ q: z.string().min(2, 'Mínimo 2 caracteres') }).safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({ error: parsed.error.errors[0].message })
      }

      const cacheKey = `search:${parsed.data.q.toLowerCase()}`
      const cached = fromCache<GeocodeResult[]>(cacheKey)
      if (cached) return cached

      const results = await enqueue(async () => {
        const res = await axios.get(`${config.NOMINATIM_URL}/search`, {
          params: {
            q: parsed.data.q,
            format: 'jsonv2',
            addressdetails: 1,
            limit: 5,
            email: 'arc.fullstack30@gmail.com',
          },
          headers: { 'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)' },
          timeout: 10000,
        })

        return mapNominatimResults(res.data as Array<Record<string, unknown>>)
      })

      setCache(cacheKey, results)
      return results
    }
  )

  // GET /api/geocode/reverse?lat=4.7&lon=-74.0
  app.get(
    '/geocode/reverse',
    { preHandler: requireGeocodeEnabled },
    async (request: FastifyRequest, reply) => {
      const parsed = z
        .object({ lat: z.coerce.number(), lon: z.coerce.number() })
        .safeParse(request.query)
      if (!parsed.success) {
        return reply.status(400).send({ error: 'Parámetros lat y lon requeridos' })
      }

      const cacheKey = `reverse:${parsed.data.lat.toFixed(4)},${parsed.data.lon.toFixed(4)}`
      const cached = fromCache<ReverseResult>(cacheKey)
      if (cached) return cached

      const result = await enqueue(async () => {
        const res = await axios.get(`${config.NOMINATIM_URL}/reverse`, {
          params: {
            lat: parsed.data.lat,
            lon: parsed.data.lon,
            format: 'jsonv2',
            addressdetails: 1,
            email: 'arc.fullstack30@gmail.com',
          },
          headers: { 'User-Agent': 'ALERTA360 (arc.fullstack30@gmail.com)' },
          timeout: 10000,
        })

        const data = res.data as Record<string, unknown>
        const addr = data.address as Record<string, string> | undefined
        return {
          name: (addr && (addr.city || addr.town || addr.village || addr.state)) || String(data.name || data.display_name || ''),
          display_name: String(data.display_name || ''),
          lat: parseFloat(String(data.lat)),
          lon: parseFloat(String(data.lon)),
        } as ReverseResult
      })

      setCache(cacheKey, result)
      return result
    }
  )
}

// `async` es obligatorio: un preHandler síncrono sin `done()` deja la petición
// colgada para siempre cuando la geocodificación está activa.
async function requireGeocodeEnabled(_request: FastifyRequest, reply: import('fastify').FastifyReply) {
  if (config.GEOCODE_ENABLED !== 'true') {
    return reply.status(503).send({ error: 'Geocodificación deshabilitada' })
  }
}
