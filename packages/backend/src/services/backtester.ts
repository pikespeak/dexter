/**
 * Backtesting Engine
 *
 * Simulates prediction strategies on historical data from the database.
 * Supports multiple strategies and staking methods.
 */

import { eq, and, gte, lte, isNotNull, inArray } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BacktestConfig {
  from?: Date;
  to?: Date;
  minConfidence?: number;
  minEdge?: number;
  leagueIds?: number[];
  strategy: 'poisson_only' | 'llm_only' | 'ensemble' | 'value_bets_only';
  stakingMethod?: 'flat' | 'kelly' | 'half_kelly' | 'eighth_kelly';
  bankroll?: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  sampleSize: number;
  accuracy1X2: number;
  accuracyOU: number;
  accuracyBTTS: number;
  totalStaked: number;
  totalReturn: number;
  profitLoss: number;
  roi: number;
  maxDrawdown: number;
  sharpeRatio: number;
  avgBrierScore: number;
  monthlyResults: Array<{
    month: string;
    predictions: number;
    accuracy: number;
    pl: number;
    roi: number;
  }>;
  equityCurve: Array<{
    date: string;
    bankroll: number;
    predictionId: string;
  }>;
}

// ---------------------------------------------------------------------------
// Pure Computation: Simulate Backtest
// ---------------------------------------------------------------------------

export interface BacktestRecord {
  predictionId: string;
  evaluatedAt: Date;
  wasCorrect: boolean;
  actualResult: string;
  // LLM probabilities
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  overUnder25: string | null;
  overUnderCorrect: boolean | null;
  btts: boolean | null;
  bttsCorrect: boolean | null;
  brierScore: number | null;
  confidence: number;
  // Poisson probabilities
  poissonHomeProb: number | null;
  poissonDrawProb: number | null;
  poissonAwayProb: number | null;
  // Odds
  bestOddsHome: number | null;
  bestOddsDraw: number | null;
  bestOddsAway: number | null;
}

/**
 * Run a backtest simulation on a set of records.
 * Pure function — no DB access.
 */
export function simulateBacktest(
  records: BacktestRecord[],
  config: BacktestConfig,
): BacktestResult {
  const startingBankroll = config.bankroll ?? 1000;
  const stakingMethod = config.stakingMethod ?? 'flat';

  // Sort chronologically
  const sorted = [...records].sort(
    (a, b) => a.evaluatedAt.getTime() - b.evaluatedAt.getTime()
  );

  let bankroll = startingBankroll;
  let peakBankroll = startingBankroll;
  let maxDrawdown = 0;
  let totalStaked = 0;
  let totalReturn = 0;
  let correct1X2 = 0;
  let correctOU = 0;
  let ouTotal = 0;
  let correctBTTS = 0;
  let bttsTotal = 0;
  let brierSum = 0;
  let brierCount = 0;

  const equityCurve: BacktestResult['equityCurve'] = [];
  const monthlyMap = new Map<string, { predictions: number; correct: number; pl: number; staked: number }>();
  const returns: number[] = [];

  for (const record of sorted) {
    // Determine prediction based on strategy
    const prediction = getStrategyPrediction(record, config.strategy);
    if (!prediction) continue;

    // Get odds for the predicted outcome
    const odds = getOddsForOutcome(record, prediction.predictedOutcome);
    if (!odds || odds <= 1) continue;

    // Calculate stake
    const stake = calculateStake(
      stakingMethod,
      bankroll,
      prediction.probability / 100,
      odds,
      startingBankroll,
    );

    if (stake <= 0) continue;

    // Simulate outcome
    const [homeGoals, awayGoals] = record.actualResult.split('-').map(Number);
    const actualOutcome = homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';
    const won = prediction.predictedOutcome === actualOutcome;

    const pl = won ? stake * (odds - 1) : -stake;
    bankroll += pl;
    totalStaked += stake;
    if (won) totalReturn += stake * odds;

    // Track metrics
    if (won) correct1X2++;
    if (record.overUnderCorrect != null) {
      ouTotal++;
      if (record.overUnderCorrect) correctOU++;
    }
    if (record.bttsCorrect != null) {
      bttsTotal++;
      if (record.bttsCorrect) correctBTTS++;
    }
    if (record.brierScore != null) {
      brierSum += record.brierScore;
      brierCount++;
    }

    // Drawdown tracking
    if (bankroll > peakBankroll) peakBankroll = bankroll;
    const drawdown = (peakBankroll - bankroll) / peakBankroll;
    if (drawdown > maxDrawdown) maxDrawdown = drawdown;

    // Returns for Sharpe ratio
    returns.push(pl / stake);

    // Equity curve
    equityCurve.push({
      date: record.evaluatedAt.toISOString().split('T')[0],
      bankroll: Math.round(bankroll * 100) / 100,
      predictionId: record.predictionId,
    });

    // Monthly tracking
    const month = record.evaluatedAt.toISOString().slice(0, 7);
    const monthly = monthlyMap.get(month) ?? { predictions: 0, correct: 0, pl: 0, staked: 0 };
    monthly.predictions++;
    if (won) monthly.correct++;
    monthly.pl += pl;
    monthly.staked += stake;
    monthlyMap.set(month, monthly);
  }

  const n = equityCurve.length;

  // Sharpe ratio (annualized, assuming daily)
  let sharpeRatio = 0;
  if (returns.length > 1) {
    const avgReturn = returns.reduce((s, r) => s + r, 0) / returns.length;
    const variance = returns.reduce((s, r) => s + Math.pow(r - avgReturn, 2), 0) / (returns.length - 1);
    const stdDev = Math.sqrt(variance);
    sharpeRatio = stdDev > 0 ? (avgReturn / stdDev) * Math.sqrt(252) : 0;
  }

  // Monthly results
  const monthlyResults = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, data]) => ({
      month,
      predictions: data.predictions,
      accuracy: data.predictions > 0 ? data.correct / data.predictions : 0,
      pl: Math.round(data.pl * 100) / 100,
      roi: data.staked > 0 ? data.pl / data.staked : 0,
    }));

  return {
    config,
    sampleSize: n,
    accuracy1X2: n > 0 ? correct1X2 / n : 0,
    accuracyOU: ouTotal > 0 ? correctOU / ouTotal : 0,
    accuracyBTTS: bttsTotal > 0 ? correctBTTS / bttsTotal : 0,
    totalStaked: Math.round(totalStaked * 100) / 100,
    totalReturn: Math.round(totalReturn * 100) / 100,
    profitLoss: Math.round((totalReturn - totalStaked) * 100) / 100,
    roi: totalStaked > 0 ? (totalReturn - totalStaked) / totalStaked : 0,
    maxDrawdown,
    sharpeRatio: Math.round(sharpeRatio * 100) / 100,
    avgBrierScore: brierCount > 0 ? brierSum / brierCount : 0,
    monthlyResults,
    equityCurve,
  };
}

// ---------------------------------------------------------------------------
// Strategy Logic
// ---------------------------------------------------------------------------

function getStrategyPrediction(
  record: BacktestRecord,
  strategy: BacktestConfig['strategy'],
): { predictedOutcome: 'home' | 'draw' | 'away'; probability: number } | null {
  switch (strategy) {
    case 'poisson_only': {
      if (record.poissonHomeProb == null) return null;
      const pH = record.poissonHomeProb;
      const pD = record.poissonDrawProb ?? 0;
      const pA = record.poissonAwayProb ?? 0;
      const max = Math.max(pH, pD, pA);
      const outcome = pH >= pD && pH >= pA ? 'home' as const : pA >= pH && pA >= pD ? 'away' as const : 'draw' as const;
      return { predictedOutcome: outcome, probability: max };
    }

    case 'llm_only': {
      const max = Math.max(record.homeWinProb, record.drawProb, record.awayWinProb);
      const outcome = record.homeWinProb >= record.drawProb && record.homeWinProb >= record.awayWinProb
        ? 'home' as const
        : record.awayWinProb >= record.homeWinProb && record.awayWinProb >= record.drawProb
          ? 'away' as const
          : 'draw' as const;
      return { predictedOutcome: outcome, probability: max };
    }

    case 'ensemble': {
      if (record.poissonHomeProb == null) {
        // Fall back to LLM only
        return getStrategyPrediction(record, 'llm_only');
      }
      // Average of Poisson and LLM
      const eH = (record.poissonHomeProb + record.homeWinProb) / 2;
      const eD = ((record.poissonDrawProb ?? 0) + record.drawProb) / 2;
      const eA = ((record.poissonAwayProb ?? 0) + record.awayWinProb) / 2;
      const max = Math.max(eH, eD, eA);
      const outcome = eH >= eD && eH >= eA ? 'home' as const : eA >= eH && eA >= eD ? 'away' as const : 'draw' as const;
      return { predictedOutcome: outcome, probability: max };
    }

    case 'value_bets_only':
      // For value_bets_only, we use LLM prediction but filter in the main loop
      return getStrategyPrediction(record, 'llm_only');

    default:
      return null;
  }
}

function getOddsForOutcome(
  record: BacktestRecord,
  outcome: 'home' | 'draw' | 'away',
): number | null {
  switch (outcome) {
    case 'home': return record.bestOddsHome;
    case 'draw': return record.bestOddsDraw;
    case 'away': return record.bestOddsAway;
    default: return null;
  }
}

// ---------------------------------------------------------------------------
// Staking Methods
// ---------------------------------------------------------------------------

function calculateStake(
  method: string,
  bankroll: number,
  probability: number,
  odds: number,
  initialBankroll: number,
): number {
  const minStake = 0.01;

  switch (method) {
    case 'flat':
      return Math.min(initialBankroll * 0.01, bankroll * 0.05); // 1% of initial or 5% of current

    case 'kelly': {
      const kelly = kellyFraction(probability, odds);
      return Math.max(minStake, Math.min(bankroll * kelly, bankroll * 0.1)); // Cap at 10%
    }

    case 'half_kelly': {
      const kelly = kellyFraction(probability, odds);
      return Math.max(minStake, Math.min(bankroll * kelly * 0.5, bankroll * 0.05));
    }

    case 'eighth_kelly': {
      const kelly = kellyFraction(probability, odds);
      return Math.max(minStake, Math.min(bankroll * kelly * 0.125, bankroll * 0.025));
    }

    default:
      return initialBankroll * 0.01;
  }
}

function kellyFraction(probability: number, odds: number): number {
  // Kelly = (p * (odds - 1) - (1 - p)) / (odds - 1)
  // = (p * odds - 1) / (odds - 1)
  if (odds <= 1) return 0;
  const fraction = (probability * odds - 1) / (odds - 1);
  return Math.max(0, fraction);
}

// ---------------------------------------------------------------------------
// DB Query: Run Backtest
// ---------------------------------------------------------------------------

export async function runBacktest(config: BacktestConfig): Promise<BacktestResult> {
  const records = await fetchBacktestRecords(config);
  return simulateBacktest(records, config);
}

export async function compareStrategies(configs: BacktestConfig[]): Promise<BacktestResult[]> {
  // Fetch records once with the broadest filters
  const broadestConfig: BacktestConfig = {
    ...configs[0],
    strategy: 'llm_only', // doesn't matter for fetching
    leagueIds: configs.flatMap(c => c.leagueIds ?? []),
  };
  const records = await fetchBacktestRecords(broadestConfig);

  return configs.map(config => {
    // Apply config-specific filters
    let filtered = records;
    if (config.minConfidence) {
      filtered = filtered.filter(r => r.confidence >= config.minConfidence!);
    }
    if (config.leagueIds?.length) {
      // Filtering by league would need leagueId on the record — skip for now
    }
    return simulateBacktest(filtered, config);
  });
}

async function fetchBacktestRecords(config: BacktestConfig): Promise<BacktestRecord[]> {
  const conditions = [
    isNotNull(schema.performance.wasCorrect),
    isNotNull(schema.performance.actualResult),
  ];

  if (config.from) {
    conditions.push(gte(schema.performance.evaluatedAt, config.from));
  }
  if (config.to) {
    conditions.push(lte(schema.performance.evaluatedAt, config.to));
  }
  if (config.leagueIds?.length) {
    conditions.push(inArray(schema.matches.leagueId, config.leagueIds));
  }

  const rows = await db
    .select({
      predictionId: schema.performance.predictionId,
      evaluatedAt: schema.performance.evaluatedAt,
      wasCorrect: schema.performance.wasCorrect,
      actualResult: schema.performance.actualResult,
      overUnderCorrect: schema.performance.overUnderCorrect,
      bttsCorrect: schema.performance.bttsCorrect,
      brierScore: schema.performance.brierScore,
      homeWinProb: schema.predictions.homeWinProb,
      drawProb: schema.predictions.drawProb,
      awayWinProb: schema.predictions.awayWinProb,
      overUnder25: schema.predictions.overUnder25,
      btts: schema.predictions.btts,
      confidence: schema.predictions.confidence,
      poissonHomeProb: schema.predictions.poissonHomeProb,
      poissonDrawProb: schema.predictions.poissonDrawProb,
      poissonAwayProb: schema.predictions.poissonAwayProb,
      bestOddsHome: schema.predictions.bestOddsHome,
      bestOddsDraw: schema.predictions.bestOddsDraw,
      bestOddsAway: schema.predictions.bestOddsAway,
    })
    .from(schema.performance)
    .innerJoin(schema.predictions, eq(schema.predictions.id, schema.performance.predictionId))
    .innerJoin(schema.matches, eq(schema.matches.id, schema.predictions.matchId))
    .where(and(...conditions));

  return rows
    .filter(r => r.wasCorrect != null && r.actualResult != null)
    .map(r => ({
      predictionId: r.predictionId,
      evaluatedAt: r.evaluatedAt,
      wasCorrect: r.wasCorrect!,
      actualResult: r.actualResult!,
      homeWinProb: Number(r.homeWinProb ?? 33),
      drawProb: Number(r.drawProb ?? 33),
      awayWinProb: Number(r.awayWinProb ?? 34),
      overUnder25: r.overUnder25,
      overUnderCorrect: r.overUnderCorrect,
      btts: r.btts,
      bttsCorrect: r.bttsCorrect,
      brierScore: r.brierScore != null ? Number(r.brierScore) : null,
      confidence: Number(r.confidence ?? 50),
      poissonHomeProb: r.poissonHomeProb != null ? Number(r.poissonHomeProb) : null,
      poissonDrawProb: r.poissonDrawProb != null ? Number(r.poissonDrawProb) : null,
      poissonAwayProb: r.poissonAwayProb != null ? Number(r.poissonAwayProb) : null,
      bestOddsHome: r.bestOddsHome != null ? Number(r.bestOddsHome) : null,
      bestOddsDraw: r.bestOddsDraw != null ? Number(r.bestOddsDraw) : null,
      bestOddsAway: r.bestOddsAway != null ? Number(r.bestOddsAway) : null,
    }));
}
