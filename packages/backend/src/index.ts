import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { authRoutes } from './routes/auth.js';
import { predictionRoutes } from './routes/predictions.js';
import { matchRoutes } from './routes/matches.js';
import { subscriptionRoutes } from './routes/subscriptions.js';
import { statsRoutes } from './routes/stats.js';
import { webhookRoutes } from './routes/webhooks.js';

const app = new Hono();

// Middleware
app.use('*', logger());
app.use('*', cors({
  origin: ['http://localhost:8081', 'https://pikspeak.app'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// Health check
app.get('/health', (c) => c.json({ status: 'ok', service: 'pikspeak-api' }));

// API routes
app.route('/auth', authRoutes);
app.route('/predictions', predictionRoutes);
app.route('/matches', matchRoutes);
app.route('/subscriptions', subscriptionRoutes);
app.route('/stats', statsRoutes);
app.route('/webhooks', webhookRoutes);

// 404 handler
app.notFound((c) => c.json({ error: 'Not Found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal Server Error' }, 500);
});

const port = parseInt(process.env.PORT || '3000');

console.log(`PiksPeak API running on port ${port}`);

export default {
  port,
  fetch: app.fetch,
};
