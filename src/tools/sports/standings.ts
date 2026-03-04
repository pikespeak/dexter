import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const StandingsSchema = z.object({
  league_id: z
    .number()
    .describe('API-Football league ID. Common: 39=Premier League, 140=La Liga, 78=Bundesliga, 135=Serie A, 61=Ligue 1.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025). Defaults to current season.'),
});

export const getStandings = new DynamicStructuredTool({
  name: 'get_standings',
  description: 'Fetches league standings/table including position, points, wins, draws, losses, goals for/against, goal difference, and form. Shows overall, home, and away records.',
  schema: StandingsSchema,
  func: async (input) => {
    const season = input.season || new Date().getFullYear();
    const params = {
      league: input.league_id,
      season,
    };

    const { data, url } = await callFootballApi('/standings', params, { cacheable: true });
    const standings = (data as { response?: unknown[] }).response || [];

    return formatToolResult(standings, [url]);
  },
});
