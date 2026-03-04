/**
 * Cron Scheduler
 *
 * Runs scheduled tasks:
 * - Daily at 06:00 UTC: Prediction pipeline
 * - Hourly: Result tracking
 */

import { runDailyPipeline } from './services/prediction-pipeline.js';
import { trackResults } from './services/result-tracker.js';

let isPipelineActive = false;
let isTrackerActive = false;
let schedulerTimer: ReturnType<typeof setInterval> | null = null;
let lastPipelineRun: Date | null = null;
let lastTrackerRun: Date | null = null;

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
    return { success: true, result };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error(`[Cron] Pipeline failed: ${msg}`);
    return { success: false, error: msg };
  } finally {
    isPipelineActive = false;
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

  console.log('[Cron] Scheduler started — pipeline: 06:00 UTC, result tracking: hourly');
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
    lastPipelineRun,
    lastTrackerRun,
  };
}
