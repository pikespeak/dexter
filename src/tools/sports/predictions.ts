import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const PredictionsSchema = z.object({
  fixture_id: z
    .number()
    .describe('API-Football fixture ID to get predictions for.'),
});

export const getApiPredictions = new DynamicStructuredTool({
  name: 'get_api_predictions',
  description: 'Fetches AI/statistical predictions from API-Football for a specific fixture. Returns win probabilities, predicted score, advice, and comparison data between teams. Useful as a baseline to compare against our own LLM-based predictions.',
  schema: PredictionsSchema,
  func: async (input) => {
    const params = {
      fixture: input.fixture_id,
    };

    const { data, url } = await callFootballApi('/predictions', params);
    const predictions = (data as { response?: unknown[] }).response || [];

    return formatToolResult(predictions, [url]);
  },
});
