import { describe, expect, test } from 'bun:test';
import {
  calculatePoissonPrediction,
  extractTeamGoalStats,
  formatPoissonForPrompt,
  type TeamGoalStats,
} from './statistical-model.js';

// ---------------------------------------------------------------------------
// Helper: average team stats (≈ league average)
// ---------------------------------------------------------------------------

const avgTeam: TeamGoalStats = {
  homeGoalsFor: 1.53,
  homeGoalsAgainst: 1.17,
  awayGoalsFor: 1.17,
  awayGoalsAgainst: 1.53,
};

const strongHome: TeamGoalStats = {
  homeGoalsFor: 3.0,
  homeGoalsAgainst: 0.5,
  awayGoalsFor: 1.5,
  awayGoalsAgainst: 1.0,
};

const weakAway: TeamGoalStats = {
  homeGoalsFor: 0.8,
  homeGoalsAgainst: 1.8,
  awayGoalsFor: 0.5,
  awayGoalsAgainst: 2.5,
};

// ---------------------------------------------------------------------------
// calculatePoissonPrediction
// ---------------------------------------------------------------------------

describe('calculatePoissonPrediction', () => {
  test('1X2 probabilities sum to 100', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    const sum = pred.homeWinProb + pred.drawProb + pred.awayWinProb;
    expect(Math.abs(sum - 100)).toBeLessThan(0.5);
  });

  test('O/U probabilities sum to 100', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    const sum = pred.over25Prob + pred.under25Prob;
    expect(Math.abs(sum - 100)).toBeLessThan(0.5);
  });

  test('average team ≈ base rates', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    // Home win should be roughly 40-50%
    expect(pred.homeWinProb).toBeGreaterThan(35);
    expect(pred.homeWinProb).toBeLessThan(55);
    // Draw ≈ 22-30%
    expect(pred.drawProb).toBeGreaterThan(18);
    expect(pred.drawProb).toBeLessThan(35);
    // Away ≈ 22-35%
    expect(pred.awayWinProb).toBeGreaterThan(18);
    expect(pred.awayWinProb).toBeLessThan(40);
  });

  test('strong home team → home win > 70%', () => {
    const pred = calculatePoissonPrediction(strongHome, weakAway);
    expect(pred.homeWinProb).toBeGreaterThan(70);
  });

  test('symmetric teams → home > away (home advantage)', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    expect(pred.homeWinProb).toBeGreaterThan(pred.awayWinProb);
  });

  test('lambda clamping — extreme inputs bounded', () => {
    const extreme: TeamGoalStats = {
      homeGoalsFor: 10.0,
      homeGoalsAgainst: 0.1,
      awayGoalsFor: 10.0,
      awayGoalsAgainst: 0.1,
    };
    const pred = calculatePoissonPrediction(extreme, extreme);
    // Expected goals should be clamped to 4.5 / 4.0
    expect(pred.expectedHomeGoals).toBeLessThanOrEqual(4.5);
    expect(pred.expectedAwayGoals).toBeLessThanOrEqual(4.0);
  });

  test('no NaN with zero goals input', () => {
    const zeroTeam: TeamGoalStats = {
      homeGoalsFor: 0,
      homeGoalsAgainst: 0,
      awayGoalsFor: 0,
      awayGoalsAgainst: 0,
    };
    const pred = calculatePoissonPrediction(zeroTeam, avgTeam);
    expect(Number.isNaN(pred.homeWinProb)).toBe(false);
    expect(Number.isNaN(pred.drawProb)).toBe(false);
    expect(Number.isNaN(pred.awayWinProb)).toBe(false);
    expect(Number.isNaN(pred.over25Prob)).toBe(false);
    expect(Number.isNaN(pred.bttsProb)).toBe(false);
  });

  test('score matrix is 9x9 and sums to ≈ 1.0', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    expect(pred.scoreMatrix.length).toBe(9);
    expect(pred.scoreMatrix[0].length).toBe(9);

    let sum = 0;
    for (const row of pred.scoreMatrix) {
      for (const cell of row) {
        sum += cell;
      }
    }
    expect(Math.abs(sum - 1.0)).toBeLessThan(0.01);
  });

  test('likely score = max cell in score matrix', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    let maxProb = 0;
    let maxHome = 0;
    let maxAway = 0;
    for (let h = 0; h < pred.scoreMatrix.length; h++) {
      for (let a = 0; a < pred.scoreMatrix[h].length; a++) {
        if (pred.scoreMatrix[h][a] > maxProb) {
          maxProb = pred.scoreMatrix[h][a];
          maxHome = h;
          maxAway = a;
        }
      }
    }
    expect(pred.likelyScore).toBe(`${maxHome}-${maxAway}`);
  });

  test('BTTS > 55% when both teams score > 2.0', () => {
    const attackingTeam: TeamGoalStats = {
      homeGoalsFor: 2.5,
      homeGoalsAgainst: 2.0,
      awayGoalsFor: 2.0,
      awayGoalsAgainst: 2.5,
    };
    const pred = calculatePoissonPrediction(attackingTeam, attackingTeam);
    expect(pred.bttsProb).toBeGreaterThan(55);
  });

  test('Dixon-Coles effect — scoreMatrix[0][0] differs from pure Poisson', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    // Dixon-Coles with rho=-0.09 inflates 0-0 probability
    // Pure Poisson: P(0) * P(0) = e^(-λh) * e^(-λa)
    // With DC: the value should differ
    const lambdaH = pred.expectedHomeGoals;
    const lambdaA = pred.expectedAwayGoals;
    const purePoisson00 = Math.exp(-lambdaH) * Math.exp(-lambdaA);
    // The matrix is normalized, so compare relative difference
    const matrixSum = pred.scoreMatrix.reduce(
      (s, row) => s + row.reduce((rs, c) => rs + c, 0),
      0
    );
    const normalized00 = pred.scoreMatrix[0][0] / matrixSum;
    // They should not be exactly equal due to Dixon-Coles
    expect(Math.abs(normalized00 - purePoisson00)).toBeGreaterThan(0.0001);
  });
});

// ---------------------------------------------------------------------------
// extractTeamGoalStats
// ---------------------------------------------------------------------------

describe('extractTeamGoalStats', () => {
  test('valid API-Football response → TeamGoalStats', () => {
    const raw = {
      goals: {
        for: { average: { home: '1.8', away: '1.2' } },
        against: { average: { home: '0.9', away: '1.5' } },
      },
    };
    const stats = extractTeamGoalStats(raw);
    expect(stats).not.toBeNull();
    expect(stats!.homeGoalsFor).toBe(1.8);
    expect(stats!.homeGoalsAgainst).toBe(0.9);
    expect(stats!.awayGoalsFor).toBe(1.2);
    expect(stats!.awayGoalsAgainst).toBe(1.5);
  });

  test('null input → null', () => {
    expect(extractTeamGoalStats(null)).toBeNull();
  });

  test('undefined input → null', () => {
    expect(extractTeamGoalStats(undefined)).toBeNull();
  });

  test('empty object → null', () => {
    expect(extractTeamGoalStats({})).toBeNull();
  });

  test('missing goals key → null', () => {
    expect(extractTeamGoalStats({ fixtures: {} })).toBeNull();
  });

  test('NaN strings → null', () => {
    const raw = {
      goals: {
        for: { average: { home: 'abc', away: '1.2' } },
        against: { average: { home: '0.9', away: '1.5' } },
      },
    };
    expect(extractTeamGoalStats(raw)).toBeNull();
  });

  test('partial missing averages → null', () => {
    const raw = {
      goals: {
        for: { average: { home: '1.8' } },
        against: { average: { home: '0.9', away: '1.5' } },
      },
    };
    expect(extractTeamGoalStats(raw)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// formatPoissonForPrompt
// ---------------------------------------------------------------------------

describe('formatPoissonForPrompt', () => {
  test('contains key sections', () => {
    const pred = calculatePoissonPrediction(avgTeam, avgTeam);
    const prompt = formatPoissonForPrompt(pred);
    expect(prompt).toContain('Statistical Baseline');
    expect(prompt).toContain('Expected Goals');
    expect(prompt).toContain('Home Win');
    expect(prompt).toContain('Over 2.5');
    expect(prompt).toContain('BTTS');
    expect(prompt).toContain('Most Likely Score');
    expect(prompt).toContain('Poisson');
  });
});
