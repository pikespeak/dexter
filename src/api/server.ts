import { Hono } from 'hono';
import { cors } from 'hono/cors';
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
import { registerOpenApi } from './openapi.js';

const app = new Hono().basePath('/api/v1');

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
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }));
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
  return server;
}
