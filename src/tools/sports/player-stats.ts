import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const PlayerStatsSchema = z.object({
  player_id: z
    .number()
    .optional()
    .describe('API-Football player ID.'),
  team_id: z
    .number()
    .optional()
    .describe('API-Football team ID to get all player stats for a team.'),
  league_id: z
    .number()
    .optional()
    .describe('API-Football league ID.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025). Defaults to current season.'),
});

export const getPlayerStats = new DynamicStructuredTool({
  name: 'get_player_stats',
  description: 'Fetches player statistics including goals, assists, cards, minutes played, rating, and more. Can filter by player, team, or league.',
  schema: PlayerStatsSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {};

    if (input.player_id) params.id = input.player_id;
    if (input.team_id) params.team = input.team_id;
    if (input.league_id) params.league = input.league_id;
    params.season = input.season || new Date().getFullYear();

    const { data, url } = await callFootballApi('/players', params, { cacheable: true });
    const players = (data as { response?: unknown[] }).response || [];

    return formatToolResult(players, [url]);
  },
});

const PlayerSearchSchema = z.object({
  name: z
    .string()
    .describe('Player name to search for (e.g. "Mbappe", "Haaland", "Bellingham").'),
  team_id: z
    .number()
    .optional()
    .describe('Optional team ID to narrow search.'),
});

export const searchPlayer = new DynamicStructuredTool({
  name: 'search_player',
  description: 'Search for a football player by name. Returns player ID, name, age, nationality, position, and current team.',
  schema: PlayerSearchSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      search: input.name,
    };
    if (input.team_id) params.team = input.team_id;

    const { data, url } = await callFootballApi('/players', params, { cacheable: true });
    const players = (data as { response?: unknown[] }).response || [];

    return formatToolResult(players, [url]);
  },
});

const TopScorersSchema = z.object({
  league_id: z
    .number()
    .describe('API-Football league ID.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025). Defaults to current season.'),
});

export const getTopScorers = new DynamicStructuredTool({
  name: 'get_top_scorers',
  description: 'Fetches the top scorers for a league/season. Returns player name, team, goals, assists, and other stats.',
  schema: TopScorersSchema,
  func: async (input) => {
    const season = input.season || new Date().getFullYear();
    const params = {
      league: input.league_id,
      season,
    };

    const { data, url } = await callFootballApi('/players/topscorers', params, { cacheable: true });
    const scorers = (data as { response?: unknown[] }).response || [];

    return formatToolResult(scorers, [url]);
  },
});
