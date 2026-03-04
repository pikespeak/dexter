import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { Agent } from '../../agent/agent.js';
import { ApiError } from '../types.js';

export const agentRoutes = new Hono();

/** POST /query — AI agent research query with SSE streaming */
agentRoutes.post('/query', async (c) => {
  const body = await c.req.json().catch(() => null);

  if (!body?.query || typeof body.query !== 'string') {
    throw new ApiError('Request body must include a "query" string', 'INVALID_PARAMS', 400);
  }

  const query: string = body.query;
  const model: string | undefined = body.model;
  const modelProvider: string | undefined = body.modelProvider;

  const agent = Agent.create({ model, modelProvider });

  return streamSSE(c, async (stream) => {
    try {
      for await (const event of agent.run(query)) {
        // For SSE, strip large result payloads from tool_end events to save bandwidth
        if (event.type === 'tool_end') {
          const { result, ...rest } = event;
          const truncated = result.length > 500
            ? result.slice(0, 500) + '... [truncated]'
            : result;
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify({ ...rest, result: truncated }),
          });
        } else {
          await stream.writeSSE({
            event: event.type,
            data: JSON.stringify(event),
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await stream.writeSSE({
        event: 'error',
        data: JSON.stringify({ error: message }),
      });
    }
  });
});
