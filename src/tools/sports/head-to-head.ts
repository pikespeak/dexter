import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const HeadToHeadSchema = z.object({
  team_id_1: z
    .number()
    .describe('API-Football team ID of the first team (home).'),
  team_id_2: z
    .number()
    .describe('API-Football team ID of the second team (away).'),
  last: z
    .number()
    .default(10)
    .describe('Number of last head-to-head matches to return. Defaults to 10.'),
});

export const getHeadToHead = new DynamicStructuredTool({
  name: 'get_head_to_head',
  description: 'Fetches head-to-head history between two teams. Returns past match results including scores, dates, venues, and competition. Essential for match prediction.',
  schema: HeadToHeadSchema,
  func: async (input) => {
    const params = {
      h2h: `${input.team_id_1}-${input.team_id_2}`,
      last: input.last,
    };

    const { data, url } = await callFootballApi('/fixtures/headtohead', params, { cacheable: true });
    const matches = (data as { response?: unknown[] }).response || [];

    return formatToolResult(matches, [url]);
  },
});
