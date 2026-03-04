import { Hono } from 'hono';
import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';
import type { JWTPayload } from '../middleware/auth.js';

export const subscriptionRoutes = new Hono();

// GET /subscriptions/status - Current subscription status
subscriptionRoutes.get('/status', authMiddleware, async (c) => {
  const user = c.get('user') as JWTPayload;

  const [sub] = await db
    .select()
    .from(schema.subscriptions)
    .where(eq(schema.subscriptions.userId, user.userId))
    .limit(1);

  if (!sub) {
    return c.json({
      plan: 'free',
      status: 'active',
      expiresAt: null,
    });
  }

  return c.json({
    plan: sub.plan,
    status: sub.status,
    expiresAt: sub.expiresAt,
    features: getPlanFeatures(sub.plan),
  });
});

// GET /subscriptions/plans - Available plans
subscriptionRoutes.get('/plans', async (c) => {
  return c.json({
    plans: [
      {
        id: 'free',
        name: 'Free',
        price: 0,
        currency: 'EUR',
        interval: 'month',
        features: getPlanFeatures('free'),
      },
      {
        id: 'pro',
        name: 'Pro',
        price: 4.99,
        currency: 'EUR',
        interval: 'month',
        features: getPlanFeatures('pro'),
      },
      {
        id: 'premium',
        name: 'Premium',
        price: 9.99,
        currency: 'EUR',
        interval: 'month',
        features: getPlanFeatures('premium'),
      },
    ],
  });
});

function getPlanFeatures(plan: string): string[] {
  switch (plan) {
    case 'free':
      return [
        '1 Vorhersage pro Tag',
        'Spielplan & Ergebnisse',
        'Performance-Statistiken',
      ];
    case 'pro':
      return [
        'Alle Vorhersagen',
        'Value Bets',
        'Push-Benachrichtigungen',
        'Head-to-Head Analysen',
        'Verletzungs-Updates',
      ];
    case 'premium':
      return [
        'Alles aus Pro',
        'Detaillierte KI-Analysen',
        'Einsatz-Empfehlungen (Kelly)',
        'Multi-Liga Abdeckung',
        'Multi-LLM Konsens',
        'Prioritäts-Support',
      ];
    default:
      return [];
  }
}
