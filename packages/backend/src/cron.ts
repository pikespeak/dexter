/**
 * Cron Scheduler
 *
 * Runs scheduled tasks:
 * - Daily at 06:00 UTC: Prediction pipeline (main run)
 * - Daily at variable time: Re-prediction run (2-3h before first match)
 * - Hourly (at :30): Result tracking
 *
 * Includes monitoring/alerting for pipeline failures.
 */

import { runDailyPipeline } from './services/prediction-pipeline.js';
import { trackResults } from './services/result-tracker.js';
import { saveDailyMetrics, captureClosingOdds } from './services/calibration.js';

let isPipelineActive = false;
let isTrackerActive = false;
let isRePredictionActive = false;
let isMetricsActive = false;
let isClosingOddsActive = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastPipelineRun: Date | null = null;
let lastTrackerRun: Date | null = null;
let lastRePredictionRun: Date | null = null;
let lastMetricsRun: Date | null = null;
let lastClosingOddsRun: Date | null = null;
let consecutiveFailures = 0;

const MAX_CONSECUTIVE_FAILURES = 3;

/**
 * Check scheduled tasks every minute.
 */
function checkScheduledTasks() {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();

  // Daily pipeline at 06:00 UTC
  if (hour === 6 && minute === 0 && !isPipelineActive) {
    triggerPipeline();
  }

  // Re-prediction run at 10:00 UTC (catches afternoon/evening European matches)
  if (hour === 10 && minute === 0 && !isRePredictionActive) {
    triggerRePrediction();
  }

  // Hourly result tracking (at minute 30)
  if (minute === 30 && !isTrackerActive) {
    triggerResultTracking();
  }

  // Daily metrics snapshot at 23:00 UTC
  if (hour === 23 && minute === 0 && !isMetricsActive) {
    triggerDailyMetrics();
  }

  // Closing odds capture every 2 hours (at minute 15)
  if (minute === 15 && hour % 2 === 0 && !isClosingOddsActive) {
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
 * Start the cron scheduler.
 */
export function startCronScheduler() {
  if (schedulerTimer) {
    console.log('[Cron] Scheduler already running');
    return;
  }

  console.log('[Cron] Scheduler started — pipeline: 06:00 UTC, re-prediction: 10:00 UTC, result tracking: hourly, metrics: 23:00 UTC, closing odds: every 2h');
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
    lastPipelineRun,
    lastTrackerRun,
    lastRePredictionRun,
    lastMetricsRun,
    lastClosingOddsRun,
    consecutiveFailures,
  };
}
