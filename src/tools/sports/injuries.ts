import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const InjuriesSchema = z.object({
  team_id: z
    .number()
    .optional()
    .describe('API-Football team ID to get injuries for.'),
  fixture_id: z
    .number()
    .optional()
    .describe('API-Football fixture ID to get injuries for a specific match.'),
  league_id: z
    .number()
    .optional()
    .describe('API-Football league ID.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025).'),
});

export const getInjuries = new DynamicStructuredTool({
  name: 'get_injuries',
  description: 'Fetches current injuries and suspensions for a team or match. Returns player name, type of injury, and expected return date. Critical for accurate match predictions.',
  schema: InjuriesSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {};

    if (input.team_id) params.team = input.team_id;
    if (input.fixture_id) params.fixture = input.fixture_id;
    if (input.league_id) params.league = input.league_id;
    if (input.season) params.season = input.season;

    if (input.league_id && !input.season) {
      params.season = new Date().getFullYear();
    }

    const { data, url } = await callFootballApi('/injuries', params);
    const injuries = (data as { response?: unknown[] }).response || [];

    return formatToolResult(injuries, [url]);
  },
});
