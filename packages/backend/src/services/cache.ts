/**
 * Redis Cache Service
 *
 * Provides caching layer using Redis (ioredis).
 * Falls back gracefully if Redis is unavailable.
 */

import Redis from 'ioredis';

// Cache TTL presets (in seconds)
export const CACHE_TTL = {
  predictions: 300,  // 5 minutes
  matches: 60,       // 1 minute
  stats: 900,        // 15 minutes
  plans: 3600,       // 1 hour
} as const;

let redis: Redis | null = null;
let connectionFailed = false;

function getRedis(): Redis | null {
  if (connectionFailed) return null;

  if (!redis) {
    const url = process.env.REDIS_URL;
    if (!url) {
      console.log('[Cache] REDIS_URL not set, caching disabled');
      connectionFailed = true;
      return null;
    }

    redis = new Redis(url, {
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Cache] Redis connection failed, disabling cache');
          connectionFailed = true;
          return null;
        }
        return Math.min(times * 200, 1000);
      },
      lazyConnect: true,
    });

    redis.on('error', (err) => {
      console.warn(`[Cache] Redis error: ${err.message}`);
    });

    redis.connect().catch(() => {
      connectionFailed = true;
    });
  }

  return redis;
}

/**
 * Get a cached value.
 */
export async function cacheGet<T>(key: string): Promise<T | null> {
  const client = getRedis();
  if (!client) return null;

  try {
    const value = await client.get(`pikspeak:${key}`);
    if (!value) return null;
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

/**
 * Set a cached value with TTL.
 */
export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.set(`pikspeak:${key}`, JSON.stringify(value), 'EX', ttlSeconds);
  } catch {
    // Cache writes are non-critical
  }
}

/**
 * Delete a cached value.
 */
export async function cacheDel(key: string): Promise<void> {
  const client = getRedis();
  if (!client) return;

  try {
    await client.del(`pikspeak:${key}`);
  } catch {
    // Non-critical
  }
}

/**
 * Check if Redis is connected.
 */
export function isCacheAvailable(): boolean {
  return !connectionFailed && redis?.status === 'ready';
}
