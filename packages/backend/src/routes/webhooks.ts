import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { secureCompare } from '../middleware/auth.js';

export const webhookRoutes = new Hono();

/**
 * POST /webhooks/revenuecat - Handle RevenueCat subscription events.
 * RevenueCat sends webhooks for subscription lifecycle events:
 * - INITIAL_PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, etc.
 */
webhookRoutes.post('/revenuecat', async (c) => {
  const body = await c.req.json();

  // Verify webhook authenticity via shared secret (constant-time comparison)
  const webhookSecret = c.req.header('Authorization') || '';
  const expectedSecret = `Bearer ${process.env.REVENUECAT_WEBHOOK_SECRET || ''}`;
  if (!process.env.REVENUECAT_WEBHOOK_SECRET || !secureCompare(webhookSecret, expectedSecret)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const event = body.event;
  const appUserId = event?.app_user_id;
  const productId = event?.product_id;
  const eventType = event?.type;

  if (!appUserId || !eventType) {
    return c.json({ error: 'Invalid event payload' }, 400);
  }

  // Map product IDs to plan names
  const planMap: Record<string, string> = {
    'pikspeak_pro_monthly': 'pro',
    'pikspeak_premium_monthly': 'premium',
  };

  const plan = planMap[productId] || 'free';

  try {
    switch (eventType) {
      case 'INITIAL_PURCHASE':
      case 'RENEWAL':
      case 'PRODUCT_CHANGE': {
        const expiresAt = event.expiration_at_ms
          ? new Date(event.expiration_at_ms)
          : null;

        await db
          .update(schema.subscriptions)
          .set({
            plan: plan as 'free' | 'pro' | 'premium',
            status: 'active',
            revenuecatId: event.id,
            expiresAt,
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, appUserId));
        break;
      }

      case 'CANCELLATION':
        await db
          .update(schema.subscriptions)
          .set({
            status: 'cancelled',
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, appUserId));
        break;

      case 'EXPIRATION':
        await db
          .update(schema.subscriptions)
          .set({
            plan: 'free',
            status: 'expired',
            updatedAt: new Date(),
          })
          .where(eq(schema.subscriptions.userId, appUserId));
        break;
    }

    return c.json({ received: true });
  } catch (error) {
    console.error('RevenueCat webhook error:', error);
    return c.json({ error: 'Internal error processing webhook' }, 500);
  }
});
