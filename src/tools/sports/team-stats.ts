import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const TeamStatsSchema = z.object({
  team_id: z
    .number()
    .describe('API-Football team ID.'),
  league_id: z
    .number()
    .describe('API-Football league ID for the season statistics.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025). Defaults to current season.'),
});

export const getTeamStats = new DynamicStructuredTool({
  name: 'get_team_stats',
  description: 'Fetches comprehensive team statistics for a season: wins/draws/losses, goals scored/conceded, form, clean sheets, penalties, cards, biggest streaks, and home/away splits.',
  schema: TeamStatsSchema,
  func: async (input) => {
    const season = input.season || new Date().getFullYear();
    const params = {
      team: input.team_id,
      league: input.league_id,
      season,
    };

    const { data, url } = await callFootballApi('/teams/statistics', params, { cacheable: true });
    const stats = (data as { response?: unknown }).response || {};

    return formatToolResult(stats, [url]);
  },
});

const TeamSearchSchema = z.object({
  name: z
    .string()
    .describe('Team name to search for (e.g. "Bayern Munich", "Real Madrid", "Liverpool").'),
});

export const searchTeam = new DynamicStructuredTool({
  name: 'search_team',
  description: 'Search for a football team by name. Returns team ID, name, logo, country, founded year, and venue details. Use this to resolve team names to IDs.',
  schema: TeamSearchSchema,
  func: async (input) => {
    const params = { search: input.name };
    const { data, url } = await callFootballApi('/teams', params, { cacheable: true });
    const teams = (data as { response?: unknown[] }).response || [];

    return formatToolResult(teams, [url]);
  },
});
