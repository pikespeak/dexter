import { DynamicStructuredTool } from '@langchain/core/tools';
import { z } from 'zod';
import { callOddsApi, callFootballApi } from './api.js';
import { formatToolResult } from '../types.js';

const MatchOddsSchema = z.object({
  fixture_id: z
    .number()
    .optional()
    .describe('API-Football fixture ID to get odds for a specific match.'),
  league_id: z
    .number()
    .optional()
    .describe('API-Football league ID.'),
  season: z
    .number()
    .optional()
    .describe('Season year (e.g. 2025).'),
  bookmaker_id: z
    .number()
    .optional()
    .describe('Specific bookmaker ID. Common: 1=Bet365, 2=Bwin, 6=Betfair, 8=Unibet, 11=1xBet.'),
});

export const getMatchOdds = new DynamicStructuredTool({
  name: 'get_match_odds',
  description: 'Fetches betting odds from API-Football for a specific fixture or league. Returns odds from multiple bookmakers for various markets (1X2, Over/Under, BTTS, etc.).',
  schema: MatchOddsSchema,
  func: async (input) => {
    const params: Record<string, string | number | undefined> = {};

    if (input.fixture_id) params.fixture = input.fixture_id;
    if (input.league_id) params.league = input.league_id;
    if (input.season) params.season = input.season ?? new Date().getFullYear();
    if (input.bookmaker_id) params.bookmaker = input.bookmaker_id;

    const { data, url } = await callFootballApi('/odds', params);
    const odds = (data as { response?: unknown[] }).response || [];

    return formatToolResult(odds, [url]);
  },
});

const ComparativeOddsSchema = z.object({
  sport: z
    .string()
    .default('soccer')
    .describe('Sport key. Default: "soccer". Others: "basketball", "tennis", "americanfootball_nfl".'),
  regions: z
    .string()
    .default('eu')
    .describe('Comma-separated regions for bookmakers. Options: us, uk, eu, au. Default: "eu".'),
  markets: z
    .string()
    .default('h2h')
    .describe('Comma-separated markets. Options: h2h (1X2), spreads, totals (Over/Under). Default: "h2h".'),
});

export const getComparativeOdds = new DynamicStructuredTool({
  name: 'get_comparative_odds',
  description: 'Fetches odds from 40+ bookmakers via The Odds API. Perfect for comparing odds across bookmakers and identifying value bets. Returns odds for upcoming matches.',
  schema: ComparativeOddsSchema,
  func: async (input) => {
    const params = {
      regions: input.regions,
      markets: input.markets,
    };

    const sport = input.sport || 'soccer';
    const { data, url } = await callOddsApi(`/sports/${sport}/odds`, params);

    return formatToolResult(data, [url]);
  },
});
