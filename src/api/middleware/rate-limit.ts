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

    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil(60 / maxTokens);
      c.header('Retry-After', String(retryAfter));
      return c.json(
        { error: 'Rate limit exceeded', code: 'RATE_LIMITED', status: 429 },
        429,
      );
    }

    bucket.tokens -= 1;
    await next();
  });
