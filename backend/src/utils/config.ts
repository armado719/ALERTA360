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
  // --- Web Push (notificaciones offline cuando el WS no está conectado) ---
  VAPID_PUBLIC_KEY: z
    .string()
    .default('BPxbliXzBcrNeL6NLG_b1TiD3h3NhKHkJApJEJqYwYMVLqBrBZ7GjQtHE3A3Q2LpBszyczHUnZ2-9wrOwWjl6CU'),
  VAPID_PRIVATE_KEY: z
    .string()
    .default('Zb_N1XzCO5Rp3uD-Ow1g_1GrICIB-A2eN7GMx830MOI'),
  // --- Documentación ---
  DOCS_ENABLED: z.string().default('true'),

  USGS_ENABLED: z.string().default('true'),
  NOAA_ENABLED: z.string().default('true'),
  EONET_ENABLED: z.string().default('true'),
  EONET_BBOX: z.string().optional().default(''),
  EONET_DAYS: z.coerce.number().default(30),
  GDACS_ENABLED: z.string().default('true'),
  GDACS_DAYS: z.coerce.number().default(30),
  GEOCODE_ENABLED: z.string().default('true'),
  NOMINATIM_URL: z.string().default('https://nominatim.openstreetmap.org'),
  INGEST_INTERVAL: z.coerce.number().default(300000),
  STALE_AFTER_MINUTES: z.coerce.number().default(30),
  DIGEST_ENABLED: z.string().default('false'),
  DIGEST_HOUR: z.coerce.number().default(8),
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
