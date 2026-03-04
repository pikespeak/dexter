import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const UpcomingMatchesSchema = z.object({
  league_id: z
    .number()
    .optional()
    .describe('API-Football league ID. Common: 39=Premier League, 140=La Liga, 78=Bundesliga, 135=Serie A, 61=Ligue 1, 2=Champions League.'),
  team_id: z
    .number()
    .optional()
    .describe('API-Football team ID to filter matches for a specific team.'),
  date: z
    .string()
    .optional()
    .describe('Specific date in YYYY-MM-DD format. Defaults to today.'),
  next: z
    .number()
    .optional()
    .describe('Number of upcoming fixtures to return (max 20). Use for "next N games".'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025). Defaults to current season.'),
});

export const getUpcomingMatches = new DynamicStructuredTool({
  name: 'get_upcoming_matches',
  description: 'Fetches upcoming football/soccer fixtures. Can filter by league, team, or date. Returns match details including teams, venue, date/time, and status.',
  schema: UpcomingMatchesSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {};

    if (input.league_id) params.league = input.league_id;
    if (input.team_id) params.team = input.team_id;
    if (input.date) params.date = input.date;
    if (input.next) params.next = input.next;
    if (input.season) params.season = input.season;

    // Default to current season if league specified but no season
    if (input.league_id && !input.season) {
      params.season = new Date().getFullYear();
    }

    const { data, url } = await callFootballApi('/fixtures', params);
    const fixtures = (data as { response?: unknown[] }).response || [];

    return formatToolResult(fixtures, [url]);
  },
});

const MatchResultsSchema = z.object({
  league_id: z
    .number()
    .optional()
    .describe('API-Football league ID to filter results.'),
  team_id: z
    .number()
    .optional()
    .describe('API-Football team ID to filter results for a specific team.'),
  last: z
    .number()
    .optional()
    .describe('Number of last finished fixtures to return (max 20).'),
  from: z
    .string()
    .optional()
    .describe('Start date in YYYY-MM-DD format.'),
  to: z
    .string()
    .optional()
    .describe('End date in YYYY-MM-DD format.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025).'),
});

export const getMatchResults = new DynamicStructuredTool({
  name: 'get_match_results',
  description: 'Fetches past match results. Can filter by league, team, or date range. Returns final scores, half-time scores, and match status.',
  schema: MatchResultsSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {
      status: 'FT', // Finished matches only
    };

    if (input.league_id) params.league = input.league_id;
    if (input.team_id) params.team = input.team_id;
    if (input.last) params.last = input.last;
    if (input.from) params.from = input.from;
    if (input.to) params.to = input.to;
    if (input.season) params.season = input.season;

    if (input.league_id && !input.season) {
      params.season = new Date().getFullYear();
    }

    const { data, url } = await callFootballApi('/fixtures', params, { cacheable: true });
    const fixtures = (data as { response?: unknown[] }).response || [];

    return formatToolResult(fixtures, [url]);
  },
});
