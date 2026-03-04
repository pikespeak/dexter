/**
 * Prediction Pipeline Service
 *
 * Orchestrates the daily prediction generation process:
 * 1. Fetch upcoming matches from API-Football
 * 2. Run the prediction agent for each match
 * 3. Store predictions in the database
 * 4. Run value bet analysis
 * 5. Send push notifications to subscribers
 *
 * Designed to run as a cron job (daily at 06:00 UTC).
 */

import { eq, and, gte, lte, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { callFootballApi } from '../../../../src/tools/sports/api.js';
import { generateMatchPrediction, type PredictionResult } from './prediction-agent.js';

// ---------------------------------------------------------------------------
// League Configuration
// ---------------------------------------------------------------------------

const TOP_LEAGUES = [
  { id: 39, name: 'Premier League' },
  { id: 140, name: 'La Liga' },
  { id: 78, name: 'Bundesliga' },
  { id: 135, name: 'Serie A' },
  { id: 61, name: 'Ligue 1' },
];

// ---------------------------------------------------------------------------
// Main Pipeline
// ---------------------------------------------------------------------------

export interface PipelineResult {
  matchesFound: number;
  predictionsGenerated: number;
  valueBetsFound: number;
  errors: string[];
}

export async function runDailyPipeline(): Promise<PipelineResult> {
  console.log('[Pipeline] Starting daily prediction run...');
  const result: PipelineResult = {
    matchesFound: 0,
    predictionsGenerated: 0,
    valueBetsFound: 0,
    errors: [],
  };

  // Step 1: Fetch upcoming matches for the next 48 hours
  const matches = await fetchUpcomingMatches();
  result.matchesFound = matches.length;
  console.log(`[Pipeline] Found ${matches.length} upcoming matches`);

  if (matches.length === 0) {
    console.log('[Pipeline] No upcoming matches found. Exiting.');
    return result;
  }

  // Step 2: Generate predictions for each match (sequentially to manage API rate limits)
  const predictions: Array<{ match: MatchData; prediction: PredictionResult }> = [];

  for (const match of matches) {
    try {
      console.log(`[Pipeline] Predicting: ${match.homeTeam} vs ${match.awayTeam}`);
      const prediction = await generatePrediction(match);
      await storePrediction(match, prediction);
      predictions.push({ match, prediction });
      result.predictionsGenerated++;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Pipeline] Error predicting ${match.homeTeam} vs ${match.awayTeam}: ${msg}`);
      result.errors.push(`${match.homeTeam} vs ${match.awayTeam}: ${msg}`);
    }
  }

  // Step 3: Assign tiers (highest confidence = free, rest = pro)
  await assignTiers();

  // Step 4: Run value bet analysis
  const valueBetCount = await runValueBetAnalysis();
  result.valueBetsFound = valueBetCount;

  // Step 5: Send notifications (placeholder for Phase 2)
  await sendNotifications();

  console.log(
    `[Pipeline] Complete: ${result.predictionsGenerated}/${result.matchesFound} predictions, ${result.valueBetsFound} value bets`
  );
  return result;
}

// ---------------------------------------------------------------------------
// Step 1: Fetch Upcoming Matches
// ---------------------------------------------------------------------------

interface MatchData {
  fixtureId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  leagueId: number;
  leagueName: string;
  kickoff: Date;
  venue: string;
}

interface FixtureResponse {
  fixture: {
    id: number;
    date: string;
    venue?: { name?: string };
    status: { short: string };
  };
  league: {
    id: number;
    name: string;
  };
  teams: {
    home: { id: number; name: string };
    away: { id: number; name: string };
  };
}

async function fetchUpcomingMatches(): Promise<MatchData[]> {
  console.log('[Pipeline] Fetching upcoming matches from API-Football...');

  const now = new Date();
  const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const fromDate = now.toISOString().split('T')[0];
  const toDate = in48Hours.toISOString().split('T')[0];
  const season = now.getFullYear();

  const allMatches: MatchData[] = [];

  // Fetch from each top league in parallel
  const leagueResults = await Promise.allSettled(
    TOP_LEAGUES.map((league) =>
      callFootballApi('/fixtures', {
        league: league.id,
        season,
        from: fromDate,
        to: toDate,
        status: 'NS', // Not Started
      })
    )
  );

  for (let i = 0; i < leagueResults.length; i++) {
    const result = leagueResults[i];
    if (result.status === 'rejected') {
      console.error(`[Pipeline] Failed to fetch ${TOP_LEAGUES[i].name}: ${result.reason}`);
      continue;
    }

    const fixtures = (result.value.data as { response?: FixtureResponse[] }).response || [];

    for (const fixture of fixtures) {
      if (fixture.fixture.status.short !== 'NS') continue;

      allMatches.push({
        fixtureId: fixture.fixture.id,
        homeTeam: fixture.teams.home.name,
        homeTeamId: fixture.teams.home.id,
        awayTeam: fixture.teams.away.name,
        awayTeamId: fixture.teams.away.id,
        leagueId: fixture.league.id,
        leagueName: fixture.league.name,
        kickoff: new Date(fixture.fixture.date),
        venue: fixture.fixture.venue?.name || 'Unknown',
      });
    }
  }

  // Sort by kickoff time
  allMatches.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  return allMatches;
}

// ---------------------------------------------------------------------------
// Step 2: Generate Prediction
// ---------------------------------------------------------------------------

async function generatePrediction(match: MatchData): Promise<PredictionResult> {
  return generateMatchPrediction({
    fixtureId: match.fixtureId,
    homeTeam: match.homeTeam,
    homeTeamId: match.homeTeamId,
    awayTeam: match.awayTeam,
    awayTeamId: match.awayTeamId,
    leagueId: match.leagueId,
    leagueName: match.leagueName,
  });
}

// ---------------------------------------------------------------------------
// Step 3: Store Prediction
// ---------------------------------------------------------------------------

async function storePrediction(match: MatchData, prediction: PredictionResult): Promise<void> {
  // Upsert match (ON CONFLICT apiFootballId)
  const existingMatch = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.apiFootballId, match.fixtureId))
    .limit(1);

  let matchId: string;

  if (existingMatch.length > 0) {
    matchId = existingMatch[0].id;
    // Update match data
    await db
      .update(schema.matches)
      .set({
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        kickoff: match.kickoff,
        venue: match.venue,
        status: 'scheduled',
      })
      .where(eq(schema.matches.id, matchId));
  } else {
    const [newMatch] = await db
      .insert(schema.matches)
      .values({
        apiFootballId: match.fixtureId,
        homeTeam: match.homeTeam,
        homeTeamId: match.homeTeamId,
        awayTeam: match.awayTeam,
        awayTeamId: match.awayTeamId,
        leagueName: match.leagueName,
        leagueId: match.leagueId,
        kickoff: match.kickoff,
        venue: match.venue,
        status: 'scheduled',
      })
      .returning();
    matchId = newMatch.id;
  }

  // Check if prediction already exists for this match (avoid duplicates on re-runs)
  const existingPrediction = await db
    .select()
    .from(schema.predictions)
    .where(eq(schema.predictions.matchId, matchId))
    .limit(1);

  if (existingPrediction.length > 0) {
    // Update existing prediction
    await db
      .update(schema.predictions)
      .set({
        predictionData: prediction.analysis as unknown as Record<string, unknown>,
        confidence: String(prediction.confidence),
        homeWinProb: String(prediction.homeWinProb),
        drawProb: String(prediction.drawProb),
        awayWinProb: String(prediction.awayWinProb),
        overUnder25: prediction.overUnder25,
        btts: prediction.btts,
        predictedScore: prediction.predictedScore,
      })
      .where(eq(schema.predictions.id, existingPrediction[0].id));
  } else {
    await db.insert(schema.predictions).values({
      matchId,
      predictionData: prediction.analysis as unknown as Record<string, unknown>,
      confidence: String(prediction.confidence),
      homeWinProb: String(prediction.homeWinProb),
      drawProb: String(prediction.drawProb),
      awayWinProb: String(prediction.awayWinProb),
      overUnder25: prediction.overUnder25,
      btts: prediction.btts,
      predictedScore: prediction.predictedScore,
      tier: 'pro', // Default; will be reassigned in assignTiers()
    });
  }

  console.log(`[Pipeline] Stored prediction for ${match.homeTeam} vs ${match.awayTeam}`);
}

// ---------------------------------------------------------------------------
// Tier Assignment
// ---------------------------------------------------------------------------

async function assignTiers(): Promise<void> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Get today's predictions ordered by confidence (highest first)
  const todaysPredictions = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(and(gte(schema.matches.kickoff, today), lte(schema.matches.kickoff, tomorrow)))
    .orderBy(desc(schema.predictions.confidence));

  // Set all to 'pro' first, then mark the highest confidence as 'free'
  for (const { prediction } of todaysPredictions) {
    await db
      .update(schema.predictions)
      .set({ tier: 'pro' })
      .where(eq(schema.predictions.id, prediction.id));
  }

  if (todaysPredictions.length > 0) {
    await db
      .update(schema.predictions)
      .set({ tier: 'free' })
      .where(eq(schema.predictions.id, todaysPredictions[0].prediction.id));

    console.log(
      `[Pipeline] Assigned free tier to highest-confidence prediction`
    );
  }
}

// ---------------------------------------------------------------------------
// Step 4: Value Bet Analysis
// ---------------------------------------------------------------------------

async function runValueBetAnalysis(): Promise<number> {
  console.log('[Pipeline] Running value bet analysis...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 2); // Include tomorrow's matches too

  // Get predictions with their matches
  const predictionsWithMatches = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(and(gte(schema.matches.kickoff, today), lte(schema.matches.kickoff, tomorrow)));

  let valueBetCount = 0;

  for (const { prediction, match } of predictionsWithMatches) {
    try {
      // Fetch odds for this fixture
      const oddsResult = await callFootballApi('/odds', {
        fixture: match.apiFootballId,
      });

      const oddsData = (oddsResult.data as { response?: Array<{ bookmakers?: unknown[] }> })
        .response;
      if (!oddsData || oddsData.length === 0) continue;

      const bookmakers = oddsData[0]?.bookmakers as
        | Array<{
            name: string;
            bets: Array<{
              name: string;
              values: Array<{ value: string; odd: string }>;
            }>;
          }>
        | undefined;

      if (!bookmakers) continue;

      // Analyze each bookmaker's 1X2 odds
      for (const bookmaker of bookmakers) {
        const matchWinnerBet = bookmaker.bets?.find(
          (b) => b.name === 'Match Winner' || b.name === '1X2'
        );
        if (!matchWinnerBet) continue;

        const homeOdds = matchWinnerBet.values.find((v) => v.value === 'Home')?.odd;
        const drawOdds = matchWinnerBet.values.find((v) => v.value === 'Draw')?.odd;
        const awayOdds = matchWinnerBet.values.find((v) => v.value === 'Away')?.odd;

        if (!homeOdds || !drawOdds || !awayOdds) continue;

        const bets = [
          {
            type: '1X2_Home',
            ourProb: Number(prediction.homeWinProb) / 100,
            odds: parseFloat(homeOdds),
          },
          {
            type: '1X2_Draw',
            ourProb: Number(prediction.drawProb) / 100,
            odds: parseFloat(drawOdds),
          },
          {
            type: '1X2_Away',
            ourProb: Number(prediction.awayWinProb) / 100,
            odds: parseFloat(awayOdds),
          },
        ];

        for (const bet of bets) {
          const impliedProb = 1 / bet.odds;
          const edge = bet.ourProb - impliedProb;

          // Value bet if edge > 5%
          if (edge > 0.05) {
            // Kelly Criterion: f* = (bp - q) / b
            // where b = odds - 1, p = our probability, q = 1 - p
            const b = bet.odds - 1;
            const kellyFraction = (b * bet.ourProb - (1 - bet.ourProb)) / b;
            // Cap Kelly at 25% for safety (quarter-Kelly)
            const kellyStake = Math.max(0, Math.min(kellyFraction * 0.25, 0.25));

            // Delete existing value bet for this match/type/bookmaker
            await db
              .delete(schema.valueBets)
              .where(
                and(
                  eq(schema.valueBets.matchId, match.id),
                  eq(schema.valueBets.betType, bet.type),
                  eq(schema.valueBets.bookmaker, bookmaker.name)
                )
              );

            await db.insert(schema.valueBets).values({
              matchId: match.id,
              betType: bet.type,
              ourProbability: String(Math.round(bet.ourProb * 10000) / 100),
              bestOdds: String(bet.odds),
              bookmaker: bookmaker.name,
              edge: String(Math.round(edge * 10000) / 100),
              kellyStake: String(Math.round(kellyStake * 10000) / 100),
              tier: 'pro',
            });

            valueBetCount++;
            console.log(
              `[Pipeline] Value bet: ${match.homeTeam} vs ${match.awayTeam} - ${bet.type} @ ${bet.odds} (edge: ${(edge * 100).toFixed(1)}%)`
            );
          }
        }
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[Pipeline] Value bet analysis error for fixture ${match.apiFootballId}: ${msg}`);
    }
  }

  console.log(`[Pipeline] Found ${valueBetCount} value bets`);
  return valueBetCount;
}

// ---------------------------------------------------------------------------
// Step 5: Notifications (placeholder for Phase 2)
// ---------------------------------------------------------------------------

async function sendNotifications(): Promise<void> {
  // TODO: Implement in Phase 2 - Push notifications via Expo Push Notifications
  console.log('[Pipeline] Notifications: skipped (not yet implemented)');
}
