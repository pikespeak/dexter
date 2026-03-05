import { createHash } from 'crypto';
import { config } from '../config.js';
import { cacheGet, cacheSet } from '../services/cache.js';

const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
const API_FOOTBALL_MAX_REQUESTS = config.API_FOOTBALL_MAX_REQUESTS;
let apiFootballUsedRequests = 0;

type SportsDataProvider = 'api-football' | 'sportmonks' | 'football-data';

export interface ApiResponse {
  data: Record<string, unknown>;
  url: string;
}

type ApiParams = Record<string, string | number | string[] | undefined>;
type CacheProvider = string;

interface ApiCallOptions {
  cacheable?: boolean;
  cacheTtlSeconds?: number;
}

interface ProviderResult {
  data: Record<string, unknown>;
  url: string;
}

interface NormalizedFixture {
  fixture: {
    id: number;
    date: string;
    status: { short: string };
    venue: { name: string | null };
  };
  league: {
    id: number;
    name: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    fulltime: {
      home: number | null;
      away: number | null;
    };
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function toInt(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function toIsoString(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

function serializeParams(params: ApiParams): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${[...value].sort().join(',')}`;
      }
      return `${key}=${String(value)}`;
    })
    .join('&');
}

function buildCacheKey(provider: CacheProvider, endpoint: string, params: ApiParams): string {
  const normalized = normalizeEndpoint(endpoint);
  const canonical = `${normalized}?${serializeParams(params)}`;
  const hash = createHash('sha1').update(canonical).digest('hex').slice(0, 16);
  const endpointLabel = normalized.replace(/\//g, '_').replace(/^_+/, '') || 'root';
  return `sports:${provider}:${endpointLabel}:${hash}`;
}

function buildUrl(baseUrl: string, endpoint: string, params: ApiParams): URL {
  const url = new URL(`${baseUrl}${normalizeEndpoint(endpoint)}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
      continue;
    }
    url.searchParams.append(key, String(value));
  }
  return url;
}

function getFootballCacheTtl(endpoint: string): number {
  const normalized = normalizeEndpoint(endpoint);
  if (normalized === '/teams/statistics') return 86_400;
  if (normalized === '/standings') return 86_400;
  if (normalized === '/fixtures/headtohead') return 43_200;
  if (normalized === '/fixtures/statistics') return 21_600;
  if (normalized === '/injuries') return 3_600;
  if (normalized === '/odds') return 120;
  if (normalized === '/predictions') return 300;
  if (normalized === '/fixtures') return 300;
  return 300;
}

function getOddsCacheTtl(endpoint: string): number {
  const normalized = normalizeEndpoint(endpoint);
  if (normalized.includes('/odds')) return 120;
  return 300;
}

function consumeFootballRequestBudgetOrThrow(): void {
  if (config.SPORTS_DATA_PROVIDER !== 'api-football') return;
  if (API_FOOTBALL_MAX_REQUESTS <= 0) return;

  if (apiFootballUsedRequests >= API_FOOTBALL_MAX_REQUESTS) {
    throw new Error(
      `[API-Football] request budget exhausted (API_FOOTBALL_MAX_REQUESTS=${API_FOOTBALL_MAX_REQUESTS}, used=${apiFootballUsedRequests})`,
    );
  }

  apiFootballUsedRequests += 1;
}

export function getApiFootballBudgetStatus(): {
  provider: SportsDataProvider;
  maxRequests: number;
  usedRequests: number;
  remainingRequests: number | null;
} {
  if (config.SPORTS_DATA_PROVIDER !== 'api-football') {
    return {
      provider: config.SPORTS_DATA_PROVIDER,
      maxRequests: 0,
      usedRequests: 0,
      remainingRequests: null,
    };
  }

  return {
    provider: 'api-football',
    maxRequests: API_FOOTBALL_MAX_REQUESTS,
    usedRequests: apiFootballUsedRequests,
    remainingRequests: API_FOOTBALL_MAX_REQUESTS > 0
      ? Math.max(0, API_FOOTBALL_MAX_REQUESTS - apiFootballUsedRequests)
      : null,
  };
}

async function requestJson(
  providerLabel: string,
  url: URL,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url.toString(), init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[${providerLabel}] network error: ${message}`);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const msg = details
      ? `${response.status} ${response.statusText} - ${details}`
      : `${response.status} ${response.statusText}`;
    throw new Error(`[${providerLabel}] request failed: ${msg}`);
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`[${providerLabel}] invalid JSON response`);
  }
}

async function tryReadCache(key: string): Promise<ApiResponse | null> {
  const cached = await cacheGet<ApiResponse>(key);
  if (!cached || typeof cached !== 'object') return null;
  if (!('url' in cached) || !('data' in cached)) return null;
  return cached;
}

function parseFootballDataCompetitionMap(raw: string): Record<number, string> {
  const map: Record<number, string> = {};
  for (const entry of raw.split(',')) {
    const [leagueRaw, codeRaw] = entry.split(':');
    if (!leagueRaw || !codeRaw) continue;
    const leagueId = Number.parseInt(leagueRaw.trim(), 10);
    const code = codeRaw.trim().toUpperCase();
    if (!Number.isFinite(leagueId) || leagueId <= 0 || !code) continue;
    map[leagueId] = code;
  }
  return map;
}

const footballDataCompetitionByLeagueId = parseFootballDataCompetitionMap(config.FOOTBALL_DATA_COMPETITION_MAP);
const footballDataLeagueByCompetitionCode = Object.fromEntries(
  Object.entries(footballDataCompetitionByLeagueId).map(([leagueId, code]) => [code, Number.parseInt(leagueId, 10)]),
) as Record<string, number>;

function resolveFootballDataCompetitionCode(leagueId: number | null): string | null {
  if (leagueId == null) return null;
  return footballDataCompetitionByLeagueId[leagueId] ?? null;
}

function resolveFootballDataLeagueId(code: string | null): number | null {
  if (!code) return null;
  return footballDataLeagueByCompetitionCode[code.toUpperCase()] ?? null;
}

function parseApiFootballStatusSet(raw: unknown): Set<string> | null {
  if (typeof raw !== 'string' || !raw.trim()) return null;
  const tokens = raw
    .split(/[-,]/)
    .map((token) => token.trim().toUpperCase())
    .filter(Boolean);
  if (tokens.length === 0) return null;
  return new Set(tokens);
}

function mapApiFootballShortToFootballDataStatus(short: string): string | null {
  if (short === 'NS' || short === 'TBD') return 'SCHEDULED';
  if (short === 'FT' || short === 'AET' || short === 'PEN') return 'FINISHED';
  if (short === '1H' || short === '2H' || short === 'HT' || short === 'LIVE') return 'IN_PLAY';
  if (short === 'PST') return 'POSTPONED';
  if (short === 'CANC') return 'CANCELLED';
  if (short === 'ABD') return 'SUSPENDED';
  return null;
}

function mapFootballDataStatusToApiFootballShort(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === 'SCHEDULED' || normalized === 'TIMED') return 'NS';
  if (normalized === 'IN_PLAY') return 'LIVE';
  if (normalized === 'PAUSED') return 'HT';
  if (normalized === 'FINISHED') return 'FT';
  if (normalized === 'POSTPONED') return 'PST';
  if (normalized === 'CANCELLED') return 'CANC';
  if (normalized === 'SUSPENDED') return 'ABD';
  return normalized || 'NS';
}

function mapSportmonksStatusToApiFootballShort(raw: string): string {
  const normalized = raw.trim().toUpperCase();
  if (normalized === 'NS' || normalized === 'NOT STARTED') return 'NS';
  if (normalized === 'FT' || normalized === 'FINISHED') return 'FT';
  if (normalized === 'LIVE' || normalized === 'IN PLAY') return 'LIVE';
  if (normalized === 'HT') return 'HT';
  if (normalized === 'PST' || normalized === 'POSTPONED') return 'PST';
  if (normalized === 'CANC' || normalized === 'CANCELLED') return 'CANC';
  if (normalized === 'ABD' || normalized === 'ABANDONED') return 'ABD';
  return normalized || 'NS';
}

function filterFixturesByStatus(
  fixtures: NormalizedFixture[],
  statusSet: Set<string> | null,
): NormalizedFixture[] {
  if (!statusSet || statusSet.size === 0) return fixtures;
  return fixtures.filter((fixture) => statusSet.has(fixture.fixture.status.short.toUpperCase()));
}

function sortFixturesByDateDesc(fixtures: NormalizedFixture[]): NormalizedFixture[] {
  return [...fixtures].sort((a, b) => {
    const aTime = new Date(a.fixture.date).getTime();
    const bTime = new Date(b.fixture.date).getTime();
    return bTime - aTime;
  });
}

function normalizeFootballDataMatch(match: Record<string, unknown>, explicitLeagueId?: number): NormalizedFixture | null {
  const id = toInt(match.id);
  const date = toIsoString(match.utcDate);
  if (id == null || !date) return null;

  const competition = asRecord(match.competition);
  const competitionCode = typeof competition?.code === 'string' ? competition.code.toUpperCase() : null;
  const competitionId = toInt(competition?.id);
  const competitionName = typeof competition?.name === 'string'
    ? competition.name
    : (competitionCode ?? 'Unknown League');

  const homeTeam = asRecord(match.homeTeam);
  const awayTeam = asRecord(match.awayTeam);
  const homeTeamId = toInt(homeTeam?.id);
  const awayTeamId = toInt(awayTeam?.id);
  const homeTeamName = typeof homeTeam?.name === 'string' ? homeTeam.name : 'Home';
  const awayTeamName = typeof awayTeam?.name === 'string' ? awayTeam.name : 'Away';

  if (homeTeamId == null || awayTeamId == null) return null;

  const leagueId =
    explicitLeagueId
    ?? resolveFootballDataLeagueId(competitionCode)
    ?? competitionId
    ?? 0;

  const score = asRecord(match.score);
  const fullTime = asRecord(score?.fullTime);
  const homeGoals = toInt(fullTime?.home);
  const awayGoals = toInt(fullTime?.away);

  const statusRaw = typeof match.status === 'string' ? match.status : 'SCHEDULED';

  return {
    fixture: {
      id,
      date,
      status: { short: mapFootballDataStatusToApiFootballShort(statusRaw) },
      venue: { name: null },
    },
    league: {
      id: leagueId,
      name: competitionName,
    },
    teams: {
      home: { id: homeTeamId, name: homeTeamName },
      away: { id: awayTeamId, name: awayTeamName },
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
    score: {
      fulltime: {
        home: homeGoals,
        away: awayGoals,
      },
    },
  };
}

function parseScorePair(value: unknown): { home: number | null; away: number | null } {
  if (typeof value !== 'string') {
    return { home: null, away: null };
  }
  const match = value.match(/(\d+)\s*-\s*(\d+)/);
  if (!match) return { home: null, away: null };
  return {
    home: toInt(match[1]),
    away: toInt(match[2]),
  };
}

function resolveSportmonksParticipantBySide(
  participants: Array<Record<string, unknown>>,
  side: 'home' | 'away',
): Record<string, unknown> | null {
  for (const participant of participants) {
    const meta = asRecord(participant.meta);
    const location = typeof meta?.location === 'string' ? meta.location.toLowerCase() : '';
    const position = typeof participant.position === 'string' ? participant.position.toLowerCase() : '';
    if (location === side || position === side) return participant;
  }
  return null;
}

function resolveSportmonksGoalFromScores(
  scores: Array<Record<string, unknown>>,
  participantId: number | null,
): number | null {
  const parseScoreRecord = (record: Record<string, unknown>): number | null => {
    const direct = toInt(record.goals);
    if (direct != null) return direct;
    const score = asRecord(record.score);
    if (score) {
      const fromScore = toInt(score.goals ?? score.goal ?? score.total ?? score.value);
      if (fromScore != null) return fromScore;
    }
    const value = toInt(record.value);
    if (value != null) return value;
    return null;
  };

  if (participantId != null) {
    for (const score of scores) {
      const scoreParticipantId =
        toInt(score.participant_id)
        ?? toInt(asRecord(score.participant)?.id);
      if (scoreParticipantId !== participantId) continue;
      const value = parseScoreRecord(score);
      if (value != null) return value;
    }
  }

  for (const score of scores) {
    const value = parseScoreRecord(score);
    if (value != null) return value;
  }

  return null;
}

function normalizeSportmonksFixture(fixture: Record<string, unknown>, explicitLeagueId?: number): NormalizedFixture | null {
  const id = toInt(fixture.id);
  const date = toIsoString(fixture.starting_at ?? fixture.date);
  if (id == null || !date) return null;

  const participants = asArray(fixture.participants)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

  const homeParticipant = resolveSportmonksParticipantBySide(participants, 'home') ?? participants[0] ?? null;
  const awayParticipant = resolveSportmonksParticipantBySide(participants, 'away') ?? participants[1] ?? null;

  const homeTeamId = toInt(homeParticipant?.id);
  const awayTeamId = toInt(awayParticipant?.id);
  const homeTeamName = typeof homeParticipant?.name === 'string' ? homeParticipant.name : 'Home';
  const awayTeamName = typeof awayParticipant?.name === 'string' ? awayParticipant.name : 'Away';

  if (homeTeamId == null || awayTeamId == null) return null;

  const scores = asArray(fixture.scores)
    .map((entry) => asRecord(entry))
    .filter((entry): entry is Record<string, unknown> => Boolean(entry));

  let homeGoals = resolveSportmonksGoalFromScores(scores, homeTeamId);
  let awayGoals = resolveSportmonksGoalFromScores(scores, awayTeamId);

  if (homeGoals == null || awayGoals == null) {
    const parsed = parseScorePair(fixture.result_info);
    homeGoals = homeGoals ?? parsed.home;
    awayGoals = awayGoals ?? parsed.away;
  }

  const league = asRecord(fixture.league);
  const leagueId = explicitLeagueId ?? toInt(league?.id ?? fixture.league_id) ?? 0;
  const leagueName = typeof league?.name === 'string' ? league.name : `League ${leagueId || '?'}`;

  const state = asRecord(fixture.state);
  const statusRaw =
    typeof state?.short_name === 'string' ? state.short_name
      : typeof state?.name === 'string' ? state.name
        : typeof fixture.status === 'string' ? fixture.status
          : 'NS';

  const venue = asRecord(fixture.venue);
  const venueName = typeof venue?.name === 'string' ? venue.name : null;

  return {
    fixture: {
      id,
      date,
      status: { short: mapSportmonksStatusToApiFootballShort(statusRaw) },
      venue: { name: venueName },
    },
    league: {
      id: leagueId,
      name: leagueName,
    },
    teams: {
      home: { id: homeTeamId, name: homeTeamName },
      away: { id: awayTeamId, name: awayTeamName },
    },
    goals: {
      home: homeGoals,
      away: awayGoals,
    },
    score: {
      fulltime: {
        home: homeGoals,
        away: awayGoals,
      },
    },
  };
}

function buildTeamStatisticsFromFixtures(fixtures: NormalizedFixture[], teamId: number): Record<string, unknown> {
  let playedTotal = 0;
  let playedHome = 0;
  let playedAway = 0;
  let winsTotal = 0;
  let winsHome = 0;
  let winsAway = 0;
  let drawsTotal = 0;
  let drawsHome = 0;
  let drawsAway = 0;
  let lossesTotal = 0;
  let lossesHome = 0;
  let lossesAway = 0;

  let goalsForTotal = 0;
  let goalsForHome = 0;
  let goalsForAway = 0;
  let goalsAgainstTotal = 0;
  let goalsAgainstHome = 0;
  let goalsAgainstAway = 0;

  let cleanSheetTotal = 0;
  let cleanSheetHome = 0;
  let cleanSheetAway = 0;
  let failedToScoreTotal = 0;
  let failedToScoreHome = 0;
  let failedToScoreAway = 0;

  const outcomesByDate: Array<{ date: string; outcome: 'W' | 'D' | 'L' }> = [];

  for (const fixture of fixtures) {
    const isHome = fixture.teams.home.id === teamId;
    const isAway = fixture.teams.away.id === teamId;
    if (!isHome && !isAway) continue;

    const homeGoals = fixture.goals.home;
    const awayGoals = fixture.goals.away;
    if (homeGoals == null || awayGoals == null) continue;

    playedTotal += 1;
    if (isHome) playedHome += 1;
    if (isAway) playedAway += 1;

    const teamGoals = isHome ? homeGoals : awayGoals;
    const oppGoals = isHome ? awayGoals : homeGoals;

    goalsForTotal += teamGoals;
    goalsAgainstTotal += oppGoals;
    if (isHome) {
      goalsForHome += teamGoals;
      goalsAgainstHome += oppGoals;
    } else {
      goalsForAway += teamGoals;
      goalsAgainstAway += oppGoals;
    }

    if (oppGoals === 0) {
      cleanSheetTotal += 1;
      if (isHome) cleanSheetHome += 1;
      if (isAway) cleanSheetAway += 1;
    }

    if (teamGoals === 0) {
      failedToScoreTotal += 1;
      if (isHome) failedToScoreHome += 1;
      if (isAway) failedToScoreAway += 1;
    }

    let outcome: 'W' | 'D' | 'L';
    if (teamGoals > oppGoals) {
      outcome = 'W';
      winsTotal += 1;
      if (isHome) winsHome += 1;
      if (isAway) winsAway += 1;
    } else if (teamGoals === oppGoals) {
      outcome = 'D';
      drawsTotal += 1;
      if (isHome) drawsHome += 1;
      if (isAway) drawsAway += 1;
    } else {
      outcome = 'L';
      lossesTotal += 1;
      if (isHome) lossesHome += 1;
      if (isAway) lossesAway += 1;
    }

    outcomesByDate.push({
      date: fixture.fixture.date,
      outcome,
    });
  }

  const outcomesDesc = [...outcomesByDate]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const form = outcomesDesc.slice(0, 5).map((entry) => entry.outcome).join('');

  let maxWinStreak = 0;
  let streak = 0;
  const outcomesAsc = [...outcomesByDate]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  for (const entry of outcomesAsc) {
    if (entry.outcome === 'W') {
      streak += 1;
      if (streak > maxWinStreak) maxWinStreak = streak;
    } else {
      streak = 0;
    }
  }

  const avg = (total: number, count: number): string => {
    if (count <= 0) return '0.00';
    return (total / count).toFixed(2);
  };

  return {
    form,
    fixtures: {
      played: { total: playedTotal, home: playedHome, away: playedAway },
      wins: { total: winsTotal, home: winsHome, away: winsAway },
      draws: { total: drawsTotal, home: drawsHome, away: drawsAway },
      loses: { total: lossesTotal, home: lossesHome, away: lossesAway },
    },
    goals: {
      for: {
        total: { total: goalsForTotal, home: goalsForHome, away: goalsForAway },
        average: { total: avg(goalsForTotal, playedTotal), home: avg(goalsForHome, playedHome), away: avg(goalsForAway, playedAway) },
      },
      against: {
        total: { total: goalsAgainstTotal, home: goalsAgainstHome, away: goalsAgainstAway },
        average: { total: avg(goalsAgainstTotal, playedTotal), home: avg(goalsAgainstHome, playedHome), away: avg(goalsAgainstAway, playedAway) },
      },
    },
    clean_sheet: {
      total: cleanSheetTotal,
      home: cleanSheetHome,
      away: cleanSheetAway,
    },
    failed_to_score: {
      total: failedToScoreTotal,
      home: failedToScoreHome,
      away: failedToScoreAway,
    },
    biggest: {
      streak: {
        wins: maxWinStreak,
      },
    },
  };
}

async function callApiFootballProvider(endpoint: string, params: ApiParams): Promise<ProviderResult> {
  const apiKey = config.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new Error('API_FOOTBALL_KEY not set');
  }

  consumeFootballRequestBudgetOrThrow();

  const url = buildUrl(config.API_FOOTBALL_BASE_URL, endpoint, params);
  const data = await requestJson('API-Football', url, {
    headers: {
      'x-apisports-key': apiKey,
    },
  });

  return { data, url: url.toString() };
}

async function callFootballDataProvider(endpoint: string, params: ApiParams): Promise<ProviderResult> {
  const apiKey = config.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error('FOOTBALL_DATA_API_KEY not set');
  }

  const request = async (path: string, query: ApiParams = {}): Promise<ProviderResult> => {
    const url = buildUrl(config.FOOTBALL_DATA_BASE_URL, path, query);
    const data = await requestJson('football-data.org', url, {
      headers: {
        'X-Auth-Token': apiKey,
      },
    });
    return { data, url: url.toString() };
  };

  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const statusSet = parseApiFootballStatusSet(params.status);

  if (normalizedEndpoint === '/fixtures') {
    const fixtureId = toInt(params.id);
    if (fixtureId != null) {
      const result = await request(`/matches/${fixtureId}`);
      const fixture = normalizeFootballDataMatch(result.data);
      const response = fixture ? filterFixturesByStatus([fixture], statusSet) : [];
      return { data: { response, errors: [] }, url: result.url };
    }

    const teamId = toInt(params.team);
    if (teamId != null) {
      const query: ApiParams = {};
      const mappedStatus = statusSet
        ? Array.from(statusSet).map(mapApiFootballShortToFootballDataStatus).find(Boolean) ?? null
        : null;

      if (mappedStatus) query.status = mappedStatus;
      if (toInt(params.last) != null) {
        query.limit = toInt(params.last) ?? undefined;
        if (!mappedStatus) query.status = 'FINISHED';
      }
      if (typeof params.from === 'string' && params.from.trim()) query.dateFrom = params.from;
      if (typeof params.to === 'string' && params.to.trim()) query.dateTo = params.to;

      const season = toInt(params.season);
      if (season != null) query.season = season;

      const leagueId = toInt(params.league);
      const competitionCode = resolveFootballDataCompetitionCode(leagueId);
      if (competitionCode) query.competitions = competitionCode;

      const result = await request(`/teams/${teamId}/matches`, query);
      const matches = asArray(asRecord(result.data)?.matches);
      let fixtures = matches
        .map((match) => asRecord(match))
        .filter((match): match is Record<string, unknown> => Boolean(match))
        .map((match) => normalizeFootballDataMatch(match, leagueId ?? undefined))
        .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));

      const last = toInt(params.last);
      if (last != null && last > 0) {
        fixtures = sortFixturesByDateDesc(fixtures).slice(0, last);
      }

      fixtures = filterFixturesByStatus(fixtures, statusSet);
      return { data: { response: fixtures, errors: [] }, url: result.url };
    }

    const leagueId = toInt(params.league);
    const query: ApiParams = {};
    if (typeof params.from === 'string' && params.from.trim()) query.dateFrom = params.from;
    if (typeof params.to === 'string' && params.to.trim()) query.dateTo = params.to;
    const mappedStatus = statusSet
      ? Array.from(statusSet).map(mapApiFootballShortToFootballDataStatus).find(Boolean) ?? null
      : null;
    if (mappedStatus) query.status = mappedStatus;

    const season = toInt(params.season);
    if (season != null) query.season = season;

    let result: ProviderResult;
    let explicitLeagueId: number | undefined;
    if (leagueId != null) {
      const competitionCode = resolveFootballDataCompetitionCode(leagueId);
      if (!competitionCode) {
        throw new Error(`FOOTBALL_DATA_COMPETITION_MAP missing mapping for league ${leagueId}`);
      }
      result = await request(`/competitions/${competitionCode}/matches`, query);
      explicitLeagueId = leagueId;
    } else {
      result = await request('/matches', query);
    }

    const matches = asArray(asRecord(result.data)?.matches);
    let fixtures = matches
      .map((match) => asRecord(match))
      .filter((match): match is Record<string, unknown> => Boolean(match))
      .map((match) => normalizeFootballDataMatch(match, explicitLeagueId))
      .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));

    fixtures = filterFixturesByStatus(fixtures, statusSet);
    return { data: { response: fixtures, errors: [] }, url: result.url };
  }

  if (normalizedEndpoint === '/fixtures/headtohead') {
    const h2h = typeof params.h2h === 'string' ? params.h2h : '';
    const [homeRaw, awayRaw] = h2h.split('-');
    const homeTeamId = Number.parseInt(homeRaw || '', 10);
    const awayTeamId = Number.parseInt(awayRaw || '', 10);
    if (!Number.isFinite(homeTeamId) || !Number.isFinite(awayTeamId)) {
      throw new Error('Invalid h2h parameter. Expected "<homeTeamId>-<awayTeamId>"');
    }

    const last = toInt(params.last) ?? 10;
    const query: ApiParams = {
      status: 'FINISHED',
      limit: Math.max(last * 6, 60),
    };

    const leagueId = toInt(params.league);
    const competitionCode = resolveFootballDataCompetitionCode(leagueId);
    if (competitionCode) query.competitions = competitionCode;

    const result = await request(`/teams/${homeTeamId}/matches`, query);
    const matches = asArray(asRecord(result.data)?.matches);
    const headToHeadMatches = matches
      .map((match) => asRecord(match))
      .filter((match): match is Record<string, unknown> => Boolean(match))
      .filter((match) => {
        const home = toInt(asRecord(match.homeTeam)?.id);
        const away = toInt(asRecord(match.awayTeam)?.id);
        return home === awayTeamId || away === awayTeamId;
      })
      .map((match) => normalizeFootballDataMatch(match, leagueId ?? undefined))
      .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));

    const response = sortFixturesByDateDesc(headToHeadMatches).slice(0, last);
    return { data: { response, errors: [] }, url: result.url };
  }

  if (normalizedEndpoint === '/standings') {
    const leagueId = toInt(params.league);
    if (leagueId == null) {
      throw new Error('/standings requires league parameter for football-data provider');
    }

    const competitionCode = resolveFootballDataCompetitionCode(leagueId);
    if (!competitionCode) {
      throw new Error(`FOOTBALL_DATA_COMPETITION_MAP missing mapping for league ${leagueId}`);
    }

    const query: ApiParams = {};
    const season = toInt(params.season);
    if (season != null) query.season = season;

    const result = await request(`/competitions/${competitionCode}/standings`, query);
    const payload = asRecord(result.data);
    const competition = asRecord(payload?.competition);
    const standings = asArray(payload?.standings);
    const totalStandings = standings
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .find((entry) => String(entry.type || '').toUpperCase() === 'TOTAL')
      ?? asRecord(standings[0]);

    const table = asArray(totalStandings?.table)
      .map((entry) => asRecord(entry))
      .filter((entry): entry is Record<string, unknown> => Boolean(entry))
      .map((entry) => {
        const team = asRecord(entry.team);
        return {
          rank: toInt(entry.position) ?? 0,
          team: {
            id: toInt(team?.id) ?? 0,
            name: typeof team?.name === 'string' ? team.name : 'Unknown Team',
          },
          all: {
            played: toInt(entry.playedGames) ?? 0,
            win: toInt(entry.won) ?? 0,
            draw: toInt(entry.draw) ?? 0,
            lose: toInt(entry.lost) ?? 0,
            goals: {
              for: toInt(entry.goalsFor) ?? 0,
              against: toInt(entry.goalsAgainst) ?? 0,
            },
          },
          goalsDiff: toInt(entry.goalDifference) ?? 0,
          points: toInt(entry.points) ?? 0,
        };
      });

    const response = [{
      league: {
        id: leagueId,
        name: typeof competition?.name === 'string' ? competition.name : competitionCode,
        standings: [table],
      },
    }];

    return { data: { response, errors: [] }, url: result.url };
  }

  if (normalizedEndpoint === '/teams/statistics') {
    const teamId = toInt(params.team);
    if (teamId == null) {
      throw new Error('/teams/statistics requires team parameter for football-data provider');
    }

    const query: ApiParams = {
      status: 'FINISHED',
      limit: 120,
    };

    const season = toInt(params.season);
    if (season != null) query.season = season;

    const leagueId = toInt(params.league);
    const competitionCode = resolveFootballDataCompetitionCode(leagueId);
    if (competitionCode) query.competitions = competitionCode;

    const result = await request(`/teams/${teamId}/matches`, query);
    const matches = asArray(asRecord(result.data)?.matches);
    const fixtures = matches
      .map((match) => asRecord(match))
      .filter((match): match is Record<string, unknown> => Boolean(match))
      .map((match) => normalizeFootballDataMatch(match, leagueId ?? undefined))
      .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));

    const response = buildTeamStatisticsFromFixtures(fixtures, teamId);
    return { data: { response, errors: [] }, url: result.url };
  }

  throw new Error(
    `[football-data] endpoint "${normalizedEndpoint}" not implemented. ` +
    'Supported endpoints: /fixtures, /fixtures/headtohead, /standings, /teams/statistics',
  );
}

function toYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function parseDateParam(value: unknown, fallback: Date): Date {
  if (typeof value !== 'string' || !value.trim()) return fallback;
  const parsed = new Date(`${value.trim()}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return fallback;
  return parsed;
}

async function callSportmonksProvider(endpoint: string, params: ApiParams): Promise<ProviderResult> {
  const apiKey = config.SPORTMONKS_API_KEY;
  if (!apiKey) {
    throw new Error('SPORTMONKS_API_KEY not set');
  }

  const request = async (path: string, query: ApiParams = {}): Promise<ProviderResult> => {
    const url = buildUrl(config.SPORTMONKS_BASE_URL, path, {
      ...query,
      api_token: apiKey,
    });
    const data = await requestJson('sportmonks', url);
    return { data, url: url.toString() };
  };

  const normalizedEndpoint = normalizeEndpoint(endpoint);
  const statusSet = parseApiFootballStatusSet(params.status);

  if (normalizedEndpoint === '/fixtures') {
    const fixtureId = toInt(params.id);
    if (fixtureId != null) {
      const result = await request(`/fixtures/${fixtureId}`, {
        include: 'participants;scores;league;state;venue',
      });
      const fixtureData = asRecord(result.data);
      const fixtureRecord = asRecord(fixtureData?.data);
      const fixture = fixtureRecord ? normalizeSportmonksFixture(fixtureRecord) : null;
      const response = fixture ? filterFixturesByStatus([fixture], statusSet) : [];
      return { data: { response, errors: [] }, url: result.url };
    }

    const leagueId = toInt(params.league);
    const teamId = toInt(params.team);
    const last = toInt(params.last);
    let fixtures: NormalizedFixture[] = [];
    let primaryUrl = '';

    if (teamId != null && last != null && last > 0) {
      const now = new Date();
      const from = addDays(now, -365);
      const result = await request(`/fixtures/between/${toYmd(from)}/${toYmd(now)}/${teamId}`, {
        include: 'participants;scores;league;state;venue',
      });
      primaryUrl = result.url;
      const rows = asArray(asRecord(result.data)?.data);
      fixtures = rows
        .map((row) => asRecord(row))
        .filter((row): row is Record<string, unknown> => Boolean(row))
        .map((row) => normalizeSportmonksFixture(row, leagueId ?? undefined))
        .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));
    } else {
      const from = parseDateParam(params.from, new Date());
      const to = parseDateParam(params.to, addDays(from, 7));
      const days = Math.max(
        1,
        Math.min(31, Math.floor((to.getTime() - from.getTime()) / 86_400_000) + 1),
      );

      for (let i = 0; i < days; i++) {
        const date = addDays(from, i);
        const result = await request(`/fixtures/date/${toYmd(date)}`, {
          include: 'participants;scores;league;state;venue',
        });
        if (!primaryUrl) primaryUrl = result.url;
        const rows = asArray(asRecord(result.data)?.data);
        const normalized = rows
          .map((row) => asRecord(row))
          .filter((row): row is Record<string, unknown> => Boolean(row))
          .map((row) => normalizeSportmonksFixture(row, leagueId ?? undefined))
          .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));
        fixtures.push(...normalized);
      }
    }

    if (leagueId != null) {
      fixtures = fixtures.filter((fixture) => fixture.league.id === leagueId);
    }
    if (teamId != null) {
      fixtures = fixtures.filter((fixture) => fixture.teams.home.id === teamId || fixture.teams.away.id === teamId);
    }

    fixtures = filterFixturesByStatus(fixtures, statusSet);
    if (last != null && last > 0) {
      fixtures = sortFixturesByDateDesc(fixtures).slice(0, last);
    }

    return { data: { response: fixtures, errors: [] }, url: primaryUrl };
  }

  if (normalizedEndpoint === '/fixtures/headtohead') {
    const h2h = typeof params.h2h === 'string' ? params.h2h : '';
    const [homeRaw, awayRaw] = h2h.split('-');
    const homeTeamId = Number.parseInt(homeRaw || '', 10);
    const awayTeamId = Number.parseInt(awayRaw || '', 10);
    if (!Number.isFinite(homeTeamId) || !Number.isFinite(awayTeamId)) {
      throw new Error('Invalid h2h parameter. Expected "<homeTeamId>-<awayTeamId>"');
    }

    const last = toInt(params.last) ?? 10;
    const result = await request(`/fixtures/head-to-head/${homeTeamId}/${awayTeamId}`, {
      include: 'participants;scores;league;state;venue',
    });
    const rows = asArray(asRecord(result.data)?.data);
    let fixtures = rows
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => normalizeSportmonksFixture(row))
      .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));

    fixtures = filterFixturesByStatus(fixtures, statusSet);
    fixtures = sortFixturesByDateDesc(fixtures).slice(0, last);
    return { data: { response: fixtures, errors: [] }, url: result.url };
  }

  if (normalizedEndpoint === '/standings') {
    const leagueId = toInt(params.league);
    if (leagueId == null) {
      throw new Error('/standings requires league parameter for sportmonks provider');
    }

    const result = await request(`/standings/live/leagues/${leagueId}`, {});
    const rows = asArray(asRecord(result.data)?.data);
    const table = rows
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => {
        const participant = asRecord(row.participant ?? row.team);
        return {
          rank: toInt(row.position ?? row.rank) ?? 0,
          team: {
            id: toInt(participant?.id) ?? 0,
            name: typeof participant?.name === 'string' ? participant.name : 'Unknown Team',
          },
          all: {
            played: toInt(row.played ?? row.matches_played) ?? 0,
            win: toInt(row.won ?? row.wins) ?? 0,
            draw: toInt(row.draw ?? row.draws) ?? 0,
            lose: toInt(row.lost ?? row.losses) ?? 0,
            goals: {
              for: toInt(row.goals_for ?? row.goalsfor) ?? 0,
              against: toInt(row.goals_against ?? row.goalsagainst) ?? 0,
            },
          },
          goalsDiff: toInt(row.goal_difference ?? row.goals_difference) ?? 0,
          points: toInt(row.points) ?? 0,
        };
      });

    const response = [{
      league: {
        id: leagueId,
        name: `League ${leagueId}`,
        standings: [table],
      },
    }];

    return { data: { response, errors: [] }, url: result.url };
  }

  if (normalizedEndpoint === '/teams/statistics') {
    const teamId = toInt(params.team);
    if (teamId == null) {
      throw new Error('/teams/statistics requires team parameter for sportmonks provider');
    }

    const season = toInt(params.season) ?? new Date().getUTCFullYear();
    const from = `${season}-08-01`;
    const to = `${season + 1}-07-31`;
    const leagueId = toInt(params.league);

    const result = await request(`/fixtures/between/${from}/${to}/${teamId}`, {
      include: 'participants;scores;league;state;venue',
    });
    let fixtures = asArray(asRecord(result.data)?.data)
      .map((row) => asRecord(row))
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => normalizeSportmonksFixture(row, leagueId ?? undefined))
      .filter((fixture): fixture is NormalizedFixture => Boolean(fixture));

    if (leagueId != null) {
      fixtures = fixtures.filter((fixture) => fixture.league.id === leagueId);
    }

    const response = buildTeamStatisticsFromFixtures(fixtures, teamId);
    return { data: { response, errors: [] }, url: result.url };
  }

  throw new Error(
    `[sportmonks] endpoint "${normalizedEndpoint}" not implemented. ` +
    'Supported endpoints: /fixtures, /fixtures/headtohead, /standings, /teams/statistics',
  );
}

async function callSportsDataProvider(endpoint: string, params: ApiParams): Promise<ProviderResult> {
  if (config.SPORTS_DATA_PROVIDER === 'api-football') {
    return callApiFootballProvider(endpoint, params);
  }
  if (config.SPORTS_DATA_PROVIDER === 'sportmonks') {
    return callSportmonksProvider(endpoint, params);
  }
  if (config.SPORTS_DATA_PROVIDER === 'football-data') {
    return callFootballDataProvider(endpoint, params);
  }
  throw new Error(`Unsupported SPORTS_DATA_PROVIDER: ${config.SPORTS_DATA_PROVIDER}`);
}

export async function callFootballApi(
  endpoint: string,
  params: ApiParams,
  options?: ApiCallOptions,
): Promise<ApiResponse> {
  const cacheKey = buildCacheKey(`sports-${config.SPORTS_DATA_PROVIDER}`, endpoint, params);

  if (options?.cacheable) {
    const cached = await tryReadCache(cacheKey);
    if (cached) return cached;
  }

  const providerResult = await callSportsDataProvider(endpoint, params);
  const result = { data: providerResult.data, url: providerResult.url };

  if (options?.cacheable) {
    const ttl = options.cacheTtlSeconds ?? getFootballCacheTtl(endpoint);
    await cacheSet(cacheKey, result, ttl);
  }

  return result;
}

export async function callOddsApi(
  endpoint: string,
  params: ApiParams,
  options?: ApiCallOptions,
): Promise<ApiResponse> {
  const apiKey = config.ODDS_API_KEY;
  const cacheKey = buildCacheKey('odds', endpoint, params);

  if (options?.cacheable) {
    const cached = await tryReadCache(cacheKey);
    if (cached) return cached;
  }

  const url = buildUrl(ODDS_API_BASE_URL, endpoint, params);
  url.searchParams.set('apiKey', apiKey ?? '');
  const data = await requestJson('Odds API', url);

  const result = { data, url: url.toString() };
  if (options?.cacheable) {
    const ttl = options.cacheTtlSeconds ?? getOddsCacheTtl(endpoint);
    await cacheSet(cacheKey, result, ttl);
  }

  return result;
}

