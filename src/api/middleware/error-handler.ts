import { createMiddleware } from 'hono/factory';
import type { Context } from 'hono';
import { ApiError } from '../types.js';

/**
 * Global error handler that catches all errors and returns consistent JSON responses.
 */
export const errorHandler = () =>
  createMiddleware(async (c: Context, next) => {
    try {
      await next();
    } catch (error) {
      if (error instanceof ApiError) {
        return c.json(
          { error: error.message, code: error.code, status: error.status },
          error.status as 400,
        );
      }

      const message = error instanceof Error ? error.message : String(error);
      console.error('[API Error]', message);

      return c.json(
        { error: 'Internal server error', code: 'INTERNAL_ERROR', status: 500 },
        500,
      );
    }
  });
