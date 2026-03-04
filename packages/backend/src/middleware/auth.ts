import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';
import { timingSafeEqual } from 'crypto';

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET must be set in production');
    }
    console.warn('[Auth] WARNING: Using dev JWT secret. Set JWT_SECRET in production.');
    return 'pikspeak-dev-secret-DO-NOT-USE-IN-PRODUCTION';
  }
  return secret;
}

function getRefreshSecret(): string {
  return process.env.JWT_REFRESH_SECRET || getJwtSecret() + '-refresh';
}

export interface JWTPayload {
  userId: string;
  email: string;
  plan: string;
}

/**
 * JWT authentication middleware.
 * Extracts and verifies the JWT token from the Authorization header.
 */
export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, getJwtSecret()) as JWTPayload;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
}

/**
 * Refresh token middleware.
 * Uses a separate secret for refresh tokens.
 */
export async function refreshMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, getRefreshSecret()) as JWTPayload;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired refresh token' }, 401);
  }
}

/**
 * Subscription tier middleware.
 * Checks if the user has the required subscription plan.
 */
export function requirePlan(minimumPlan: 'free' | 'pro' | 'premium') {
  const planHierarchy = { free: 0, pro: 1, premium: 2 };

  return async (c: Context, next: Next) => {
    const user = c.get('user') as JWTPayload;

    if (!user) {
      return c.json({ error: 'Authentication required' }, 401);
    }

    const userLevel = planHierarchy[user.plan as keyof typeof planHierarchy] ?? 0;
    const requiredLevel = planHierarchy[minimumPlan];

    if (userLevel < requiredLevel) {
      return c.json({
        error: 'Subscription upgrade required',
        required: minimumPlan,
        current: user.plan,
      }, 403);
    }

    await next();
  };
}

/**
 * Generate a JWT access token for a user.
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' });
}

/**
 * Generate a refresh token with longer expiry (separate secret).
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, getRefreshSecret(), { expiresIn: '30d' });
}

/**
 * Constant-time string comparison to prevent timing attacks.
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Compare against itself to maintain constant time
    timingSafeEqual(Buffer.from(a), Buffer.from(a));
    return false;
  }
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}
