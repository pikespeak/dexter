/**
 * Structured Error Handling
 *
 * Consistent error response format with request ID tracking.
 */

import { Context, Next } from 'hono';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Request ID middleware - adds unique ID to each request.
 */
export async function requestIdMiddleware(c: Context, next: Next) {
  const requestId =
    c.req.header('x-request-id') || crypto.randomUUID();
  c.set('requestId', requestId);
  c.header('X-Request-Id', requestId);
  await next();
}

/**
 * Structured error handler.
 */
export function structuredErrorHandler(err: Error, c: Context) {
  const requestId = c.get('requestId') || 'unknown';

  if (err instanceof AppError) {
    return c.json(
      {
        error: err.message,
        code: err.code,
        requestId,
      },
      err.statusCode as 400 | 401 | 403 | 404 | 409 | 429 | 500
    );
  }

  // Log unexpected errors
  console.error(`[${requestId}] Unhandled error:`, err);

  return c.json(
    {
      error: 'Internal Server Error',
      requestId,
    },
    500
  );
}
