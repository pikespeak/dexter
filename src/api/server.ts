/**
 * Hono API Server — exposes the Dexter agent as a REST API with SSE streaming.
 *
 * Endpoints:
 *   POST /api/v1/predict      — Start a new prediction (returns SSE stream)
 *   GET  /api/v1/domains      — List available prediction domains
 *   GET  /api/v1/health       — Health check
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { streamSSE } from 'hono/streaming';
import { Agent } from '../agent/agent.js';
import { discoverSkills } from '../skills/index.js';

const app = new Hono();

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

app.use('*', cors({
  origin: ['http://localhost:8081', 'http://localhost:19006'], // Expo dev
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

/** Health check */
app.get('/api/v1/health', (c) => c.json({ status: 'ok', version: '1.0.0' }));

/** List available prediction domains & skills */
app.get('/api/v1/domains', (c) => {
  const skills = discoverSkills();
  const domains = skills.map((s) => ({
    name: s.name,
    description: s.description,
    source: s.source,
  }));
  return c.json({ domains });
});

/** Start a prediction — streams agent events via SSE */
app.post('/api/v1/predict', async (c) => {
  const body = await c.req.json<{ query: string; model?: string }>();

  if (!body.query || typeof body.query !== 'string') {
    return c.json({ error: 'Missing or invalid "query" field' }, 400);
  }

  const agent = Agent.create({
    model: body.model,
  });

  return streamSSE(c, async (stream) => {
    for await (const event of agent.run(body.query)) {
      await stream.writeSSE({
        event: event.type,
        data: JSON.stringify(event),
      });
    }
  });
});

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export { app };

/**
 * Start the API server (called from CLI or standalone).
 */
export function startServer(port = 3000): void {
  console.log(`Dexter API server listening on http://localhost:${port}`);

  Bun.serve({
    port,
    fetch: app.fetch,
  });
}
