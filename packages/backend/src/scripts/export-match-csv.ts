import { exportMatchPredictionVersionsCsv } from '../services/match-csv-export.js';

interface CliOptions {
  includePending?: boolean;
  includeFinished?: boolean;
  outputDir?: string;
  outputFile?: string;
  snapshot?: boolean;
  timezone?: string;
}

function parseBoolean(raw: string): boolean | undefined {
  const normalized = raw.trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return undefined;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg.startsWith('--include-pending=')) {
      options.includePending = parseBoolean(arg.slice('--include-pending='.length));
      continue;
    }
    if (arg.startsWith('--include-finished=')) {
      options.includeFinished = parseBoolean(arg.slice('--include-finished='.length));
      continue;
    }
    if (arg.startsWith('--output-dir=')) {
      options.outputDir = arg.slice('--output-dir='.length).trim();
      continue;
    }
    if (arg.startsWith('--output-file=')) {
      options.outputFile = arg.slice('--output-file='.length).trim();
      continue;
    }
    if (arg.startsWith('--snapshot=')) {
      options.snapshot = parseBoolean(arg.slice('--snapshot='.length));
      continue;
    }
    if (arg.startsWith('--timezone=')) {
      options.timezone = arg.slice('--timezone='.length).trim();
      continue;
    }
  }

  return options;
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));

  const result = await exportMatchPredictionVersionsCsv({
    includePending: options.includePending,
    includeFinished: options.includeFinished,
    outputDir: options.outputDir,
    outputFileName: options.outputFile,
    snapshotEnabled: options.snapshot,
    timezone: options.timezone,
  });

  console.log(
    `[MatchCsvExport] rows=${result.rows} file=${result.path} durationMs=${result.durationMs}`
  );

  if (result.warnings.length > 0) {
    console.warn(`[MatchCsvExport] warnings=${result.warnings.join('; ')}`);
  }
}

await main();
