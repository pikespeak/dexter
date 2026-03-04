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
  getSchedulerStatus,
} from './cron.js';
import { isCacheAvailable } from './services/cache.js';

const app = new Hono();

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
app.use('/auth/*', authRateLimit);

// Rate limiting on API endpoints
app.use('/predictions/*', apiRateLimit);
app.use('/matches/*', apiRateLimit);

// Health check
app.get('/health', (c) => {
  const scheduler = getSchedulerStatus();
  return c.json({
    status: 'ok',
    service: 'pikspeak-api',
    cache: isCacheAvailable(),
    scheduler,
  });
});

// API routes
app.route('/auth', authRoutes);
app.route('/predictions', predictionRoutes);
app.route('/matches', matchRoutes);
app.route('/subscriptions', subscriptionRoutes);
app.route('/stats', statsRoutes);
app.route('/webhooks', webhookRoutes);
app.route('/push', pushRoutes);

// Admin: Manual pipeline trigger
app.post('/admin/run-pipeline', async (c) => {
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
app.post('/admin/track-results', async (c) => {
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
app.get('/admin/status', (c) => {
  return c.json(getSchedulerStatus());
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
