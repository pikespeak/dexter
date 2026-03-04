import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';
import { parseUpstreamError } from '../types.js';

export const filingsRoutes = new Hono();

/** GET /:ticker — SEC filings list */
filingsRoutes.get('/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const filing_type = c.req.query('filing_type');
  const limit = c.req.query('limit') || '10';

  try {
    const params: Record<string, string | undefined> = { ticker, limit };
    if (filing_type) params.filing_type = filing_type;

    const { data } = await callApi('/filings/', params);
    return c.json({ data: data.filings ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /items/:ticker — SEC filing items/sections */
filingsRoutes.get('/items/:ticker', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const filing_type = c.req.query('filing_type');
  const limit = c.req.query('limit') || '10';

  try {
    const params: Record<string, string | undefined> = { ticker, limit };
    if (filing_type) params.filing_type = filing_type;

    const { data } = await callApi('/filings/items/', params);
    return c.json({ data: data.filing_items ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});
