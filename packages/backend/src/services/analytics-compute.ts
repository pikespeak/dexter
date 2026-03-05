/**
 * Analytics Compute Layer — Pure Functions
 *
 * All functions take arrays of records and return computed metrics.
 * No database access — fully testable with mock data.
 */

// ---------------------------------------------------------------------------
// Input Record Types
// ---------------------------------------------------------------------------

export interface PerformanceRecord {
  predictionId: string;
  wasCorrect: boolean | null;
  actualResult: string | null;
  brierScore: number | null;
  realProfitLoss: number | null;
  profitLoss: number | null;
  overUnderCorrect: boolean | null;
  bttsCorrect: boolean | null;
  exactScoreCorrect: boolean | null;
  // Joined from predictions
  homeWinProb: number | null;
  drawProb: number | null;
  awayWinProb: number | null;
  overUnder25: string | null;
  overUnder25Prob: number | null;
  btts: boolean | null;
  bttsProb: number | null;
  predictedScore: string | null;
  poissonHomeProb: number | null;
  poissonDrawProb: number | null;
  poissonAwayProb: number | null;
  poissonOver25Prob: number | null;
  poissonBttsProb: number | null;
  confidence: number | null;
  modelVersion: string | null;
  // Joined from matches
  leagueId: number | null;
  leagueName: string | null;
  evaluatedAt: Date | string | null;
}

export interface ValueBetRecord {
  betType: string;
  ourProbability: number;
  bestOdds: number;
  edge: number;
  kellyStake: number | null;
  result: string | null; // 'won' | 'lost' | 'void'
  actualProfitLoss: number | null;
  closingOdds: number | null;
}

// ---------------------------------------------------------------------------
// Output Types
// ---------------------------------------------------------------------------

export interface OverallPerformance {
  totalPredictions: number;
  correct1X2: number;
  accuracy1X2: number;
  correctOU: number;
  accuracyOU: number;
  correctBTTS: number;
  accuracyBTTS: number;
  correctExact: number;
  accuracyExact: number;
  avgBrierScore: number;
  totalRealPL: number;
  totalFairPL: number;
  avgConfidence: number;
}

export interface MarketBreakdown {
  market1X2: { total: number; correct: number; accuracy: number; avgBrier: number; totalPL: number };
  marketOU: { total: number; correct: number; accuracy: number };
  marketBTTS: { total: number; correct: number; accuracy: number };
  marketExact: { total: number; correct: number; accuracy: number };
}

export interface LeagueBreakdown {
  leagueId: number;
  leagueName: string;
  total: number;
  correct: number;
  accuracy: number;
  avgBrier: number;
  totalPL: number;
}

export interface CalibrationBucket {
  midpoint: number;
  predicted: number;
  observed: number;
  count: number;
}

export interface BrierAnalysis {
  avgBrierScore: number;
  reliability: number;
  resolution: number;
  uncertainty: number;
}

export interface ValueBetROI {
  totalBets: number;
  won: number;
  lost: number;
  winRate: number;
  totalStaked: number;
  totalReturn: number;
  profitLoss: number;
  roi: number;
  avgEdge: number;
  avgOdds: number;
  byType: Record<string, { total: number; won: number; roi: number; pl: number }>;
}

export interface PoissonVsLlm {
  sampleSize: number;
  poissonAccuracy: number;
  llmAccuracy: number;
  poissonAvgBrier: number;
  llmAvgBrier: number;
  agreement: number;
  llmImprovement: number;
}

export interface CLVAnalysis {
  totalWithClosing: number;
  avgCLV: number;
  positiveCLVRate: number;
  avgCLVWon: number;
  avgCLVLost: number;
}

// ---------------------------------------------------------------------------
// Compute Functions
// ---------------------------------------------------------------------------

export function computeOverallPerformance(records: PerformanceRecord[]): OverallPerformance {
  if (records.length === 0) {
    return {
      totalPredictions: 0, correct1X2: 0, accuracy1X2: 0,
      correctOU: 0, accuracyOU: 0, correctBTTS: 0, accuracyBTTS: 0,
      correctExact: 0, accuracyExact: 0, avgBrierScore: 0,
      totalRealPL: 0, totalFairPL: 0, avgConfidence: 0,
    };
  }

  const evaluated = records.filter(r => r.wasCorrect != null);
  const correct1X2 = evaluated.filter(r => r.wasCorrect === true).length;

  const ouRecords = records.filter(r => r.overUnderCorrect != null);
  const correctOU = ouRecords.filter(r => r.overUnderCorrect === true).length;

  const bttsRecords = records.filter(r => r.bttsCorrect != null);
  const correctBTTS = bttsRecords.filter(r => r.bttsCorrect === true).length;

  const exactRecords = records.filter(r => r.exactScoreCorrect != null);
  const correctExact = exactRecords.filter(r => r.exactScoreCorrect === true).length;

  const brierRecords = records.filter(r => r.brierScore != null);
  const avgBrier = brierRecords.length > 0
    ? brierRecords.reduce((s, r) => s + r.brierScore!, 0) / brierRecords.length
    : 0;

  const totalRealPL = records.reduce((s, r) => s + (r.realProfitLoss ?? 0), 0);
  const totalFairPL = records.reduce((s, r) => s + (r.profitLoss ?? 0), 0);

  const confRecords = records.filter(r => r.confidence != null);
  const avgConfidence = confRecords.length > 0
    ? confRecords.reduce((s, r) => s + r.confidence!, 0) / confRecords.length
    : 0;

  return {
    totalPredictions: records.length,
    correct1X2,
    accuracy1X2: evaluated.length > 0 ? correct1X2 / evaluated.length : 0,
    correctOU,
    accuracyOU: ouRecords.length > 0 ? correctOU / ouRecords.length : 0,
    correctBTTS,
    accuracyBTTS: bttsRecords.length > 0 ? correctBTTS / bttsRecords.length : 0,
    correctExact,
    accuracyExact: exactRecords.length > 0 ? correctExact / exactRecords.length : 0,
    avgBrierScore: avgBrier,
    totalRealPL,
    totalFairPL,
    avgConfidence,
  };
}

export function computeMarketBreakdown(records: PerformanceRecord[]): MarketBreakdown {
  const evaluated = records.filter(r => r.wasCorrect != null);
  const correct1X2 = evaluated.filter(r => r.wasCorrect === true).length;
  const brierRecords = evaluated.filter(r => r.brierScore != null);
  const avgBrier = brierRecords.length > 0
    ? brierRecords.reduce((s, r) => s + r.brierScore!, 0) / brierRecords.length
    : 0;
  const totalPL = evaluated.reduce((s, r) => s + (r.realProfitLoss ?? r.profitLoss ?? 0), 0);

  const ouRecords = records.filter(r => r.overUnderCorrect != null);
  const correctOU = ouRecords.filter(r => r.overUnderCorrect === true).length;

  const bttsRecords = records.filter(r => r.bttsCorrect != null);
  const correctBTTS = bttsRecords.filter(r => r.bttsCorrect === true).length;

  const exactRecords = records.filter(r => r.exactScoreCorrect != null);
  const correctExact = exactRecords.filter(r => r.exactScoreCorrect === true).length;

  return {
    market1X2: {
      total: evaluated.length,
      correct: correct1X2,
      accuracy: evaluated.length > 0 ? correct1X2 / evaluated.length : 0,
      avgBrier,
      totalPL,
    },
    marketOU: {
      total: ouRecords.length,
      correct: correctOU,
      accuracy: ouRecords.length > 0 ? correctOU / ouRecords.length : 0,
    },
    marketBTTS: {
      total: bttsRecords.length,
      correct: correctBTTS,
      accuracy: bttsRecords.length > 0 ? correctBTTS / bttsRecords.length : 0,
    },
    marketExact: {
      total: exactRecords.length,
      correct: correctExact,
      accuracy: exactRecords.length > 0 ? correctExact / exactRecords.length : 0,
    },
  };
}

export function computeLeagueBreakdown(records: PerformanceRecord[]): LeagueBreakdown[] {
  const byLeague = new Map<number, PerformanceRecord[]>();

  for (const r of records) {
    if (r.leagueId == null) continue;
    const existing = byLeague.get(r.leagueId) ?? [];
    existing.push(r);
    byLeague.set(r.leagueId, existing);
  }

  const result: LeagueBreakdown[] = [];
  for (const [leagueId, leagueRecords] of byLeague) {
    const evaluated = leagueRecords.filter(r => r.wasCorrect != null);
    const correct = evaluated.filter(r => r.wasCorrect === true).length;
    const brierRecs = leagueRecords.filter(r => r.brierScore != null);
    const avgBrier = brierRecs.length > 0
      ? brierRecs.reduce((s, r) => s + r.brierScore!, 0) / brierRecs.length
      : 0;
    const totalPL = leagueRecords.reduce((s, r) => s + (r.realProfitLoss ?? r.profitLoss ?? 0), 0);

    result.push({
      leagueId,
      leagueName: leagueRecords[0]?.leagueName ?? `League ${leagueId}`,
      total: leagueRecords.length,
      correct,
      accuracy: evaluated.length > 0 ? correct / evaluated.length : 0,
      avgBrier,
      totalPL,
    });
  }

  return result.sort((a, b) => b.total - a.total);
}

export function computeCalibrationBuckets(
  records: PerformanceRecord[],
  bucketSize = 5,
): CalibrationBucket[] {
  // For each evaluated prediction, compute the probability of the predicted outcome
  // and whether it was correct, then group into buckets
  const dataPoints: Array<{ predicted: number; actual: number }> = [];

  for (const r of records) {
    if (r.wasCorrect == null) continue;
    const homeProb = r.homeWinProb ?? 0;
    const drawProb = r.drawProb ?? 0;
    const awayProb = r.awayWinProb ?? 0;
    const maxProb = Math.max(homeProb, drawProb, awayProb);

    dataPoints.push({
      predicted: maxProb / 100, // normalize to 0-1
      actual: r.wasCorrect ? 1 : 0,
    });
  }

  if (dataPoints.length === 0) return [];

  const buckets = new Map<number, { sumPredicted: number; sumActual: number; count: number }>();

  for (const dp of dataPoints) {
    const bucketIdx = Math.floor((dp.predicted * 100) / bucketSize);
    const midpoint = bucketIdx * bucketSize + bucketSize / 2;
    const existing = buckets.get(midpoint) ?? { sumPredicted: 0, sumActual: 0, count: 0 };
    existing.sumPredicted += dp.predicted;
    existing.sumActual += dp.actual;
    existing.count++;
    buckets.set(midpoint, existing);
  }

  const result: CalibrationBucket[] = [];
  for (const [midpoint, data] of buckets) {
    result.push({
      midpoint,
      predicted: data.sumPredicted / data.count,
      observed: data.sumActual / data.count,
      count: data.count,
    });
  }

  return result.sort((a, b) => a.midpoint - b.midpoint);
}

export function computeBrierDecomposition(
  calibrationBuckets: CalibrationBucket[],
  overallHitRate: number,
): BrierAnalysis {
  const totalCount = calibrationBuckets.reduce((s, b) => s + b.count, 0);
  if (totalCount === 0) {
    return { avgBrierScore: 0, reliability: 0, resolution: 0, uncertainty: 0 };
  }

  // Reliability: weighted average of (predicted - observed)^2
  let reliability = 0;
  for (const bucket of calibrationBuckets) {
    reliability += (bucket.count / totalCount) *
      Math.pow(bucket.predicted - bucket.observed, 2);
  }

  // Resolution: weighted average of (observed - overallHitRate)^2
  let resolution = 0;
  for (const bucket of calibrationBuckets) {
    resolution += (bucket.count / totalCount) *
      Math.pow(bucket.observed - overallHitRate, 2);
  }

  // Uncertainty: overallHitRate * (1 - overallHitRate)
  const uncertainty = overallHitRate * (1 - overallHitRate);

  // Brier Score = reliability - resolution + uncertainty
  const avgBrierScore = reliability - resolution + uncertainty;

  return { avgBrierScore, reliability, resolution, uncertainty };
}

export function computeValueBetROI(valueBetRecords: ValueBetRecord[]): ValueBetROI {
  const settled = valueBetRecords.filter(r => r.result === 'won' || r.result === 'lost');

  if (settled.length === 0) {
    return {
      totalBets: 0, won: 0, lost: 0, winRate: 0,
      totalStaked: 0, totalReturn: 0, profitLoss: 0, roi: 0,
      avgEdge: 0, avgOdds: 0, byType: {},
    };
  }

  const won = settled.filter(r => r.result === 'won').length;
  const lost = settled.filter(r => r.result === 'lost').length;
  const totalStaked = settled.length; // flat 1 unit per bet
  const totalReturn = settled.reduce((s, r) => {
    if (r.result === 'won') return s + r.bestOdds;
    return s;
  }, 0);
  const profitLoss = totalReturn - totalStaked;
  const avgEdge = settled.reduce((s, r) => s + r.edge, 0) / settled.length;
  const avgOdds = settled.reduce((s, r) => s + r.bestOdds, 0) / settled.length;

  // By type breakdown
  const byType: ValueBetROI['byType'] = {};
  for (const r of settled) {
    if (!byType[r.betType]) {
      byType[r.betType] = { total: 0, won: 0, roi: 0, pl: 0 };
    }
    byType[r.betType].total++;
    if (r.result === 'won') {
      byType[r.betType].won++;
      byType[r.betType].pl += r.bestOdds - 1;
    } else {
      byType[r.betType].pl -= 1;
    }
  }
  for (const type of Object.keys(byType)) {
    byType[type].roi = byType[type].total > 0 ? byType[type].pl / byType[type].total : 0;
  }

  return {
    totalBets: settled.length,
    won,
    lost,
    winRate: won / settled.length,
    totalStaked,
    totalReturn,
    profitLoss,
    roi: totalStaked > 0 ? profitLoss / totalStaked : 0,
    avgEdge,
    avgOdds,
    byType,
  };
}

export function computePoissonVsLlm(records: PerformanceRecord[]): PoissonVsLlm {
  // Only records that have both Poisson and LLM probabilities
  const withBoth = records.filter(
    r => r.poissonHomeProb != null && r.homeWinProb != null &&
         r.wasCorrect != null && r.actualResult != null
  );

  if (withBoth.length === 0) {
    return {
      sampleSize: 0, poissonAccuracy: 0, llmAccuracy: 0,
      poissonAvgBrier: 0, llmAvgBrier: 0, agreement: 0, llmImprovement: 0,
    };
  }

  let poissonCorrect = 0;
  let llmCorrect = 0;
  let poissonBrierSum = 0;
  let llmBrierSum = 0;
  let agreements = 0;

  for (const r of withBoth) {
    const [homeGoals, awayGoals] = r.actualResult!.split('-').map(Number);
    const actualOutcome = homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';

    // Poisson prediction
    const pH = r.poissonHomeProb!;
    const pD = r.poissonDrawProb ?? 0;
    const pA = r.poissonAwayProb ?? 0;
    const poissonPred = pH >= pD && pH >= pA ? 'home' : pA >= pH && pA >= pD ? 'away' : 'draw';
    if (poissonPred === actualOutcome) poissonCorrect++;

    // LLM prediction
    const lH = r.homeWinProb!;
    const lD = r.drawProb ?? 0;
    const lA = r.awayWinProb ?? 0;
    const llmPred = lH >= lD && lH >= lA ? 'home' : lA >= lH && lA >= lD ? 'away' : 'draw';
    if (llmPred === actualOutcome) llmCorrect++;

    // Agreement
    if (poissonPred === llmPred) agreements++;

    // Brier scores
    const actualHome = actualOutcome === 'home' ? 1 : 0;
    const actualDraw = actualOutcome === 'draw' ? 1 : 0;
    const actualAway = actualOutcome === 'away' ? 1 : 0;

    poissonBrierSum +=
      (Math.pow(pH / 100 - actualHome, 2) +
       Math.pow(pD / 100 - actualDraw, 2) +
       Math.pow(pA / 100 - actualAway, 2)) / 3;

    llmBrierSum +=
      (Math.pow(lH / 100 - actualHome, 2) +
       Math.pow(lD / 100 - actualDraw, 2) +
       Math.pow(lA / 100 - actualAway, 2)) / 3;
  }

  const n = withBoth.length;
  const poissonAcc = poissonCorrect / n;
  const llmAcc = llmCorrect / n;

  return {
    sampleSize: n,
    poissonAccuracy: poissonAcc,
    llmAccuracy: llmAcc,
    poissonAvgBrier: poissonBrierSum / n,
    llmAvgBrier: llmBrierSum / n,
    agreement: agreements / n,
    llmImprovement: llmAcc - poissonAcc,
  };
}

export function computeCLVAnalysis(valueBetRecords: ValueBetRecord[]): CLVAnalysis {
  const withClosing = valueBetRecords.filter(
    r => r.closingOdds != null && r.closingOdds > 0 && r.result != null
  );

  if (withClosing.length === 0) {
    return { totalWithClosing: 0, avgCLV: 0, positiveCLVRate: 0, avgCLVWon: 0, avgCLVLost: 0 };
  }

  let clvSum = 0;
  let positiveCLVCount = 0;
  const wonCLVs: number[] = [];
  const lostCLVs: number[] = [];

  for (const r of withClosing) {
    // CLV = (closingOdds / openingOdds - 1) * 100
    // Positive CLV means our odds were better than closing (market moved towards us)
    const clv = (r.closingOdds! / r.bestOdds - 1) * 100;
    clvSum += clv;
    if (clv > 0) positiveCLVCount++;

    if (r.result === 'won') wonCLVs.push(clv);
    else lostCLVs.push(clv);
  }

  return {
    totalWithClosing: withClosing.length,
    avgCLV: clvSum / withClosing.length,
    positiveCLVRate: positiveCLVCount / withClosing.length,
    avgCLVWon: wonCLVs.length > 0 ? wonCLVs.reduce((s, v) => s + v, 0) / wonCLVs.length : 0,
    avgCLVLost: lostCLVs.length > 0 ? lostCLVs.reduce((s, v) => s + v, 0) / lostCLVs.length : 0,
  };
}

/**
 * Simple linear regression: y = slope * x + intercept
 */
export function linearRegression(
  x: number[],
  y: number[],
  weights?: number[],
): { slope: number; intercept: number; rSquared: number } {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0 };

  const w = weights ?? new Array(n).fill(1);
  const totalWeight = w.reduce((s, v) => s + v, 0);

  const meanX = x.reduce((s, v, i) => s + v * w[i], 0) / totalWeight;
  const meanY = y.reduce((s, v, i) => s + v * w[i], 0) / totalWeight;

  let ssXY = 0;
  let ssXX = 0;
  let ssYY = 0;

  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    ssXY += w[i] * dx * dy;
    ssXX += w[i] * dx * dx;
    ssYY += w[i] * dy * dy;
  }

  const slope = ssXX > 0 ? ssXY / ssXX : 0;
  const intercept = meanY - slope * meanX;
  const rSquared = ssXX > 0 && ssYY > 0 ? (ssXY * ssXY) / (ssXX * ssYY) : 0;

  return { slope, intercept, rSquared };
}
