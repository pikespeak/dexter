import { describe, test, expect, beforeEach, mock } from 'bun:test';
import { app } from './server.js';
import { resetBuckets } from './middleware/rate-limit.js';

// Mock callApi to avoid hitting upstream API in tests
mock.module('../../src/tools/finance/api.js', () => ({
  callApi: async (endpoint: string, params: Record<string, unknown>) => {
    // Return realistic shapes per endpoint
    if (endpoint.includes('snapshot')) {
      return { data: { snapshot: { price: 150.0, ticker: params.ticker } } };
    }
    if (endpoint.includes('income-statements')) {
      return { data: { income_statements: [{ revenue: 100000, period: 'annual' }] } };
    }
    if (endpoint.includes('balance-sheets')) {
      return { data: { balance_sheets: [{ total_assets: 500000 }] } };
    }
    if (endpoint.includes('cash-flow-statements')) {
      return { data: { cash_flow_statements: [{ operating_cash_flow: 30000 }] } };
    }
    if (endpoint.includes('financial-metrics')) {
      return { data: { financial_metrics: [{ pe_ratio: 25 }] } };
    }
    if (endpoint.includes('analyst-estimates')) {
      return { data: { analyst_estimates: [{ eps_estimate: 6.5 }] } };
    }
    if (endpoint.includes('filings/items')) {
      return { data: { filing_items: [{ item: '1A', text: 'Risk factors' }] } };
    }
    if (endpoint.includes('filings')) {
      return { data: { filings: [{ filing_type: '10-K', date: '2024-01-15' }] } };
    }
    if (endpoint.includes('company/facts')) {
      return { data: { name: 'Apple Inc.', sector: 'Technology' } };
    }
    if (endpoint.includes('news')) {
      return { data: { news: [{ title: 'Apple earnings beat', date: '2024-01-20' }] } };
    }
    if (endpoint.includes('insider-trades')) {
      return { data: { insider_trades: [{ insider: 'Tim Cook', shares: 100 }] } };
    }
    if (endpoint.includes('segmented-revenues')) {
      return { data: { segmented_revenues: [{ segment: 'iPhone', revenue: 200000 }] } };
    }
    if (endpoint.includes('crypto/tickers')) {
      return { data: { tickers: ['BTC', 'ETH', 'SOL'] } };
    }
    if (endpoint.includes('crypto/prices')) {
      return { data: { prices: [{ open: 40000, close: 41000 }] } };
    }
    if (endpoint.includes('prices')) {
      return { data: { prices: [{ open: 150, close: 152, high: 153, low: 149 }] } };
    }
    return { data: {} };
  },
}));

const API_KEY = 'test-key-123';

function req(path: string, opts?: RequestInit & { noAuth?: boolean }) {
  const headers: Record<string, string> = {};
  if (!opts?.noAuth) {
    headers['Authorization'] = `Bearer ${API_KEY}`;
  }
  return app.request(`/api/v1${path}`, {
    ...opts,
    headers: { ...headers, ...((opts?.headers as Record<string, string>) || {}) },
  });
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  process.env.DEXTER_API_KEYS = API_KEY;
  resetBuckets();
});

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

describe('GET /health', () => {
  test('returns 200 with status ok', async () => {
    const res = await app.request('/api/v1/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe('dexter-api');
    expect(body.timestamp).toBeDefined();
  });

  test('deep health check pings upstream', async () => {
    const res = await app.request('/api/v1/health?deep=true');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.upstream).toBeDefined();
    expect(body.upstream.status).toBe('ok');
  });
});

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('Authentication', () => {
  test('returns 401 without Authorization header', async () => {
    const res = await req('/prices/snapshot/AAPL', { noAuth: true });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.code).toBe('UNAUTHORIZED');
  });

  test('returns 403 with invalid API key', async () => {
    const res = await app.request('/api/v1/prices/snapshot/AAPL', {
      headers: { Authorization: 'Bearer wrong-key' },
    });
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.code).toBe('FORBIDDEN');
  });

  test('returns 200 with valid API key', async () => {
    const res = await req('/prices/snapshot/AAPL');
    expect(res.status).toBe(200);
  });
});

// ---------------------------------------------------------------------------
// Rate Limiting
// ---------------------------------------------------------------------------

describe('Rate Limiting', () => {
  test('returns 429 after exhausting rate limit', async () => {
    // Agent endpoint has 10 req/min limit
    for (let i = 0; i < 10; i++) {
      const res = await req('/agent/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: 'test' }),
      });
      // These might be 200 or other status, but should not be 429 yet
      expect(res.status).not.toBe(429);
    }

    // 11th request should be rate limited
    const res = await req('/agent/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: 'test' }),
    });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.code).toBe('RATE_LIMITED');
  });

  test('includes X-RateLimit-* headers on successful responses', async () => {
    const res = await req('/prices/snapshot/AAPL');
    expect(res.headers.get('X-RateLimit-Limit')).toBe('60');
    expect(res.headers.get('X-RateLimit-Remaining')).toBeDefined();
    expect(res.headers.get('X-RateLimit-Reset')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------

describe('CORS', () => {
  test('includes CORS headers', async () => {
    const res = await req('/prices/snapshot/AAPL');
    // Hono cors middleware sets this header
    expect(res.headers.get('Access-Control-Allow-Origin')).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Error Responses
// ---------------------------------------------------------------------------

describe('Error Responses', () => {
  test('match ApiErrorResponse shape', async () => {
    const res = await req('/prices/snapshot/AAPL', { noAuth: true });
    const body = await res.json();
    expect(body).toHaveProperty('error');
    expect(body).toHaveProperty('code');
    expect(body).toHaveProperty('status');
  });

  test('invalid params return 400', async () => {
    const res = await req('/prices/AAPL'); // missing start_date/end_date
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.code).toBe('INVALID_PARAMS');
  });
});

// ---------------------------------------------------------------------------
// Route Response Shapes
// ---------------------------------------------------------------------------

describe('Prices', () => {
  test('GET /prices/snapshot/:ticker returns data and ticker', async () => {
    const res = await req('/prices/snapshot/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.ticker).toBe('AAPL');
  });

  test('GET /prices/:ticker returns paginated data', async () => {
    const res = await req('/prices/AAPL?start_date=2024-01-01&end_date=2024-12-31');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.pagination.total).toBeGreaterThanOrEqual(0);
    expect(body.ticker).toBe('AAPL');
  });

  test('snapshot has Cache-Control header', async () => {
    const res = await req('/prices/snapshot/AAPL');
    expect(res.headers.get('Cache-Control')).toContain('max-age=60');
  });

  test('historical has Cache-Control header', async () => {
    const res = await req('/prices/AAPL?start_date=2024-01-01&end_date=2024-12-31');
    expect(res.headers.get('Cache-Control')).toContain('max-age=3600');
  });
});

describe('Financials', () => {
  test('GET /financials/:ticker/income returns paginated data', async () => {
    const res = await req('/financials/AAPL/income');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.ticker).toBe('AAPL');
  });

  test('GET /financials/:ticker/balance returns paginated data', async () => {
    const res = await req('/financials/AAPL/balance');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  test('GET /financials/:ticker/cashflow returns paginated data', async () => {
    const res = await req('/financials/AAPL/cashflow');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });
});

describe('Metrics', () => {
  test('GET /metrics/snapshot/:ticker returns data', async () => {
    const res = await req('/metrics/snapshot/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.ticker).toBe('AAPL');
  });

  test('GET /metrics/:ticker returns paginated data', async () => {
    const res = await req('/metrics/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  test('GET /metrics/estimates/:ticker returns paginated data', async () => {
    const res = await req('/metrics/estimates/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });
});

describe('Filings', () => {
  test('GET /filings/:ticker returns paginated data', async () => {
    const res = await req('/filings/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
    expect(body.ticker).toBe('AAPL');
  });

  test('GET /filings/items/:ticker returns paginated data', async () => {
    const res = await req('/filings/items/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });
});

describe('Company', () => {
  test('GET /company/:ticker returns data', async () => {
    const res = await req('/company/AAPL');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeDefined();
    expect(body.ticker).toBe('AAPL');
  });

  test('GET /company/:ticker/news returns paginated data', async () => {
    const res = await req('/company/AAPL/news');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  test('GET /company/:ticker/insider-trades returns paginated data', async () => {
    const res = await req('/company/AAPL/insider-trades');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });

  test('GET /company/:ticker/segments returns paginated data', async () => {
    const res = await req('/company/AAPL/segments');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toBeInstanceOf(Array);
    expect(body.pagination).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

describe('Pagination', () => {
  test('respects offset and limit query params', async () => {
    const res = await req('/prices/AAPL?start_date=2024-01-01&end_date=2024-12-31&limit=2&offset=0');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pagination.offset).toBe(0);
    expect(body.pagination.limit).toBe(2);
    expect(body.pagination.total).toBeDefined();
  });
});
