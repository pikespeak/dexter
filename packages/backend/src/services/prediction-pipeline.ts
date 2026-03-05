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

import { eq, and, gte, lte, desc, inArray } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { db, schema } from '../db/index.js';
import { callFootballApi, callOddsApi } from '../lib/sports-api.js';
import { generateMatchPrediction, type PredictionResult } from './prediction-agent.js';
import { type PoissonPrediction } from './statistical-model.js';
import { resolveApiFootballSeasons } from '../utils/api-football-season.js';
import { config } from '../config.js';
import { getConfiguredLeagueIds, getConfiguredLeagues, parseLeagueIdsCsv } from './fixture-sync.js';

type FullPredictionResult = PredictionResult & { poissonBaseline?: PoissonPrediction };

interface PromptContextPayload {
  systemPrompt: string;
  userPrompt: string;
  promptHash: string;
}

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

  // Step 1: Fetch upcoming matches for the configured lookahead window
  const matches = await fetchUpcomingMatches();
  result.matchesFound = matches.length;
  console.log(`[Pipeline] Found ${matches.length} upcoming matches`);

  if (matches.length === 0) {
    console.log('[Pipeline] No upcoming matches found. Exiting.');
    return result;
  }

  // Step 2: Generate predictions for each match (sequentially to manage API rate limits)
  const predictions: Array<{ match: MatchData; prediction: FullPredictionResult }> = [];

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

function flattenApiErrors(errors: unknown): string[] {
  if (!errors) return [];

  if (Array.isArray(errors)) {
    return errors.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0);
  }

  if (typeof errors === 'object') {
    return Object.entries(errors as Record<string, unknown>)
      .filter(([, value]) => typeof value === 'string' && value.length > 0)
      .map(([key, value]) => `${key}: ${value}`);
  }

  return [];
}

function getPipelineLeagueIds(): number[] {
  const fromPipelineEnv = parseLeagueIdsCsv(config.PIPELINE_LEAGUE_IDS);
  if (fromPipelineEnv.length > 0) return fromPipelineEnv;
  return getConfiguredLeagueIds();
}

function getPipelineLeagues(): Array<{ id: number; name: string }> {
  return getConfiguredLeagues(getPipelineLeagueIds());
}

async function fetchUpcomingMatches(): Promise<MatchData[]> {
  const syncedMatches = await fetchUpcomingMatchesFromDb();
  if (syncedMatches.length > 0) {
    console.log(`[Pipeline] Using ${syncedMatches.length} upcoming matches from DB fixture sync`);
    return syncedMatches;
  }

  if (!config.PIPELINE_DIRECT_FETCH_ENABLED) {
    console.warn('[Pipeline] Direct API fallback disabled via PIPELINE_DIRECT_FETCH_ENABLED=false');
    return [];
  }

  console.warn('[Pipeline] No synced matches in DB. Falling back to direct API-Football fetch.');
  return fetchUpcomingMatchesFromApi();
}

async function fetchUpcomingMatchesFromDb(): Promise<MatchData[]> {
  const now = new Date();
  const lookaheadHours = config.PIPELINE_MATCH_LOOKAHEAD_HOURS;
  const inLookaheadWindow = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);
  const topLeagueIds = getPipelineLeagueIds();

  const matches = await db
    .select()
    .from(schema.matches)
    .where(
      and(
        gte(schema.matches.kickoff, now),
        lte(schema.matches.kickoff, inLookaheadWindow),
        eq(schema.matches.status, 'scheduled'),
        inArray(schema.matches.leagueId, topLeagueIds)
      )
    )
    .orderBy(schema.matches.kickoff);

  return matches.map((match) => ({
    fixtureId: match.apiFootballId,
    homeTeam: match.homeTeam,
    homeTeamId: match.homeTeamId,
    awayTeam: match.awayTeam,
    awayTeamId: match.awayTeamId,
    leagueId: match.leagueId,
    leagueName: match.leagueName,
    kickoff: match.kickoff,
    venue: match.venue || 'Unknown',
  }));
}

async function fetchUpcomingMatchesFromApi(): Promise<MatchData[]> {
  console.log('[Pipeline] Fetching upcoming matches from API-Football...');

  const now = new Date();
  const lookaheadHours = config.PIPELINE_MATCH_LOOKAHEAD_HOURS;
  const inLookaheadWindow = new Date(now.getTime() + lookaheadHours * 60 * 60 * 1000);
  const pipelineLeagues = getPipelineLeagues();

  const fromDate = now.toISOString().split('T')[0];
  const toDate = inLookaheadWindow.toISOString().split('T')[0];
  const seasons = resolveApiFootballSeasons(now, inLookaheadWindow);

  const requestSpecs: Array<{ league: { id: number; name: string }; season: number | null }> = [];
  for (const league of pipelineLeagues) {
    if (seasons.length === 0) {
      requestSpecs.push({ league, season: null });
      continue;
    }

    for (const season of seasons) {
      requestSpecs.push({ league, season });
    }
  }

  const allMatchesByFixtureId = new Map<number, MatchData>();

  // Fetch from each configured league/season in parallel
  const leagueResults = await Promise.allSettled(
    requestSpecs.map((requestSpec) => {
      const query: Record<string, string | number> = {
        league: requestSpec.league.id,
        from: fromDate,
        to: toDate,
        status: config.PIPELINE_API_STATUS_FILTER,
      };

      if (requestSpec.season != null) {
        query.season = requestSpec.season;
      }

      return callFootballApi('/fixtures', query);
    })
  );

  for (let i = 0; i < leagueResults.length; i++) {
    const result = leagueResults[i];
    const requestSpec = requestSpecs[i];
    const seasonLabel = requestSpec.season == null ? 'all' : String(requestSpec.season);

    if (result.status === 'rejected') {
      console.error(
        `[Pipeline] Failed to fetch ${requestSpec.league.name} (season=${seasonLabel}): ${result.reason}`
      );
      continue;
    }

    const payload = result.value.data as { response?: FixtureResponse[]; errors?: unknown };
    const apiErrors = flattenApiErrors(payload.errors);
    if (apiErrors.length > 0) {
      console.error(
        `[Pipeline] API error for ${requestSpec.league.name} (season=${seasonLabel}): ${apiErrors.join('; ')}`
      );
      continue;
    }

    const fixtures = payload.response || [];

    for (const fixture of fixtures) {
      const shortStatus = fixture.fixture.status.short?.toUpperCase();
      if (shortStatus !== 'NS' && shortStatus !== 'TBD') continue;

      allMatchesByFixtureId.set(fixture.fixture.id, {
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

  const allMatches = Array.from(allMatchesByFixtureId.values());

  // Sort by kickoff time
  allMatches.sort((a, b) => a.kickoff.getTime() - b.kickoff.getTime());

  return allMatches;
}

// ---------------------------------------------------------------------------
// Step 2: Generate Prediction
// ---------------------------------------------------------------------------

async function generatePrediction(match: MatchData): Promise<FullPredictionResult> {
  return generateMatchPrediction({
    fixtureId: match.fixtureId,
    homeTeam: match.homeTeam,
    homeTeamId: match.homeTeamId,
    awayTeam: match.awayTeam,
    awayTeamId: match.awayTeamId,
    leagueId: match.leagueId,
    leagueName: match.leagueName,
    kickoff: match.kickoff,
    venue: match.venue,
  });
}

// ---------------------------------------------------------------------------
// Step 3: Store Prediction
// ---------------------------------------------------------------------------

async function storePrediction(match: MatchData, prediction: FullPredictionResult): Promise<void> {
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

  const predictionValues = {
    predictionData: prediction.analysis as unknown as Record<string, unknown>,
    modelVersion: 'council-v1',
    confidence: String(prediction.confidence),
    homeWinProb: String(prediction.homeWinProb),
    drawProb: String(prediction.drawProb),
    awayWinProb: String(prediction.awayWinProb),
    overUnder25: prediction.overUnder25,
    overUnder25Prob: String(prediction.overUnder25Prob),
    btts: prediction.btts,
    bttsProb: String(prediction.bttsProb),
    predictedScore: prediction.predictedScore,
    // Poisson baseline (if available on the prediction object)
    ...(prediction.poissonBaseline ? {
      poissonHomeProb: String(prediction.poissonBaseline.homeWinProb),
      poissonDrawProb: String(prediction.poissonBaseline.drawProb),
      poissonAwayProb: String(prediction.poissonBaseline.awayWinProb),
      poissonOver25Prob: String(prediction.poissonBaseline.over25Prob),
      poissonBttsProb: String(prediction.poissonBaseline.bttsProb),
    } : {}),
  };

  let predictionId: string;
  let tier: 'free' | 'pro' | 'premium' = 'pro';

  if (existingPrediction.length > 0) {
    await db
      .update(schema.predictions)
      .set(predictionValues)
      .where(eq(schema.predictions.id, existingPrediction[0].id));
    predictionId = existingPrediction[0].id;
    tier = existingPrediction[0].tier;
  } else {
    const [inserted] = await db.insert(schema.predictions).values({
      matchId,
      ...predictionValues,
      tier: 'pro', // Default; will be reassigned in assignTiers()
    }).returning({
      id: schema.predictions.id,
      tier: schema.predictions.tier,
    });
    predictionId = inserted.id;
    tier = inserted.tier;
  }

  const analysis = prediction.analysis as unknown as Record<string, unknown>;
  const promptContext = extractPromptContext(analysis);
  const councilTrace = extractCouncilTrace(analysis);
  const predictionSnapshot = {
    homeWinProb: prediction.homeWinProb,
    drawProb: prediction.drawProb,
    awayWinProb: prediction.awayWinProb,
    overUnder25: prediction.overUnder25,
    overUnder25Prob: prediction.overUnder25Prob,
    btts: prediction.btts,
    bttsProb: prediction.bttsProb,
    predictedScore: prediction.predictedScore,
    confidence: prediction.confidence,
    analysis,
    poissonBaseline: prediction.poissonBaseline ?? null,
  };

  await insertPredictionVersionWithRetry({
    matchId,
    predictionId,
    modelVersion: 'council-v1',
    tier,
    promptContext,
    councilTrace,
    prediction,
    predictionSnapshot,
  });

  console.log(`[Pipeline] Stored prediction for ${match.homeTeam} vs ${match.awayTeam}`);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function extractPromptContext(analysis: Record<string, unknown>): PromptContextPayload {
  const fallback: PromptContextPayload = {
    systemPrompt: '',
    userPrompt: '',
    promptHash: '0000000000000000000000000000000000000000000000000000000000000000',
  };

  if (!isRecord(analysis.promptContext)) return fallback;
  const raw = analysis.promptContext;

  const systemPrompt = typeof raw.systemPrompt === 'string' ? raw.systemPrompt : '';
  const userPrompt = typeof raw.userPrompt === 'string' ? raw.userPrompt : '';
  const providedHash = typeof raw.promptHash === 'string' ? raw.promptHash.toLowerCase() : '';
  const computedHash = createHash('sha256')
    .update(systemPrompt)
    .update('\n\n')
    .update(userPrompt)
    .digest('hex');

  return {
    systemPrompt,
    userPrompt,
    promptHash: /^[a-f0-9]{64}$/i.test(providedHash) ? providedHash : computedHash,
  };
}

function extractCouncilTrace(analysis: Record<string, unknown>): Record<string, unknown> | null {
  if (!isRecord(analysis.council)) return null;
  return analysis.council;
}

interface InsertPredictionVersionInput {
  matchId: string;
  predictionId: string;
  modelVersion: string;
  tier: 'free' | 'pro' | 'premium';
  promptContext: PromptContextPayload;
  councilTrace: Record<string, unknown> | null;
  prediction: FullPredictionResult;
  predictionSnapshot: Record<string, unknown>;
}

async function getNextPredictionVersionNo(matchId: string): Promise<number> {
  const latest = await db
    .select({
      versionNo: schema.predictionVersions.versionNo,
    })
    .from(schema.predictionVersions)
    .where(eq(schema.predictionVersions.matchId, matchId))
    .orderBy(desc(schema.predictionVersions.versionNo))
    .limit(1);

  if (latest.length === 0) return 1;
  return latest[0].versionNo + 1;
}

async function insertPredictionVersionWithRetry(input: InsertPredictionVersionInput): Promise<void> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const versionNo = await getNextPredictionVersionNo(input.matchId);

    try {
      await db.insert(schema.predictionVersions).values({
        matchId: input.matchId,
        predictionId: input.predictionId,
        versionNo,
        modelVersion: input.modelVersion,
        tier: input.tier,
        systemPrompt: input.promptContext.systemPrompt,
        userPrompt: input.promptContext.userPrompt,
        promptHash: input.promptContext.promptHash,
        predictionSnapshot: input.predictionSnapshot,
        councilTrace: input.councilTrace,
        homeWinProb: String(input.prediction.homeWinProb),
        drawProb: String(input.prediction.drawProb),
        awayWinProb: String(input.prediction.awayWinProb),
        overUnder25: input.prediction.overUnder25,
        overUnder25Prob: String(input.prediction.overUnder25Prob),
        btts: input.prediction.btts,
        bttsProb: String(input.prediction.bttsProb),
        predictedScore: input.prediction.predictedScore,
        confidence: String(input.prediction.confidence),
      });
      return;
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      const isUniqueConflict = msg.includes('prediction_versions_match_version_unique');
      if (attempt === 0 && isUniqueConflict) continue;
      throw error;
    }
  }
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

// Edge threshold — higher than 5% to reduce false positives with uncalibrated probs
const VALUE_BET_EDGE_THRESHOLD = config.VALUE_BET_EDGE_THRESHOLD;

function parseOddsApiSportKeys(raw: string): Record<number, string> {
  const mapping: Record<number, string> = {};

  for (const pair of raw.split(',')) {
    const [leagueIdRaw, sportKeyRaw] = pair.split(':');
    if (!leagueIdRaw || !sportKeyRaw) continue;

    const leagueId = Number.parseInt(leagueIdRaw.trim(), 10);
    const sportKey = sportKeyRaw.trim();
    if (!Number.isFinite(leagueId) || leagueId <= 0 || sportKey.length === 0) continue;

    mapping[leagueId] = sportKey;
  }

  return mapping;
}

const ODDS_API_SPORT_KEYS = parseOddsApiSportKeys(config.ODDS_API_SPORT_KEYS);

interface OddsOutcome {
  name: string;
  price: number;
}

interface OddsMarket {
  key: string;
  outcomes: OddsOutcome[];
}

interface OddsBookmaker {
  key: string;
  title: string;
  markets: OddsMarket[];
}

interface OddsEvent {
  id: string;
  home_team: string;
  away_team: string;
  bookmakers: OddsBookmaker[];
}

async function runValueBetAnalysis(): Promise<number> {
  console.log('[Pipeline] Running value bet analysis...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + config.VALUE_BET_LOOKAHEAD_DAYS);

  const predictionsWithMatches = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(and(gte(schema.matches.kickoff, today), lte(schema.matches.kickoff, windowEnd)));

  // Fetch odds from The Odds API per league (much richer than API-Football odds)
  const oddsCache = new Map<number, OddsEvent[]>();
  const leagueIdSet = new Set<number>();
  for (const p of predictionsWithMatches) leagueIdSet.add(Number(p.match.leagueId));
  const leagueIds = Array.from(leagueIdSet);

  for (const leagueId of leagueIds) {
    const sportKey = ODDS_API_SPORT_KEYS[leagueId as number];
    if (!sportKey) continue;

    try {
      const oddsResult = await callOddsApi(`/sports/${sportKey}/odds`, {
        regions: config.ODDS_API_REGIONS,
        markets: config.ODDS_API_MARKETS,
        oddsFormat: config.ODDS_API_ODDS_FORMAT,
      });

      const events = (oddsResult.data as unknown) as OddsEvent[] | undefined;
      if (Array.isArray(events)) {
        oddsCache.set(leagueId, events);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.warn(`[Pipeline] The Odds API failed for league ${leagueId}: ${msg}. Falling back to API-Football odds.`);
    }
  }

  let valueBetCount = 0;

  for (const { prediction, match } of predictionsWithMatches) {
    try {
      // Try to match against The Odds API events
      const leagueEvents = oddsCache.get(Number(match.leagueId)) || [];
      const oddsEvent = findMatchingEvent(leagueEvents, match.homeTeam, match.awayTeam);

      // Build all bet candidates from our probabilities
      const betCandidates: Array<{ type: string; ourProb: number }> = [
        { type: '1X2_Home', ourProb: Number(prediction.homeWinProb) / 100 },
        { type: '1X2_Draw', ourProb: Number(prediction.drawProb) / 100 },
        { type: '1X2_Away', ourProb: Number(prediction.awayWinProb) / 100 },
      ];

      // Add O/U and BTTS if we have probabilities
      if (prediction.overUnder25Prob) {
        betCandidates.push(
          { type: 'Over_2.5', ourProb: Number(prediction.overUnder25Prob) / 100 },
          { type: 'Under_2.5', ourProb: 1 - Number(prediction.overUnder25Prob) / 100 },
        );
      }
      if (prediction.bttsProb) {
        betCandidates.push(
          { type: 'BTTS_Yes', ourProb: Number(prediction.bttsProb) / 100 },
          { type: 'BTTS_No', ourProb: 1 - Number(prediction.bttsProb) / 100 },
        );
      }

      // Find best odds across all bookmakers for each bet type
      const bestOddsMap = new Map<string, { odds: number; bookmaker: string }>();

      if (oddsEvent) {
        for (const bm of oddsEvent.bookmakers) {
          for (const market of bm.markets) {
            for (const outcome of market.outcomes) {
              const betType = mapOddsOutcomeToBetType(
                market.key, outcome.name, oddsEvent.home_team, oddsEvent.away_team,
              );
              if (!betType) continue;

              const current = bestOddsMap.get(betType);
              if (!current || outcome.price > current.odds) {
                bestOddsMap.set(betType, { odds: outcome.price, bookmaker: bm.title });
              }
            }
          }
        }
      }

      // Fallback: also check API-Football odds if The Odds API didn't cover this match
      if (bestOddsMap.size === 0) {
        try {
          const fbOdds = await callFootballApi('/odds', { fixture: match.apiFootballId });
          const fbData = (fbOdds.data as { response?: Array<{ bookmakers?: Array<{ name: string; bets: Array<{ name: string; values: Array<{ value: string; odd: string }> }> }> }> }).response;
          const fbBookmakers = fbData?.[0]?.bookmakers || [];

          for (const bm of fbBookmakers) {
            for (const bet of bm.bets || []) {
              for (const val of bet.values || []) {
                const betType = mapApiFootballBet(bet.name, val.value);
                if (!betType) continue;

                const odds = parseFloat(val.odd);
                const current = bestOddsMap.get(betType);
                if (!current || odds > current.odds) {
                  bestOddsMap.set(betType, { odds, bookmaker: bm.name });
                }
              }
            }
          }
        } catch {
          // API-Football odds also unavailable — skip
        }
      }

      // Store best bookmaker odds on the prediction for later P/L calculation
      const bestHome = bestOddsMap.get('1X2_Home');
      const bestDraw = bestOddsMap.get('1X2_Draw');
      const bestAway = bestOddsMap.get('1X2_Away');
      const bestOver = bestOddsMap.get('Over_2.5');
      const bestUnder = bestOddsMap.get('Under_2.5');
      const bestBttsYes = bestOddsMap.get('BTTS_Yes');
      const bestBttsNo = bestOddsMap.get('BTTS_No');

      await db
        .update(schema.predictions)
        .set({
          bestOddsHome: bestHome ? String(bestHome.odds) : null,
          bestOddsDraw: bestDraw ? String(bestDraw.odds) : null,
          bestOddsAway: bestAway ? String(bestAway.odds) : null,
          bestOddsOver25: bestOver ? String(bestOver.odds) : null,
          bestOddsUnder25: bestUnder ? String(bestUnder.odds) : null,
          bestOddsBttsYes: bestBttsYes ? String(bestBttsYes.odds) : null,
          bestOddsBttsNo: bestBttsNo ? String(bestBttsNo.odds) : null,
        })
        .where(eq(schema.predictions.id, prediction.id));

      // Evaluate value bets
      for (const bet of betCandidates) {
        const best = bestOddsMap.get(bet.type);
        if (!best) continue;

        const impliedProb = 1 / best.odds;
        const edge = bet.ourProb - impliedProb;

        if (edge > VALUE_BET_EDGE_THRESHOLD) {
          const b = best.odds - 1;
          const kellyFraction = (b * bet.ourProb - (1 - bet.ourProb)) / b;
          const kellyStake = Math.max(
            0,
            Math.min(kellyFraction * config.VALUE_BET_KELLY_MULTIPLIER, config.VALUE_BET_MAX_STAKE)
          );

          // Upsert value bet
          await db
            .delete(schema.valueBets)
            .where(
              and(
                eq(schema.valueBets.matchId, match.id),
                eq(schema.valueBets.betType, bet.type),
                eq(schema.valueBets.bookmaker, best.bookmaker)
              )
            );

          await db.insert(schema.valueBets).values({
            matchId: match.id,
            betType: bet.type,
            ourProbability: String(Math.round(bet.ourProb * 10000) / 100),
            bestOdds: String(best.odds),
            bookmaker: best.bookmaker,
            edge: String(Math.round(edge * 10000) / 100),
            kellyStake: String(Math.round(kellyStake * 10000) / 100),
            tier: 'pro',
          });

          valueBetCount++;
          console.log(
            `[Pipeline] Value bet: ${match.homeTeam} vs ${match.awayTeam} - ${bet.type} @ ${best.odds} (${best.bookmaker}, edge: ${(edge * 100).toFixed(1)}%)`
          );
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

/**
 * Match The Odds API event to our match by fuzzy team name matching.
 */
function findMatchingEvent(events: OddsEvent[], homeTeam: string, awayTeam: string): OddsEvent | undefined {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
  const homeNorm = normalize(homeTeam);
  const awayNorm = normalize(awayTeam);

  return events.find(e => {
    const eHome = normalize(e.home_team);
    const eAway = normalize(e.away_team);
    return (eHome.includes(homeNorm) || homeNorm.includes(eHome)) &&
           (eAway.includes(awayNorm) || awayNorm.includes(eAway));
  });
}

/**
 * Map The Odds API outcome to our bet type string.
 * For h2h markets, outcome names are team names (not Home/Draw/Away).
 */
function mapOddsOutcomeToBetType(
  marketKey: string, outcomeName: string, homeTeam?: string, awayTeam?: string,
): string | null {
  if (marketKey === 'h2h') {
    if (outcomeName === 'Draw') return '1X2_Draw';
    if (homeTeam && outcomeName === homeTeam) return '1X2_Home';
    if (awayTeam && outcomeName === awayTeam) return '1X2_Away';
    return null;
  }
  if (marketKey === 'totals') {
    if (outcomeName === 'Over') return 'Over_2.5';
    if (outcomeName === 'Under') return 'Under_2.5';
  }
  if (marketKey === 'btts') {
    if (outcomeName === 'Yes') return 'BTTS_Yes';
    if (outcomeName === 'No') return 'BTTS_No';
  }
  return null;
}

/**
 * Map API-Football bet types to our bet type string.
 */
function mapApiFootballBet(betName: string, value: string): string | null {
  if (betName === 'Match Winner' || betName === '1X2') {
    if (value === 'Home') return '1X2_Home';
    if (value === 'Draw') return '1X2_Draw';
    if (value === 'Away') return '1X2_Away';
  }
  if (betName === 'Goals Over/Under' || betName === 'Over/Under 2.5') {
    if (value === 'Over 2.5') return 'Over_2.5';
    if (value === 'Under 2.5') return 'Under_2.5';
  }
  if (betName === 'Both Teams Score') {
    if (value === 'Yes') return 'BTTS_Yes';
    if (value === 'No') return 'BTTS_No';
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 5: Notifications (placeholder for Phase 2)
// ---------------------------------------------------------------------------

async function sendNotifications(): Promise<void> {
  // TODO: Implement in Phase 2 - Push notifications via Expo Push Notifications
  console.log('[Pipeline] Notifications: skipped (not yet implemented)');
}
