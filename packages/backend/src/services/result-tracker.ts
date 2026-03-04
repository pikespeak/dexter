/**
 * Result Tracker Service
 *
 * Checks finished matches, fetches actual results from API-Football,
 * evaluates predictions, and updates the performance table.
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

/**
 * Check for finished matches and evaluate predictions.
 */
export async function trackResults(): Promise<{
  checked: number;
  evaluated: number;
  correct: number;
}> {
  console.log('[ResultTracker] Checking for finished matches...');

  // Find matches that are scheduled and have kickoff in the past
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
        isNull(schema.performance.id) // Not yet evaluated
      )
    );

  let checked = 0;
  let evaluated = 0;
  let correct = 0;

  for (const { match, prediction } of pendingMatches) {
    checked++;

    try {
      // Fetch fixture result from API-Football
      const result = await callFootballApi('/fixtures', {
        id: match.apiFootballId,
      });

      const fixtures = (result.data as { response?: FinishedFixture[] }).response || [];
      if (fixtures.length === 0) continue;

      const fixture = fixtures[0];
      const status = fixture.fixture.status.short;

      // Only process finished matches
      if (status !== 'FT' && status !== 'AET' && status !== 'PEN') continue;

      const homeGoals = fixture.goals.home;
      const awayGoals = fixture.goals.away;
      const actualResult = `${homeGoals}-${awayGoals}`;

      // Update match with actual score
      await db
        .update(schema.matches)
        .set({
          homeScore: homeGoals,
          awayScore: awayGoals,
          status: 'finished',
        })
        .where(eq(schema.matches.id, match.id));

      // Determine if prediction was correct
      // "Correct" = predicted the right outcome (1X2)
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

      // Calculate profit/loss (assuming 1 unit stake on predicted outcome with fair odds)
      // This is simplified; real P/L would use actual bookmaker odds
      const fairOdds = 100 / Math.max(homeProb, drawProb, awayProb);
      const profitLoss = wasCorrect ? fairOdds - 1 : -1;

      // Insert performance record
      await db.insert(schema.performance).values({
        predictionId: prediction.id,
        wasCorrect,
        actualResult,
        profitLoss: String(Math.round(profitLoss * 100) / 100),
      });

      evaluated++;
      if (wasCorrect) correct++;

      console.log(
        `[ResultTracker] ${match.homeTeam} ${actualResult} ${match.awayTeam} — ${wasCorrect ? 'CORRECT' : 'WRONG'} (predicted: ${predictedOutcome})`
      );
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[ResultTracker] Error checking fixture ${match.apiFootballId}: ${msg}`);
    }
  }

  console.log(
    `[ResultTracker] Done: ${evaluated}/${checked} evaluated, ${correct} correct`
  );
  return { checked, evaluated, correct };
}
