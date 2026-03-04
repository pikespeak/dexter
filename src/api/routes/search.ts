import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';
import { parseUpstreamError } from '../types.js';

export const searchRoutes = new Hono();

/** GET /?q=AAPL — Search for tickers by name or symbol */
searchRoutes.get('/', async (c) => {
  const query = c.req.query('q')?.trim();

  if (!query) {
    return c.json({ data: [] });
  }

  const ticker = query.toUpperCase();

  try {
    // Try exact ticker match via company facts
    const { data } = await callApi('/company/facts', { ticker });

    const result = {
      ticker: data.ticker || ticker,
      name: data.name || ticker,
      exchange: data.exchange || '',
      sector: data.sector || '',
    };

    return c.json({ data: [result] });
  } catch {
    // No match found
    return c.json({ data: [] });
  }
});
