import { useAppStore } from "./store";
import { delay, getAgentResponse } from "./mock-data";
import type { SSEEvent, SSEEventType } from "./types";

interface AgentQueryOptions {
  model?: string;
  modelProvider?: string;
  signal?: AbortSignal;
}

async function* mockQueryAgent(
  query: string,
  signal?: AbortSignal
): AsyncGenerator<SSEEvent> {
  const response = getAgentResponse(query);

  await delay(300, 600);
  if (signal?.aborted) return;
  yield { type: "thinking", data: { content: "Analyzing your question..." } };

  for (const toolName of response.tools) {
    await delay(400, 800);
    if (signal?.aborted) return;
    yield { type: "tool_start", toolName, data: { toolName } };

    await delay(500, 1000);
    if (signal?.aborted) return;
    yield { type: "tool_end", toolName, data: { toolName } };
  }

  await delay(300, 500);
  if (signal?.aborted) return;
  yield { type: "done", answer: response.answer, data: { answer: response.answer } };
}

export async function* queryAgent(
  query: string,
  opts?: AgentQueryOptions
): AsyncGenerator<SSEEvent> {
  const { serverUrl, apiKey, useMockData } = useAppStore.getState();

  if (useMockData) {
    yield* mockQueryAgent(query, opts?.signal);
    return;
  }
  const url = `${serverUrl}/agent/query`;

  const body: Record<string, string> = { query };
  if (opts?.model) body.model = opts.model;
  if (opts?.modelProvider) body.modelProvider = opts.modelProvider;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });

  if (!response.ok) {
    const err = await response.json();
    yield { type: "error", error: err.error || "Request failed" };
    return;
  }

  if (!response.body) {
    yield { type: "error", error: "No response body" };
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let currentEvent: SSEEventType | null = null;

      for (const line of lines) {
        if (line.startsWith("event: ")) {
          currentEvent = line.slice(7).trim() as SSEEventType;
        } else if (line.startsWith("data: ") && currentEvent) {
          const dataStr = line.slice(6);
          try {
            const data = JSON.parse(dataStr);
            yield {
              type: currentEvent,
              data,
              toolName: data.toolName,
              error: data.error,
              answer: data.answer,
            };
          } catch {
            yield { type: currentEvent, data: { raw: dataStr } };
          }
          currentEvent = null;
        } else if (line === "") {
          currentEvent = null;
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}
