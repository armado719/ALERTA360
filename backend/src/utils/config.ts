import { z } from 'zod'
import dotenv from 'dotenv'

dotenv.config()

const ConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
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
