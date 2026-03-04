import { Context, Next } from 'hono';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'pikspeak-dev-secret-change-in-production';

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
    const payload = jwt.verify(token, JWT_SECRET) as JWTPayload;
    c.set('user', payload);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
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
 * Generate a JWT token for a user.
 */
export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Generate a refresh token with longer expiry.
 */
export function generateRefreshToken(payload: JWTPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}
