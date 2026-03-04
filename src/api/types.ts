/**
 * Shared API response and error types for the Dexter Mobile API.
 */

export interface ApiSuccessResponse<T = unknown> {
  data: T;
  ticker?: string;
}

export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
  status: number;
}

export type ErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'RATE_LIMITED'
  | 'NOT_FOUND'
  | 'INVALID_PARAMS'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly code: ErrorCode,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Parse upstream Financial Datasets API errors into appropriate ApiErrors.
 */
export function parseUpstreamError(error: unknown): ApiError {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes('404')) {
    return new ApiError('Resource not found', 'NOT_FOUND', 404);
  }
  if (message.includes('429')) {
    return new ApiError('Upstream rate limit exceeded', 'UPSTREAM_ERROR', 502);
  }
  if (message.includes('401') || message.includes('403')) {
    return new ApiError('Upstream authentication failed', 'UPSTREAM_ERROR', 502);
  }

  return new ApiError(
    `Upstream service error: ${message}`,
    'UPSTREAM_ERROR',
    502,
  );
}
