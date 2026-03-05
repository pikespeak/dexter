import { describe, expect, test } from 'bun:test';
import { PredictionResultSchema, normalizeProbabilities } from './prediction-agent.js';

// ---------------------------------------------------------------------------
// PredictionResultSchema validation
// ---------------------------------------------------------------------------

describe('PredictionResultSchema', () => {
  const validPrediction = {
    homeWinProb: 55,
    drawProb: 25,
    awayWinProb: 20,
    overUnder25: 'over',
    overUnder25Prob: 60,
    btts: true,
    bttsProb: 55,
    predictedScore: '2-1',
    confidence: 65,
    analysis: {
      summary: 'Strong home team advantage',
      keyFactors: ['home form', 'h2h record'],
      homeStrengths: ['attack'],
      awayStrengths: ['defense'],
    },
  };

  test('valid prediction parses successfully', () => {
    const result = PredictionResultSchema.safeParse(validPrediction);
    expect(result.success).toBe(true);
  });

  test('homeWinProb > 100 fails', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      homeWinProb: 101,
    });
    expect(result.success).toBe(false);
  });

  test('negative probability fails', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      homeWinProb: -5,
    });
    expect(result.success).toBe(false);
  });

  test('invalid score format fails', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      predictedScore: 'two-one',
    });
    expect(result.success).toBe(false);
  });

  test('overUnder25 only accepts "over" or "under"', () => {
    const invalid = PredictionResultSchema.safeParse({
      ...validPrediction,
      overUnder25: 'maybe',
    });
    expect(invalid.success).toBe(false);

    const over = PredictionResultSchema.safeParse({
      ...validPrediction,
      overUnder25: 'over',
    });
    expect(over.success).toBe(true);

    const under = PredictionResultSchema.safeParse({
      ...validPrediction,
      overUnder25: 'under',
    });
    expect(under.success).toBe(true);
  });

  test('optional analysis fields', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      analysis: {
        summary: 'Test',
        keyFactors: ['a'],
        homeStrengths: ['b'],
        awayStrengths: ['c'],
        // injuries, formAnalysis, headToHeadInsight are all optional
      },
    });
    expect(result.success).toBe(true);
  });

  test('analysis with all optional fields', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      analysis: {
        summary: 'Full analysis',
        keyFactors: ['form'],
        homeStrengths: ['attack'],
        awayStrengths: ['defense'],
        injuries: 'Key striker out',
        formAnalysis: 'Strong run of form',
        headToHeadInsight: 'Home team dominates H2H',
      },
    });
    expect(result.success).toBe(true);
  });

  test('confidence capped at 100', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      confidence: 150,
    });
    expect(result.success).toBe(false);
  });

  test('score format accepts multi-digit scores', () => {
    const result = PredictionResultSchema.safeParse({
      ...validPrediction,
      predictedScore: '10-3',
    });
    expect(result.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// normalizeProbabilities
// ---------------------------------------------------------------------------

describe('normalizeProbabilities', () => {
  test('sum=100 → no change', () => {
    const raw = { homeWinProb: 50, drawProb: 30, awayWinProb: 20 };
    normalizeProbabilities(raw);
    expect(raw.homeWinProb).toBe(50);
    expect(raw.drawProb).toBe(30);
    expect(raw.awayWinProb).toBe(20);
  });

  test('scales up: (25,15,10) → sums to 100', () => {
    const raw = { homeWinProb: 25, drawProb: 15, awayWinProb: 10 };
    normalizeProbabilities(raw);
    const sum = Number(raw.homeWinProb) + Number(raw.drawProb) + Number(raw.awayWinProb);
    expect(Math.abs(sum - 100)).toBeLessThan(0.5);
    // Proportions should be preserved: 25/50=0.5, 15/50=0.3, 10/50=0.2
    expect(Number(raw.homeWinProb)).toBeCloseTo(50, 0);
    expect(Number(raw.drawProb)).toBeCloseTo(30, 0);
  });

  test('scales down: (50,40,30) → sums to 100', () => {
    const raw = { homeWinProb: 50, drawProb: 40, awayWinProb: 30 };
    normalizeProbabilities(raw);
    const sum = Number(raw.homeWinProb) + Number(raw.drawProb) + Number(raw.awayWinProb);
    expect(Math.abs(sum - 100)).toBeLessThan(0.5);
  });

  test('tolerance < 1%: (50.3, 29.8, 19.9) → no change', () => {
    const raw = { homeWinProb: 50.3, drawProb: 29.8, awayWinProb: 19.9 };
    normalizeProbabilities(raw);
    // Sum is 100.0, within tolerance
    expect(raw.homeWinProb).toBe(50.3);
    expect(raw.drawProb).toBe(29.8);
    expect(raw.awayWinProb).toBe(19.9);
  });

  test('all zeros → no change (avoids division by zero)', () => {
    const raw = { homeWinProb: 0, drawProb: 0, awayWinProb: 0 };
    normalizeProbabilities(raw);
    expect(raw.homeWinProb).toBe(0);
    expect(raw.drawProb).toBe(0);
    expect(raw.awayWinProb).toBe(0);
  });

  test('handles missing values', () => {
    const raw: Record<string, unknown> = { homeWinProb: 80 };
    normalizeProbabilities(raw);
    // sum = 80, should normalize
    // 80 * (100/80) = 100, drawProb + awayProb remain 0
    const sum = Number(raw.homeWinProb) + Number(raw.drawProb || 0) + Number(raw.awayWinProb || 0);
    expect(sum).toBeCloseTo(100, 0);
  });
});
