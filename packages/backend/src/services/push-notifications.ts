/**
 * Push Notification Service
 *
 * Sends push notifications via Expo Push API.
 * Manages token registration and notification delivery.
 */

import { eq } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  sound?: 'default' | null;
  badge?: number;
}

/**
 * Register a push token for a user.
 */
export async function registerPushToken(
  userId: string,
  token: string,
  platform: 'ios' | 'android'
): Promise<void> {
  // Upsert: if token exists, update the user assignment
  const existing = await db
    .select()
    .from(schema.pushTokens)
    .where(eq(schema.pushTokens.token, token))
    .limit(1);

  if (existing.length > 0) {
    await db
      .update(schema.pushTokens)
      .set({ userId, platform })
      .where(eq(schema.pushTokens.token, token));
  } else {
    await db.insert(schema.pushTokens).values({ userId, token, platform });
  }
}

/**
 * Remove a push token.
 */
export async function removePushToken(token: string): Promise<void> {
  await db.delete(schema.pushTokens).where(eq(schema.pushTokens.token, token));
}

/**
 * Send push notifications to all registered users.
 */
export async function sendPushToAll(
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const tokens = await db.select().from(schema.pushTokens);

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
  }));

  return sendPushMessages(messages);
}

/**
 * Send push notifications to a specific user.
 */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const tokens = await db
    .select()
    .from(schema.pushTokens)
    .where(eq(schema.pushTokens.userId, userId));

  if (tokens.length === 0) {
    return { sent: 0, failed: 0 };
  }

  const messages: PushMessage[] = tokens.map((t) => ({
    to: t.token,
    title,
    body,
    data,
    sound: 'default',
  }));

  return sendPushMessages(messages);
}

/**
 * Send messages via Expo Push API (batched in chunks of 100).
 */
async function sendPushMessages(
  messages: PushMessage[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Expo API accepts up to 100 messages per request
  const chunks: PushMessage[][] = [];
  for (let i = 0; i < messages.length; i += 100) {
    chunks.push(messages.slice(i, i + 100));
  }

  for (const chunk of chunks) {
    try {
      const response = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          accept: 'application/json',
        },
        body: JSON.stringify(chunk),
      });

      if (response.ok) {
        const result = (await response.json()) as {
          data: Array<{ status: string; id?: string; message?: string }>;
        };
        for (const ticket of result.data) {
          if (ticket.status === 'ok') {
            sent++;
          } else {
            failed++;
            console.warn(`[Push] Failed ticket: ${ticket.message}`);
          }
        }
      } else {
        failed += chunk.length;
        console.error(`[Push] API error: ${response.status}`);
      }
    } catch (error) {
      failed += chunk.length;
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Push] Send error: ${msg}`);
    }
  }

  return { sent, failed };
}
