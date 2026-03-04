import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';
import { parseUpstreamError } from '../types.js';

export const metricsRoutes = new Hono();

/** GET /snapshot/:ticker — Latest financial metrics snapshot */
metricsRoutes.get('/snapshot/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();

  try {
    const { data } = await callApi('/financial-metrics/snapshot/', { ticker });
    return c.json({ data: data.snapshot ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker — Historical financial metrics */
metricsRoutes.get('/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const period = c.req.query('period') || 'annual';
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/financial-metrics/', {
      ticker,
      period,
      limit,
    });
    return c.json({ data: data.financial_metrics ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /estimates/:ticker — Analyst estimates */
metricsRoutes.get('/estimates/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const period = c.req.query('period') || 'annual';
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/analyst-estimates/', {
      ticker,
      period,
      limit,
    });
    return c.json({ data: data.analyst_estimates ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});
