import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';

export const healthRoutes = new Hono();

healthRoutes.get('/', async (c) => {
  const deep = c.req.query('deep') === 'true';

  const base = {
    status: 'ok' as const,
    service: 'dexter-api',
    timestamp: new Date().toISOString(),
  };

  if (!deep) {
    return c.json(base);
  }

  // Deep health check: ping upstream Financial Datasets API
  try {
    await callApi('/prices/snapshot/', { ticker: 'AAPL' });
    return c.json({ ...base, upstream: { status: 'ok', service: 'financial-datasets' } });
  } catch {
    return c.json(
      { ...base, status: 'degraded', upstream: { status: 'error', service: 'financial-datasets' } },
      503,
    );
  }
});
