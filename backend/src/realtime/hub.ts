/**
 * Hub de WebSockets para empujar alertas a los usuarios conectados.
 *
 * Sin estado externo: el backend corre en una sola instancia (ver runbook,
 * sección de capacidad). Si algún día hay varias réplicas habrá que pasar a
 * Redis pub/sub; el resto del motor no cambia.
 */

/** Lo mínimo que usamos de un socket, para no acoplar el hub a `ws`. */
export interface SocketLike {
  readyState: number
  send: (data: string) => void
}

const OPEN = 1

export interface AlertPayload {
  type: 'alert'
  notificationId?: string
  eventId: string
  title: string
  severity: string
  distanceKm: number
  channels: string[]
  occurredAt: string
  latitude: number
  longitude: number
}

export class AlertHub {
  private clients = new Map<string, Set<SocketLike>>()

  /** Conexiones activas (todas). */
  get size(): number {
    let total = 0
    for (const sockets of this.clients.values()) total += sockets.size
    return total
  }

  add(userId: string, socket: SocketLike): void {
    const current = this.clients.get(userId) ?? new Set<SocketLike>()
    current.add(socket)
    this.clients.set(userId, current)
  }

  remove(userId: string, socket: SocketLike): void {
    const current = this.clients.get(userId)
    if (!current) return
    current.delete(socket)
    if (current.size === 0) this.clients.delete(userId)
  }

  /** Envía a un usuario y devuelve cuántos sockets recibieron el mensaje. */
  sendToUser(userId: string, payload: AlertPayload): number {
    const sockets = this.clients.get(userId)
    if (!sockets || sockets.size === 0) return 0

    const message = JSON.stringify(payload)
    let delivered = 0
    for (const socket of sockets) {
      if (socket.readyState !== OPEN) continue
      try {
        socket.send(message)
        delivered++
      } catch {
        // Socket roto: se limpia en el evento `close`; aquí solo se ignora.
      }
    }
    return delivered
  }

  /** Cierra todas las conexiones (apagado ordenado y tests). */
  closeAll(): void {
    this.clients.clear()
  }
}
