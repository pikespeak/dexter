import { describe, expect, test } from 'bun:test';
import { simulateBacktest, type BacktestRecord, type BacktestConfig } from './backtester.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRecord(overrides: Partial<BacktestRecord> = {}): BacktestRecord {
  return {
    predictionId: `pred-${Math.random().toString(36).slice(2, 8)}`,
    evaluatedAt: new Date('2025-10-15'),
    wasCorrect: true,
    actualResult: '2-1',
    homeWinProb: 65,
    drawProb: 20,
    awayWinProb: 15,
    overUnder25: 'over',
    overUnderCorrect: true,
    btts: true,
    bttsCorrect: true,
    brierScore: 0.05,
    confidence: 70,
    poissonHomeProb: 60,
    poissonDrawProb: 22,
    poissonAwayProb: 18,
    bestOddsHome: 1.80,
    bestOddsDraw: 3.50,
    bestOddsAway: 5.00,
    ...overrides,
  };
}

const baseConfig: BacktestConfig = {
  strategy: 'llm_only',
  stakingMethod: 'flat',
  bankroll: 1000,
};

// ---------------------------------------------------------------------------
// simulateBacktest
// ---------------------------------------------------------------------------

describe('simulateBacktest', () => {
  test('empty records → zero results', () => {
    const result = simulateBacktest([], baseConfig);
    expect(result.sampleSize).toBe(0);
    expect(result.accuracy1X2).toBe(0);
    expect(result.roi).toBe(0);
    expect(result.equityCurve).toEqual([]);
  });

  test('flat staking ROI with all wins', () => {
    const records = [
      makeRecord({ actualResult: '2-1', wasCorrect: true, evaluatedAt: new Date('2025-10-01') }),
      makeRecord({ actualResult: '3-0', wasCorrect: true, evaluatedAt: new Date('2025-10-02') }),
    ];
    const result = simulateBacktest(records, baseConfig);
    expect(result.sampleSize).toBe(2);
    expect(result.accuracy1X2).toBe(1.0);
    expect(result.roi).toBeGreaterThan(0);
    expect(result.profitLoss).toBeGreaterThan(0);
  });

  test('flat staking with all losses → negative PL', () => {
    const records = [
      makeRecord({
        actualResult: '0-2', wasCorrect: false,
        evaluatedAt: new Date('2025-10-01'),
      }),
      makeRecord({
        actualResult: '1-1', wasCorrect: false,
        evaluatedAt: new Date('2025-10-02'),
      }),
    ];
    const result = simulateBacktest(records, baseConfig);
    expect(result.accuracy1X2).toBe(0);
    expect(result.profitLoss).toBeLessThan(0);
    expect(result.roi).toBeLessThan(0);
  });

  test('max drawdown calculation', () => {
    const records = [
      makeRecord({ actualResult: '2-1', wasCorrect: true, evaluatedAt: new Date('2025-10-01') }),
      makeRecord({ actualResult: '0-1', wasCorrect: false, evaluatedAt: new Date('2025-10-02') }),
      makeRecord({ actualResult: '0-2', wasCorrect: false, evaluatedAt: new Date('2025-10-03') }),
      makeRecord({ actualResult: '3-0', wasCorrect: true, evaluatedAt: new Date('2025-10-04') }),
    ];
    const result = simulateBacktest(records, baseConfig);
    expect(result.maxDrawdown).toBeGreaterThan(0);
    expect(result.maxDrawdown).toBeLessThan(1);
  });

  test('equity curve tracks bankroll', () => {
    const records = [
      makeRecord({ evaluatedAt: new Date('2025-10-01') }),
      makeRecord({ evaluatedAt: new Date('2025-10-02') }),
    ];
    const result = simulateBacktest(records, { ...baseConfig, bankroll: 1000 });
    expect(result.equityCurve.length).toBe(2);
    expect(result.equityCurve[0].date).toBe('2025-10-01');
    expect(result.equityCurve[1].date).toBe('2025-10-02');
  });

  test('monthly grouping', () => {
    const records = [
      makeRecord({ evaluatedAt: new Date('2025-10-05') }),
      makeRecord({ evaluatedAt: new Date('2025-10-20') }),
      makeRecord({ evaluatedAt: new Date('2025-11-05') }),
    ];
    const result = simulateBacktest(records, baseConfig);
    expect(result.monthlyResults.length).toBe(2);
    expect(result.monthlyResults[0].month).toBe('2025-10');
    expect(result.monthlyResults[0].predictions).toBe(2);
    expect(result.monthlyResults[1].month).toBe('2025-11');
    expect(result.monthlyResults[1].predictions).toBe(1);
  });

  test('kelly staking produces different stakes than flat', () => {
    const records = [
      makeRecord({ evaluatedAt: new Date('2025-10-01'), bestOddsHome: 2.50 }),
    ];
    const flatResult = simulateBacktest(records, { ...baseConfig, stakingMethod: 'flat' });
    const kellyResult = simulateBacktest(records, { ...baseConfig, stakingMethod: 'kelly' });
    // Kelly stake depends on probability and odds, should differ from flat
    expect(flatResult.totalStaked).not.toBe(kellyResult.totalStaked);
  });

  test('half kelly stakes less than full kelly', () => {
    const records = [
      makeRecord({ evaluatedAt: new Date('2025-10-01'), bestOddsHome: 2.50 }),
    ];
    const kellyResult = simulateBacktest(records, { ...baseConfig, stakingMethod: 'kelly' });
    const halfKellyResult = simulateBacktest(records, { ...baseConfig, stakingMethod: 'half_kelly' });
    expect(halfKellyResult.totalStaked).toBeLessThanOrEqual(kellyResult.totalStaked);
  });

  test('poisson_only strategy uses poisson probabilities', () => {
    const records = [
      makeRecord({
        evaluatedAt: new Date('2025-10-01'),
        poissonHomeProb: 30,
        poissonDrawProb: 25,
        poissonAwayProb: 45,
        homeWinProb: 60,
        drawProb: 20,
        awayWinProb: 20,
        actualResult: '0-2',
        wasCorrect: false,
      }),
    ];
    // Poisson predicts away (45%), actual away → correct
    const poissonResult = simulateBacktest(records, { ...baseConfig, strategy: 'poisson_only' });
    expect(poissonResult.accuracy1X2).toBe(1);

    // LLM predicts home (60%), actual away → wrong
    const llmResult = simulateBacktest(records, { ...baseConfig, strategy: 'llm_only' });
    expect(llmResult.accuracy1X2).toBe(0);
  });

  test('ensemble averages poisson and llm', () => {
    const records = [
      makeRecord({
        evaluatedAt: new Date('2025-10-01'),
        poissonHomeProb: 30,
        poissonDrawProb: 25,
        poissonAwayProb: 45,
        homeWinProb: 60,
        drawProb: 25,
        awayWinProb: 15,
        actualResult: '2-1',
      }),
    ];
    // Ensemble: avg H=45, D=25, A=30 → predicts home
    const result = simulateBacktest(records, { ...baseConfig, strategy: 'ensemble' });
    expect(result.sampleSize).toBe(1);
  });

  test('records without odds are skipped', () => {
    const records = [
      makeRecord({
        evaluatedAt: new Date('2025-10-01'),
        bestOddsHome: null,
        bestOddsDraw: null,
        bestOddsAway: null,
      }),
    ];
    const result = simulateBacktest(records, baseConfig);
    expect(result.sampleSize).toBe(0);
  });

  test('records without poisson data skipped in poisson_only', () => {
    const records = [
      makeRecord({
        evaluatedAt: new Date('2025-10-01'),
        poissonHomeProb: null,
      }),
    ];
    const result = simulateBacktest(records, { ...baseConfig, strategy: 'poisson_only' });
    expect(result.sampleSize).toBe(0);
  });

  test('sharpe ratio is computed', () => {
    const records = Array.from({ length: 20 }, (_, i) =>
      makeRecord({
        evaluatedAt: new Date(2025, 9, i + 1),
        wasCorrect: i % 3 !== 0,
        actualResult: i % 3 !== 0 ? '2-1' : '0-1',
      })
    );
    const result = simulateBacktest(records, baseConfig);
    expect(typeof result.sharpeRatio).toBe('number');
    expect(Number.isNaN(result.sharpeRatio)).toBe(false);
  });

  test('chronological ordering', () => {
    const records = [
      makeRecord({ evaluatedAt: new Date('2025-10-03'), predictionId: 'late' }),
      makeRecord({ evaluatedAt: new Date('2025-10-01'), predictionId: 'early' }),
    ];
    const result = simulateBacktest(records, baseConfig);
    expect(result.equityCurve[0].predictionId).toBe('early');
    expect(result.equityCurve[1].predictionId).toBe('late');
  });
});
