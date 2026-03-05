import { and, gte, lt, lte, sql } from 'drizzle-orm';
import { readdir } from 'fs/promises';
import { resolve } from 'path';
import { config } from '../config.js';
import { db, schema } from '../db/index.js';
import { importCsvFixtures } from '../services/csv-fixture-import.js';

interface CliOptions {
  dryRun: boolean;
  seasonCode?: string;
  fromDate?: string;
  toDate?: string;
  windowDays: number;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {
    dryRun: false,
    windowDays: 45,
  };

  for (const arg of argv) {
    if (arg === '--dry-run') {
      options.dryRun = true;
      continue;
    }

    if (arg.startsWith('--season=')) {
      options.seasonCode = arg.slice('--season='.length).trim();
      continue;
    }

    if (arg.startsWith('--from=')) {
      options.fromDate = arg.slice('--from='.length).trim();
      continue;
    }

    if (arg.startsWith('--to=')) {
      options.toDate = arg.slice('--to='.length).trim();
      continue;
    }

    if (arg.startsWith('--window-days=')) {
      const raw = arg.slice('--window-days='.length).trim();
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.windowDays = parsed;
      }
    }
  }

  return options;
}

function parseCsvFiles(raw: string): string[] {
  return raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

async function discoverCsvFilesFromDataDir(): Promise<string[]> {
  const baseDir = resolve(process.cwd(), '../../data/football-data');
  let seasonDirs: string[] = [];

  try {
    const entries = await readdir(baseDir, { withFileTypes: true });
    seasonDirs = entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => resolve(baseDir, entry.name))
      .sort();
  } catch {
    return [];
  }

  const files: string[] = [];
  for (const seasonDir of seasonDirs) {
    const entries = await readdir(seasonDir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.toLowerCase().endsWith('.csv')) continue;
      files.push(resolve(seasonDir, entry.name));
    }
  }

  return files;
}

function extractSeasonCode(pathValue: string): string | null {
  const normalized = pathValue.replace(/\\/g, '/');
  const match = normalized.match(/\/(\d{4})\//);
  return match ? match[1] : null;
}

function parseSeasonStartYear(seasonCode: string): number | null {
  if (!/^\d{4}$/.test(seasonCode)) return null;

  const startShort = Number.parseInt(seasonCode.slice(0, 2), 10);
  if (!Number.isFinite(startShort)) return null;
  return 2000 + startShort;
}

function formatYmd(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function subtractUtcDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() - days);
  return next;
}

function getLatestSeasonCode(files: string[]): string | null {
  const seasonCodes = new Set<string>();
  for (const file of files) {
    const code = extractSeasonCode(file);
    if (code) seasonCodes.add(code);
  }
  if (seasonCodes.size === 0) return null;
  return Array.from(seasonCodes).sort().at(-1) ?? null;
}

function filterFilesForSeason(files: string[], seasonCode: string): string[] {
  const markerUnix = `/${seasonCode}/`;
  const markerWindows = `\\${seasonCode}\\`;
  return files.filter((file) => file.includes(markerUnix) || file.includes(markerWindows));
}

async function resolveRollingFromDate(
  seasonStart: Date,
  seasonEnd: Date,
  windowDays: number
): Promise<Date> {
  const [row] = await db
    .select({
      maxKickoff: sql<string | Date | null>`max(${schema.matches.kickoff})`,
    })
    .from(schema.matches)
    .where(and(
      lt(schema.matches.apiFootballId, 0),
      gte(schema.matches.kickoff, seasonStart),
      lte(schema.matches.kickoff, seasonEnd)
    ));

  const value = row?.maxKickoff;
  if (!value) return seasonStart;

  const maxKickoff = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(maxKickoff.getTime())) return seasonStart;

  const candidate = subtractUtcDays(maxKickoff, windowDays);
  return candidate < seasonStart ? seasonStart : candidate;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  let allFiles = parseCsvFiles(config.CSV_FIXTURE_FILES);
  if (allFiles.length === 0) {
    allFiles = await discoverCsvFilesFromDataDir();
  }

  if (allFiles.length === 0) {
    throw new Error('No CSV files found. Set CSV_FIXTURE_FILES or place CSVs under data/football-data/<season>/');
  }

  const seasonCode = options.seasonCode || getLatestSeasonCode(allFiles);
  const files = seasonCode ? filterFilesForSeason(allFiles, seasonCode) : allFiles;

  if (files.length === 0) {
    throw new Error(`No CSV files found for season "${seasonCode}".`);
  }

  const today = new Date();
  const toDate = options.toDate || formatYmd(today);

  let fromDate = options.fromDate;
  if (!fromDate) {
    if (!seasonCode) {
      fromDate = formatYmd(subtractUtcDays(today, options.windowDays));
    } else {
      const seasonStartYear = parseSeasonStartYear(seasonCode);
      if (!seasonStartYear) {
        throw new Error(`Invalid season code "${seasonCode}". Expected format YYZZ (e.g. 2526).`);
      }

      const seasonStart = new Date(Date.UTC(seasonStartYear, 7, 1, 0, 0, 0, 0));
      const seasonEnd = new Date(Date.UTC(seasonStartYear + 1, 6, 31, 23, 59, 59, 999));
      fromDate = formatYmd(await resolveRollingFromDate(seasonStart, seasonEnd, options.windowDays));
    }
  }

  console.log(`[CSV Delta] season=${seasonCode || 'all'} files=${files.length} from=${fromDate} to=${toDate} dryRun=${options.dryRun}`);

  const result = await importCsvFixtures({
    files,
    dryRun: options.dryRun,
    fromDate,
    toDate,
  });

  console.log(JSON.stringify(result, null, 2));

  process.exit(result.errors.length > 0 ? 2 : 0);
}

await main();
