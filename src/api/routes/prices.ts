import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';
import { ApiError, parseUpstreamError } from '../types.js';
import { paginate } from '../pagination.js';

export const pricesRoutes = new Hono();

/** GET /snapshot/:ticker — Latest price snapshot */
pricesRoutes.get('/snapshot/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  try {
    const { data } = await callApi('/prices/snapshot/', { ticker });
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ data: data.snapshot ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker — Historical OHLCV prices */
pricesRoutes.get('/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const interval = c.req.query('interval') || 'day';
  const interval_multiplier = c.req.query('interval_multiplier') || '1';
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');

  if (!start_date || !end_date) {
    throw new ApiError('start_date and end_date are required', 'INVALID_PARAMS', 400);
  }

  try {
    const { data } = await callApi('/prices/', {
      ticker,
      interval,
      interval_multiplier,
      start_date,
      end_date,
    });
    const items = data.prices ?? data;
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json({ ...paginate(items, c), ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /crypto/snapshot/:ticker — Crypto price snapshot */
pricesRoutes.get('/crypto/snapshot/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  try {
    const { data } = await callApi('/crypto/prices/snapshot/', { ticker });
    c.header('Cache-Control', 'public, max-age=60');
    return c.json({ data: data.snapshot ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /crypto/:ticker — Historical crypto prices */
pricesRoutes.get('/crypto/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const interval = c.req.query('interval') || 'day';
  const interval_multiplier = c.req.query('interval_multiplier') || '1';
  const start_date = c.req.query('start_date');
  const end_date = c.req.query('end_date');

  if (!start_date || !end_date) {
    throw new ApiError('start_date and end_date are required', 'INVALID_PARAMS', 400);
  }

  try {
    const { data } = await callApi('/crypto/prices/', {
      ticker,
      interval,
      interval_multiplier,
      start_date,
      end_date,
    });
    const items = data.prices ?? data;
    c.header('Cache-Control', 'public, max-age=3600');
    return c.json({ ...paginate(items, c), ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /crypto/tickers — Available crypto tickers */
pricesRoutes.get('/crypto/tickers', async (c) => {
  try {
    const { data } = await callApi('/crypto/tickers/', {});
    const items = data.tickers ?? data;
    return c.json({ ...paginate(items, c) });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});
