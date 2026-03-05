/**
 * Cron Scheduler
 *
 * Runs scheduled tasks using env-configured UTC times.
 *
 * Includes monitoring/alerting for pipeline failures.
 */

import { runDailyPipeline } from './services/prediction-pipeline.js';
import { trackResults } from './services/result-tracker.js';
import { saveDailyMetrics, captureClosingOdds } from './services/calibration.js';
import {
  syncUpcomingFixtures,
  seedHistoricalFixtures,
  getConfiguredLeagueIds,
  type HistoricalFixtureSeedOptions,
} from './services/fixture-sync.js';
import { exportMatchPredictionVersionsCsv } from './services/match-csv-export.js';
import { config } from './config.js';

let isPipelineActive = false;
let isTrackerActive = false;
let isRePredictionActive = false;
let isMetricsActive = false;
let isClosingOddsActive = false;
let isFixtureSyncActive = false;
let isHistoricalSeedActive = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastPipelineRun: Date | null = null;
let lastTrackerRun: Date | null = null;
let lastRePredictionRun: Date | null = null;
let lastMetricsRun: Date | null = null;
let lastClosingOddsRun: Date | null = null;
let lastFixtureSyncRun: Date | null = null;
let lastHistoricalSeedRun: Date | null = null;
let consecutiveFailures = 0;

const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Check scheduled tasks every minute.
 */
function checkScheduledTasks() {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // Daily pipeline
  if (hour === config.CRON_PIPELINE_HOUR_UTC && minute === 0 && !isPipelineActive) {
    triggerPipeline();
  }

  // Daily fixture sync
  if (
    config.FIXTURE_SYNC_ENABLED &&
    hour === config.CRON_FIXTURE_SYNC_HOUR_UTC &&
    minute === 0 &&
    !isFixtureSyncActive
  ) {
    triggerFixtureSync();
  }

  // Daily re-prediction run (catches afternoon/evening European matches)
  if (hour === config.CRON_REPREDICTION_HOUR_UTC && minute === 0 && !isRePredictionActive) {
    triggerRePrediction();
  }

  // Hourly result tracking
  if (minute === config.CRON_RESULT_TRACKER_MINUTE_UTC && !isTrackerActive) {
    triggerResultTracking();
  }

  // Daily metrics snapshot
  if (hour === config.CRON_METRICS_HOUR_UTC && minute === 0 && !isMetricsActive) {
    triggerDailyMetrics();
  }

  // Closing odds capture in fixed interval
  if (
    minute === config.CRON_CLOSING_ODDS_MINUTE_UTC &&
    hour % config.CRON_CLOSING_ODDS_INTERVAL_HOURS === 0 &&
    !isClosingOddsActive
  ) {
    triggerClosingOddsCapture();
  }
}

/**
 * Trigger the prediction pipeline.
 */
export async function triggerPipeline(): Promise<{
  success: boolean;
  result?: Awaited<ReturnType<typeof runDailyPipeline>>;
  error?: string;
}> {
  if (isPipelineActive) {
    return { success: false, error: 'Pipeline is already running' };
  }

  isPipelineActive = true;
  console.log('[Cron] Pipeline triggered');

  try {
    const result = await runDailyPipeline();
    lastPipelineRun = new Date();
    consecutiveFailures = 0;

    // Alert on pipeline errors
    if (result.errors.length > 0) {
      console.warn(`[Cron] Pipeline completed with ${result.errors.length} errors:`,
        result.errors.slice(0, 5).join('; ')
      );
    }

    return { success: true, result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Pipeline FAILED: ${msg}`);
    consecutiveFailures++;

    if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
      console.error(`[Cron] ALERT: Pipeline has failed ${consecutiveFailures} times in a row!`);
    }

    return { success: false, error: msg };
  } finally {
    isPipelineActive = false;
  }
}

/**
 * Trigger re-prediction run for matches with updated data.
 * Runs the same pipeline but only generates predictions for matches
 * that already have predictions (update mode).
 */
export async function triggerRePrediction(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (isRePredictionActive || isPipelineActive) {
    return { success: false, error: 'Pipeline or re-prediction is already running' };
  }

  isRePredictionActive = true;
  console.log('[Cron] Re-prediction triggered (late data update)');

  try {
    // Re-run the full pipeline — storePrediction handles upserts
    const result = await runDailyPipeline();
    lastRePredictionRun = new Date();
    console.log(`[Cron] Re-prediction complete: ${result.predictionsGenerated} predictions updated`);
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Re-prediction failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isRePredictionActive = false;
  }
}

/**
 * Trigger result tracking.
 */
export async function triggerResultTracking(): Promise<{
  success: boolean;
  result?: Awaited<ReturnType<typeof trackResults>>;
  error?: string;
}> {
  if (isTrackerActive) {
    return { success: false, error: 'Result tracker is already running' };
  }

  isTrackerActive = true;
  console.log('[Cron] Result tracking triggered');

  try {
    const result = await trackResults();
    lastTrackerRun = new Date();

    if (config.MATCH_CSV_EXPORT_ENABLED) {
      try {
        const exportResult = await exportMatchPredictionVersionsCsv();
        console.log(
          `[Cron] Match CSV export complete: rows=${exportResult.rows} file=${exportResult.path} durationMs=${exportResult.durationMs}`
        );
        if (exportResult.warnings.length > 0) {
          console.warn(`[Cron] Match CSV export warnings: ${exportResult.warnings.join('; ')}`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.warn(`[Cron] Match CSV export failed (fail-open): ${msg}`);
      }
    }

    return { success: true, result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Result tracking failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isTrackerActive = false;
  }
}

/**
 * Trigger daily metrics snapshot.
 */
export async function triggerDailyMetrics(): Promise<{
  success: boolean;
  error?: string;
}> {
  if (isMetricsActive) {
    return { success: false, error: 'Metrics snapshot is already running' };
  }

  isMetricsActive = true;
  console.log('[Cron] Daily metrics snapshot triggered');

  try {
    await saveDailyMetrics();
    lastMetricsRun = new Date();
    return { success: true };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Daily metrics failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isMetricsActive = false;
  }
}

/**
 * Trigger closing odds capture for upcoming matches.
 */
export async function triggerClosingOddsCapture(): Promise<{
  success: boolean;
  updated?: number;
  error?: string;
}> {
  if (isClosingOddsActive) {
    return { success: false, error: 'Closing odds capture is already running' };
  }

  isClosingOddsActive = true;
  console.log('[Cron] Closing odds capture triggered');

  try {
    const updated = await captureClosingOdds();
    lastClosingOddsRun = new Date();
    return { success: true, updated };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Closing odds capture failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isClosingOddsActive = false;
  }
}

/**
 * Trigger fixture sync for upcoming matches.
 */
export async function triggerFixtureSync(): Promise<{
  success: boolean;
  result?: Awaited<ReturnType<typeof syncUpcomingFixtures>>;
  error?: string;
}> {
  if (isFixtureSyncActive) {
    return { success: false, error: 'Fixture sync is already running' };
  }

  isFixtureSyncActive = true;
  console.log('[Cron] Fixture sync triggered');

  try {
    const result = await syncUpcomingFixtures({
      horizonDays: config.FIXTURE_SYNC_HORIZON_DAYS,
      leagueIds: getConfiguredLeagueIds(),
      dryRun: false,
    });
    lastFixtureSyncRun = new Date();

    if (result.successfulFetches === 0 && result.errors.length > 0) {
      return {
        success: false,
        result,
        error: 'Fixture sync failed for all configured leagues',
      };
    }

    return { success: true, result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Fixture sync failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isFixtureSyncActive = false;
  }
}

/**
 * Trigger historical fixture seed.
 */
export async function triggerHistoricalFixtureSeed(
  options: HistoricalFixtureSeedOptions = {}
): Promise<{
  success: boolean;
  result?: Awaited<ReturnType<typeof seedHistoricalFixtures>>;
  error?: string;
}> {
  if (isHistoricalSeedActive) {
    return { success: false, error: 'Historical fixture seed is already running' };
  }

  isHistoricalSeedActive = true;
  console.log('[Cron] Historical fixture seed triggered');

  try {
    const result = await seedHistoricalFixtures(options);
    lastHistoricalSeedRun = new Date();

    if (result.successfulFetches === 0 && result.errors.length > 0) {
      return {
        success: false,
        result,
        error: 'Historical fixture seed failed for all configured requests',
      };
    }

    return { success: true, result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Historical fixture seed failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isHistoricalSeedActive = false;
  }
}

/**
 * Start the cron scheduler.
 */
export function startCronScheduler() {
  if (schedulerTimer) {
    console.log('[Cron] Scheduler already running');
    return;
  }

  const fixtureSyncSchedule = config.FIXTURE_SYNC_ENABLED
    ? `${String(config.CRON_FIXTURE_SYNC_HOUR_UTC).padStart(2, '0')}:00 UTC`
    : 'disabled';
  console.log(
    '[Cron] Scheduler started — fixture sync: ' +
    `${fixtureSyncSchedule}, ` +
    `pipeline: ${String(config.CRON_PIPELINE_HOUR_UTC).padStart(2, '0')}:00 UTC, ` +
    `re-prediction: ${String(config.CRON_REPREDICTION_HOUR_UTC).padStart(2, '0')}:00 UTC, ` +
    `result tracking: hourly @ minute ${String(config.CRON_RESULT_TRACKER_MINUTE_UTC).padStart(2, '0')}, ` +
    `metrics: ${String(config.CRON_METRICS_HOUR_UTC).padStart(2, '0')}:00 UTC, ` +
    `closing odds: every ${config.CRON_CLOSING_ODDS_INTERVAL_HOURS}h @ minute ${String(config.CRON_CLOSING_ODDS_MINUTE_UTC).padStart(2, '0')}`
  );
  schedulerTimer = setInterval(checkScheduledTasks, 60_000);
  checkScheduledTasks();
}

/**
 * Stop the cron scheduler.
 */
export function stopCronScheduler() {
  if (schedulerTimer) {
    clearInterval(schedulerTimer);
    schedulerTimer = null;
    console.log('[Cron] Scheduler stopped');
  }
}

export function isPipelineRunning(): boolean {
  return isPipelineActive;
}

export function getSchedulerStatus() {
  return {
    pipelineRunning: isPipelineActive,
    trackerRunning: isTrackerActive,
    rePredictionRunning: isRePredictionActive,
    metricsRunning: isMetricsActive,
    closingOddsRunning: isClosingOddsActive,
    fixtureSyncRunning: isFixtureSyncActive,
    historicalSeedRunning: isHistoricalSeedActive,
    lastPipelineRun,
    lastTrackerRun,
    lastRePredictionRun,
    lastMetricsRun,
    lastClosingOddsRun,
    lastFixtureSyncRun,
    lastHistoricalSeedRun,
    consecutiveFailures,
  };
}
