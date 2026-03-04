import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { compress } from 'hono/compress';
import { logger } from 'hono/logger';
import { etag } from 'hono/etag';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { ApiError } from './types.js';
import { pricesRoutes } from './routes/prices.js';
import { financialsRoutes } from './routes/financials.js';
import { metricsRoutes } from './routes/metrics.js';
import { filingsRoutes } from './routes/filings.js';
import { companyRoutes } from './routes/company.js';
import { agentRoutes } from './routes/agent.js';
import { healthRoutes } from './routes/health.js';
import { searchRoutes } from './routes/search.js';
import { registerOpenApi } from './openapi.js';

export const app = new Hono().basePath('/api/v1');

// Global error handler (Hono's built-in onError)
app.onError((error, c) => {
  if (error instanceof ApiError) {
    return c.json(
      { error: error.message, code: error.code, status: error.status },
      error.status as 400,
    );
  }

  const message = error instanceof Error ? error.message : String(error);
  console.error('[API Error]', message);

  return c.json(
    { error: 'Internal server error', code: 'INTERNAL_ERROR', status: 500 },
    500,
  );
});

// Global middleware
app.use('*', logger());
app.use('*', compress());
app.use('*', etag());

const corsOrigins = (process.env.CORS_ORIGINS || '*').split(',').map((o) => o.trim()).filter(Boolean);
app.use(
  '*',
  cors({
    origin: corsOrigins.includes('*') ? '*' : corsOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
  }),
);

app.use('*', authMiddleware());
app.use('*', rateLimiter());

// Routes
app.route('/health', healthRoutes);
app.route('/prices', pricesRoutes);
app.route('/financials', financialsRoutes);
app.route('/metrics', metricsRoutes);
app.route('/filings', filingsRoutes);
app.route('/company', companyRoutes);
app.route('/agent', agentRoutes);
app.route('/search', searchRoutes);

// OpenAPI / Swagger UI
registerOpenApi(app);

/**
 * Start the Dexter API server.
 */
export function startServer(port: number = 3000) {
  const server = Bun.serve({ fetch: app.fetch, port });
  console.log(`🚀 Dexter API server running on http://localhost:${server.port}`);
  console.log(`📖 Swagger UI: http://localhost:${server.port}/api/v1/docs`);
  console.log(`📋 OpenAPI spec: http://localhost:${server.port}/api/v1/openapi.json`);

  // Graceful shutdown
  const shutdown = () => {
    console.log('\n🛑 Shutting down gracefully...');
    server.stop();
    process.exit(0);
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return server;
}
