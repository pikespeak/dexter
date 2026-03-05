import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { db, schema } from '../db/index.js';
import { generateToken, generateRefreshToken, authMiddleware, refreshMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../middleware/auth.js';

export const authRoutes = new Hono<{ Variables: { user: JWTPayload } }>();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(100).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// POST /auth/register
authRoutes.post('/register', zValidator('json', registerSchema), async (c) => {
  const { email, password, displayName } = c.req.valid('json');

  // Check if user exists
  const existing = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (existing.length > 0) {
    return c.json({ error: 'Email already registered' }, 409);
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 12);

  // Create user
  const [user] = await db.insert(schema.users).values({
    email,
    passwordHash,
    displayName,
  }).returning();

  // Create free subscription
  await db.insert(schema.subscriptions).values({
    userId: user.id,
    plan: 'free',
    status: 'active',
  });

  // Generate tokens
  const tokenPayload = { userId: user.id, email: user.email, plan: 'free' };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
    refreshToken,
  }, 201);
});

// POST /auth/login
authRoutes.post('/login', zValidator('json', loginSchema), async (c) => {
  const { email, password } = c.req.valid('json');

  // Find user
  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Verify password
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return c.json({ error: 'Invalid credentials' }, 401);
  }

  // Get subscription
  const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, user.id)).limit(1);
  const plan = sub?.plan || 'free';

  // Generate tokens
  const tokenPayload = { userId: user.id, email: user.email, plan };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return c.json({
    user: { id: user.id, email: user.email, displayName: user.displayName },
    token,
    refreshToken,
  });
});

// POST /auth/refresh - uses separate refresh secret
authRoutes.post('/refresh', refreshMiddleware, async (c) => {
  const user = c.get('user');

  // Fetch latest subscription info
  const [sub] = await db.select().from(schema.subscriptions).where(eq(schema.subscriptions.userId, user.userId)).limit(1);
  const plan = sub?.plan || 'free';

  const tokenPayload = { userId: user.userId, email: user.email, plan };
  const token = generateToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  return c.json({ token, refreshToken });
});
