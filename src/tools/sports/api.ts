import { readCache, writeCache, describeRequest } from '../../utils/cache.js';
import { logger } from '../../utils/logger.js';

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';

export interface ApiResponse {
  data: Record<string, unknown>;
  url: string;
}

/**
 * Call the API-Football API (api-football.com via RapidAPI).
 * Provides comprehensive football data: fixtures, teams, players, odds, statistics.
 */
export async function callFootballApi(
  endpoint: string,
  params: Record<string, string | number | string[] | undefined>,
  options?: { cacheable?: boolean }
): Promise<ApiResponse> {
  const label = describeRequest(endpoint, params);

  if (options?.cacheable) {
    const cached = readCache(`football${endpoint}`, params);
    if (cached) {
      return cached;
    }
  }

  const API_FOOTBALL_KEY = process.env.API_FOOTBALL_KEY;

  if (!API_FOOTBALL_KEY) {
    logger.warn(`[API-Football] call without key: ${label}`);
  }

  const url = new URL(`${API_FOOTBALL_BASE_URL}${endpoint}`);

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        'x-apisports-key': API_FOOTBALL_KEY || '',
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[API-Football] network error: ${label} — ${message}`);
    throw new Error(`[API-Football] request failed for ${label}: ${message}`);
  }

  if (!response.ok) {
    const detail = `${response.status} ${response.statusText}`;
    logger.error(`[API-Football] error: ${label} — ${detail}`);
    throw new Error(`[API-Football] request failed: ${detail}`);
  }

  const data = await response.json().catch(() => {
    const detail = `invalid JSON (${response.status} ${response.statusText})`;
    logger.error(`[API-Football] parse error: ${label} — ${detail}`);
    throw new Error(`[API-Football] request failed: ${detail}`);
  });

  if (options?.cacheable) {
    writeCache(`football${endpoint}`, params, data, url.toString());
  }

  return { data, url: url.toString() };
}

/**
 * Call The Odds API for aggregated bookmaker odds.
 * Provides odds from 40+ bookmakers for value bet detection.
 */
export async function callOddsApi(
  endpoint: string,
  params: Record<string, string | number | string[] | undefined>,
  options?: { cacheable?: boolean }
): Promise<ApiResponse> {
  const label = describeRequest(endpoint, params);

  if (options?.cacheable) {
    const cached = readCache(`odds${endpoint}`, params);
    if (cached) {
      return cached;
    }
  }

  const ODDS_API_KEY = process.env.ODDS_API_KEY;

  if (!ODDS_API_KEY) {
    logger.warn(`[Odds API] call without key: ${label}`);
  }

  const url = new URL(`${ODDS_API_BASE_URL}${endpoint}`);
  url.searchParams.append('apiKey', ODDS_API_KEY || '');

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((v) => url.searchParams.append(key, v));
      } else {
        url.searchParams.append(key, String(value));
      }
    }
  }

  let response: Response;
  try {
    response = await fetch(url.toString());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`[Odds API] network error: ${label} — ${message}`);
    throw new Error(`[Odds API] request failed for ${label}: ${message}`);
  }

  if (!response.ok) {
    const detail = `${response.status} ${response.statusText}`;
    logger.error(`[Odds API] error: ${label} — ${detail}`);
    throw new Error(`[Odds API] request failed: ${detail}`);
  }

  const data = await response.json().catch(() => {
    const detail = `invalid JSON (${response.status} ${response.statusText})`;
    logger.error(`[Odds API] parse error: ${label} — ${detail}`);
    throw new Error(`[Odds API] parse failed: ${detail}`);
  });

  if (options?.cacheable) {
    writeCache(`odds${endpoint}`, params, data, url.toString());
  }

  return { data, url: url.toString() };
}
