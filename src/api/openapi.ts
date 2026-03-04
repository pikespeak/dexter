import type { Hono } from 'hono';
import { swaggerUI } from '@hono/swagger-ui';

/**
 * OpenAPI 3.1 specification for the Dexter Mobile API.
 */
const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Dexter Financial Research API',
    version: '1.0.0',
    description:
      'REST API for Dexter — AI-powered financial research. Provides stock prices, financial statements, key metrics, SEC filings, company data, and an AI agent for natural language queries.',
  },
  servers: [{ url: '/api/v1', description: 'API v1' }],
  security: [{ bearerAuth: [] }],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http' as const,
        scheme: 'bearer',
        description: 'API key passed as Bearer token',
      },
    },
    schemas: {
      Error: {
        type: 'object' as const,
        properties: {
          error: { type: 'string' as const },
          code: { type: 'string' as const },
          status: { type: 'integer' as const },
        },
      },
    },
    parameters: {
      ticker: {
        name: 'ticker',
        in: 'path' as const,
        required: true,
        schema: { type: 'string' as const },
        description: 'Stock ticker symbol (e.g. AAPL, MSFT)',
      },
      period: {
        name: 'period',
        in: 'query' as const,
        schema: { type: 'string' as const, enum: ['annual', 'quarterly', 'ttm'], default: 'annual' },
        description: 'Reporting period',
      },
      limit: {
        name: 'limit',
        in: 'query' as const,
        schema: { type: 'string' as const, default: '10' },
        description: 'Maximum number of results',
      },
    },
  },
  paths: {
    '/health': {
      get: {
        tags: ['System'],
        summary: 'Health check',
        security: [],
        responses: { '200': { description: 'Service is healthy' } },
      },
    },
    '/prices/snapshot/{ticker}': {
      get: {
        tags: ['Prices'],
        summary: 'Latest stock price snapshot',
        parameters: [{ $ref: '#/components/parameters/ticker' }],
        responses: { '200': { description: 'Price snapshot' } },
      },
    },
    '/prices/{ticker}': {
      get: {
        tags: ['Prices'],
        summary: 'Historical OHLCV stock prices',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { name: 'start_date', in: 'query' as const, required: true, schema: { type: 'string' as const }, description: 'Start date (YYYY-MM-DD)' },
          { name: 'end_date', in: 'query' as const, required: true, schema: { type: 'string' as const }, description: 'End date (YYYY-MM-DD)' },
          { name: 'interval', in: 'query' as const, schema: { type: 'string' as const, enum: ['minute', 'hour', 'day', 'week', 'month'], default: 'day' } },
          { name: 'interval_multiplier', in: 'query' as const, schema: { type: 'string' as const, default: '1' } },
        ],
        responses: { '200': { description: 'Array of OHLCV price bars' } },
      },
    },
    '/prices/crypto/snapshot/{ticker}': {
      get: {
        tags: ['Prices'],
        summary: 'Latest crypto price snapshot',
        parameters: [{ $ref: '#/components/parameters/ticker' }],
        responses: { '200': { description: 'Crypto price snapshot' } },
      },
    },
    '/prices/crypto/{ticker}': {
      get: {
        tags: ['Prices'],
        summary: 'Historical crypto prices',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { name: 'start_date', in: 'query' as const, required: true, schema: { type: 'string' as const } },
          { name: 'end_date', in: 'query' as const, required: true, schema: { type: 'string' as const } },
          { name: 'interval', in: 'query' as const, schema: { type: 'string' as const, default: 'day' } },
          { name: 'interval_multiplier', in: 'query' as const, schema: { type: 'string' as const, default: '1' } },
        ],
        responses: { '200': { description: 'Array of crypto price bars' } },
      },
    },
    '/prices/crypto/tickers': {
      get: {
        tags: ['Prices'],
        summary: 'Available crypto tickers',
        responses: { '200': { description: 'List of supported crypto tickers' } },
      },
    },
    '/financials/{ticker}/income': {
      get: {
        tags: ['Financials'],
        summary: 'Income statements',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/period' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Income statements' } },
      },
    },
    '/financials/{ticker}/balance': {
      get: {
        tags: ['Financials'],
        summary: 'Balance sheets',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/period' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Balance sheets' } },
      },
    },
    '/financials/{ticker}/cashflow': {
      get: {
        tags: ['Financials'],
        summary: 'Cash flow statements',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/period' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Cash flow statements' } },
      },
    },
    '/metrics/snapshot/{ticker}': {
      get: {
        tags: ['Metrics'],
        summary: 'Latest financial metrics snapshot',
        parameters: [{ $ref: '#/components/parameters/ticker' }],
        responses: { '200': { description: 'Financial metrics snapshot' } },
      },
    },
    '/metrics/{ticker}': {
      get: {
        tags: ['Metrics'],
        summary: 'Historical financial metrics',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/period' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Financial metrics' } },
      },
    },
    '/metrics/estimates/{ticker}': {
      get: {
        tags: ['Metrics'],
        summary: 'Analyst estimates',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/period' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Analyst estimates' } },
      },
    },
    '/filings/{ticker}': {
      get: {
        tags: ['Filings'],
        summary: 'SEC filings',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { name: 'filing_type', in: 'query' as const, schema: { type: 'string' as const }, description: 'Filing type (e.g. 10-K, 10-Q, 8-K)' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'SEC filings list' } },
      },
    },
    '/filings/items/{ticker}': {
      get: {
        tags: ['Filings'],
        summary: 'SEC filing items/sections',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { name: 'filing_type', in: 'query' as const, schema: { type: 'string' as const } },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Filing items' } },
      },
    },
    '/company/{ticker}': {
      get: {
        tags: ['Company'],
        summary: 'Company facts',
        parameters: [{ $ref: '#/components/parameters/ticker' }],
        responses: { '200': { description: 'Company information' } },
      },
    },
    '/company/{ticker}/news': {
      get: {
        tags: ['Company'],
        summary: 'Company news',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'News articles' } },
      },
    },
    '/company/{ticker}/insider-trades': {
      get: {
        tags: ['Company'],
        summary: 'Insider trades',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Insider trades' } },
      },
    },
    '/company/{ticker}/segments': {
      get: {
        tags: ['Company'],
        summary: 'Revenue segments',
        parameters: [
          { $ref: '#/components/parameters/ticker' },
          { $ref: '#/components/parameters/period' },
          { $ref: '#/components/parameters/limit' },
        ],
        responses: { '200': { description: 'Revenue segments' } },
      },
    },
    '/agent/query': {
      post: {
        tags: ['AI Agent'],
        summary: 'AI research query (SSE streaming)',
        description:
          'Send a natural language financial research query. Returns Server-Sent Events with thinking, tool_start, tool_end, and done events.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object' as const,
                required: ['query'],
                properties: {
                  query: { type: 'string' as const, description: 'Research question', example: "What is Apple's revenue trend over the last 5 years?" },
                  model: { type: 'string' as const, description: 'LLM model to use (optional)', example: 'gpt-5.2' },
                  modelProvider: { type: 'string' as const, description: 'Model provider (optional)', example: 'openai' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'SSE stream of agent events' },
        },
      },
    },
  },
};

/**
 * Register OpenAPI documentation endpoints on a Hono app.
 */
export function registerOpenApi(app: Hono) {
  // Serve raw OpenAPI JSON spec
  app.get('/openapi.json', (c) => c.json(openApiSpec));

  // Serve Swagger UI
  app.get('/docs', swaggerUI({ url: '/api/v1/openapi.json' }));
}
