/**
 * Tests de `sendPush` con `web-push` mockeado (sin tocar la red ni VAPID real).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('web-push', () => ({
  setVapidDetails: vi.fn(),
  sendNotification: vi.fn().mockResolvedValue(undefined),
}))
import * as webpush from 'web-push'
import { sendPush } from '../src/services/push'

const SUB = { endpoint: 'https://fcm/send/abc', keys: { p256dh: 'a', auth: 'b' } }

describe('sendPush (web-push mock)', () => {
  beforeEach(() => {
    vi.mocked(webpush.sendNotification).mockClear()
    vi.mocked(webpush.setVapidDetails).mockClear()
  })

  it('envía el payload como JSON y devuelve true si el proveedor acepta', async () => {
    vi.mocked(webpush.sendNotification).mockResolvedValue(undefined)
    const payload = { title: 'Sismo', body: 'a 12 km', data: { eventId: 'ev-1' } }
    const ok = await sendPush(SUB, payload)
    expect(ok).toBe(true)
    expect(webpush.sendNotification).toHaveBeenCalledTimes(1)
    expect(webpush.sendNotification).toHaveBeenCalledWith(
      SUB,
      JSON.stringify(payload)
    )
  })

  it('devuelve false (sin lanzar) cuando no hay subscription', async () => {
    expect(await sendPush(null, { title: 'x' })).toBe(false)
    expect(await sendPush(undefined, { title: 'x' })).toBe(false)
    expect(webpush.sendNotification).not.toHaveBeenCalled()
  })

  it('devuelve false (sin lanzar) si el proveedor responde 410 Gone', async () => {
    const err: any = new Error('Gone')
    err.statusCode = 410
    vi.mocked(webpush.sendNotification).mockRejectedValue(err)
    const ok = await sendPush(SUB, { title: 'x' })
    expect(ok).toBe(false)
  })

  it('devuelve false si el proveedor lanza un error genérico', async () => {
    vi.mocked(webpush.sendNotification).mockRejectedValue(new Error('boom'))
    const ok = await sendPush(SUB, { title: 'x' })
    expect(ok).toBe(false)
  })
})
