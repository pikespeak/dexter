/**
 * API client for the Dexter prediction backend.
 * Handles authentication, requests, and SSE streaming.
 */

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Domain {
  name: string;
  description: string;
  source: string;
}

export interface PredictionEvent {
  type: string;
  [key: string]: unknown;
}

// ---------------------------------------------------------------------------
// Auth (placeholder — JWT flow)
// ---------------------------------------------------------------------------

let authToken: string | null = null;

export function setAuthToken(token: string): void {
  authToken = token;
}

function headers(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (authToken) h['Authorization'] = `Bearer ${authToken}`;
  return h;
}

// ---------------------------------------------------------------------------
// API Calls
// ---------------------------------------------------------------------------

/** Health check */
export async function healthCheck(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/api/v1/health`);
  return res.json();
}

/** List available prediction domains */
export async function getDomains(): Promise<Domain[]> {
  const res = await fetch(`${API_BASE}/api/v1/domains`, { headers: headers() });
  const data = await res.json();
  return data.domains;
}

/**
 * Start a prediction and stream results via SSE.
 * Yields parsed events as they arrive.
 */
export async function* streamPrediction(
  query: string,
  model?: string
): AsyncGenerator<PredictionEvent> {
  const res = await fetch(`${API_BASE}/api/v1/predict`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ query, model }),
  });

  if (!res.ok) {
    throw new Error(`Prediction failed: ${res.status} ${res.statusText}`);
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error('No response body');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const event = JSON.parse(line.slice(6)) as PredictionEvent;
          yield event;
        } catch {
          // Skip malformed SSE data
        }
      }
    }
  }
}
