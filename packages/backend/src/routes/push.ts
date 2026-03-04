import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../middleware/auth.js';
import { registerPushToken, removePushToken } from '../services/push-notifications.js';

export const pushRoutes = new Hono();

const registerTokenSchema = z.object({
  token: z.string().min(1),
  platform: z.enum(['ios', 'android']),
});

// POST /push/register - Register a push notification token
pushRoutes.post('/register', authMiddleware, zValidator('json', registerTokenSchema), async (c) => {
  const user = c.get('user') as JWTPayload;
  const { token, platform } = c.req.valid('json');

  await registerPushToken(user.userId, token, platform);
  return c.json({ registered: true });
});

// POST /push/unregister - Remove a push notification token
pushRoutes.post('/unregister', authMiddleware, zValidator('json', z.object({ token: z.string() })), async (c) => {
  const { token } = c.req.valid('json');
  await removePushToken(token);
  return c.json({ unregistered: true });
});
