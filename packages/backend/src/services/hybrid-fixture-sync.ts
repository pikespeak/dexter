import { config } from '../config.js';
import { importCsvFixtures, type CsvFixtureImportOptions, type CsvFixtureImportResult } from './csv-fixture-import.js';
import { syncUpcomingFixtures, type FixtureSyncOptions, type FixtureSyncResult } from './fixture-sync.js';

export interface HybridFixtureSyncOptions {
  includeCsv?: boolean;
  includeLive?: boolean;
  csvOptions?: CsvFixtureImportOptions;
  liveOptions?: FixtureSyncOptions;
}

export interface HybridFixtureSyncResult {
  includeCsv: boolean;
  includeLive: boolean;
  csvResult: CsvFixtureImportResult | null;
  liveResult: FixtureSyncResult | null;
  errors: string[];
}

export async function syncHybridFixtures(
  options: HybridFixtureSyncOptions = {}
): Promise<HybridFixtureSyncResult> {
  const includeCsv = options.includeCsv ?? config.CSV_FIXTURE_IMPORT_ENABLED;
  const includeLive = options.includeLive ?? true;

  const result: HybridFixtureSyncResult = {
    includeCsv,
    includeLive,
    csvResult: null,
    liveResult: null,
    errors: [],
  };

  if (!includeCsv && !includeLive) {
    result.errors.push('Both includeCsv and includeLive are disabled');
    return result;
  }

  if (includeCsv) {
    try {
      const csv = await importCsvFixtures(options.csvOptions);
      result.csvResult = csv;
      if (csv.errors.length > 0) {
        result.errors.push(...csv.errors.map((error) => `csv: ${error}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`csv: ${message}`);
    }
  }

  if (includeLive) {
    try {
      const live = await syncUpcomingFixtures(options.liveOptions);
      result.liveResult = live;
      if (live.errors.length > 0) {
        result.errors.push(...live.errors.map((error) => `live: ${error}`));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`live: ${message}`);
    }
  }

  return result;
}
