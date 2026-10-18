import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  // Lista separada por comas: "https://alerta360.com,https://www.alerta360.com"
  CORS_ORIGIN: z.string().default('http://localhost:5173,http://127.0.0.1:5173'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  // --- Entrega de notificaciones ---
  // Sin API key, el canal queda en `skipped` (no rompe nada).
  SENDGRID_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('alertas@alerta360.com'),
  SENDGRID_BASE_URL: z.string().default('https://api.sendgrid.com'),
  TWILIO_ACCOUNT_SID: z.string().default(''),
  TWILIO_AUTH_TOKEN: z.string().default(''),
  TWILIO_FROM_NUMBER: z.string().default(''),
  TWILIO_BASE_URL: z.string().default('https://api.twilio.com'),
  // --- Documentación ---
  DOCS_ENABLED: z.string().default('true'),

  USGS_ENABLED: z.string().default('true'),
  NOAA_ENABLED: z.string().default('true'),
  INGEST_INTERVAL: z.coerce.number().default(300000),
})

type Config = z.infer<typeof ConfigSchema>

const _parsed = ConfigSchema.safeParse(process.env)

if (!_parsed.success) {
  const issues = _parsed.error.issues
    .map(i => `  - ${i.path.join('.')}: ${i.message}`)
    .join('\n')
  console.error(`[CONFIG] Invalid environment:\n${issues}`)
  process.exit(1)
}

export const config: Config = _parsed.data
