import { describe, expect, test } from 'bun:test';
import { evaluatePredictionOutcome, evaluateValueBet } from './result-tracker.js';

// ---------------------------------------------------------------------------
// Helper: build prediction input
// ---------------------------------------------------------------------------

function makePrediction(overrides: Partial<Parameters<typeof evaluatePredictionOutcome>[0]> = {}) {
  return {
    homeWinProb: 70,
    drawProb: 15,
    awayWinProb: 15,
    overUnder25: 'over' as string | null,
    btts: true as boolean | null,
    predictedScore: '2-1' as string | null,
    bestOddsHome: 1.80,
    bestOddsDraw: 3.50,
    bestOddsAway: 4.50,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// evaluatePredictionOutcome
// ---------------------------------------------------------------------------

describe('evaluatePredictionOutcome', () => {
  // --- 1X2 ---
  test('correct home win prediction', () => {
    const result = evaluatePredictionOutcome(makePrediction(), 2, 1);
    expect(result.wasCorrect).toBe(true);
    expect(result.actualOutcome).toBe('home');
    expect(result.predictedOutcome).toBe('home');
  });

  test('wrong prediction — predicted home, actual away', () => {
    const result = evaluatePredictionOutcome(makePrediction(), 0, 2);
    expect(result.wasCorrect).toBe(false);
    expect(result.actualOutcome).toBe('away');
    expect(result.predictedOutcome).toBe('home');
  });

  test('draw as highest probability → draw prediction', () => {
    const pred = makePrediction({ homeWinProb: 25, drawProb: 50, awayWinProb: 25 });
    const result = evaluatePredictionOutcome(pred, 1, 1);
    expect(result.predictedOutcome).toBe('draw');
    expect(result.wasCorrect).toBe(true);
  });

  test('away win as highest probability', () => {
    const pred = makePrediction({ homeWinProb: 20, drawProb: 25, awayWinProb: 55 });
    const result = evaluatePredictionOutcome(pred, 0, 3);
    expect(result.predictedOutcome).toBe('away');
    expect(result.wasCorrect).toBe(true);
  });

  // --- Brier Score ---
  test('Brier score calculation', () => {
    // Home win with 70% confidence, actual home win
    // Brier = ((0.7-1)^2 + (0.15-0)^2 + (0.15-0)^2) / 3
    //       = (0.09 + 0.0225 + 0.0225) / 3 = 0.045
    const result = evaluatePredictionOutcome(makePrediction(), 2, 1);
    expect(result.brierScore).toBeCloseTo(0.045, 4);
  });

  test('perfect Brier score = 0', () => {
    const pred = makePrediction({ homeWinProb: 100, drawProb: 0, awayWinProb: 0 });
    const result = evaluatePredictionOutcome(pred, 3, 0);
    expect(result.brierScore).toBeCloseTo(0, 6);
  });

  test('worst case Brier score for wrong 100% prediction', () => {
    const pred = makePrediction({ homeWinProb: 100, drawProb: 0, awayWinProb: 0 });
    const result = evaluatePredictionOutcome(pred, 0, 2);
    // Brier = ((1-0)^2 + (0-0)^2 + (0-1)^2) / 3 = 2/3
    expect(result.brierScore).toBeCloseTo(2 / 3, 4);
  });

  // --- Over/Under ---
  test('O/U correct — over + 4 total goals', () => {
    const result = evaluatePredictionOutcome(makePrediction({ overUnder25: 'over' }), 3, 1);
    expect(result.overUnderCorrect).toBe(true);
  });

  test('O/U correct — under + 2 total goals', () => {
    const result = evaluatePredictionOutcome(makePrediction({ overUnder25: 'under' }), 1, 0);
    expect(result.overUnderCorrect).toBe(true);
  });

  test('O/U wrong — over + 1 total goals', () => {
    const result = evaluatePredictionOutcome(makePrediction({ overUnder25: 'over' }), 1, 0);
    expect(result.overUnderCorrect).toBe(false);
  });

  test('O/U null when not provided', () => {
    const result = evaluatePredictionOutcome(makePrediction({ overUnder25: null }), 2, 1);
    expect(result.overUnderCorrect).toBeNull();
  });

  // --- BTTS ---
  test('BTTS correct — btts=true + 2-1', () => {
    const result = evaluatePredictionOutcome(makePrediction({ btts: true }), 2, 1);
    expect(result.bttsCorrect).toBe(true);
  });

  test('BTTS wrong — btts=true + 2-0', () => {
    const result = evaluatePredictionOutcome(makePrediction({ btts: true }), 2, 0);
    expect(result.bttsCorrect).toBe(false);
  });

  test('BTTS null when not provided', () => {
    const result = evaluatePredictionOutcome(makePrediction({ btts: null }), 2, 1);
    expect(result.bttsCorrect).toBeNull();
  });

  // --- Exact Score ---
  test('exact score correct', () => {
    const result = evaluatePredictionOutcome(makePrediction({ predictedScore: '2-1' }), 2, 1);
    expect(result.exactScoreCorrect).toBe(true);
  });

  test('exact score wrong', () => {
    const result = evaluatePredictionOutcome(makePrediction({ predictedScore: '2-1' }), 3, 1);
    expect(result.exactScoreCorrect).toBe(false);
  });

  // --- P/L ---
  test('real P/L on win — odds 2.50', () => {
    const pred = makePrediction({ bestOddsHome: 2.50 });
    const result = evaluatePredictionOutcome(pred, 2, 1);
    expect(result.realProfitLoss).toBeCloseTo(1.50, 2);
  });

  test('real P/L on loss — odds 2.50', () => {
    const pred = makePrediction({ bestOddsHome: 2.50 });
    const result = evaluatePredictionOutcome(pred, 0, 1);
    expect(result.realProfitLoss).toBe(-1);
  });

  test('real P/L null when no odds', () => {
    const pred = makePrediction({ bestOddsHome: 0, bestOddsDraw: 0, bestOddsAway: 0 });
    const result = evaluatePredictionOutcome(pred, 2, 1);
    expect(result.realProfitLoss).toBeNull();
  });

  test('fair P/L on win — 70% probability', () => {
    const result = evaluatePredictionOutcome(makePrediction(), 2, 1);
    // fairOdds = 100/70 = 1.4286, P/L = 1.4286 - 1 = 0.4286
    expect(result.fairProfitLoss).toBeCloseTo(100 / 70 - 1, 4);
  });

  test('fair P/L on loss', () => {
    const result = evaluatePredictionOutcome(makePrediction(), 0, 2);
    expect(result.fairProfitLoss).toBe(-1);
  });

  // --- String probabilities (as stored in DB) ---
  test('handles string probabilities', () => {
    const pred = makePrediction({
      homeWinProb: '60' as unknown as number,
      drawProb: '20' as unknown as number,
      awayWinProb: '20' as unknown as number,
    });
    const result = evaluatePredictionOutcome(pred, 2, 1);
    expect(result.wasCorrect).toBe(true);
    expect(result.brierScore).toBeGreaterThan(0);
    expect(Number.isNaN(result.brierScore)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateValueBet
// ---------------------------------------------------------------------------

describe('evaluateValueBet', () => {
  test('1X2_Home + home win → true', () => {
    expect(evaluateValueBet('1X2_Home', 2, 1)).toBe(true);
  });

  test('1X2_Home + draw → false', () => {
    expect(evaluateValueBet('1X2_Home', 1, 1)).toBe(false);
  });

  test('1X2_Draw + draw → true', () => {
    expect(evaluateValueBet('1X2_Draw', 1, 1)).toBe(true);
  });

  test('1X2_Away + away win → true', () => {
    expect(evaluateValueBet('1X2_Away', 0, 2)).toBe(true);
  });

  test('Over_2.5 + 4 goals → true', () => {
    expect(evaluateValueBet('Over_2.5', 2, 2)).toBe(true);
  });

  test('Over_2.5 + 2 goals → false', () => {
    expect(evaluateValueBet('Over_2.5', 1, 1)).toBe(false);
  });

  test('Under_2.5 + 2 goals → true', () => {
    expect(evaluateValueBet('Under_2.5', 1, 0)).toBe(true);
  });

  test('BTTS_Yes + 2-1 → true', () => {
    expect(evaluateValueBet('BTTS_Yes', 2, 1)).toBe(true);
  });

  test('BTTS_Yes + 2-0 → false', () => {
    expect(evaluateValueBet('BTTS_Yes', 2, 0)).toBe(false);
  });

  test('BTTS_No + 2-0 → true', () => {
    expect(evaluateValueBet('BTTS_No', 2, 0)).toBe(true);
  });

  test('unknown bet type → null', () => {
    expect(evaluateValueBet('UNKNOWN_BET', 2, 1)).toBeNull();
  });
});
