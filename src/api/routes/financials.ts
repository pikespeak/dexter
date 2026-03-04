import { Hono } from 'hono';
import { callApi } from '../../tools/finance/api.js';
import { parseUpstreamError } from '../types.js';

export const financialsRoutes = new Hono();

/** GET /:ticker/income — Income statements */
financialsRoutes.get('/:ticker/income', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const period = c.req.query('period') || 'annual';
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/financials/income-statements/', {
      ticker,
      period,
      limit,
    });
    return c.json({ data: data.income_statements ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker/balance — Balance sheets */
financialsRoutes.get('/:ticker/balance', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const period = c.req.query('period') || 'annual';
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/financials/balance-sheets/', {
      ticker,
      period,
      limit,
    });
    return c.json({ data: data.balance_sheets ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});

/** GET /:ticker/cashflow — Cash flow statements */
financialsRoutes.get('/:ticker/cashflow', async (c) => {
  const ticker = c.req.param('ticker').toUpperCase();
  const period = c.req.query('period') || 'annual';
  const limit = c.req.query('limit') || '10';

  try {
    const { data } = await callApi('/financials/cash-flow-statements/', {
      ticker,
      period,
      limit,
    });
    return c.json({ data: data.cash_flow_statements ?? data, ticker });
  } catch (error) {
    throw parseUpstreamError(error);
  }
});
