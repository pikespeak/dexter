/**
 * Rate Limiting Middleware
 *
 * Token-bucket rate limiting using in-memory store.
 * Falls back gracefully if Redis is unavailable.
 */

import { Context, Next } from 'hono';

interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

// In-memory rate limit store (per-process)
const buckets = new Map<string, BucketEntry>();

// Clean up stale entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of buckets) {
    if (now - entry.lastRefill > 600_000) {
      buckets.delete(key);
    }
  }
}, 60_000);

interface RateLimitOptions {
  maxTokens: number;       // Max tokens in bucket
  refillRate: number;      // Tokens added per second
  keyExtractor?: (c: Context) => string;
}

/**
 * Rate limiting middleware factory.
 */
export function rateLimit(options: RateLimitOptions) {
  const { maxTokens, refillRate, keyExtractor } = options;

  return async (c: Context, next: Next) => {
    const key = keyExtractor
      ? keyExtractor(c)
      : c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'anonymous';

    const now = Date.now();
    let bucket = buckets.get(key);

    if (!bucket) {
      bucket = { tokens: maxTokens, lastRefill: now };
      buckets.set(key, bucket);
    }

    // Refill tokens
    const elapsed = (now - bucket.lastRefill) / 1000;
    bucket.tokens = Math.min(maxTokens, bucket.tokens + elapsed * refillRate);
    bucket.lastRefill = now;

    if (bucket.tokens < 1) {
      const retryAfter = Math.ceil((1 - bucket.tokens) / refillRate);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too many requests', retryAfter }, 429);
    }

    bucket.tokens -= 1;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', String(maxTokens));
    c.header('X-RateLimit-Remaining', String(Math.floor(bucket.tokens)));

    await next();
  };
}

// Preset configurations
export const apiRateLimit = rateLimit({
  maxTokens: 100,
  refillRate: 10, // 10 req/s sustained, 100 burst
});

export const authRateLimit = rateLimit({
  maxTokens: 10,
  refillRate: 0.5, // 30 req/min for auth endpoints
});
