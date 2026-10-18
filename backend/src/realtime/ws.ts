import type { FastifyInstance, FastifyRequest } from 'fastify'
import logger from '../utils/logger'
import { wsConnections } from '../plugins/metrics'

interface JwtPayload {
  id: string
  email?: string
}

/** Acepta el token por query (`?token=`) o por cabecera `Authorization`. */
function extractToken(request: FastifyRequest): string | null {
  const fromQuery = (request.query as Record<string, unknown> | undefined)?.token
  if (typeof fromQuery === 'string' && fromQuery.length > 0) return fromQuery

  const header = request.headers.authorization
  if (header?.startsWith('Bearer ')) return header.slice(7)
  return null
}

/**
 * `GET /ws/alerts?token=<jwt>`
 *
 * Canal de push en vivo: el motor de matching envía por aquí cada alerta que
 * corresponde al usuario conectado. Requiere JWT válido; sin él se cierra con
 * el código 1008 (policy violation).
 *
 * Nota: @fastify/websocket v8 entrega un envoltorio con `.socket`; las
 * versiones nuevas entregan el socket directamente, así que se aceptan ambos.
 */
export async function registerRealtimeRoutes(app: FastifyInstance) {
  app.get('/ws/alerts', { websocket: true }, (connection: any, request: FastifyRequest) => {
    const socket: any = connection?.socket ?? connection

    const token = extractToken(request)
    if (!token) {
      socket.close(1008, 'Missing token')
      return
    }

    let userId: string
    try {
      const payload = app.jwt.verify<JwtPayload>(token)
      userId = payload.id
    } catch {
      socket.close(1008, 'Invalid token')
      return
    }

    app.hub.add(userId, socket)
    wsConnections.set(app.hub.size)
    logger.debug({ userId, sockets: app.hub.size }, '[WS] Cliente conectado')

    socket.send(JSON.stringify({ type: 'ready', userId }))

    const cleanup = () => {
      app.hub.remove(userId, socket)
      wsConnections.set(app.hub.size)
      logger.debug({ userId, sockets: app.hub.size }, '[WS] Cliente desconectado')
    }

    socket.on('close', cleanup)
    socket.on('error', cleanup)
  })
}
