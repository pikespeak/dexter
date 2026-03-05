import { config } from '../config.js';
import { getSeasonYear } from './season.js';

export type ApiFootballSeasonMode = 'auto' | 'range' | 'list' | 'all';

function uniqueSorted(values: number[]): number[] {
  return Array.from(new Set(values)).sort((a, b) => a - b);
}

export function parseSeasonList(raw: string): number[] {
  if (!raw.trim()) return [];
  const seasons = raw
    .split(',')
    .map((entry) => Number.parseInt(entry.trim(), 10))
    .filter((entry) => Number.isFinite(entry) && entry >= 1900 && entry <= 2100);
  return uniqueSorted(seasons);
}

function buildRange(from: number, to: number): number[] {
  if (!Number.isFinite(from) || !Number.isFinite(to)) return [];
  const min = Math.min(from, to);
  const max = Math.max(from, to);
  const result: number[] = [];
  for (let year = min; year <= max; year++) {
    result.push(year);
  }
  return result;
}

export function resolveApiFootballSeasons(fromDate: Date, toDate: Date): number[] {
  const mode = config.API_FOOTBALL_SEASON_MODE as ApiFootballSeasonMode;

  if (mode === 'all') return [];

  if (mode === 'list') {
    const list = parseSeasonList(config.API_FOOTBALL_SEASON_LIST);
    if (list.length > 0) return list;
  }

  if (mode === 'range') {
    const range = buildRange(config.API_FOOTBALL_SEASON_FROM, config.API_FOOTBALL_SEASON_TO);
    if (range.length > 0) return range;
  }

  return uniqueSorted([getSeasonYear(fromDate), getSeasonYear(toDate)]);
}

export function getPrimaryApiFootballSeason(referenceDate: Date = new Date()): number {
  const seasons = resolveApiFootballSeasons(referenceDate, referenceDate);
  if (seasons.length > 0) return seasons[seasons.length - 1];

  // "all" mode omits season for fixture listing, but some endpoints still require one.
  // Use configured upper bound as stable fallback for restricted/free plans.
  if (Number.isFinite(config.API_FOOTBALL_SEASON_TO)) {
    return config.API_FOOTBALL_SEASON_TO;
  }

  return getSeasonYear(referenceDate);
}
