/**
 * Environment Configuration
 *
 * Zod-validated configuration with startup validation.
 * All env vars are validated at import time.
 */

import { z } from 'zod';

const envBool = z.preprocess((value) => {
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  }
  return value;
}, z.boolean());

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
  API_FOOTBALL_MAX_REQUESTS: z.coerce.number().int().min(0).default(0),
  API_FOOTBALL_SEASON_MODE: z.enum(['auto', 'range', 'list', 'all']).default('auto'),
  API_FOOTBALL_SEASON_LIST: z.string().default(''),
  API_FOOTBALL_SEASON_FROM: z.coerce.number().int().min(1900).max(2100).default(2022),
  API_FOOTBALL_SEASON_TO: z.coerce.number().int().min(1900).max(2100).default(2024),
  ODDS_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),

  // LLM (via Vercel AI Gateway)
  AI_GATEWAY_API_KEY: z.string().optional(),
  AI_GATEWAY_BASE_URL: z.string().optional(),
  PREDICTION_MODEL: z.string().default('anthropic/claude-sonnet-4-5-20250514'),
  ENSEMBLE_MODELS: z.string().optional(),

  // Context enrichment
  WEB_INTEL_ENABLED: envBool.default(false),
  WEB_INTEL_RECENCY_HOURS: z.coerce.number().int().positive().default(72),
  WEB_INTEL_MAX_QUERIES_PER_MATCH: z.coerce.number().int().positive().default(2),
  WEB_INTEL_MAX_RESULTS_PER_QUERY: z.coerce.number().int().positive().default(5),
  WEB_INTEL_TIMEOUT_MS: z.coerce.number().int().positive().default(6000),
  WEATHER_INTEL_ENABLED: envBool.default(false),
  LOCATION_INTEL_ENABLED: envBool.default(false),

  // Scheduling (UTC)
  CRON_FIXTURE_SYNC_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(3),
  CRON_PIPELINE_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(6),
  CRON_REPREDICTION_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(10),
  CRON_RESULT_TRACKER_MINUTE_UTC: z.coerce.number().int().min(0).max(59).default(30),
  CRON_METRICS_HOUR_UTC: z.coerce.number().int().min(0).max(23).default(23),
  CRON_CLOSING_ODDS_MINUTE_UTC: z.coerce.number().int().min(0).max(59).default(15),
  CRON_CLOSING_ODDS_INTERVAL_HOURS: z.coerce.number().int().min(1).max(24).default(2),

  // Fixture sync
  FIXTURE_SYNC_ENABLED: envBool.default(true),
  FIXTURE_SYNC_HORIZON_DAYS: z.coerce.number().int().positive().default(7),
  FIXTURE_SYNC_LEAGUE_IDS: z.string().default('39,140,78,135,61'),
  FIXTURE_SYNC_STATUS_FILTER: z.string().default('NS-TBD-1H-2H-HT-LIVE-FT-AET-PEN-PST-CANC-ABD'),
  FIXTURE_SYNC_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
  FIXTURE_SYNC_STALE_SCHEDULED_HOURS: z.coerce.number().int().positive().default(24),
  CSV_FIXTURE_IMPORT_ENABLED: envBool.default(false),
  CSV_FIXTURE_FILES: z.string().default(''),
  CSV_FIXTURE_LEAGUE_MAP: z.string().default('E0:39,SP1:140,D1:78,I1:135,F1:61'),
  CSV_FIXTURE_FROM: z.string().default('2022-01-01'),
  CSV_FIXTURE_TO: z.string().default(''),
  CSV_FIXTURE_MAX_ROWS: z.coerce.number().int().min(0).default(0),
  HISTORICAL_FIXTURE_SEED_FROM: z.string().default('2022-01-01'),
  HISTORICAL_FIXTURE_SEED_TO: z.string().default(''),
  HISTORICAL_FIXTURE_SEED_LEAGUE_IDS: z.string().default(''),
  HISTORICAL_FIXTURE_SEED_SEASON_LIST: z.string().default('2022,2023,2024'),
  HISTORICAL_FIXTURE_SEED_STATUS_FILTER: z.string().default('FT-AET-PEN-PST-CANC-ABD'),
  HISTORICAL_FIXTURE_SEED_CHUNK_DAYS: z.coerce.number().int().positive().default(365),
  HISTORICAL_FIXTURE_SEED_REQUEST_DELAY_MS: z.coerce.number().int().min(0).default(6500),
  HISTORICAL_FIXTURE_SEED_CACHE_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

  // Prediction pipeline
  PIPELINE_MATCH_LOOKAHEAD_HOURS: z.coerce.number().int().positive().default(48),
  PIPELINE_DIRECT_FETCH_ENABLED: envBool.default(true),
  PIPELINE_API_STATUS_FILTER: z.string().default('NS'),
  PIPELINE_LEAGUE_IDS: z.string().default(''),
  VALUE_BET_EDGE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.08),
  VALUE_BET_LOOKAHEAD_DAYS: z.coerce.number().int().positive().default(2),
  VALUE_BET_KELLY_MULTIPLIER: z.coerce.number().positive().max(1).default(0.125),
  VALUE_BET_MAX_STAKE: z.coerce.number().positive().max(1).default(0.10),
  ODDS_API_REGIONS: z.string().default('eu,uk'),
  ODDS_API_MARKETS: z.string().default('h2h,totals,btts'),
  ODDS_API_ODDS_FORMAT: z.string().default('decimal'),
  ODDS_API_SPORT_KEYS: z.string().default(
    '39:soccer_epl,140:soccer_spain_la_liga,78:soccer_germany_bundesliga,135:soccer_italy_serie_a,61:soccer_france_ligue_one'
  ),

  // Calibration
  CLOSING_ODDS_LOOKAHEAD_HOURS: z.coerce.number().int().positive().default(2),

  // Legacy keys — kept optional to avoid breaking existing deployments
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
