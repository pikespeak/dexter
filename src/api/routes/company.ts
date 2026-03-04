import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';
import { parseUpstreamError } from '../types.js';

export const companyRoutes = new Hono();

/** GET /:ticker — Company facts */
companyRoutes.get('/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();

  try {
    const { data } = await callApi('/company/facts', { ticker });
    return c.json({ data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker/news — Company news */
companyRoutes.get('/:ticker/news', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/news/', { ticker, limit });
    return c.json({ data: data.news ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker/insider-trades — Insider trades */
companyRoutes.get('/:ticker/insider-trades', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const limit = c.req.query('limit') || '20';

  try {
    const { data } = await callApi('/insider-trades/', { ticker, limit });
    return c.json({ data: data.insider_trades ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker/segments — Revenue segments */
companyRoutes.get('/:ticker/segments', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const period = c.req.query('period') || 'annual';
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/segmented-revenues/', {
      ticker,
      period,
      limit,
    });
    return c.json({ data: data.segmented_revenues ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});
