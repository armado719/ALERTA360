import axios from 'axios'
import { config } from '../../utils/config'
import logger from '../../utils/logger'
import type { DeliveryResult } from './email'

/**
 * Entrega por SMS con la API REST de Twilio (Messages).
 *
 * Solo se manda a números en formato E.164 (`+573001234567`). Sin
 * credenciales, la notificación queda en `skipped`.
 */

export interface SmsMessage {
  to: string
  body: string
}

/** Formato E.164: + y entre 8 y 15 dígitos. */
export const E164 = /^\+[1-9]\d{7,14}$/

export function smsConfigured(): boolean {
  return Boolean(
    config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN && config.TWILIO_FROM_NUMBER
  )
}

export async function sendSms(message: SmsMessage): Promise<DeliveryResult> {
  if (!smsConfigured()) {
    return { status: 'skipped', reason: 'Twilio no configurado' }
  }
  if (!E164.test(message.to)) {
    return { status: 'failed', error: 'Teléfono no está en formato E.164' }
  }

  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM_NUMBER: from } = config
  const auth = Buffer.from(`${sid}:${token}`).toString('base64')

  try {
    await axios.post(
      `${config.TWILIO_BASE_URL}/2010-04-01/Accounts/${sid}/Messages.json`,
      new URLSearchParams({ To: message.to, From: from, Body: message.body }).toString(),
      {
        timeout: 10000,
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    )
    return { status: 'sent' }
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `${err.response?.status ?? 'sin respuesta'} ${JSON.stringify(err.response?.data ?? err.message)}`
      : (err as Error).message
    logger.error({ err: detail, to: message.to }, '[SMS] Fallo de Twilio')
    return { status: 'failed', error: detail.slice(0, 500) }
  }
}
