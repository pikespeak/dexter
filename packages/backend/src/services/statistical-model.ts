/**
 * Statistical Model — Poisson-based match prediction
 *
 * Provides a mathematically grounded baseline for match predictions.
 * Uses team goal-scoring and conceding rates to calculate probabilities
 * via the Poisson distribution with Dixon-Coles correction for low scores.
 *
 * This baseline is passed to the LLM as an anchor — the LLM adjusts
 * based on qualitative factors (injuries, motivation, form trends).
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface TeamGoalStats {
  /** Average goals scored per game at home */
  homeGoalsFor: number;
  /** Average goals conceded per game at home */
  homeGoalsAgainst: number;
  /** Average goals scored per game away */
  awayGoalsFor: number;
  /** Average goals conceded per game away */
  awayGoalsAgainst: number;
}

export interface PoissonPrediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  over25Prob: number;
  under25Prob: number;
  bttsProb: number;
  expectedHomeGoals: number;
  expectedAwayGoals: number;
  /** Most likely score */
  likelyScore: string;
  /** Score probability matrix (home 0-5 x away 0-5) */
  scoreMatrix: number[][];
}

// ---------------------------------------------------------------------------
// League averages (Top 5 European Leagues — updated per season)
// ---------------------------------------------------------------------------

const LEAGUE_DEFAULTS = {
  avgHomeGoals: 1.53,
  avgAwayGoals: 1.17,
  avgTotalGoals: 2.70,
};

// ---------------------------------------------------------------------------
// Poisson Distribution
// ---------------------------------------------------------------------------

function poissonPmf(k: number, lambda: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

function factorial(n: number): number {
  if (n <= 1) return 1;
  let result = 1;
  for (let i = 2; i <= n; i++) result *= i;
  return result;
}

// ---------------------------------------------------------------------------
// Dixon-Coles Correction
//
// Adjusts probabilities for 0-0, 1-0, 0-1, and 1-1 scores.
// These low-scoring outcomes are observed more (0-0, 1-1) or less
// (1-0, 0-1) frequently than a basic Poisson model predicts.
// ---------------------------------------------------------------------------

function dixonColesCorrection(
  homeGoals: number,
  awayGoals: number,
  lambdaHome: number,
  lambdaAway: number,
  rho: number,
): number {
  if (homeGoals === 0 && awayGoals === 0) {
    return 1 - lambdaHome * lambdaAway * rho;
  }
  if (homeGoals === 1 && awayGoals === 0) {
    return 1 + lambdaAway * rho;
  }
  if (homeGoals === 0 && awayGoals === 1) {
    return 1 + lambdaHome * rho;
  }
  if (homeGoals === 1 && awayGoals === 1) {
    return 1 - rho;
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Main Prediction Function
// ---------------------------------------------------------------------------

const MAX_GOALS = 8;

/**
 * Calculate match probabilities using the Poisson model with Dixon-Coles correction.
 *
 * @param home - Home team goal statistics
 * @param away - Away team goal statistics
 * @param leagueAvg - Optional league averages (defaults to Top 5 avg)
 */
export function calculatePoissonPrediction(
  home: TeamGoalStats,
  away: TeamGoalStats,
  leagueAvg = LEAGUE_DEFAULTS,
): PoissonPrediction {
  // Calculate expected goals using attack/defense strength
  const homeAttack = home.homeGoalsFor / leagueAvg.avgHomeGoals;
  const homeDefense = home.homeGoalsAgainst / leagueAvg.avgAwayGoals;
  const awayAttack = away.awayGoalsFor / leagueAvg.avgAwayGoals;
  const awayDefense = away.awayGoalsAgainst / leagueAvg.avgHomeGoals;

  // Expected goals = attack_strength * defense_weakness * league_average
  let expectedHomeGoals = homeAttack * awayDefense * leagueAvg.avgHomeGoals;
  let expectedAwayGoals = awayAttack * homeDefense * leagueAvg.avgAwayGoals;

  // Clamp to reasonable range
  expectedHomeGoals = Math.max(0.3, Math.min(expectedHomeGoals, 4.5));
  expectedAwayGoals = Math.max(0.2, Math.min(expectedAwayGoals, 4.0));

  // Dixon-Coles rho parameter (negative = more 0-0 and 1-1 than expected)
  // Typical value around -0.13 to -0.05
  const rho = -0.09;

  // Build score probability matrix
  const scoreMatrix: number[][] = [];
  for (let h = 0; h <= MAX_GOALS; h++) {
    scoreMatrix[h] = [];
    for (let a = 0; a <= MAX_GOALS; a++) {
      const pHome = poissonPmf(h, expectedHomeGoals);
      const pAway = poissonPmf(a, expectedAwayGoals);
      const dcCorr = dixonColesCorrection(h, a, expectedHomeGoals, expectedAwayGoals, rho);
      scoreMatrix[h][a] = pHome * pAway * dcCorr;
    }
  }

  // Normalize matrix (Dixon-Coles can push sum slightly away from 1)
  let matrixSum = 0;
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      matrixSum += scoreMatrix[h][a];
    }
  }
  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      scoreMatrix[h][a] /= matrixSum;
    }
  }

  // Calculate outcome probabilities
  let homeWinProb = 0;
  let drawProb = 0;
  let awayWinProb = 0;
  let over25Prob = 0;
  let bttsProb = 0;
  let maxScoreProb = 0;
  let likelyHome = 0;
  let likelyAway = 0;

  for (let h = 0; h <= MAX_GOALS; h++) {
    for (let a = 0; a <= MAX_GOALS; a++) {
      const p = scoreMatrix[h][a];

      if (h > a) homeWinProb += p;
      else if (h === a) drawProb += p;
      else awayWinProb += p;

      if (h + a > 2) over25Prob += p;
      if (h > 0 && a > 0) bttsProb += p;

      if (p > maxScoreProb) {
        maxScoreProb = p;
        likelyHome = h;
        likelyAway = a;
      }
    }
  }

  return {
    homeWinProb: round(homeWinProb * 100),
    drawProb: round(drawProb * 100),
    awayWinProb: round(awayWinProb * 100),
    over25Prob: round(over25Prob * 100),
    under25Prob: round((1 - over25Prob) * 100),
    bttsProb: round(bttsProb * 100),
    expectedHomeGoals: round(expectedHomeGoals),
    expectedAwayGoals: round(expectedAwayGoals),
    likelyScore: `${likelyHome}-${likelyAway}`,
    scoreMatrix,
  };
}

function round(n: number, decimals = 1): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

// ---------------------------------------------------------------------------
// Helper: Extract Team Goal Stats from API-Football team statistics
// ---------------------------------------------------------------------------

/**
 * Extract TeamGoalStats from raw API-Football /teams/statistics response.
 * Falls back to league averages if data is incomplete.
 */
export function extractTeamGoalStats(teamStats: unknown): TeamGoalStats | null {
  if (!teamStats || typeof teamStats !== 'object') return null;

  const stats = teamStats as Record<string, unknown>;
  const goals = stats.goals as Record<string, Record<string, Record<string, unknown>>> | undefined;

  if (!goals) return null;

  const gfHome = parseFloat(String(goals.for?.average?.home ?? ''));
  const gaHome = parseFloat(String(goals.against?.average?.home ?? ''));
  const gfAway = parseFloat(String(goals.for?.average?.away ?? ''));
  const gaAway = parseFloat(String(goals.against?.average?.away ?? ''));

  if (isNaN(gfHome) || isNaN(gaHome) || isNaN(gfAway) || isNaN(gaAway)) return null;

  return {
    homeGoalsFor: gfHome,
    homeGoalsAgainst: gaHome,
    awayGoalsFor: gfAway,
    awayGoalsAgainst: gaAway,
  };
}

/**
 * Format Poisson prediction as a text block for the LLM prompt.
 */
export function formatPoissonForPrompt(pred: PoissonPrediction): string {
  return [
    '## Statistical Baseline (Poisson Model with Dixon-Coles Correction)',
    `Expected Goals: Home ${pred.expectedHomeGoals}, Away ${pred.expectedAwayGoals}`,
    `Home Win: ${pred.homeWinProb}%, Draw: ${pred.drawProb}%, Away Win: ${pred.awayWinProb}%`,
    `Over 2.5: ${pred.over25Prob}%, Under 2.5: ${pred.under25Prob}%`,
    `BTTS: ${pred.bttsProb}%`,
    `Most Likely Score: ${pred.likelyScore}`,
    '',
    'Use these as your starting point. Adjust based on qualitative factors above (form, injuries, motivation, etc.).',
  ].join('\n');
}
