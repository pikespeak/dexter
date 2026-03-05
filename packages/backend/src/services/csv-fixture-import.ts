import { createHash } from 'crypto';
import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { config } from '../config.js';
import { DEFAULT_TOP_LEAGUES, parseLeagueIdsCsv, type MatchUpsertValues, upsertMatchValues } from './fixture-sync.js';

const DEFAULT_LEAGUE_NAME_BY_ID: Record<number, string> = Object.fromEntries(
  DEFAULT_TOP_LEAGUES.map((league) => [league.id, league.name])
);

const MAX_SYNTH_ID_ATTEMPTS = 32;

export interface CsvFixtureImportOptions {
  files?: string[];
  dryRun?: boolean;
  leagueIds?: number[];
  fromDate?: string | Date;
  toDate?: string | Date;
  maxRows?: number;
}

export interface CsvFixtureImportResult {
  files: string[];
  filesProcessed: number;
  rowsRead: number;
  rowsAccepted: number;
  fixturesPrepared: number;
  fixturesDeduped: number;
  inserted: number;
  updated: number;
  skipped: number;
  dryRun: boolean;
  errors: string[];
}

interface CsvHeaderMap {
  div: number;
  date: number;
  time: number;
  homeTeam: number;
  awayTeam: number;
  fthg: number;
  ftag: number;
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
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

function toUtcBoundaryStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0));
}

function toUtcBoundaryEnd(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 23, 59, 59, 999));
}

function parseCsvFileList(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

export function parseCsvLeagueMap(raw: string): Record<string, number> {
  const map: Record<string, number> = {};

  for (const entry of raw.split(',')) {
    const [divRaw, leagueRaw] = entry.split(':');
    if (!divRaw || !leagueRaw) continue;

    const div = divRaw.trim().toUpperCase();
    const leagueId = Number.parseInt(leagueRaw.trim(), 10);
    if (!div || !Number.isFinite(leagueId) || leagueId <= 0) continue;
    map[div] = leagueId;
  }

  return map;
}

function detectDelimiter(content: string): ',' | ';' {
  const maxScan = Math.min(content.length, 2048);
  let commaCount = 0;
  let semicolonCount = 0;
  let inQuotes = false;

  for (let i = 0; i < maxScan; i++) {
    const char = content[i];
    if (char === '"') {
      const next = content[i + 1];
      if (inQuotes && next === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (inQuotes) continue;
    if (char === ',') commaCount++;
    if (char === ';') semicolonCount++;
    if (char === '\n') break;
  }

  return semicolonCount > commaCount ? ';' : ',';
}

function parseCsvRows(content: string): string[][] {
  const delimiter = detectDelimiter(content);
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    if (char === '"') {
      const next = content[i + 1];
      if (inQuotes && next === '"') {
        field += '"';
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }

    if (!inQuotes && char === delimiter) {
      row.push(field);
      field = '';
      continue;
    }

    if (!inQuotes && (char === '\n' || char === '\r')) {
      if (char === '\r' && content[i + 1] === '\n') {
        i++;
      }
      row.push(field);
      field = '';

      if (row.length > 1 || row[0]?.trim()) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.length > 1 || row[0]?.trim()) {
    rows.push(row);
  }

  return rows;
}

function buildCsvHeaderMap(headers: string[]): CsvHeaderMap {
  const normalized = headers.map(normalizeHeader);
  const findIndex = (candidates: string[]): number => {
    for (const candidate of candidates) {
      const index = normalized.indexOf(candidate);
      if (index >= 0) return index;
    }
    return -1;
  };

  return {
    div: findIndex(['div', 'league', 'competition']),
    date: findIndex(['date']),
    time: findIndex(['time', 'ko', 'kickoff', 'kickofftime']),
    homeTeam: findIndex(['hometeam', 'home', 'homeclub']),
    awayTeam: findIndex(['awayteam', 'away', 'awayclub']),
    fthg: findIndex(['fthg', 'homegoals', 'hg']),
    ftag: findIndex(['ftag', 'awaygoals', 'ag']),
  };
}

function mustGet(row: string[], index: number): string {
  if (index < 0) return '';
  return (row[index] || '').trim();
}

function parseInteger(value: string): number | null {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseCsvKickoff(dateRaw: string, timeRaw: string): Date | null {
  const trimmedDate = dateRaw.trim();
  if (!trimmedDate) return null;

  const parseTime = (): { hour: number; minute: number } => {
    const match = timeRaw.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return { hour: 12, minute: 0 };
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) return { hour: 12, minute: 0 };
    return { hour: Math.max(0, Math.min(23, hour)), minute: Math.max(0, Math.min(59, minute)) };
  };

  const { hour, minute } = parseTime();

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
    const [yearRaw, monthRaw, dayRaw] = trimmedDate.split('-');
    const year = Number.parseInt(yearRaw, 10);
    const month = Number.parseInt(monthRaw, 10);
    const day = Number.parseInt(dayRaw, 10);
    const kickoff = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    return Number.isNaN(kickoff.getTime()) ? null : kickoff;
  }

  if (/^\d{2}\/\d{2}\/\d{2,4}$/.test(trimmedDate)) {
    const [dayRaw, monthRaw, yearRaw] = trimmedDate.split('/');
    const day = Number.parseInt(dayRaw, 10);
    const month = Number.parseInt(monthRaw, 10);
    let year = Number.parseInt(yearRaw, 10);

    if (yearRaw.length === 2) {
      year += year >= 70 ? 1900 : 2000;
    }

    const kickoff = new Date(Date.UTC(year, month - 1, day, hour, minute, 0, 0));
    return Number.isNaN(kickoff.getTime()) ? null : kickoff;
  }

  const parsed = new Date(`${trimmedDate}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function stableNegativeId(seed: string): number {
  const hash = createHash('sha1').update(seed).digest();
  const num = hash.readUInt32BE(0);
  return -((num % 2_000_000_000) + 1);
}

function buildSyntheticFixtureId(seed: string, usedIds: Map<number, string>): number {
  for (let attempt = 0; attempt < MAX_SYNTH_ID_ATTEMPTS; attempt++) {
    const candidate = stableNegativeId(`${seed}|${attempt}`);
    const existing = usedIds.get(candidate);
    if (!existing || existing === seed) {
      usedIds.set(candidate, seed);
      return candidate;
    }
  }
  throw new Error(`Synthetic fixture id collision for seed=${seed}`);
}

function buildSyntheticTeamId(teamName: string): number {
  return stableNegativeId(`team:${teamName.trim().toLowerCase()}`);
}

function leagueNameById(leagueId: number): string {
  return DEFAULT_LEAGUE_NAME_BY_ID[leagueId] ?? `League ${leagueId}`;
}

function mapCsvRowToMatchValue(
  row: string[],
  headerMap: CsvHeaderMap,
  leagueMap: Record<string, number>,
  allowedLeagueIds: Set<number> | null,
  fromDate: Date | null,
  toDate: Date | null,
  usedFixtureIds: Map<number, string>
): { value?: MatchUpsertValues; skipped: boolean; error?: string } {
  const divCode = mustGet(row, headerMap.div).toUpperCase();
  const homeTeam = mustGet(row, headerMap.homeTeam);
  const awayTeam = mustGet(row, headerMap.awayTeam);
  const dateRaw = mustGet(row, headerMap.date);
  const timeRaw = mustGet(row, headerMap.time);
  const homeGoalsRaw = mustGet(row, headerMap.fthg);
  const awayGoalsRaw = mustGet(row, headerMap.ftag);

  if (!homeTeam || !awayTeam || !dateRaw) {
    return { skipped: true };
  }

  const kickoff = parseCsvKickoff(dateRaw, timeRaw);
  if (!kickoff) {
    return { skipped: true, error: `Invalid date/time: "${dateRaw}" "${timeRaw}"` };
  }

  const leagueId = leagueMap[divCode];
  if (!leagueId) {
    return { skipped: true };
  }

  if (allowedLeagueIds && !allowedLeagueIds.has(leagueId)) {
    return { skipped: true };
  }

  if (fromDate && kickoff < fromDate) {
    return { skipped: true };
  }
  if (toDate && kickoff > toDate) {
    return { skipped: true };
  }

  const homeGoals = parseInteger(homeGoalsRaw);
  const awayGoals = parseInteger(awayGoalsRaw);
  const isFinished = homeGoals != null && awayGoals != null;

  const key = `${leagueId}|${kickoff.toISOString()}|${homeTeam.toLowerCase()}|${awayTeam.toLowerCase()}`;
  const apiFootballId = buildSyntheticFixtureId(key, usedFixtureIds);

  return {
    skipped: false,
    value: {
      apiFootballId,
      homeTeam,
      homeTeamId: buildSyntheticTeamId(homeTeam),
      awayTeam,
      awayTeamId: buildSyntheticTeamId(awayTeam),
      leagueName: leagueNameById(leagueId),
      leagueId,
      kickoff,
      venue: 'Unknown',
      status: isFinished ? 'finished' : 'scheduled',
      homeScore: isFinished ? homeGoals : null,
      awayScore: isFinished ? awayGoals : null,
    },
  };
}

export async function importCsvFixtures(options: CsvFixtureImportOptions = {}): Promise<CsvFixtureImportResult> {
  const files = options.files?.length
    ? options.files
    : parseCsvFileList(config.CSV_FIXTURE_FILES);

  if (files.length === 0) {
    throw new Error('CSV fixture import is enabled but no CSV files are configured');
  }

  const dryRun = options.dryRun === true;
  const maxRows = options.maxRows ?? config.CSV_FIXTURE_MAX_ROWS;
  const fromDate = parseDateInput(options.fromDate, 'fromDate')
    ?? parseDateInput(config.CSV_FIXTURE_FROM, 'CSV_FIXTURE_FROM');
  const toDate = parseDateInput(options.toDate, 'toDate')
    ?? parseDateInput(config.CSV_FIXTURE_TO, 'CSV_FIXTURE_TO');
  const from = fromDate ? toUtcBoundaryStart(fromDate) : null;
  const to = toDate ? toUtcBoundaryEnd(toDate) : null;

  const leagueMap = parseCsvLeagueMap(config.CSV_FIXTURE_LEAGUE_MAP);
  const leagueIds = options.leagueIds?.length
    ? options.leagueIds
    : parseLeagueIdsCsv(config.HISTORICAL_FIXTURE_SEED_LEAGUE_IDS);
  const allowedLeagueIds = leagueIds.length > 0 ? new Set(leagueIds) : null;

  const result: CsvFixtureImportResult = {
    files,
    filesProcessed: 0,
    rowsRead: 0,
    rowsAccepted: 0,
    fixturesPrepared: 0,
    fixturesDeduped: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    dryRun,
    errors: [],
  };

  const prepared: MatchUpsertValues[] = [];
  const usedFixtureIds = new Map<number, string>();

  for (const filePath of files) {
    const absolutePath = resolve(filePath);
    try {
      const rawContent = await readFile(absolutePath, 'utf8');
      const rows = parseCsvRows(rawContent);
      if (rows.length === 0) {
        result.errors.push(`${absolutePath}: CSV is empty`);
        continue;
      }

      const headerMap = buildCsvHeaderMap(rows[0]);
      if (headerMap.date < 0 || headerMap.homeTeam < 0 || headerMap.awayTeam < 0) {
        result.errors.push(`${absolutePath}: missing required columns (Date/HomeTeam/AwayTeam)`);
        continue;
      }

      result.filesProcessed++;
      for (let i = 1; i < rows.length; i++) {
        if (maxRows > 0 && result.rowsAccepted >= maxRows) break;

        const row = rows[i];
        result.rowsRead++;

        const mapped = mapCsvRowToMatchValue(
          row,
          headerMap,
          leagueMap,
          allowedLeagueIds,
          from,
          to,
          usedFixtureIds
        );

        if (mapped.error) {
          result.errors.push(`${absolutePath}: row ${i + 1}: ${mapped.error}`);
        }
        if (mapped.skipped || !mapped.value) {
          result.skipped++;
          continue;
        }

        prepared.push(mapped.value);
        result.rowsAccepted++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`${absolutePath}: ${message}`);
    }
  }

  result.fixturesPrepared = prepared.length;
  if (prepared.length === 0) {
    return result;
  }

  const upsert = await upsertMatchValues(prepared, dryRun);
  result.fixturesDeduped = upsert.fixturesDeduped;
  result.inserted = upsert.inserted;
  result.updated = upsert.updated;
  return result;
}
