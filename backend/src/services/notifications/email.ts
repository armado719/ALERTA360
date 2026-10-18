import axios from 'axios'
import { config } from '../../utils/config'
import logger from '../../utils/logger'

/**
 * Entrega por email con la API v3 de SendGrid.
 *
 * Sin `SENDGRID_API_KEY` no se intenta nada: la notificación queda en
 * `skipped` y el resto del sistema sigue funcionando.
 */

export interface EmailMessage {
  to: string
  subject: string
  text: string
}

export type DeliveryResult =
  | { status: 'sent' }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string }

export function emailConfigured(): boolean {
  return Boolean(config.SENDGRID_API_KEY && config.EMAIL_FROM)
}

export async function sendEmail(message: EmailMessage): Promise<DeliveryResult> {
  if (!emailConfigured()) {
    return { status: 'skipped', reason: 'SENDGRID_API_KEY no configurada' }
  }

  try {
    await axios.post(
      `${config.SENDGRID_BASE_URL}/v3/mail/send`,
      {
        personalizations: [{ to: [{ email: message.to }] }],
        from: { email: config.EMAIL_FROM, name: 'ALERTA360' },
        subject: message.subject,
        content: [{ type: 'text/plain', value: message.text }],
      },
      {
        timeout: 10000,
        headers: {
          Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    )
    return { status: 'sent' }
  } catch (err) {
    const detail = axios.isAxiosError(err)
      ? `${err.response?.status ?? 'sin respuesta'} ${JSON.stringify(err.response?.data ?? err.message)}`
      : (err as Error).message
    logger.error({ err: detail, to: message.to }, '[EMAIL] Fallo de SendGrid')
    return { status: 'failed', error: detail.slice(0, 500) }
  }
}
