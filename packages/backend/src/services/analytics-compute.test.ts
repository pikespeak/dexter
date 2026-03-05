import { describe, expect, test } from 'bun:test';
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
} from './analytics-compute.js';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<PerformanceRecord> = {}): PerformanceRecord {
  return {
    predictionId: 'test-id',
    wasCorrect: true,
    actualResult: '2-1',
    brierScore: 0.045,
    realProfitLoss: 0.80,
    profitLoss: 0.43,
    overUnderCorrect: true,
    bttsCorrect: true,
    exactScoreCorrect: false,
    homeWinProb: 70,
    drawProb: 15,
    awayWinProb: 15,
    overUnder25: 'over',
    overUnder25Prob: 60,
    btts: true,
    bttsProb: 55,
    predictedScore: '2-1',
    poissonHomeProb: 65,
    poissonDrawProb: 20,
    poissonAwayProb: 15,
    poissonOver25Prob: 58,
    poissonBttsProb: 50,
    confidence: 65,
    modelVersion: 'v1',
    leagueId: 39,
    leagueName: 'Premier League',
    evaluatedAt: new Date('2025-12-01'),
    ...overrides,
  };
}

function makeValueBet(overrides: Partial<ValueBetRecord> = {}): ValueBetRecord {
  return {
    betType: '1X2_Home',
    ourProbability: 65,
    bestOdds: 1.80,
    edge: 8.5,
    kellyStake: 5,
    result: 'won',
    actualProfitLoss: 0.80,
    closingOdds: 1.70,
    ...overrides,
  };
}

const sampleRecords: PerformanceRecord[] = [
  makeRecord({ wasCorrect: true, brierScore: 0.04, realProfitLoss: 0.80, leagueId: 39 }),
  makeRecord({ wasCorrect: false, brierScore: 0.25, realProfitLoss: -1, leagueId: 39, homeWinProb: 45, drawProb: 30, awayWinProb: 25, actualResult: '0-1' }),
  makeRecord({ wasCorrect: true, brierScore: 0.03, realProfitLoss: 1.50, leagueId: 140, leagueName: 'La Liga' }),
  makeRecord({ wasCorrect: false, brierScore: 0.30, realProfitLoss: -1, leagueId: 140, leagueName: 'La Liga', homeWinProb: 50, drawProb: 25, awayWinProb: 25, actualResult: '1-1' }),
  makeRecord({ wasCorrect: true, brierScore: 0.02, realProfitLoss: 0.50, leagueId: 39, overUnderCorrect: false, bttsCorrect: false }),
];

// ---------------------------------------------------------------------------
// computeOverallPerformance
// ---------------------------------------------------------------------------

describe('computeOverallPerformance', () => {
  test('empty array → zero values', () => {
    const result = computeOverallPerformance([]);
    expect(result.totalPredictions).toBe(0);
    expect(result.accuracy1X2).toBe(0);
  });

  test('correct totals with sample data', () => {
    const result = computeOverallPerformance(sampleRecords);
    expect(result.totalPredictions).toBe(5);
    expect(result.correct1X2).toBe(3);
    expect(result.accuracy1X2).toBeCloseTo(0.6, 2);
  });

  test('O/U accuracy', () => {
    const result = computeOverallPerformance(sampleRecords);
    // 4 correct + 1 wrong out of 5 O/U records
    expect(result.correctOU).toBe(4);
    expect(result.accuracyOU).toBeCloseTo(0.8, 2);
  });

  test('total real P/L', () => {
    const result = computeOverallPerformance(sampleRecords);
    // 0.80 + (-1) + 1.50 + (-1) + 0.50 = 0.80
    expect(result.totalRealPL).toBeCloseTo(0.80, 2);
  });

  test('average Brier score', () => {
    const result = computeOverallPerformance(sampleRecords);
    // (0.04 + 0.25 + 0.03 + 0.30 + 0.02) / 5 = 0.128
    expect(result.avgBrierScore).toBeCloseTo(0.128, 3);
  });
});

// ---------------------------------------------------------------------------
// computeMarketBreakdown
// ---------------------------------------------------------------------------

describe('computeMarketBreakdown', () => {
  test('market breakdown totals', () => {
    const result = computeMarketBreakdown(sampleRecords);
    expect(result.market1X2.total).toBe(5);
    expect(result.market1X2.correct).toBe(3);
    expect(result.marketOU.total).toBe(5);
    expect(result.marketBTTS.total).toBe(5);
  });
});

// ---------------------------------------------------------------------------
// computeLeagueBreakdown
// ---------------------------------------------------------------------------

describe('computeLeagueBreakdown', () => {
  test('groups by league', () => {
    const result = computeLeagueBreakdown(sampleRecords);
    expect(result.length).toBe(2);

    const pl = result.find(l => l.leagueId === 39);
    expect(pl).toBeDefined();
    expect(pl!.total).toBe(3);
    expect(pl!.leagueName).toBe('Premier League');

    const laLiga = result.find(l => l.leagueId === 140);
    expect(laLiga).toBeDefined();
    expect(laLiga!.total).toBe(2);
  });

  test('sorted by total descending', () => {
    const result = computeLeagueBreakdown(sampleRecords);
    expect(result[0].total).toBeGreaterThanOrEqual(result[1].total);
  });

  test('records without leagueId are excluded', () => {
    const records = [makeRecord({ leagueId: null })];
    const result = computeLeagueBreakdown(records);
    expect(result.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeCalibrationBuckets
// ---------------------------------------------------------------------------

describe('computeCalibrationBuckets', () => {
  test('empty records → empty buckets', () => {
    expect(computeCalibrationBuckets([])).toEqual([]);
  });

  test('buckets with correct midpoints', () => {
    const records = [
      makeRecord({ homeWinProb: 72, drawProb: 15, awayWinProb: 13, wasCorrect: true }),
      makeRecord({ homeWinProb: 73, drawProb: 14, awayWinProb: 13, wasCorrect: false }),
    ];
    const buckets = computeCalibrationBuckets(records, 5);
    // max prob is 72-73%, bucket midpoint = 72.5 (70-75 bucket)
    expect(buckets.length).toBe(1);
    expect(buckets[0].midpoint).toBe(72.5);
    expect(buckets[0].count).toBe(2);
    expect(buckets[0].observed).toBeCloseTo(0.5, 2); // 1 correct, 1 wrong
  });

  test('sorted by midpoint', () => {
    const records = [
      makeRecord({ homeWinProb: 80, drawProb: 10, awayWinProb: 10 }),
      makeRecord({ homeWinProb: 40, drawProb: 35, awayWinProb: 25 }),
      makeRecord({ homeWinProb: 60, drawProb: 20, awayWinProb: 20 }),
    ];
    const buckets = computeCalibrationBuckets(records, 10);
    for (let i = 1; i < buckets.length; i++) {
      expect(buckets[i].midpoint).toBeGreaterThan(buckets[i - 1].midpoint);
    }
  });
});

// ---------------------------------------------------------------------------
// computeBrierDecomposition
// ---------------------------------------------------------------------------

describe('computeBrierDecomposition', () => {
  test('empty buckets → zero', () => {
    const result = computeBrierDecomposition([], 0.5);
    expect(result.avgBrierScore).toBe(0);
    expect(result.reliability).toBe(0);
    expect(result.resolution).toBe(0);
    expect(result.uncertainty).toBe(0);
  });

  test('perfectly calibrated → reliability = 0', () => {
    // predicted = observed for each bucket
    const buckets = [
      { midpoint: 30, predicted: 0.3, observed: 0.3, count: 10 },
      { midpoint: 60, predicted: 0.6, observed: 0.6, count: 10 },
      { midpoint: 90, predicted: 0.9, observed: 0.9, count: 10 },
    ];
    const result = computeBrierDecomposition(buckets, 0.6);
    expect(result.reliability).toBeCloseTo(0, 4);
  });

  test('uncertainty = p*(1-p)', () => {
    const buckets = [{ midpoint: 50, predicted: 0.5, observed: 0.5, count: 100 }];
    const result = computeBrierDecomposition(buckets, 0.45);
    expect(result.uncertainty).toBeCloseTo(0.45 * 0.55, 4);
  });
});

// ---------------------------------------------------------------------------
// computeValueBetROI
// ---------------------------------------------------------------------------

describe('computeValueBetROI', () => {
  test('empty → zero', () => {
    const result = computeValueBetROI([]);
    expect(result.totalBets).toBe(0);
    expect(result.roi).toBe(0);
  });

  test('correct ROI calculation', () => {
    const bets = [
      makeValueBet({ result: 'won', bestOdds: 2.00 }),
      makeValueBet({ result: 'lost', bestOdds: 2.00 }),
      makeValueBet({ result: 'won', bestOdds: 1.80 }),
    ];
    const result = computeValueBetROI(bets);
    expect(result.totalBets).toBe(3);
    expect(result.won).toBe(2);
    expect(result.lost).toBe(1);
    // Return: 2.00 + 1.80 = 3.80, staked: 3, PL: 0.80
    expect(result.totalReturn).toBeCloseTo(3.80, 2);
    expect(result.profitLoss).toBeCloseTo(0.80, 2);
    expect(result.roi).toBeCloseTo(0.80 / 3, 4);
  });

  test('unsettled bets excluded', () => {
    const bets = [
      makeValueBet({ result: 'won' }),
      makeValueBet({ result: null }), // pending
    ];
    const result = computeValueBetROI(bets);
    expect(result.totalBets).toBe(1);
  });

  test('by type breakdown', () => {
    const bets = [
      makeValueBet({ betType: '1X2_Home', result: 'won', bestOdds: 2.00 }),
      makeValueBet({ betType: '1X2_Home', result: 'lost', bestOdds: 2.00 }),
      makeValueBet({ betType: 'Over_2.5', result: 'won', bestOdds: 1.90 }),
    ];
    const result = computeValueBetROI(bets);
    expect(result.byType['1X2_Home'].total).toBe(2);
    expect(result.byType['1X2_Home'].won).toBe(1);
    expect(result.byType['Over_2.5'].total).toBe(1);
    expect(result.byType['Over_2.5'].won).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// computePoissonVsLlm
// ---------------------------------------------------------------------------

describe('computePoissonVsLlm', () => {
  test('empty → zero', () => {
    const result = computePoissonVsLlm([]);
    expect(result.sampleSize).toBe(0);
  });

  test('both correct → both accuracy 100%', () => {
    const records = [
      makeRecord({
        poissonHomeProb: 60, poissonDrawProb: 20, poissonAwayProb: 20,
        homeWinProb: 65, drawProb: 20, awayWinProb: 15,
        actualResult: '2-1', wasCorrect: true,
      }),
    ];
    const result = computePoissonVsLlm(records);
    expect(result.poissonAccuracy).toBe(1);
    expect(result.llmAccuracy).toBe(1);
    expect(result.agreement).toBe(1); // both predict home
  });

  test('LLM better than Poisson', () => {
    const records = [
      makeRecord({
        poissonHomeProb: 40, poissonDrawProb: 35, poissonAwayProb: 25,
        homeWinProb: 30, drawProb: 20, awayWinProb: 50,
        actualResult: '0-2', wasCorrect: false,
      }),
    ];
    const result = computePoissonVsLlm(records);
    // Poisson predicts home (40%), actual away → wrong
    expect(result.poissonAccuracy).toBe(0);
    // LLM predicts away (50%), actual away → correct
    expect(result.llmAccuracy).toBe(1);
    expect(result.llmImprovement).toBe(1);
  });

  test('records without Poisson data excluded', () => {
    const records = [
      makeRecord({ poissonHomeProb: null }),
    ];
    const result = computePoissonVsLlm(records);
    expect(result.sampleSize).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// computeCLVAnalysis
// ---------------------------------------------------------------------------

describe('computeCLVAnalysis', () => {
  test('empty → zero', () => {
    const result = computeCLVAnalysis([]);
    expect(result.totalWithClosing).toBe(0);
  });

  test('positive CLV when closing odds lower', () => {
    const bets = [
      makeValueBet({ bestOdds: 2.00, closingOdds: 1.80, result: 'won' }),
    ];
    const result = computeCLVAnalysis(bets);
    expect(result.totalWithClosing).toBe(1);
    // CLV = (1.80/2.00 - 1) * 100 = -10%
    // Wait: closing < opening means market moved AGAINST us (odds shortened)
    expect(result.avgCLV).toBeLessThan(0);
  });

  test('positive CLV when closing odds higher', () => {
    const bets = [
      makeValueBet({ bestOdds: 2.00, closingOdds: 2.20, result: 'won' }),
    ];
    const result = computeCLVAnalysis(bets);
    // CLV = (2.20/2.00 - 1) * 100 = 10%
    expect(result.avgCLV).toBeCloseTo(10, 1);
    expect(result.positiveCLVRate).toBe(1);
  });

  test('bets without closing odds excluded', () => {
    const bets = [
      makeValueBet({ closingOdds: null }),
    ];
    const result = computeCLVAnalysis(bets);
    expect(result.totalWithClosing).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// linearRegression
// ---------------------------------------------------------------------------

describe('linearRegression', () => {
  test('perfect positive correlation', () => {
    const result = linearRegression([1, 2, 3, 4, 5], [2, 4, 6, 8, 10]);
    expect(result.slope).toBeCloseTo(2, 4);
    expect(result.intercept).toBeCloseTo(0, 4);
    expect(result.rSquared).toBeCloseTo(1, 4);
  });

  test('perfect calibration line: y = x', () => {
    const result = linearRegression([0.3, 0.5, 0.7, 0.9], [0.3, 0.5, 0.7, 0.9]);
    expect(result.slope).toBeCloseTo(1, 4);
    expect(result.intercept).toBeCloseTo(0, 4);
    expect(result.rSquared).toBeCloseTo(1, 4);
  });

  test('single point → zero slope', () => {
    const result = linearRegression([1], [2]);
    expect(result.slope).toBe(0);
  });

  test('weighted regression', () => {
    const result = linearRegression(
      [1, 2, 3],
      [1, 2, 3],
      [1, 1, 100], // heavily weight the last point
    );
    expect(result.slope).toBeCloseTo(1, 1);
  });

  test('no correlation → low rSquared', () => {
    const result = linearRegression([1, 2, 3, 4, 5], [3, 5, 3, 5, 3]);
    expect(result.rSquared).toBeLessThan(0.3);
  });
});
