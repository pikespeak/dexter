import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { predictionRoutes } from './routes/predictions.js';
import { matchRoutes } from './routes/matches.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { statsRoutes } from './routes/stats.js';
import { webhookRoutes } from './routes/webhooks.js';
import { pushRoutes } from './routes/push.js';
import { requestIdMiddleware, structuredErrorHandler } from './middleware/error-handler.js';
import { apiRateLimit, authRateLimit } from './middleware/rate-limit.js';
import {
  startCronScheduler,
  triggerPipeline,
  triggerResultTracking,
  triggerDailyMetrics,
  triggerClosingOddsCapture,
  triggerFixtureSync,
  triggerHistoricalFixtureSeed,
  getSchedulerStatus,
} from './cron.js';
import { isCacheAvailable } from './services/cache.js';
import { runBacktest, compareStrategies, type BacktestConfig } from './services/backtester.js';
import { generateModelReport } from './services/calibration.js';
import { parseLeagueIdsCsv } from './services/fixture-sync.js';
import { syncHybridFixtures } from './services/hybrid-fixture-sync.js';
import { getApiFootballBudgetStatus } from './lib/sports-api.js';

const app = new Hono();
const API_PREFIX = '/v1';

const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'PiksPeak API',
    version: '1.0.0',
    description: 'AI-powered football prediction API',
  },
  servers: [{ url: API_PREFIX }],
  paths: {
    '/health': { get: { summary: 'Health check' } },
    '/auth/register': { post: { summary: 'Register user' } },
    '/auth/login': { post: { summary: 'Login user' } },
    '/auth/refresh': { post: { summary: 'Refresh auth token' } },
    '/predictions/today': { get: { summary: "Get today's predictions (Pro)" } },
    '/predictions/free': { get: { summary: 'Get daily free prediction' } },
    '/predictions/history': { get: { summary: 'Get prediction history' } },
    '/predictions/{matchId}': { get: { summary: 'Get prediction detail for match' } },
    '/matches/upcoming': { get: { summary: 'Get upcoming matches' } },
    '/matches/{id}': { get: { summary: 'Get match detail' } },
    '/subscriptions/status': { get: { summary: 'Get subscription status' } },
    '/subscriptions/plans': { get: { summary: 'Get subscription plans' } },
    '/stats/performance': { get: { summary: 'Get performance statistics' } },
    '/stats/markets': { get: { summary: 'Get market breakdown' } },
    '/stats/leagues': { get: { summary: 'Get league breakdown' } },
    '/stats/calibration': { get: { summary: 'Get calibration data' } },
    '/stats/brier': { get: { summary: 'Get Brier score analysis' } },
    '/stats/value-bets': { get: { summary: 'Get value bet ROI' } },
    '/stats/poisson-vs-llm': { get: { summary: 'Compare Poisson vs LLM' } },
    '/stats/clv': { get: { summary: 'Get CLV analysis' } },
    '/stats/dashboard': { get: { summary: 'Get dashboard metrics' } },
    '/push/register': { post: { summary: 'Register push token' } },
    '/push/unregister': { post: { summary: 'Unregister push token' } },
    '/webhooks/revenuecat': { post: { summary: 'RevenueCat webhook' } },
    '/admin/run-pipeline': { post: { summary: 'Trigger pipeline manually' } },
    '/admin/track-results': { post: { summary: 'Trigger result tracking manually' } },
    '/admin/status': { get: { summary: 'Get scheduler status' } },
    '/admin/backtest': { post: { summary: 'Run backtest' } },
    '/admin/backtest/compare': { post: { summary: 'Compare backtest strategies' } },
    '/admin/metrics': { post: { summary: 'Trigger metrics snapshot' } },
    '/admin/closing-odds': { post: { summary: 'Trigger closing odds capture' } },
    '/admin/sync-fixtures': { post: { summary: 'Trigger upcoming fixture sync' } },
    '/admin/sync-hybrid-fixtures': { post: { summary: 'Trigger CSV + live fixture sync' } },
    '/admin/seed-historical-fixtures': { post: { summary: 'Trigger historical fixture seed' } },
    '/admin/model-report': { get: { summary: 'Get model report' } },
    '/docs': { get: { summary: 'OpenAPI specification' } },
  },
} as const;

// Global middleware
app.use('*', requestIdMiddleware);
app.use('*', logger());
app.use('*', cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : ['http://localhost:8081', 'https://pikspeak.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting on auth endpoints
app.use(`${API_PREFIX}/auth/*`, authRateLimit);

// Rate limiting on API endpoints
app.use(`${API_PREFIX}/predictions/*`, apiRateLimit);
app.use(`${API_PREFIX}/matches/*`, apiRateLimit);

// Health check
app.get('/health', (c) => {
  const scheduler = getSchedulerStatus();
  return c.json({
    status: 'ok',
    service: 'pikspeak-api',
    cache: isCacheAvailable(),
    apiFootballBudget: getApiFootballBudgetStatus(),
    scheduler,
  });
});
app.get(`${API_PREFIX}/health`, (c) => c.json({
  status: 'ok',
  service: 'pikspeak-api',
  cache: isCacheAvailable(),
  apiFootballBudget: getApiFootballBudgetStatus(),
  scheduler: getSchedulerStatus(),
}));

// API docs
app.get(`${API_PREFIX}/docs`, (c) => c.json(openApiSpec));
app.get(`${API_PREFIX}/docs/openapi.json`, (c) => c.json(openApiSpec));

// API routes
app.route(`${API_PREFIX}/auth`, authRoutes);
app.route(`${API_PREFIX}/predictions`, predictionRoutes);
app.route(`${API_PREFIX}/matches`, matchRoutes);
app.route(`${API_PREFIX}/subscriptions`, subscriptionRoutes);
app.route(`${API_PREFIX}/stats`, statsRoutes);
app.route(`${API_PREFIX}/webhooks`, webhookRoutes);
app.route(`${API_PREFIX}/push`, pushRoutes);

// Admin: Manual pipeline trigger
app.post(`${API_PREFIX}/admin/run-pipeline`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const result = await triggerPipeline();
  return c.json(result, result.success ? 200 : 409);
});

// Admin: Manual result tracking
app.post(`${API_PREFIX}/admin/track-results`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const result = await triggerResultTracking();
  return c.json(result, result.success ? 200 : 409);
});

// Admin: Scheduler status
app.get(`${API_PREFIX}/admin/status`, (c) => {
  return c.json({
    ...getSchedulerStatus(),
    apiFootballBudget: getApiFootballBudgetStatus(),
  });
});

// Admin: Run backtest
app.post(`${API_PREFIX}/admin/backtest`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const body = await c.req.json<BacktestConfig>();
  const result = await runBacktest(body);
  return c.json(result);
});

// Admin: Compare strategies
app.post(`${API_PREFIX}/admin/backtest/compare`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const configs = await c.req.json<BacktestConfig[]>();
  const results = await compareStrategies(configs);
  return c.json({ results });
});

// Admin: Trigger daily metrics snapshot
app.post(`${API_PREFIX}/admin/metrics`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const result = await triggerDailyMetrics();
  return c.json(result, result.success ? 200 : 409);
});

// Admin: Trigger closing odds capture
app.post(`${API_PREFIX}/admin/closing-odds`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const result = await triggerClosingOddsCapture();
  return c.json(result, result.success ? 200 : 409);
});

// Admin: Trigger fixture sync
app.post(`${API_PREFIX}/admin/sync-fixtures`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const result = await triggerFixtureSync();
  return c.json(result, result.success ? 200 : 409);
});

// Admin: Trigger hybrid fixture sync (CSV + live API)
app.post(`${API_PREFIX}/admin/sync-hybrid-fixtures`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const parseOptionalBool = (raw: string | undefined): boolean | undefined => {
    if (!raw) return undefined;
    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return undefined;
  };

  const parseOptionalInt = (raw: string | undefined): number | undefined => {
    if (!raw) return undefined;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const dryRun = parseOptionalBool(c.req.query('dry_run'));
  const includeCsv = parseOptionalBool(c.req.query('include_csv'));
  const includeLive = parseOptionalBool(c.req.query('include_live'));

  const csvFiles = (c.req.query('csv_files') || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  const result = await syncHybridFixtures({
    includeCsv,
    includeLive,
    csvOptions: {
      dryRun,
      files: csvFiles.length > 0 ? csvFiles : undefined,
      leagueIds: parseLeagueIdsCsv(c.req.query('csv_league_ids') || ''),
      fromDate: c.req.query('csv_from') || undefined,
      toDate: c.req.query('csv_to') || undefined,
      maxRows: parseOptionalInt(c.req.query('csv_max_rows')),
    },
    liveOptions: {
      dryRun,
      horizonDays: parseOptionalInt(c.req.query('live_horizon_days')),
      leagueIds: parseLeagueIdsCsv(c.req.query('live_league_ids') || ''),
      statusFilter: c.req.query('live_status_filter') || undefined,
      cacheTtlSeconds: parseOptionalInt(c.req.query('live_cache_ttl_seconds')),
      staleScheduledHours: parseOptionalInt(c.req.query('live_stale_scheduled_hours')),
    },
  });

  const hasFatal = result.errors.length > 0 && !result.csvResult && !result.liveResult;
  return c.json(result, hasFatal ? 409 : 200);
});

// Admin: Trigger historical fixture seed
app.post(`${API_PREFIX}/admin/seed-historical-fixtures`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const dryRunRaw = c.req.query('dry_run');
  const dryRun = dryRunRaw
    ? ['1', 'true', 'yes', 'on'].includes(dryRunRaw.trim().toLowerCase())
    : undefined;
  const leagueIds = parseLeagueIdsCsv(c.req.query('league_ids') || '');
  const seasonYears = (c.req.query('season_years') || '')
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((value) => Number.isFinite(value) && value >= 1900 && value <= 2100);

  const parseOptionalInt = (raw: string | undefined): number | undefined => {
    if (!raw) return undefined;
    const parsed = Number.parseInt(raw, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  };

  const chunkDaysRaw = c.req.query('chunk_days');
  const requestDelayRaw = c.req.query('request_delay_ms');
  const cacheTtlRaw = c.req.query('cache_ttl_seconds');

  const result = await triggerHistoricalFixtureSeed({
    fromDate: c.req.query('from') || undefined,
    toDate: c.req.query('to') || undefined,
    dryRun,
    leagueIds: leagueIds.length > 0 ? leagueIds : undefined,
    seasonYears: seasonYears.length > 0 ? seasonYears : undefined,
    statusFilter: c.req.query('status_filter') || undefined,
    chunkDays: parseOptionalInt(chunkDaysRaw),
    requestDelayMs: parseOptionalInt(requestDelayRaw),
    cacheTtlSeconds: parseOptionalInt(cacheTtlRaw),
  });
  return c.json(result, result.success ? 200 : 409);
});

// Admin: Full model report
app.get(`${API_PREFIX}/admin/model-report`, async (c) => {
  const adminKey = process.env.ADMIN_API_KEY;
  const providedKey = c.req.header('X-Admin-Key') || c.req.query('key');

  if (adminKey && providedKey !== adminKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!adminKey && process.env.NODE_ENV === 'production') {
    return c.json({ error: 'ADMIN_API_KEY not configured' }, 500);
  }

  const from = c.req.query('from') ? new Date(c.req.query('from')!) : undefined;
  const to = c.req.query('to') ? new Date(c.req.query('to')!) : undefined;
  const report = await generateModelReport({ from, to });
  return c.json(report);
});

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError(structuredErrorHandler);

const port = parseInt(process.env.PORT || '3000');

// Start cron scheduler
startCronScheduler();

console.log(`PiksPeak API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
