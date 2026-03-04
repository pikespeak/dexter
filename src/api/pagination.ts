import type { Context } from 'hono';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

/**
 * Apply offset/limit pagination to an array and return a response envelope.
 * Reads `offset` and `limit` query params from the request context.
 */
export function paginate(items: unknown, c: Context) {
  if (!Array.isArray(items)) {
    return { data: items };
  }

  const total = items.length;
  const offset = Math.max(0, parseInt(c.req.query('offset') || '0', 10) || 0);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(c.req.query('limit') || String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT));

  const data = items.slice(offset, offset + limit);

  return {
    data,
    pagination: { offset, limit, total },
  };
}
