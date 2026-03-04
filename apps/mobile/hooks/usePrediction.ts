/**
 * Hook for managing prediction state and SSE streaming.
 */

import { useState, useCallback, useRef } from 'react';
import { streamPrediction, type PredictionEvent } from '../services/api';

interface PredictionState {
  isLoading: boolean;
  events: PredictionEvent[];
  answer: string | null;
  error: string | null;
}

export function usePrediction() {
  const [state, setState] = useState<PredictionState>({
    isLoading: false,
    events: [],
    answer: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const predict = useCallback(async (query: string, model?: string) => {
    // Cancel any in-flight prediction
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState({ isLoading: true, events: [], answer: null, error: null });

    try {
      for await (const event of streamPrediction(query, model)) {
        setState((prev) => {
          const updated = { ...prev, events: [...prev.events, event] };
          if (event.type === 'done' && typeof event.answer === 'string') {
            updated.answer = event.answer;
            updated.isLoading = false;
          }
          return updated;
        });
      }

      // Stream ended — mark as done if not already
      setState((prev) => ({ ...prev, isLoading: false }));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
    }
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  return { ...state, predict, cancel };
}
