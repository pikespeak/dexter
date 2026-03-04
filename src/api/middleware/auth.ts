import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';

/**
 * Bearer token authentication middleware.
 * Validates API keys from the DEXTER_API_KEYS environment variable.
 * Skips auth for the health check endpoint.
 */
export const authMiddleware = () =>
  createMiddleware(async (c: Context, next) => {
    // Skip auth for health check and docs
    if (
      c.req.path.endsWith('/health') ||
      c.req.path.endsWith('/docs') ||
      c.req.path.endsWith('/openapi.json')
    ) {
      return next();
    }

    const authHeader = c.req.header('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return c.json(
        { error: 'Missing or invalid Authorization header', code: 'UNAUTHORIZED', status: 401 },
        401,
      );
    }

    const token = authHeader.slice(7);
    const validKeys = (process.env.DEXTER_API_KEYS || '')
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (validKeys.length === 0) {
      // No API keys configured — allow all requests (development mode)
      await next();
      return;
    }

    if (!validKeys.includes(token)) {
      return c.json(
        { error: 'Invalid API key', code: 'FORBIDDEN', status: 403 },
        403,
      );
    }

    await next();
  });
