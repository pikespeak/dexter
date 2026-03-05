/**
 * Calibration Service
 *
 * Generates calibration curves, CLV reports, and model reports.
 * Persists daily metrics snapshots to model_metrics table.
 */

import { eq, and, gte, lte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import {
  getOverallPerformance,
  getMarketBreakdown,
  getCalibrationData,
  getBrierScoreAnalysis,
  getValueBetROI,
  getPoissonVsLlmAnalysis,
  getCLVAnalysis,
  getCalibrationCurve,
  type DateFilters,
} from './analytics.js';
import { linearRegression } from './analytics-compute.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CalibrationCurve {
  market1X2: {
    buckets: Array<{ midpoint: number; predicted: number; observed: number; count: number }>;
    regression: { slope: number; intercept: number; rSquared: number };
  };
}

export interface CLVReport {
  totalWithClosing: number;
  avgCLV: number;
  positiveCLVRate: number;
  avgCLVWon: number;
  avgCLVLost: number;
  interpretation: string;
}

export interface ModelReport {
  overall: Awaited<ReturnType<typeof getOverallPerformance>>;
  markets: Awaited<ReturnType<typeof getMarketBreakdown>>;
  calibration: CalibrationCurve;
  brier: Awaited<ReturnType<typeof getBrierScoreAnalysis>>;
  valueBetROI: Awaited<ReturnType<typeof getValueBetROI>>;
  poissonVsLlm: Awaited<ReturnType<typeof getPoissonVsLlmAnalysis>>;
  clv: CLVReport;
  interpretation: ModelInterpretation;
  generatedAt: string;
}

export interface ModelInterpretation {
  calibrationStatus: 'well-calibrated' | 'overconfident' | 'underconfident';
  clvStatus: 'beating-market' | 'neutral' | 'losing-to-market';
  strengthAreas: string[];
  improvementAreas: string[];
}

// ---------------------------------------------------------------------------
// Calibration Curve
// ---------------------------------------------------------------------------

export async function generateCalibrationCurve(filters?: DateFilters): Promise<CalibrationCurve> {
  const { buckets, regression } = await getCalibrationCurve(filters);

  return {
    market1X2: { buckets, regression },
  };
}

// ---------------------------------------------------------------------------
// CLV Report
// ---------------------------------------------------------------------------

export async function generateCLVReport(filters?: DateFilters): Promise<CLVReport> {
  const clv = await getCLVAnalysis(filters);

  let interpretation: string;
  if (clv.totalWithClosing === 0) {
    interpretation = 'No closing odds data available yet. Capture closing odds to enable CLV analysis.';
  } else if (clv.avgCLV > 2) {
    interpretation = 'Strong positive CLV — model consistently finds value before market correction.';
  } else if (clv.avgCLV > 0) {
    interpretation = 'Slight positive CLV — model has a small edge over closing market prices.';
  } else if (clv.avgCLV > -2) {
    interpretation = 'Neutral CLV — predictions are roughly in line with closing market efficiency.';
  } else {
    interpretation = 'Negative CLV — consider reviewing prediction timing and odds capture.';
  }

  return { ...clv, interpretation };
}

// ---------------------------------------------------------------------------
// Full Model Report
// ---------------------------------------------------------------------------

export async function generateModelReport(filters?: DateFilters): Promise<ModelReport> {
  const [overall, markets, calibration, brier, valueBetROI, poissonVsLlm, clv] = await Promise.all([
    getOverallPerformance(filters),
    getMarketBreakdown(filters),
    generateCalibrationCurve(filters),
    getBrierScoreAnalysis(filters),
    getValueBetROI(filters),
    getPoissonVsLlmAnalysis(filters),
    generateCLVReport(filters),
  ]);

  const interpretation = interpretModel(overall, calibration, clv, poissonVsLlm);

  return {
    overall,
    markets,
    calibration,
    brier,
    valueBetROI,
    poissonVsLlm,
    clv,
    interpretation,
    generatedAt: new Date().toISOString(),
  };
}

function interpretModel(
  overall: Awaited<ReturnType<typeof getOverallPerformance>>,
  calibration: CalibrationCurve,
  clv: CLVReport,
  poissonVsLlm: Awaited<ReturnType<typeof getPoissonVsLlmAnalysis>>,
): ModelInterpretation {
  const slope = calibration.market1X2.regression.slope;

  let calibrationStatus: ModelInterpretation['calibrationStatus'];
  if (Math.abs(slope - 1) < 0.15) {
    calibrationStatus = 'well-calibrated';
  } else if (slope < 1) {
    calibrationStatus = 'overconfident';
  } else {
    calibrationStatus = 'underconfident';
  }

  let clvStatus: ModelInterpretation['clvStatus'];
  if (clv.avgCLV > 1) {
    clvStatus = 'beating-market';
  } else if (clv.avgCLV > -1) {
    clvStatus = 'neutral';
  } else {
    clvStatus = 'losing-to-market';
  }

  const strengthAreas: string[] = [];
  const improvementAreas: string[] = [];

  if (overall.accuracy1X2 > 0.45) strengthAreas.push('1X2 accuracy above random');
  else improvementAreas.push('1X2 accuracy needs improvement');

  if (overall.accuracyOU > 0.55) strengthAreas.push('Strong O/U predictions');
  else if (overall.accuracyOU < 0.50) improvementAreas.push('O/U accuracy below baseline');

  if (overall.avgBrierScore < 0.20) strengthAreas.push('Good probability calibration (Brier < 0.20)');
  else improvementAreas.push('Brier score needs improvement (> 0.20)');

  if (poissonVsLlm.llmImprovement > 0.02) strengthAreas.push('LLM adds value over Poisson baseline');
  else if (poissonVsLlm.llmImprovement < -0.02) improvementAreas.push('LLM performs worse than Poisson — check prompt/data');

  if (overall.totalRealPL > 0) strengthAreas.push('Positive real P/L');
  else improvementAreas.push('Negative real P/L — review staking or selection');

  return { calibrationStatus, clvStatus, strengthAreas, improvementAreas };
}

// ---------------------------------------------------------------------------
// Daily Metrics Snapshot
// ---------------------------------------------------------------------------

export async function saveDailyMetrics(): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const filters: DateFilters = {};

  const [overall, calibrationData, poissonVsLlm, clv, calibration] = await Promise.all([
    getOverallPerformance(filters),
    getCalibrationData(filters),
    getPoissonVsLlmAnalysis(filters),
    getCLVAnalysis(filters),
    generateCalibrationCurve(filters),
  ]);

  if (overall.totalPredictions === 0) {
    console.log('[Calibration] No predictions to snapshot');
    return;
  }

  const valueBetROI = await getValueBetROI(filters);

  await db.insert(schema.modelMetrics).values({
    date: today,
    modelVersion: 'v1',
    sampleSize: overall.totalPredictions,
    accuracy1X2: String(overall.accuracy1X2),
    accuracyOU: String(overall.accuracyOU),
    accuracyBTTS: String(overall.accuracyBTTS),
    avgBrierScore: String(overall.avgBrierScore),
    totalProfitLoss: String(overall.totalRealPL),
    roi: valueBetROI.totalBets > 0 ? String(valueBetROI.roi) : null,
    calibrationSlope: String(calibration.market1X2.regression.slope),
    avgClv: clv.totalWithClosing > 0 ? String(clv.avgCLV) : null,
    poissonBrier: poissonVsLlm.sampleSize > 0 ? String(poissonVsLlm.poissonAvgBrier) : null,
    llmBrier: poissonVsLlm.sampleSize > 0 ? String(poissonVsLlm.llmAvgBrier) : null,
    poissonAccuracy: poissonVsLlm.sampleSize > 0 ? String(poissonVsLlm.poissonAccuracy) : null,
    llmAccuracy: poissonVsLlm.sampleSize > 0 ? String(poissonVsLlm.llmAccuracy) : null,
  });

  console.log(`[Calibration] Daily metrics saved: ${overall.totalPredictions} predictions, accuracy=${(overall.accuracy1X2 * 100).toFixed(1)}%, Brier=${overall.avgBrierScore.toFixed(4)}`);
}

// ---------------------------------------------------------------------------
// Closing Odds Capture
// ---------------------------------------------------------------------------

/**
 * Capture closing odds for upcoming matches.
 * Should be called close to kickoff time.
 * Uses the same API as prediction-agent to fetch current odds.
 */
export async function captureClosingOdds(): Promise<number> {
  // Import dynamically to avoid circular dependency
  const { callFootballApi } = await import('../../../../src/tools/sports/api.js');

  // Find value bets for matches about to start (within next 2 hours)
  const now = new Date();
  const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const pendingBets = await db
    .select({
      valueBet: schema.valueBets,
      match: schema.matches,
    })
    .from(schema.valueBets)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.valueBets.matchId))
    .where(
      and(
        eq(schema.matches.status, 'scheduled'),
        gte(schema.matches.kickoff, now),
        lte(schema.matches.kickoff, twoHoursLater),
      )
    );

  // Filter to bets without closing odds
  const betsNeedingOdds = pendingBets.filter(
    b => b.valueBet.closingOdds == null
  );

  let updated = 0;

  // Group by match to minimize API calls
  const byMatch = new Map<number, typeof betsNeedingOdds>();
  for (const bet of betsNeedingOdds) {
    const existing = byMatch.get(bet.match.apiFootballId) ?? [];
    existing.push(bet);
    byMatch.set(bet.match.apiFootballId, existing);
  }

  for (const [fixtureId, bets] of byMatch) {
    try {
      const result = await callFootballApi('/odds', { fixture: fixtureId });
      const oddsData = (result.data as { response?: Array<{ bookmakers?: unknown[] }> }).response;
      if (!oddsData?.length) continue;

      const bookmakers = (oddsData[0] as { bookmakers?: Array<{ bets?: Array<{ name: string; values?: Array<{ value: string; odd: string }> }> }> }).bookmakers;
      if (!bookmakers?.length) continue;

      // Find best odds for each bet type
      for (const bet of bets) {
        const closingOdds = findClosingOdds(bookmakers, bet.valueBet.betType);
        if (closingOdds != null) {
          await db
            .update(schema.valueBets)
            .set({ closingOdds: String(closingOdds) })
            .where(eq(schema.valueBets.id, bet.valueBet.id));
          updated++;
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Calibration] Failed to capture closing odds for fixture ${fixtureId}: ${msg}`);
    }
  }

  console.log(`[Calibration] Captured closing odds for ${updated} value bets`);
  return updated;
}

function findClosingOdds(
  bookmakers: Array<{ bets?: Array<{ name: string; values?: Array<{ value: string; odd: string }> }> }>,
  betType: string,
): number | null {
  // Map bet types to API-Football bet names and value labels
  const betMapping: Record<string, { betName: string; valueLabel: string }> = {
    '1X2_Home': { betName: 'Match Winner', valueLabel: 'Home' },
    '1X2_Draw': { betName: 'Match Winner', valueLabel: 'Draw' },
    '1X2_Away': { betName: 'Match Winner', valueLabel: 'Away' },
    'Over_2.5': { betName: 'Goals Over/Under', valueLabel: 'Over 2.5' },
    'Under_2.5': { betName: 'Goals Over/Under', valueLabel: 'Under 2.5' },
    'BTTS_Yes': { betName: 'Both Teams Score', valueLabel: 'Yes' },
    'BTTS_No': { betName: 'Both Teams Score', valueLabel: 'No' },
  };

  const mapping = betMapping[betType];
  if (!mapping) return null;

  let bestOdds = 0;

  for (const bm of bookmakers) {
    const bet = bm.bets?.find(b => b.name === mapping.betName || b.name === '1X2');
    if (!bet?.values) continue;

    const value = bet.values.find(v => v.value === mapping.valueLabel);
    if (!value) continue;

    const odds = parseFloat(value.odd);
    if (odds > bestOdds) bestOdds = odds;
  }

  return bestOdds > 0 ? bestOdds : null;
}
