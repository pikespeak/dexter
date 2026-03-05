/**
 * Analytics Service — DB Query Layer
 *
 * Fetches performance records from the database and delegates
 * computation to analytics-compute.ts pure functions.
 */

import { eq, and, gte, lte, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import {
  computeOverallPerformance,
  computeMarketBreakdown,
  computeLeagueBreakdown,
  computeCalibrationBuckets,
  computeBrierDecomposition,
  computeValueBetROI,
  computePoissonVsLlm,
  computeCLVAnalysis,
  linearRegression,
  type PerformanceRecord,
  type ValueBetRecord,
  type OverallPerformance,
  type MarketBreakdown,
  type LeagueBreakdown,
  type CalibrationBucket,
  type BrierAnalysis,
  type ValueBetROI,
  type PoissonVsLlm,
  type CLVAnalysis,
} from './analytics-compute.js';

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

export interface DateFilters {
  from?: Date;
  to?: Date;
  leagueId?: number;
  modelVersion?: string;
}

// ---------------------------------------------------------------------------
// Internal: Fetch Records
// ---------------------------------------------------------------------------

async function fetchPerformanceRecords(filters?: DateFilters): Promise<PerformanceRecord[]> {
  const conditions = [];

  if (filters?.from) {
    conditions.push(gte(schema.performance.evaluatedAt, filters.from));
  }
  if (filters?.to) {
    conditions.push(lte(schema.performance.evaluatedAt, filters.to));
  }
  if (filters?.leagueId) {
    conditions.push(eq(schema.matches.leagueId, filters.leagueId));
  }
  if (filters?.modelVersion) {
    conditions.push(eq(schema.predictions.modelVersion, filters.modelVersion));
  }

  const rows = await db
    .select({
      predictionId: schema.performance.predictionId,
      wasCorrect: schema.performance.wasCorrect,
      actualResult: schema.performance.actualResult,
      brierScore: schema.performance.brierScore,
      realProfitLoss: schema.performance.realProfitLoss,
      profitLoss: schema.performance.profitLoss,
      overUnderCorrect: schema.performance.overUnderCorrect,
      bttsCorrect: schema.performance.bttsCorrect,
      exactScoreCorrect: schema.performance.exactScoreCorrect,
      evaluatedAt: schema.performance.evaluatedAt,
      homeWinProb: schema.predictions.homeWinProb,
      drawProb: schema.predictions.drawProb,
      awayWinProb: schema.predictions.awayWinProb,
      overUnder25: schema.predictions.overUnder25,
      overUnder25Prob: schema.predictions.overUnder25Prob,
      btts: schema.predictions.btts,
      bttsProb: schema.predictions.bttsProb,
      predictedScore: schema.predictions.predictedScore,
      poissonHomeProb: schema.predictions.poissonHomeProb,
      poissonDrawProb: schema.predictions.poissonDrawProb,
      poissonAwayProb: schema.predictions.poissonAwayProb,
      poissonOver25Prob: schema.predictions.poissonOver25Prob,
      poissonBttsProb: schema.predictions.poissonBttsProb,
      confidence: schema.predictions.confidence,
      modelVersion: schema.predictions.modelVersion,
      leagueId: schema.matches.leagueId,
      leagueName: schema.matches.leagueName,
    })
    .from(schema.performance)
    .innerJoin(schema.predictions, eq(schema.predictions.id, schema.performance.predictionId))
    .innerJoin(schema.matches, eq(schema.matches.id, schema.predictions.matchId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return rows.map(r => ({
    predictionId: r.predictionId,
    wasCorrect: r.wasCorrect,
    actualResult: r.actualResult,
    brierScore: r.brierScore != null ? Number(r.brierScore) : null,
    realProfitLoss: r.realProfitLoss != null ? Number(r.realProfitLoss) : null,
    profitLoss: r.profitLoss != null ? Number(r.profitLoss) : null,
    overUnderCorrect: r.overUnderCorrect,
    bttsCorrect: r.bttsCorrect,
    exactScoreCorrect: r.exactScoreCorrect,
    homeWinProb: r.homeWinProb != null ? Number(r.homeWinProb) : null,
    drawProb: r.drawProb != null ? Number(r.drawProb) : null,
    awayWinProb: r.awayWinProb != null ? Number(r.awayWinProb) : null,
    overUnder25: r.overUnder25,
    overUnder25Prob: r.overUnder25Prob != null ? Number(r.overUnder25Prob) : null,
    btts: r.btts,
    bttsProb: r.bttsProb != null ? Number(r.bttsProb) : null,
    predictedScore: r.predictedScore,
    poissonHomeProb: r.poissonHomeProb != null ? Number(r.poissonHomeProb) : null,
    poissonDrawProb: r.poissonDrawProb != null ? Number(r.poissonDrawProb) : null,
    poissonAwayProb: r.poissonAwayProb != null ? Number(r.poissonAwayProb) : null,
    poissonOver25Prob: r.poissonOver25Prob != null ? Number(r.poissonOver25Prob) : null,
    poissonBttsProb: r.poissonBttsProb != null ? Number(r.poissonBttsProb) : null,
    confidence: r.confidence != null ? Number(r.confidence) : null,
    modelVersion: r.modelVersion,
    leagueId: r.leagueId,
    leagueName: r.leagueName,
    evaluatedAt: r.evaluatedAt,
  }));
}

async function fetchValueBetRecords(filters?: DateFilters): Promise<ValueBetRecord[]> {
  const conditions = [];

  if (filters?.from) {
    conditions.push(gte(schema.valueBets.createdAt, filters.from));
  }
  if (filters?.to) {
    conditions.push(lte(schema.valueBets.createdAt, filters.to));
  }
  if (filters?.leagueId) {
    conditions.push(eq(schema.matches.leagueId, filters.leagueId));
  }

  const rows = await db
    .select({
      betType: schema.valueBets.betType,
      ourProbability: schema.valueBets.ourProbability,
      bestOdds: schema.valueBets.bestOdds,
      edge: schema.valueBets.edge,
      kellyStake: schema.valueBets.kellyStake,
      result: schema.valueBets.result,
      actualProfitLoss: schema.valueBets.actualProfitLoss,
      closingOdds: schema.valueBets.closingOdds,
    })
    .from(schema.valueBets)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.valueBets.matchId))
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return rows.map(r => ({
    betType: r.betType,
    ourProbability: Number(r.ourProbability),
    bestOdds: Number(r.bestOdds),
    edge: Number(r.edge),
    kellyStake: r.kellyStake != null ? Number(r.kellyStake) : null,
    result: r.result,
    actualProfitLoss: r.actualProfitLoss != null ? Number(r.actualProfitLoss) : null,
    closingOdds: r.closingOdds != null ? Number(r.closingOdds) : null,
  }));
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function getOverallPerformance(filters?: DateFilters): Promise<OverallPerformance> {
  const records = await fetchPerformanceRecords(filters);
  return computeOverallPerformance(records);
}

export async function getMarketBreakdown(filters?: DateFilters): Promise<MarketBreakdown> {
  const records = await fetchPerformanceRecords(filters);
  return computeMarketBreakdown(records);
}

export async function getLeagueBreakdown(filters?: DateFilters): Promise<LeagueBreakdown[]> {
  const records = await fetchPerformanceRecords(filters);
  return computeLeagueBreakdown(records);
}

export async function getCalibrationData(filters?: DateFilters): Promise<CalibrationBucket[]> {
  const records = await fetchPerformanceRecords(filters);
  return computeCalibrationBuckets(records);
}

export async function getBrierScoreAnalysis(filters?: DateFilters): Promise<BrierAnalysis> {
  const records = await fetchPerformanceRecords(filters);
  const buckets = computeCalibrationBuckets(records);
  const overall = computeOverallPerformance(records);
  return computeBrierDecomposition(buckets, overall.accuracy1X2);
}

export async function getValueBetROI(filters?: DateFilters): Promise<ValueBetROI> {
  const records = await fetchValueBetRecords(filters);
  return computeValueBetROI(records);
}

export async function getPoissonVsLlmAnalysis(filters?: DateFilters): Promise<PoissonVsLlm> {
  const records = await fetchPerformanceRecords(filters);
  return computePoissonVsLlm(records);
}

export async function getCLVAnalysis(filters?: DateFilters): Promise<CLVAnalysis> {
  const records = await fetchValueBetRecords(filters);
  return computeCLVAnalysis(records);
}

export async function getCalibrationCurve(filters?: DateFilters): Promise<{
  buckets: CalibrationBucket[];
  regression: { slope: number; intercept: number; rSquared: number };
}> {
  const records = await fetchPerformanceRecords(filters);
  const buckets = computeCalibrationBuckets(records);

  const x = buckets.map(b => b.predicted);
  const y = buckets.map(b => b.observed);
  const weights = buckets.map(b => b.count);
  const regression = linearRegression(x, y, weights);

  return { buckets, regression };
}

export async function getDashboard(filters?: DateFilters) {
  const records = await fetchPerformanceRecords(filters);
  const valueBets = await fetchValueBetRecords(filters);

  const overall = computeOverallPerformance(records);
  const markets = computeMarketBreakdown(records);
  const leagues = computeLeagueBreakdown(records);
  const buckets = computeCalibrationBuckets(records);
  const brier = computeBrierDecomposition(buckets, overall.accuracy1X2);
  const valueBetROI = computeValueBetROI(valueBets);
  const poissonVsLlm = computePoissonVsLlm(records);
  const clv = computeCLVAnalysis(valueBets);

  const x = buckets.map(b => b.predicted);
  const y = buckets.map(b => b.observed);
  const weights = buckets.map(b => b.count);
  const calibrationRegression = linearRegression(x, y, weights);

  return {
    overall,
    markets,
    leagues,
    calibration: { buckets, regression: calibrationRegression },
    brier,
    valueBetROI,
    poissonVsLlm,
    clv,
    generatedAt: new Date().toISOString(),
  };
}
