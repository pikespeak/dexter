import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { authMiddleware } from './middleware/auth.js';
import { rateLimiter } from './middleware/rate-limit.js';
import { errorHandler } from './middleware/error-handler.js';
import { pricesRoutes } from './routes/prices.js';
import { financialsRoutes } from './routes/financials.js';
import { metricsRoutes } from './routes/metrics.js';
import { filingsRoutes } from './routes/filings.js';
import { companyRoutes } from './routes/company.js';
import { agentRoutes } from './routes/agent.js';
import { healthRoutes } from './routes/health.js';
import { registerOpenApi } from './openapi.js';

const app = new Hono().basePath('/api/v1');

// Global middleware
app.use('*', cors({ origin: '*', allowMethods: ['GET', 'POST', 'OPTIONS'] }));
app.use('*', errorHandler());
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
