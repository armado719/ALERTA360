/**
 * Circuit breaker y tracking de frescura para fuentes de ingesta.
 *
 * Problema que resuelve: sin esto, una fuente caída se confunde con
 * "sin eventos" y el mapa se ve falso (tranquilo). Con el circuit breaker,
 * el estado pasa a `degraded` / `down` y se expone en `/api/sources/health`.
 *
 * Diseño (adpatado de world-intel-mcp/fetcher.py + freshness.py):
 * - 3 fallos consecutivos → `down`, con cooldown de 5 min.
 * - 30 min sin un fetch exitoso → `degraded` (respuesta vieja).
 * - Un fetch exitoso (aunque devuelva []) → `ok`, resetea el contador.
 */
import logger from '../../utils/logger'

/** Estados posibles de una fuente. */
export type SourceStatus = 'ok' | 'degraded' | 'down' | 'unknown'

interface SourceState {
  status: SourceStatus
  /** Fecha del último fetch exitoso. */
  lastSuccess: number | null
  /** Fecha del último fetch (éxito o fallo). */
  lastAttempt: number | null
  /** Fallos consecutivos desde el último éxito. */
  consecutiveFailures: number
}

const STALE_AFTER_MS = 30 * 60 * 1000 // 30 min
const COOLDOWN_AFTER_MS = 5 * 60 * 1000 // 5 min (circuito abierto)
const FAILURE_THRESHOLD = 3

/** Estado interno por fuente, accesible vía las funciones exportadas. */
const sources: Record<string, SourceState> = {}

function getState(source: string): SourceState {
  if (!sources[source]) {
    sources[source] = {
      status: 'unknown',
      lastSuccess: null,
      lastAttempt: null,
      consecutiveFailures: 0,
    }
  }
  return sources[source]
}

/**
 * ¿Se debe intentar fetch de esta fuente ahora?
 *
 * Retorna `false` cuando el circuito está abierto (`down`) y el cooldown
 * de 5 min aún no ha expirado. Siempre `true` en estado `ok`, `degraded`
 * o `unknown`.
 */
export function canFetch(source: string): boolean {
  const state = getState(source)
  if (state.status !== 'down') return true

  const elapsed = Date.now() - (state.lastAttempt ?? 0)
  if (elapsed >= COOLDOWN_AFTER_MS) {
    // Circuito semi-abierto: permitimos un intento
    state.status = 'degraded' as const
    return true
  }
  return false
}

/** Marca un fetch exituoso (aunque devuelva cero eventos). */
export function reportSuccess(source: string): void {
  const state = getState(source)
  state.lastSuccess = Date.now()
  state.lastAttempt = Date.now()
  state.consecutiveFailures = 0
  state.status = 'ok'
}

/**
 * Lo útil de un error para el log. Un AxiosError serializado completo trae
 * ~50 líneas de config por fallo y tapa el resto del log.
 */
function summarizeError(error: unknown) {
  if (!error || typeof error !== 'object') return error
  const e = error as { message?: string; code?: string; response?: { status?: number }; config?: { url?: string } }
  return { message: e.message, code: e.code, status: e.response?.status, url: e.config?.url }
}

/** Marca un fetch fallido. 3 fallos consecutivos → circuito abierto. */
export function reportFailure(source: string, error?: unknown): void {
  const state = getState(source)
  state.lastAttempt = Date.now()
  state.consecutiveFailures++

  if (state.consecutiveFailures >= FAILURE_THRESHOLD) {
    if (state.status !== 'down') {
      logger.warn(
        { source, failures: state.consecutiveFailures, error: summarizeError(error) },
        `[SOURCES] Circuit breaker abierto para ${source} — marcando down`
      )
    }
    state.status = 'down'
  } else {
    logger.warn(
      { source, failures: state.consecutiveFailures, error: summarizeError(error) },
      `[SOURCES] Fetch falló para ${source}`
    )
    state.status = 'degraded'
  }
}

/** Actualiza el estado de staleness (llamado por el scheduler cada ciclo). */
export function updateFreshness(source: string): void {
  const state = getState(source)
  if (state.status === 'down' || state.status === 'unknown') return

  const age = state.lastSuccess ? Date.now() - state.lastSuccess : Infinity
  if (age > STALE_AFTER_MS) {
    state.status = 'degraded'
  }
}

/** Estado de una fuente concreta (para /api/sources/health). */
export function getSourceStatus(source: string): SourceStatus {
  const state = getState(source)
  updateFreshness(source)
  return state.status
}

export interface SourceHealthEntry {
  source: string
  status: SourceStatus
  lastSuccess: string | null
  lastAttempt: string | null
  consecutiveFailures: number
}

/** Estado de todas las fuentes registradas. */
export function getAllSourceHealth(): {
  complete: boolean
  sources: SourceHealthEntry[]
  intervalMs: number
} {
  const sourceNames = Object.keys(sources)
  const entries: SourceHealthEntry[] = sourceNames.map(source => {
    const state = sources[source]
    updateFreshness(source)
    return {
      source,
      status: state.status,
      lastSuccess: state.lastSuccess ? new Date(state.lastSuccess).toISOString() : null,
      lastAttempt: state.lastAttempt ? new Date(state.lastAttempt).toISOString() : null,
      consecutiveFailures: state.consecutiveFailures,
    }
  })

  const complete = entries.every(e => e.status === 'ok')

  return {
    complete,
    sources: entries,
    intervalMs: 0, // se setea en app.ts
  }
}

/** Registra una fuente para que aparezca en /api/sources/health aunque no haya sido fetchada todavía. */
export function registerSource(source: string): void {
  getState(source) // inicializa el estado si no existe
}
