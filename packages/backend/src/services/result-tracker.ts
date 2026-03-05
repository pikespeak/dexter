/**
 * Result Tracker Service
 *
 * Checks finished matches, fetches actual results from API-Football,
 * evaluates predictions across all markets, and updates performance metrics.
 *
 * Tracks:
 * - 1X2 outcome (correct/wrong)
 * - Over/Under 2.5 goals
 * - Both Teams to Score (BTTS)
 * - Exact score
 * - Brier Score (calibration metric)
 * - Real P/L using actual bookmaker odds (not fair odds)
 * - Value bet outcomes
 *
 * Designed to run hourly via cron.
 */

import { eq, and, isNull, lte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { callFootballApi } from '../../../../src/tools/sports/api.js';

interface FinishedFixture {
  fixture: {
    id: number;
    status: { short: string };
  };
  goals: {
    home: number;
    away: number;
  };
  score: {
    fulltime: { home: number; away: number };
  };
}

export interface TrackingResult {
  checked: number;
  evaluated: number;
  correct: number;
  valueBetsEvaluated: number;
}

/**
 * Check for finished matches and evaluate predictions.
 */
export async function trackResults(): Promise<TrackingResult> {
  console.log('[ResultTracker] Checking for finished matches...');

  const pendingMatches = await db
    .select({
      match: schema.matches,
      prediction: schema.predictions,
    })
    .from(schema.matches)
    .innerJoin(schema.predictions, eq(schema.predictions.matchId, schema.matches.id))
    .leftJoin(schema.performance, eq(schema.performance.predictionId, schema.predictions.id))
    .where(
      and(
        eq(schema.matches.status, 'scheduled'),
        lte(schema.matches.kickoff, new Date()),
        isNull(schema.performance.id)
      )
    );

  let checked = 0;
  let evaluated = 0;
  let correct = 0;
  let valueBetsEvaluated = 0;

  for (const { match, prediction } of pendingMatches) {
    checked++;

    try {
      const result = await callFootballApi('/fixtures', {
        id: match.apiFootballId,
      });

      const fixtures = (result.data as { response?: FinishedFixture[] }).response || [];
      if (fixtures.length === 0) continue;

      const fixture = fixtures[0];
      const status = fixture.fixture.status.short;

      if (status !== 'FT' && status !== 'AET' && status !== 'PEN') continue;

      const homeGoals = fixture.goals.home;
      const awayGoals = fixture.goals.away;
      const actualResult = `${homeGoals}-${awayGoals}`;
      const totalGoals = homeGoals + awayGoals;

      // Update match with actual score
      await db
        .update(schema.matches)
        .set({
          homeScore: homeGoals,
          awayScore: awayGoals,
          status: 'finished',
        })
        .where(eq(schema.matches.id, match.id));

      // --- 1X2 Evaluation ---
      const actualOutcome =
        homeGoals > awayGoals ? 'home' : homeGoals < awayGoals ? 'away' : 'draw';

      const homeProb = Number(prediction.homeWinProb || 0);
      const drawProb = Number(prediction.drawProb || 0);
      const awayProb = Number(prediction.awayWinProb || 0);

      const predictedOutcome =
        homeProb >= drawProb && homeProb >= awayProb
          ? 'home'
          : awayProb >= homeProb && awayProb >= drawProb
            ? 'away'
            : 'draw';

      const wasCorrect = predictedOutcome === actualOutcome;

      // --- Brier Score ---
      // Brier = (1/3) * sum of (predicted_prob - actual)^2 for each outcome
      const actualHome = actualOutcome === 'home' ? 1 : 0;
      const actualDraw = actualOutcome === 'draw' ? 1 : 0;
      const actualAway = actualOutcome === 'away' ? 1 : 0;

      const brierScore =
        (Math.pow(homeProb / 100 - actualHome, 2) +
         Math.pow(drawProb / 100 - actualDraw, 2) +
         Math.pow(awayProb / 100 - actualAway, 2)) / 3;

      // --- Over/Under 2.5 ---
      const actualOver25 = totalGoals > 2.5;
      const overUnderCorrect = prediction.overUnder25
        ? (prediction.overUnder25 === 'over') === actualOver25
        : null;

      // --- BTTS ---
      const actualBtts = homeGoals > 0 && awayGoals > 0;
      const bttsCorrect = prediction.btts != null
        ? prediction.btts === actualBtts
        : null;

      // --- Exact Score ---
      const exactScoreCorrect = prediction.predictedScore === actualResult;

      // --- P/L with real bookmaker odds ---
      let realProfitLoss: number | null = null;
      const predictedOdds =
        predictedOutcome === 'home' ? Number(prediction.bestOddsHome || 0) :
        predictedOutcome === 'draw' ? Number(prediction.bestOddsDraw || 0) :
        Number(prediction.bestOddsAway || 0);

      if (predictedOdds > 0) {
        realProfitLoss = wasCorrect ? predictedOdds - 1 : -1;
      }

      // --- Legacy fair-odds P/L (kept for backwards compatibility) ---
      const maxProb = Math.max(homeProb, drawProb, awayProb);
      const fairOdds = maxProb > 0 ? 100 / maxProb : 0;
      const profitLoss = wasCorrect ? fairOdds - 1 : -1;

      // Insert performance record
      await db.insert(schema.performance).values({
        predictionId: prediction.id,
        wasCorrect,
        actualResult,
        profitLoss: String(Math.round(profitLoss * 100) / 100),
        realProfitLoss: realProfitLoss != null ? String(Math.round(realProfitLoss * 100) / 100) : null,
        brierScore: String(Math.round(brierScore * 1000000) / 1000000),
        overUnderCorrect,
        bttsCorrect,
        exactScoreCorrect,
      });

      evaluated++;
      if (wasCorrect) correct++;

      console.log(
        `[ResultTracker] ${match.homeTeam} ${actualResult} ${match.awayTeam} — ` +
        `1X2:${wasCorrect ? 'OK' : 'WRONG'} O/U:${overUnderCorrect ?? 'N/A'} BTTS:${bttsCorrect ?? 'N/A'} ` +
        `Brier:${brierScore.toFixed(4)} Exact:${exactScoreCorrect}`
      );

      // --- Value Bet Evaluation ---
      const matchValueBets = await db
        .select()
        .from(schema.valueBets)
        .where(eq(schema.valueBets.matchId, match.id));

      for (const vb of matchValueBets) {
        const vbResult = evaluateValueBet(vb.betType, homeGoals, awayGoals);
        if (vbResult == null) continue;

        const vbWon = vbResult;
        const odds = Number(vb.bestOdds);
        const pl = vbWon ? odds - 1 : -1;

        await db
          .update(schema.valueBets)
          .set({
            result: vbWon ? 'won' : 'lost',
            actualProfitLoss: String(Math.round(pl * 100) / 100),
          })
          .where(eq(schema.valueBets.id, vb.id));

        valueBetsEvaluated++;
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ResultTracker] Error checking fixture ${match.apiFootballId}: ${msg}`);
    }
  }

  console.log(
    `[ResultTracker] Done: ${evaluated}/${checked} evaluated, ${correct} correct, ${valueBetsEvaluated} value bets resolved`
  );
  return { checked, evaluated, correct, valueBetsEvaluated };
}

/**
 * Determine if a value bet was won based on bet type and actual score.
 */
function evaluateValueBet(betType: string, homeGoals: number, awayGoals: number): boolean | null {
  const totalGoals = homeGoals + awayGoals;
  const btts = homeGoals > 0 && awayGoals > 0;

  switch (betType) {
    case '1X2_Home': return homeGoals > awayGoals;
    case '1X2_Draw': return homeGoals === awayGoals;
    case '1X2_Away': return awayGoals > homeGoals;
    case 'Over_2.5': return totalGoals > 2.5;
    case 'Under_2.5': return totalGoals < 2.5;
    case 'BTTS_Yes': return btts;
    case 'BTTS_No': return !btts;
    default: return null;
  }
}
