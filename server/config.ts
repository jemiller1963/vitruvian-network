import path from 'node:path'
import { z } from 'zod'

const schema = z.object({
  host: z.enum(['127.0.0.1', '::1', 'localhost']),
  port: z.coerce.number().int().min(1024).max(65535),
  databasePath: z.string(),
  openclawConfigPath: z.string(),
  openclawBinary: z.string(),
  telemetryHmacSecret: z.string().min(32).nullable(),
  staticDir: z.string(),
  allowedOrigins: z.array(z.string()),
})

export type AppConfig = z.infer<typeof schema>

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  return schema.parse({
    host: env.VITRUVIAN_API_HOST ?? '127.0.0.1',
    port: env.VITRUVIAN_API_PORT ?? '50123',
    databasePath: path.resolve(env.VITRUVIAN_DATABASE_PATH ?? 'data/vitruvian.db'),
    openclawConfigPath: path.resolve(
      env.VITRUVIAN_OPENCLAW_CONFIG ?? '/home/jem/.openclaw/openclaw.json',
    ),
    openclawBinary: env.VITRUVIAN_OPENCLAW_BINARY ?? 'openclaw',
    telemetryHmacSecret: env.VITRUVIAN_TELEMETRY_HMAC_SECRET ?? null,
    staticDir: path.resolve(env.VITRUVIAN_STATIC_DIR ?? 'dist'),
    allowedOrigins: (
      env.VITRUVIAN_ALLOWED_ORIGINS ??
      'http://127.0.0.1:5173,http://localhost:5173'
    ).split(','),
  })
}
