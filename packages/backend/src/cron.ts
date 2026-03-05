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

let isPipelineActive = false;
let isTrackerActive = false;
let isRePredictionActive = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastPipelineRun: Date | null = null;
let lastTrackerRun: Date | null = null;
let lastRePredictionRun: Date | null = null;
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
 * Start the cron scheduler.
 */
export function startCronScheduler() {
  if (schedulerTimer) {
    console.log('[Cron] Scheduler already running');
    return;
  }

  console.log('[Cron] Scheduler started — pipeline: 06:00 UTC, re-prediction: 10:00 UTC, result tracking: hourly');
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
    lastPipelineRun,
    lastTrackerRun,
    lastRePredictionRun,
    consecutiveFailures,
  };
}
