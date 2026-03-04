/**
 * Environment Configuration
 *
 * Zod-validated configuration with startup validation.
 * All env vars are validated at import time.
 */

import { z } from 'zod';

const configSchema = z.object({
  // Server
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().default('postgresql://localhost:5432/pikspeak'),

  // Auth
  JWT_SECRET: z.string().optional(),
  JWT_REFRESH_SECRET: z.string().optional(),

  // External APIs
  API_FOOTBALL_KEY: z.string().optional(),
  ODDS_API_KEY: z.string().optional(),

  // LLM
  PREDICTION_MODEL: z.string().default('claude-sonnet-4-5-20250514'),
  ANTHROPIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),

  // Redis
  REDIS_URL: z.string().optional(),

  // CORS
  CORS_ORIGINS: z.string().optional(),

  // Admin
  ADMIN_API_KEY: z.string().optional(),

  // RevenueCat
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
});

type Config = z.infer<typeof configSchema>;

let _config: Config | null = null;

export function getConfig(): Config {
  if (!_config) {
    const result = configSchema.safeParse(process.env);
    if (!result.success) {
      console.error('[Config] Validation errors:');
      for (const issue of result.error.issues) {
        console.error(`  - ${issue.path.join('.')}: ${issue.message}`);
      }
      throw new Error('Invalid configuration');
    }
    _config = result.data;

    // Production checks
    if (_config.NODE_ENV === 'production') {
      const required = ['JWT_SECRET', 'DATABASE_URL', 'API_FOOTBALL_KEY'] as const;
      const missing = required.filter((key) => !_config![key]);
      if (missing.length > 0) {
        throw new Error(`Missing required production env vars: ${missing.join(', ')}`);
      }
    }
  }

  return _config;
}

// Validate config at import time
export const config = getConfig();
