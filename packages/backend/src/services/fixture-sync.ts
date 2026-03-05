/**
 * Fixture Sync Service
 *
 * Keeps upcoming matches hydrated in the database independently from
 * prediction generation.
 */

import { and, eq, inArray, lt } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { callFootballApi } from '../lib/sports-api.js';
import { parseSeasonList, resolveApiFootballSeasons } from '../utils/api-football-season.js';
import { config } from '../config.js';

export const DEFAULT_TOP_LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 78, name: 'Bundesliga' },
  { id: 135, name: 'Serie A' },
  { id: 61, name: 'Ligue 1' },
] as const;

const DEFAULT_LEAGUE_NAME_BY_ID: Record<number, string> = Object.fromEntries(
  DEFAULT_TOP_LEAGUES.map((league) => [league.id, league.name])
);

interface FixtureResponse {
  fixture?: {
    id?: number;
    date?: string;
    status?: { short?: string };
    venue?: { name?: string };
  };
  league?: {
    id?: number;
    name?: string;
  };
  teams?: {
    home?: { id?: number; name?: string };
    away?: { id?: number; name?: string };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
}

type ApiErrors = Record<string, string> | string[] | undefined;

interface FixtureApiPayload {
  response?: unknown[];
  errors?: ApiErrors;
}

export interface MatchUpsertValues {
  apiFootballId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  leagueName: string;
  leagueId: number;
  kickoff: Date;
  venue: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

interface ExistingMatchSnapshot {
  id: string;
  apiFootballId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  leagueName: string;
  leagueId: number;
  kickoff: Date;
  venue: string | null;
  status: string | null;
  homeScore: number | null;
  awayScore: number | null;
}

interface FetchFixturesPageResult {
  successfulFetches: number;
  fixturesFetched: number;
  fixtures: FixtureResponse[];
  errors: string[];
}

interface SyncCoreResult {
  successfulFetches: number;
  fixturesFetched: number;
  fixturesDeduped: number;
  inserted: number;
  updated: number;
  errors: string[];
}

interface DateChunk {
  from: Date;
  to: Date;
}

interface SeasonDateChunk extends DateChunk {
  season: number;
}

export interface FixtureSyncOptions {
  horizonDays?: number;
  leagueIds?: number[];
  dryRun?: boolean;
  statusFilter?: string;
  cacheTtlSeconds?: number;
  staleScheduledHours?: number;
}

export interface FixtureSyncResult {
  horizonDays: number;
  leagueIds: number[];
  dryRun: boolean;
  leaguesAttempted: number;
  successfulFetches: number;
  fixturesFetched: number;
  fixturesDeduped: number;
  inserted: number;
  updated: number;
  cleaned: number;
  errors: string[];
}

export interface HistoricalFixtureSeedOptions {
  fromDate?: string | Date;
  toDate?: string | Date;
  leagueIds?: number[];
  seasonYears?: number[];
  dryRun?: boolean;
  statusFilter?: string;
  chunkDays?: number;
  requestDelayMs?: number;
  cacheTtlSeconds?: number;
}

export interface HistoricalFixtureSeedResult {
  fromDate: string;
  toDate: string;
  seasonYears: number[];
  chunkDays: number;
  requestDelayMs: number;
  chunksPlanned: number;
  leagueIds: number[];
  dryRun: boolean;
  leaguesAttempted: number;
  successfulFetches: number;
  fixturesFetched: number;
  fixturesDeduped: number;
  inserted: number;
  updated: number;
  errors: string[];
}

function toYmd(date: Date): string {
  return date.toISOString().split('T')[0];
}

function distinctNumbers(values: number[]): number[] {
  return Array.from(new Set(values));
}

function parseDateInput(value: string | Date | undefined, label: string): Date | null {
  if (value == null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(`Invalid ${label}: invalid Date`);
    }
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const normalized = trimmed.length === 10 ? `${trimmed}T00:00:00.000Z` : trimmed;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Invalid ${label}: expected ISO date (YYYY-MM-DD)`);
  }
  return parsed;
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0, 0, 0, 0
  ));
}

function endOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23, 59, 59, 999
  ));
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function sleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function splitDateRange(from: Date, to: Date, chunkDays: number): DateChunk[] {
  if (chunkDays < 1) {
    throw new Error(`chunkDays must be >= 1, got ${chunkDays}`);
  }

  const start = startOfUtcDay(from);
  const end = startOfUtcDay(to);
  if (start > end) return [];

  const chunks: DateChunk[] = [];
  let cursor = start;

  while (cursor <= end) {
    let chunkEnd = addUtcDays(cursor, chunkDays - 1);
    if (chunkEnd > end) {
      chunkEnd = end;
    }

    chunks.push({
      from: new Date(cursor),
      to: endOfUtcDay(chunkEnd),
    });

    cursor = addUtcDays(chunkEnd, 1);
  }

  return chunks;
}

function getSeasonDateRange(seasonYear: number): DateChunk {
  // API-Football football season: August 1st -> July 31st.
  const from = new Date(Date.UTC(seasonYear, 7, 1, 0, 0, 0, 0));
  const to = new Date(Date.UTC(seasonYear + 1, 6, 31, 23, 59, 59, 999));
  return { from, to };
}

export function buildHistoricalSeasonSlices(
  from: Date,
  to: Date,
  seasonYears: number[],
  chunkDays: number
): SeasonDateChunk[] {
  const uniqueSeasons = distinctNumbers(seasonYears).sort((a, b) => a - b);
  const slices: SeasonDateChunk[] = [];

  for (const seasonYear of uniqueSeasons) {
    const seasonRange = getSeasonDateRange(seasonYear);
    const overlapFrom = from > seasonRange.from ? from : seasonRange.from;
    const overlapTo = to < seasonRange.to ? to : seasonRange.to;

    if (overlapFrom > overlapTo) continue;

    for (const chunk of splitDateRange(overlapFrom, overlapTo, chunkDays)) {
      slices.push({ season: seasonYear, from: chunk.from, to: chunk.to });
    }
  }

  return slices;
}

export function parseLeagueIdsCsv(raw: string): number[] {
  if (!raw.trim()) return [];

  const values = raw
    .split(',')
    .map((value) => Number.parseInt(value.trim(), 10))
    .filter((value) => Number.isFinite(value) && value > 0);

  return distinctNumbers(values);
}

export function getConfiguredLeagueIds(): number[] {
  const fromEnv = parseLeagueIdsCsv(config.FIXTURE_SYNC_LEAGUE_IDS);
  if (fromEnv.length > 0) return fromEnv;
  return DEFAULT_TOP_LEAGUES.map((league) => league.id);
}

export function getConfiguredHistoricalLeagueIds(): number[] {
  const fromEnv = parseLeagueIdsCsv(config.HISTORICAL_FIXTURE_SEED_LEAGUE_IDS);
  if (fromEnv.length > 0) return fromEnv;
  return getConfiguredLeagueIds();
}

export function getConfiguredLeagues(ids?: number[]): Array<{ id: number; name: string }> {
  const leagueIds = ids?.length ? ids : getConfiguredLeagueIds();
  return leagueIds.map((id) => ({
    id,
    name: DEFAULT_LEAGUE_NAME_BY_ID[id] ?? `League ${id}`,
  }));
}

function getConfiguredHistoricalSeasonYears(fromDate: Date, toDate: Date): number[] {
  const fromEnv = parseSeasonList(config.HISTORICAL_FIXTURE_SEED_SEASON_LIST);
  if (fromEnv.length > 0) return fromEnv;

  const fromYear = fromDate.getUTCFullYear();
  const toYear = toDate.getUTCFullYear();
  const years: number[] = [];
  for (let year = Math.min(fromYear, toYear); year <= Math.max(fromYear, toYear); year++) {
    years.push(year);
  }
  return years;
}

function resolveFixtureSeasonRequests(fromDate: Date, toDate: Date): number[] {
  const seasons = resolveApiFootballSeasons(fromDate, toDate);
  if (seasons.length > 0) return seasons;

  // API-Football /fixtures requires season for this account scope.
  return [config.API_FOOTBALL_SEASON_TO];
}

function toValidScore(value: number | null | undefined): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.trunc(value);
}

function flattenApiErrors(errors: ApiErrors): string[] {
  if (!errors) return [];
  if (Array.isArray(errors)) {
    return errors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  }

  return Object.entries(errors)
    .filter(([, value]) => typeof value === 'string' && value.length > 0)
    .map(([key, value]) => `${key}: ${value}`);
}

export function mapFixtureStatus(statusShort?: string): string {
  const status = (statusShort || '').toUpperCase();

  if (status === 'NS' || status === 'TBD') return 'scheduled';
  if (status === '1H' || status === '2H' || status === 'HT' || status === 'LIVE') return 'live';
  if (status === 'FT' || status === 'AET' || status === 'PEN') return 'finished';
  if (status === 'PST') return 'postponed';
  if (status === 'CANC') return 'cancelled';
  if (status === 'ABD') return 'abandoned';
  return 'unknown';
}

function mapFixtureToUpsertValues(fixture: FixtureResponse): MatchUpsertValues | null {
  const fixtureId = fixture.fixture?.id;
  const kickoffIso = fixture.fixture?.date;
  const homeTeam = fixture.teams?.home;
  const awayTeam = fixture.teams?.away;
  const league = fixture.league;

  if (
    typeof fixtureId !== 'number' ||
    typeof kickoffIso !== 'string' ||
    typeof homeTeam?.id !== 'number' ||
    typeof homeTeam?.name !== 'string' ||
    typeof awayTeam?.id !== 'number' ||
    typeof awayTeam?.name !== 'string' ||
    typeof league?.id !== 'number' ||
    typeof league?.name !== 'string'
  ) {
    return null;
  }

  const kickoff = new Date(kickoffIso);
  if (Number.isNaN(kickoff.getTime())) return null;

  const mappedStatus = mapFixtureStatus(fixture.fixture?.status?.short);
  const isFinished = mappedStatus === 'finished';

  return {
    apiFootballId: fixtureId,
    homeTeam: homeTeam.name,
    homeTeamId: homeTeam.id,
    awayTeam: awayTeam.name,
    awayTeamId: awayTeam.id,
    leagueName: league.name,
    leagueId: league.id,
    kickoff,
    venue: fixture.fixture?.venue?.name || 'Unknown',
    status: mappedStatus,
    homeScore: isFinished ? toValidScore(fixture.goals?.home) : null,
    awayScore: isFinished ? toValidScore(fixture.goals?.away) : null,
  };
}

export function shouldUpdateMatch(existing: ExistingMatchSnapshot, incoming: MatchUpsertValues): boolean {
  return (
    existing.homeTeam !== incoming.homeTeam ||
    existing.homeTeamId !== incoming.homeTeamId ||
    existing.awayTeam !== incoming.awayTeam ||
    existing.awayTeamId !== incoming.awayTeamId ||
    existing.leagueName !== incoming.leagueName ||
    existing.leagueId !== incoming.leagueId ||
    existing.kickoff.getTime() !== incoming.kickoff.getTime() ||
    (existing.venue || 'Unknown') !== incoming.venue ||
    (existing.status || 'unknown') !== incoming.status ||
    existing.homeScore !== incoming.homeScore ||
    existing.awayScore !== incoming.awayScore
  );
}

async function fetchFixturesWithPagination(
  leagueId: number,
  season: number,
  fromDate: string,
  toDate: string,
  statusFilter: string,
  cacheTtlSeconds: number
): Promise<FetchFixturesPageResult> {
  const result: FetchFixturesPageResult = {
    successfulFetches: 0,
    fixturesFetched: 0,
    fixtures: [],
    errors: [],
  };

  try {
    const response = await callFootballApi(
      '/fixtures',
      {
        league: leagueId,
        season,
        from: fromDate,
        to: toDate,
        status: statusFilter,
      },
      { cacheable: true, cacheTtlSeconds }
    );

    const payload = response.data as FixtureApiPayload;
    const apiErrors = flattenApiErrors(payload.errors);
    if (apiErrors.length > 0) {
      result.errors.push(...apiErrors);
      return result;
    }

    const fixtures = (payload.response || []) as FixtureResponse[];
    result.successfulFetches = 1;
    result.fixturesFetched = fixtures.length;
    result.fixtures = fixtures;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    result.errors.push(message);
  }

  return result;
}

export async function upsertMatchValues(matchValues: MatchUpsertValues[], dryRun: boolean): Promise<{
  fixturesDeduped: number;
  inserted: number;
  updated: number;
}> {
  const deduped = new Map<number, MatchUpsertValues>();
  for (const row of matchValues) {
    deduped.set(row.apiFootballId, row);
  }

  const upserts = Array.from(deduped.values());

  const fixtureIds = upserts.map((fixture) => fixture.apiFootballId);
  const existingRows = fixtureIds.length > 0
    ? await db
      .select({
        id: schema.matches.id,
        apiFootballId: schema.matches.apiFootballId,
        homeTeam: schema.matches.homeTeam,
        homeTeamId: schema.matches.homeTeamId,
        awayTeam: schema.matches.awayTeam,
        awayTeamId: schema.matches.awayTeamId,
        leagueName: schema.matches.leagueName,
        leagueId: schema.matches.leagueId,
        kickoff: schema.matches.kickoff,
        venue: schema.matches.venue,
        status: schema.matches.status,
        homeScore: schema.matches.homeScore,
        awayScore: schema.matches.awayScore,
      })
      .from(schema.matches)
      .where(inArray(schema.matches.apiFootballId, fixtureIds))
    : [];

  const existingByFixtureId = new Map(existingRows.map((row) => [row.apiFootballId, row]));
  let inserted = 0;
  let updated = 0;

  for (const incoming of upserts) {
    const existing = existingByFixtureId.get(incoming.apiFootballId);

    if (!existing) {
      inserted++;
      if (!dryRun) {
        await db.insert(schema.matches).values(incoming);
      }
      continue;
    }

    if (!shouldUpdateMatch(existing, incoming)) continue;

    updated++;
    if (!dryRun) {
      await db
        .update(schema.matches)
        .set({
          homeTeam: incoming.homeTeam,
          homeTeamId: incoming.homeTeamId,
          awayTeam: incoming.awayTeam,
          awayTeamId: incoming.awayTeamId,
          leagueName: incoming.leagueName,
          leagueId: incoming.leagueId,
          kickoff: incoming.kickoff,
          venue: incoming.venue,
          status: incoming.status,
          homeScore: incoming.homeScore,
          awayScore: incoming.awayScore,
        })
        .where(eq(schema.matches.id, existing.id));
    }
  }

  return {
    fixturesDeduped: upserts.length,
    inserted,
    updated,
  };
}

async function upsertFixtures(fetchedFixtures: FixtureResponse[], dryRun: boolean): Promise<{
  fixturesDeduped: number;
  inserted: number;
  updated: number;
}> {
  const matchValues = fetchedFixtures
    .map(mapFixtureToUpsertValues)
    .filter((row): row is MatchUpsertValues => row != null);
  return upsertMatchValues(matchValues, dryRun);
}

async function syncFixturesByDateSlices(options: {
  leagueIds: number[];
  seasonSlices: SeasonDateChunk[];
  dryRun: boolean;
  statusFilter: string;
  cacheTtlSeconds: number;
  requestDelayMs?: number;
}): Promise<SyncCoreResult> {
  const {
    leagueIds,
    seasonSlices,
    dryRun,
    statusFilter,
    cacheTtlSeconds,
    requestDelayMs = 0,
  } = options;
  const fetchedFixtures: FixtureResponse[] = [];

  const result: SyncCoreResult = {
    successfulFetches: 0,
    fixturesFetched: 0,
    fixturesDeduped: 0,
    inserted: 0,
    updated: 0,
    errors: [],
  };

  for (const leagueId of leagueIds) {
    for (const slice of seasonSlices) {
      const fromDate = toYmd(slice.from);
      const toDate = toYmd(slice.to);

      const pageResult = await fetchFixturesWithPagination(
        leagueId,
        slice.season,
        fromDate,
        toDate,
        statusFilter,
        cacheTtlSeconds
      );

      if (pageResult.successfulFetches > 0) {
        result.successfulFetches++;
      }
      result.fixturesFetched += pageResult.fixturesFetched;
      fetchedFixtures.push(...pageResult.fixtures);

      if (pageResult.errors.length > 0) {
        result.errors.push(
          ...pageResult.errors.map(
            (error) =>
              `league=${leagueId}, season=${slice.season}, from=${fromDate}, to=${toDate}: ${error}`
          )
        );
      }

      if (requestDelayMs > 0) {
        await sleep(requestDelayMs);
      }
    }
  }

  if (result.successfulFetches === 0) {
    console.warn('[FixtureSync] All API calls failed. Keeping existing database data unchanged.');
    return result;
  }

  const upsert = await upsertFixtures(fetchedFixtures, dryRun);
  result.fixturesDeduped = upsert.fixturesDeduped;
  result.inserted = upsert.inserted;
  result.updated = upsert.updated;
  return result;
}

export async function syncUpcomingFixtures(options: FixtureSyncOptions = {}): Promise<FixtureSyncResult> {
  const horizonDays = options.horizonDays ?? config.FIXTURE_SYNC_HORIZON_DAYS;
  const leagueIds = distinctNumbers(
    options.leagueIds?.length ? options.leagueIds : getConfiguredLeagueIds()
  );
  const dryRun = options.dryRun === true;
  const statusFilter = options.statusFilter ?? config.FIXTURE_SYNC_STATUS_FILTER;
  const cacheTtlSeconds = options.cacheTtlSeconds ?? config.FIXTURE_SYNC_CACHE_TTL_SECONDS;
  const staleScheduledHours = options.staleScheduledHours ?? config.FIXTURE_SYNC_STALE_SCHEDULED_HOURS;

  const result: FixtureSyncResult = {
    horizonDays,
    leagueIds,
    dryRun,
    leaguesAttempted: leagueIds.length,
    successfulFetches: 0,
    fixturesFetched: 0,
    fixturesDeduped: 0,
    inserted: 0,
    updated: 0,
    cleaned: 0,
    errors: [],
  };

  const from = new Date();
  const to = new Date(from.getTime() + horizonDays * 24 * 60 * 60 * 1000);
  const seasons = resolveFixtureSeasonRequests(from, to);
  const seasonSlices = seasons.map((season) => ({ season, from, to }));

  const sync = await syncFixturesByDateSlices({
    leagueIds,
    seasonSlices,
    dryRun,
    statusFilter,
    cacheTtlSeconds,
  });

  result.successfulFetches = sync.successfulFetches;
  result.fixturesFetched = sync.fixturesFetched;
  result.fixturesDeduped = sync.fixturesDeduped;
  result.inserted = sync.inserted;
  result.updated = sync.updated;
  result.errors = sync.errors;

  if (sync.successfulFetches === 0) {
    return result;
  }

  const staleCutoff = new Date(from.getTime() - staleScheduledHours * 60 * 60 * 1000);
  const staleScheduledMatches = await db
    .select({ id: schema.matches.id })
    .from(schema.matches)
    .where(
      and(
        eq(schema.matches.status, 'scheduled'),
        lt(schema.matches.kickoff, staleCutoff)
      )
    );

  result.cleaned = staleScheduledMatches.length;

  if (!dryRun && staleScheduledMatches.length > 0) {
    await db
      .update(schema.matches)
      .set({ status: 'unknown' })
      .where(
        and(
          eq(schema.matches.status, 'scheduled'),
          lt(schema.matches.kickoff, staleCutoff)
        )
      );
  }

  return result;
}

export async function seedHistoricalFixtures(
  options: HistoricalFixtureSeedOptions = {}
): Promise<HistoricalFixtureSeedResult> {
  const configuredFrom = parseDateInput(config.HISTORICAL_FIXTURE_SEED_FROM, 'HISTORICAL_FIXTURE_SEED_FROM');
  const configuredTo = parseDateInput(config.HISTORICAL_FIXTURE_SEED_TO, 'HISTORICAL_FIXTURE_SEED_TO');
  const fromDate = parseDateInput(options.fromDate, 'fromDate') ?? configuredFrom ?? new Date();
  const toDate = parseDateInput(options.toDate, 'toDate') ?? configuredTo ?? new Date();

  const from = startOfUtcDay(fromDate);
  const to = endOfUtcDay(toDate);
  if (from > to) {
    throw new Error(`Invalid seed range: fromDate (${toYmd(from)}) is after toDate (${toYmd(to)})`);
  }

  const seasonYears = distinctNumbers(
    options.seasonYears?.length
      ? options.seasonYears
      : getConfiguredHistoricalSeasonYears(from, to)
  ).sort((a, b) => a - b);

  if (seasonYears.length === 0) {
    throw new Error('No season years configured for historical fixture seed');
  }

  const leagueIds = distinctNumbers(
    options.leagueIds?.length ? options.leagueIds : getConfiguredHistoricalLeagueIds()
  );
  const dryRun = options.dryRun === true;
  const statusFilter = options.statusFilter ?? config.HISTORICAL_FIXTURE_SEED_STATUS_FILTER;
  const chunkDays = options.chunkDays ?? config.HISTORICAL_FIXTURE_SEED_CHUNK_DAYS;
  const requestDelayMs = options.requestDelayMs ?? config.HISTORICAL_FIXTURE_SEED_REQUEST_DELAY_MS;
  const cacheTtlSeconds = options.cacheTtlSeconds ?? config.HISTORICAL_FIXTURE_SEED_CACHE_TTL_SECONDS;

  const seasonSlices = buildHistoricalSeasonSlices(from, to, seasonYears, chunkDays);
  const sync = await syncFixturesByDateSlices({
    leagueIds,
    seasonSlices,
    dryRun,
    statusFilter,
    cacheTtlSeconds,
    requestDelayMs,
  });

  return {
    fromDate: toYmd(from),
    toDate: toYmd(to),
    seasonYears,
    chunkDays,
    requestDelayMs,
    chunksPlanned: seasonSlices.length,
    leagueIds,
    dryRun,
    leaguesAttempted: leagueIds.length,
    successfulFetches: sync.successfulFetches,
    fixturesFetched: sync.fixturesFetched,
    fixturesDeduped: sync.fixturesDeduped,
    inserted: sync.inserted,
    updated: sync.updated,
    errors: sync.errors,
  };
}
