import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

interface TokenBucket {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, TokenBucket>();

const DATA_RATE = 60;   // requests per minute for data endpoints
const AGENT_RATE = 10;  // requests per minute for agent endpoint

function getBucket(key: string, maxTokens: number): TokenBucket {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: maxTokens, lastRefill: now };
    buckets.set(key, bucket);
    return bucket;
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - bucket.lastRefill) / 1000;
  const refill = (elapsed / 60) * maxTokens;
  bucket.tokens = Math.min(maxTokens, bucket.tokens + refill);
  bucket.lastRefill = now;

  return bucket;
}

/** Exported for testing — clears all token buckets. */
export function resetBuckets() {
  buckets.clear();
}

/**
 * In-memory token bucket rate limiter.
 * 60 req/min for data endpoints, 10 req/min for /agent.
 */
export const rateLimiter = () =>
  createMiddleware(async (c: Context, next) => {
    // Skip rate limiting for health/docs
    if (
      c.req.path.endsWith('/health') ||
      c.req.path.endsWith('/docs') ||
      c.req.path.endsWith('/openapi.json')
    ) {
      return next();
    }

    const apiKey = c.req.header('Authorization')?.slice(7) || 'anonymous';
    const isAgent = c.req.path.includes('/agent');
    const maxTokens = isAgent ? AGENT_RATE : DATA_RATE;
    const bucketKey = `${apiKey}:${isAgent ? 'agent' : 'data'}`;

    const bucket = getBucket(bucketKey, maxTokens);
    const resetSeconds = Math.ceil(60 / maxTokens);

    if (bucket.tokens < 1) {
      c.header('Retry-After', String(resetSeconds));
      c.header('X-RateLimit-Limit', String(maxTokens));
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', String(resetSeconds));
      return c.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED', status: 429 },
        429,
      );
    }

    bucket.tokens -= 1;

    // Set rate limit headers on every response
    c.header('X-RateLimit-Limit', String(maxTokens));
    c.header('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));
    c.header('X-RateLimit-Reset', String(resetSeconds));

    await next();
  });
