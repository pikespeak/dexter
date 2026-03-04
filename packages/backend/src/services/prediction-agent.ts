/**
 * Prediction Agent - Bridge between Sports Tools and LLM
 *
 * Calls sports data APIs directly (no full agent loop),
 * then uses LLM with structured output for prediction synthesis.
 *
 * All LLM calls go through Vercel AI Gateway (OpenAI-compatible endpoint).
 * Model is configurable via PREDICTION_MODEL env var using "provider/model" format.
 */

import { z } from 'zod';
import { callFootballApi, callOddsApi } from '../../../../src/tools/sports/api.js';
import { getSeasonYear } from '../utils/season.js';
import {
  calculatePoissonPrediction,
  extractTeamGoalStats,
  formatPoissonForPrompt,
  type PoissonPrediction,
} from './statistical-model.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PREDICTION_MODEL = process.env.PREDICTION_MODEL || 'anthropic/claude-sonnet-4-5-20250514';
const MAX_RETRIES = 2;

// Ensemble: comma-separated list of models, e.g. "anthropic/claude-sonnet-4-5-20250514,openai/gpt-4o,google/gemini-2.0-flash"
// If not set, only PREDICTION_MODEL is used (single model, no ensemble).
const ENSEMBLE_MODELS = process.env.ENSEMBLE_MODELS
  ? process.env.ENSEMBLE_MODELS.split(',').map(m => m.trim()).filter(Boolean)
  : [];

// ---------------------------------------------------------------------------
// Zod Schema for structured LLM output
// ---------------------------------------------------------------------------

export const PredictionResultSchema = z.object({
  homeWinProb: z.number().min(0).max(100),
  drawProb: z.number().min(0).max(100),
  awayWinProb: z.number().min(0).max(100),
  overUnder25: z.enum(['over', 'under']),
  overUnder25Prob: z.number().min(0).max(100),
  btts: z.boolean(),
  bttsProb: z.number().min(0).max(100),
  predictedScore: z.string().regex(/^\d+-\d+$/),
  confidence: z.number().min(0).max(100),
  analysis: z.object({
    summary: z.string(),
    keyFactors: z.array(z.string()),
    homeStrengths: z.array(z.string()),
    awayStrengths: z.array(z.string()),
    injuries: z.string().optional(),
    formAnalysis: z.string().optional(),
    headToHeadInsight: z.string().optional(),
  }),
});

export type PredictionResult = z.infer<typeof PredictionResultSchema>;

// ---------------------------------------------------------------------------
// LLM Call (direct API, no LangChain dependency)
// ---------------------------------------------------------------------------

interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

async function callGateway(model: string, messages: LlmMessage[]): Promise<string> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not set');

  const baseUrl = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({ role: m.role, content: m.content })),
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`AI Gateway ${response.status} [${model}]: ${err}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

async function callLlm(messages: LlmMessage[]): Promise<string> {
  const model = PREDICTION_MODEL;
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callGateway(model, messages);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[PredictionAgent] LLM call attempt ${attempt + 1}/${MAX_RETRIES} failed: ${msg}`);
      if (attempt === MAX_RETRIES - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

// ---------------------------------------------------------------------------
// Match Data Gathering
// ---------------------------------------------------------------------------

interface MatchInput {
  fixtureId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  leagueId: number;
  leagueName: string;
}

interface GatheredData {
  homeStats: unknown;
  awayStats: unknown;
  h2h: unknown;
  homeInjuries: unknown;
  awayInjuries: unknown;
  standings: unknown;
  odds: unknown;
  apiPredictions: unknown;
  xgData: { homeXg: Array<{ xg: string; fixture: string }>; awayXg: Array<{ xg: string; fixture: string }> } | null;
}

export async function gatherMatchData(match: MatchInput): Promise<GatheredData> {
  const season = getSeasonYear();

  // First batch: main data
  const results = await Promise.allSettled([
    // Home team stats
    callFootballApi('/teams/statistics', {
      team: match.homeTeamId,
      league: match.leagueId,
      season,
    }, { cacheable: true }),
    // Away team stats
    callFootballApi('/teams/statistics', {
      team: match.awayTeamId,
      league: match.leagueId,
      season,
    }, { cacheable: true }),
    // Head to head
    callFootballApi('/fixtures/headtohead', {
      h2h: `${match.homeTeamId}-${match.awayTeamId}`,
      last: 10,
    }, { cacheable: true }),
    // Fixture-specific injuries (more relevant than season-wide)
    callFootballApi('/injuries', {
      fixture: match.fixtureId,
    }),
    // League standings
    callFootballApi('/standings', {
      league: match.leagueId,
      season,
    }, { cacheable: true }),
    // Odds from API-Football
    callFootballApi('/odds', {
      fixture: match.fixtureId,
    }),
    // API-Football's own predictions
    callFootballApi('/predictions', {
      fixture: match.fixtureId,
    }),
    // Recent fixtures for home team (for xG extraction)
    callFootballApi('/fixtures', {
      team: match.homeTeamId,
      last: 5,
    }, { cacheable: true }),
    // Recent fixtures for away team (for xG extraction)
    callFootballApi('/fixtures', {
      team: match.awayTeamId,
      last: 5,
    }, { cacheable: true }),
  ]);

  const extract = (r: PromiseSettledResult<{ data: Record<string, unknown> }>) =>
    r.status === 'fulfilled' ? (r.value.data as { response?: unknown }).response ?? null : null;

  // Fixture-specific injuries: split into home/away based on team
  const allInjuries = extract(results[3]) as Array<{ player: unknown; team: { id: number } }> | null;
  const homeInjuries = allInjuries?.filter(i => i.team?.id === match.homeTeamId) ?? null;
  const awayInjuries = allInjuries?.filter(i => i.team?.id === match.awayTeamId) ?? null;

  // Extract xG from recent fixtures
  const xgData = await extractXgFromFixtures(
    extract(results[7]),
    extract(results[8]),
    match.homeTeamId,
    match.awayTeamId,
    match.homeTeam,
    match.awayTeam,
  );

  return {
    homeStats: extract(results[0]),
    awayStats: extract(results[1]),
    h2h: extract(results[2]),
    homeInjuries,
    awayInjuries,
    standings: extract(results[4]),
    odds: extract(results[5]),
    apiPredictions: extract(results[6]),
    xgData,
  };
}

/**
 * Fetch xG statistics for recent fixtures of both teams.
 * Calls /fixtures/statistics for each recent fixture to get Expected Goals.
 */
async function extractXgFromFixtures(
  homeFixtures: unknown,
  awayFixtures: unknown,
  homeTeamId: number,
  awayTeamId: number,
  homeTeamName: string,
  awayTeamName: string,
): Promise<GatheredData['xgData']> {
  const homeFixtureIds = extractFixtureIds(homeFixtures);
  const awayFixtureIds = extractFixtureIds(awayFixtures);

  if (homeFixtureIds.length === 0 && awayFixtureIds.length === 0) return null;

  // Fetch statistics for all fixtures in parallel
  const allIds = [...homeFixtureIds, ...awayFixtureIds];
  const statsResults = await Promise.allSettled(
    allIds.map(id => callFootballApi('/fixtures/statistics', { fixture: id }, { cacheable: true }))
  );

  const homeXg: Array<{ xg: string; fixture: string }> = [];
  const awayXg: Array<{ xg: string; fixture: string }> = [];

  for (let i = 0; i < allIds.length; i++) {
    const result = statsResults[i];
    if (result.status !== 'fulfilled') continue;

    const stats = (result.value.data as { response?: Array<{ team: { id: number }; statistics: Array<{ type: string; value: unknown }> }> }).response;
    if (!stats) continue;

    for (const teamStats of stats) {
      const xgStat = teamStats.statistics?.find(s => s.type === 'Expected Goals' || s.type === 'expected_goals');
      if (!xgStat || xgStat.value == null) continue;

      const xgValue = String(xgStat.value);
      const isHomeTeam = teamStats.team.id === homeTeamId;
      const isAwayTeam = teamStats.team.id === awayTeamId;

      if (isHomeTeam && i < homeFixtureIds.length) {
        homeXg.push({ xg: xgValue, fixture: `Fixture #${allIds[i]}` });
      } else if (isAwayTeam && i >= homeFixtureIds.length) {
        awayXg.push({ xg: xgValue, fixture: `Fixture #${allIds[i]}` });
      }
    }
  }

  return (homeXg.length > 0 || awayXg.length > 0) ? { homeXg, awayXg } : null;
}

function extractFixtureIds(fixtures: unknown): number[] {
  if (!Array.isArray(fixtures)) return [];
  return fixtures
    .map((f: Record<string, unknown>) => (f.fixture as Record<string, unknown>)?.id as number)
    .filter((id): id is number => typeof id === 'number')
    .slice(0, 5);
}

// ---------------------------------------------------------------------------
// Prediction Generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert football/soccer analyst producing calibrated probability estimates.

## BASE RATES (Top 5 European Leagues Average)
Use these as your starting point and adjust based on match-specific data:
- Home Win: ~46%, Draw: ~26%, Away Win: ~28%
- Over 2.5 Goals: ~52%, Under 2.5 Goals: ~48%
- BTTS Yes: ~49%, BTTS No: ~51%
- Average goals per match: ~2.7

## CALIBRATION RULES
1. Probabilities for homeWin + draw + awayWin MUST sum to exactly 100.
2. Every outcome must have at least 5% probability (no outcome is impossible).
3. overUnder25Prob: probability of OVER 2.5 goals (0-100). bttsProb: probability of BTTS Yes (0-100).
4. Home advantage is worth approximately +8-12% to home win probability.
5. Recent form (last 5 games) can shift probabilities by max ±10%.
6. Key player injuries shift probabilities by ±3-8% depending on player importance.
7. H2H records: weight recent meetings (last 2-3 years) more heavily.
8. League position difference: large gaps (>10 positions) can shift ±5-10%.
9. Confidence (0-100): reflects data quality and prediction certainty.
   - <40: Limited data, stick close to base rates.
   - 40-60: Some data, moderate adjustments.
   - 60-80: Good data, stronger adjustments justified.
   - >80: Exceptional data convergence (rare).
10. When a statistical baseline (Poisson model) is provided, use it as your anchor and adjust with qualitative factors.

## IMPORTANT
- Be data-driven. Do NOT over-adjust from base rates without strong evidence.
- If data is missing or contradictory, stay closer to base rates and lower confidence.
- predictedScore must be in "X-Y" format consistent with your probability estimates.

Respond ONLY with valid JSON matching this schema:
{
  "homeWinProb": number (0-100),
  "drawProb": number (0-100),
  "awayWinProb": number (0-100),
  "overUnder25": "over" | "under",
  "overUnder25Prob": number (0-100, probability of OVER 2.5),
  "btts": boolean,
  "bttsProb": number (0-100, probability of BTTS Yes),
  "predictedScore": "X-Y",
  "confidence": number (0-100),
  "analysis": {
    "summary": "Brief prediction summary",
    "keyFactors": ["factor1", "factor2", ...],
    "homeStrengths": ["strength1", ...],
    "awayStrengths": ["strength1", ...],
    "injuries": "Impact of injuries on the match",
    "formAnalysis": "Recent form analysis",
    "headToHeadInsight": "H2H pattern insights"
  }
}`;

export async function generateMatchPrediction(match: MatchInput): Promise<PredictionResult & { poissonBaseline?: PoissonPrediction }> {
  console.log(`[PredictionAgent] Gathering data for ${match.homeTeam} vs ${match.awayTeam}...`);
  const data = await gatherMatchData(match);

  // Calculate Poisson baseline from team stats
  let poissonBaseline: PoissonPrediction | undefined;
  const homeGoalStats = extractTeamGoalStats(data.homeStats);
  const awayGoalStats = extractTeamGoalStats(data.awayStats);

  if (homeGoalStats && awayGoalStats) {
    poissonBaseline = calculatePoissonPrediction(homeGoalStats, awayGoalStats);
    console.log(`[PredictionAgent] Poisson baseline: H${poissonBaseline.homeWinProb}% D${poissonBaseline.drawProb}% A${poissonBaseline.awayWinProb}% | O2.5:${poissonBaseline.over25Prob}% BTTS:${poissonBaseline.bttsProb}%`);
  } else {
    console.log(`[PredictionAgent] Insufficient stats for Poisson model — LLM will use base rates only`);
  }

  const prompt = buildPredictionPrompt(match, data, poissonBaseline);
  const messages: LlmMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ];

  // Ensemble mode: call multiple models in parallel
  let parsed: unknown;
  if (ENSEMBLE_MODELS.length >= 2) {
    parsed = await runEnsemblePrediction(messages, ENSEMBLE_MODELS);
  } else {
    console.log(`[PredictionAgent] Calling LLM (${PREDICTION_MODEL})...`);
    const rawResponse = await callLlm(messages);
    parsed = parseLlmResponse(rawResponse);
  }

  // Normalize and fill defaults
  const raw = parsed as Record<string, unknown>;
  normalizeProbabilities(raw);
  fillDefaultProbs(raw, poissonBaseline);

  const result = PredictionResultSchema.parse(parsed);
  return { ...result, poissonBaseline };
}

/**
 * Run multiple LLMs in parallel and average their probability estimates.
 * Analysis text is taken from the primary (first) model.
 * If models strongly diverge (>15% spread on any outcome), confidence is reduced.
 */
async function runEnsemblePrediction(messages: LlmMessage[], models: string[]): Promise<unknown> {
  console.log(`[PredictionAgent] Ensemble mode: calling ${models.length} models: ${models.join(', ')}`);

  const results = await Promise.allSettled(
    models.map(async (model) => {
      const rawResponse = await callLlmWithModel(model, messages);
      return parseLlmResponse(rawResponse);
    })
  );

  const successful: Record<string, unknown>[] = [];
  for (let i = 0; i < results.length; i++) {
    if (results[i].status === 'fulfilled') {
      successful.push((results[i] as PromiseFulfilledResult<unknown>).value as Record<string, unknown>);
    } else {
      console.warn(`[PredictionAgent] Ensemble: ${models[i]} failed: ${(results[i] as PromiseRejectedResult).reason}`);
    }
  }

  if (successful.length === 0) {
    throw new Error('All ensemble models failed');
  }
  if (successful.length === 1) {
    return successful[0];
  }

  // Average numeric probabilities across successful models
  const numericKeys = ['homeWinProb', 'drawProb', 'awayWinProb', 'overUnder25Prob', 'bttsProb', 'confidence'] as const;
  const averaged = { ...successful[0] }; // Take analysis from first model

  for (const key of numericKeys) {
    const values = successful.map(r => Number(r[key] || 0)).filter(v => v > 0);
    if (values.length > 0) {
      averaged[key] = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
    }
  }

  // Check divergence — if models disagree strongly, lower confidence
  const homeProbs = successful.map(r => Number(r.homeWinProb || 0));
  const drawProbs = successful.map(r => Number(r.drawProb || 0));
  const awayProbs = successful.map(r => Number(r.awayWinProb || 0));

  const maxSpread = Math.max(
    Math.max(...homeProbs) - Math.min(...homeProbs),
    Math.max(...drawProbs) - Math.min(...drawProbs),
    Math.max(...awayProbs) - Math.min(...awayProbs),
  );

  if (maxSpread > 15) {
    console.log(`[PredictionAgent] Ensemble divergence: ${maxSpread.toFixed(1)}% spread — reducing confidence`);
    averaged.confidence = Math.max(20, Number(averaged.confidence || 50) - 15);
  }

  // Majority vote for categorical fields
  const overVotes = successful.filter(r => r.overUnder25 === 'over').length;
  averaged.overUnder25 = overVotes > successful.length / 2 ? 'over' : 'under';

  const bttsVotes = successful.filter(r => r.btts === true).length;
  averaged.btts = bttsVotes > successful.length / 2;

  // Use the predicted score from the model closest to the average
  const avgHome = Number(averaged.homeWinProb);
  let closestIdx = 0;
  let closestDist = Infinity;
  for (let i = 0; i < successful.length; i++) {
    const dist = Math.abs(Number(successful[i].homeWinProb || 0) - avgHome);
    if (dist < closestDist) { closestDist = dist; closestIdx = i; }
  }
  averaged.predictedScore = successful[closestIdx].predictedScore;

  console.log(`[PredictionAgent] Ensemble result (${successful.length} models): H${averaged.homeWinProb}% D${averaged.drawProb}% A${averaged.awayWinProb}%`);
  return averaged;
}

async function callLlmWithModel(model: string, messages: LlmMessage[]): Promise<string> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      return await callGateway(model, messages);
    } catch (error) {
      if (attempt === MAX_RETRIES - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

function parseLlmResponse(rawResponse: string): unknown {
  const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${jsonStr.slice(0, 200)}`);
  }
}

function normalizeProbabilities(raw: Record<string, unknown>): void {
  const sum = Number(raw.homeWinProb || 0) + Number(raw.drawProb || 0) + Number(raw.awayWinProb || 0);
  if (sum > 0 && Math.abs(sum - 100) > 1) {
    const factor = 100 / sum;
    raw.homeWinProb = Math.round(Number(raw.homeWinProb || 0) * factor * 100) / 100;
    raw.drawProb = Math.round(Number(raw.drawProb || 0) * factor * 100) / 100;
    raw.awayWinProb = 100 - Number(raw.homeWinProb) - Number(raw.drawProb);
  }
}

function fillDefaultProbs(raw: Record<string, unknown>, poissonBaseline?: PoissonPrediction): void {
  if (raw.overUnder25Prob == null && poissonBaseline) {
    raw.overUnder25Prob = poissonBaseline.over25Prob;
  }
  if (raw.bttsProb == null && poissonBaseline) {
    raw.bttsProb = poissonBaseline.bttsProb;
  }
  if (raw.overUnder25Prob == null) {
    raw.overUnder25Prob = raw.overUnder25 === 'over' ? 55 : 45;
  }
  if (raw.bttsProb == null) {
    raw.bttsProb = raw.btts ? 55 : 45;
  }
}

function buildPredictionPrompt(match: MatchInput, data: GatheredData, poissonBaseline?: PoissonPrediction): string {
  const sections: string[] = [
    `## Match: ${match.homeTeam} vs ${match.awayTeam}`,
    `League: ${match.leagueName} (ID: ${match.leagueId})`,
    `Fixture ID: ${match.fixtureId}`,
    '',
  ];

  // Extract key stats instead of dumping raw JSON
  if (data.homeStats) {
    sections.push(`## Home Team Statistics (${match.homeTeam})`);
    sections.push(extractTeamStats(data.homeStats));
    sections.push('');
  }

  if (data.awayStats) {
    sections.push(`## Away Team Statistics (${match.awayTeam})`);
    sections.push(extractTeamStats(data.awayStats));
    sections.push('');
  }

  if (data.h2h) {
    sections.push('## Head-to-Head History');
    sections.push(extractH2H(data.h2h, match.homeTeam, match.awayTeam));
    sections.push('');
  }

  if (data.homeInjuries) {
    sections.push(`## Home Team Injuries (${match.homeTeam})`);
    sections.push(extractInjuries(data.homeInjuries));
    sections.push('');
  }

  if (data.awayInjuries) {
    sections.push(`## Away Team Injuries (${match.awayTeam})`);
    sections.push(extractInjuries(data.awayInjuries));
    sections.push('');
  }

  if (data.standings) {
    sections.push('## League Standings');
    sections.push(extractStandings(data.standings, match.homeTeamId, match.awayTeamId));
    sections.push('');
  }

  if (data.xgData) {
    sections.push('## Expected Goals (xG) — Last 5 Matches');
    sections.push(extractXgData(data.xgData, match.homeTeam, match.awayTeam));
    sections.push('');
  }

  if (data.odds) {
    sections.push('## Bookmaker Odds');
    sections.push(extractOdds(data.odds));
    sections.push('');
  }

  if (data.apiPredictions) {
    sections.push('## API-Football Predictions (baseline)');
    sections.push(extractApiPredictions(data.apiPredictions));
    sections.push('');
  }

  if (poissonBaseline) {
    sections.push(formatPoissonForPrompt(poissonBaseline));
    sections.push('');
  }

  sections.push('Based on all the data above, provide your match prediction as JSON.');

  return sections.join('\n');
}

// ---------------------------------------------------------------------------
// Smart Data Extractors — maximizes signal per token
// ---------------------------------------------------------------------------

function safe(obj: unknown, ...keys: string[]): unknown {
  let cur = obj as Record<string, unknown>;
  for (const k of keys) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[k] as Record<string, unknown>;
  }
  return cur;
}

function extractTeamStats(raw: unknown): string {
  const stats = raw as Record<string, unknown>;
  const lines: string[] = [];

  const form = safe(stats, 'form') as string | undefined;
  if (form) lines.push(`Form (last matches): ${form}`);

  const fixtures = stats.fixtures as Record<string, Record<string, number>> | undefined;
  if (fixtures) {
    const played = (fixtures.played?.total) ?? '?';
    const wins = (fixtures.wins?.total) ?? '?';
    const draws = (fixtures.draws?.total) ?? '?';
    const losses = (fixtures.loses?.total) ?? '?';
    lines.push(`Record: P${played} W${wins} D${draws} L${losses}`);
    if (fixtures.wins?.home !== undefined) {
      lines.push(`Home: W${fixtures.wins.home} D${fixtures.draws?.home ?? '?'} L${fixtures.loses?.home ?? '?'}`);
    }
    if (fixtures.wins?.away !== undefined) {
      lines.push(`Away: W${fixtures.wins.away} D${fixtures.draws?.away ?? '?'} L${fixtures.loses?.away ?? '?'}`);
    }
  }

  const goals = stats.goals as Record<string, Record<string, Record<string, unknown>>> | undefined;
  if (goals) {
    const gfTotal = safe(goals, 'for', 'total', 'total');
    const gaTotal = safe(goals, 'against', 'total', 'total');
    const gfAvg = safe(goals, 'for', 'average', 'total');
    const gaAvg = safe(goals, 'against', 'average', 'total');
    lines.push(`Goals For: ${gfTotal ?? '?'} (avg ${gfAvg ?? '?'}/game)`);
    lines.push(`Goals Against: ${gaTotal ?? '?'} (avg ${gaAvg ?? '?'}/game)`);
    const gfHome = safe(goals, 'for', 'average', 'home');
    const gaHome = safe(goals, 'against', 'average', 'home');
    const gfAway = safe(goals, 'for', 'average', 'away');
    const gaAway = safe(goals, 'against', 'average', 'away');
    if (gfHome) lines.push(`Goals Home avg: ${gfHome} for, ${gaHome} against`);
    if (gfAway) lines.push(`Goals Away avg: ${gfAway} for, ${gaAway} against`);
  }

  const cleanSheets = stats.clean_sheet as Record<string, number> | undefined;
  if (cleanSheets) {
    lines.push(`Clean Sheets: ${cleanSheets.total ?? '?'} (H:${cleanSheets.home ?? '?'} A:${cleanSheets.away ?? '?'})`);
  }

  const failedToScore = stats.failed_to_score as Record<string, number> | undefined;
  if (failedToScore) {
    lines.push(`Failed to Score: ${failedToScore.total ?? '?'} (H:${failedToScore.home ?? '?'} A:${failedToScore.away ?? '?'})`);
  }

  const biggest = stats.biggest as Record<string, unknown> | undefined;
  if (biggest) {
    const bWin = safe(biggest, 'wins', 'home') ?? safe(biggest, 'wins', 'away');
    const bLoss = safe(biggest, 'loses', 'home') ?? safe(biggest, 'loses', 'away');
    const streak = safe(biggest, 'streak', 'wins');
    if (bWin) lines.push(`Biggest Win: ${bWin}`);
    if (bLoss) lines.push(`Biggest Loss: ${bLoss}`);
    if (streak) lines.push(`Win Streak: ${streak}`);
  }

  return lines.length > 0 ? lines.join('\n') : JSON.stringify(raw).slice(0, 1500);
}

function extractH2H(raw: unknown, homeTeam: string, awayTeam: string): string {
  const matches = Array.isArray(raw) ? raw : [];
  if (matches.length === 0) return 'No H2H data available';

  let homeWins = 0, draws = 0, awayWins = 0;
  const recentResults: string[] = [];

  for (const m of matches.slice(0, 10)) {
    const hGoals = safe(m, 'goals', 'home') as number | undefined;
    const aGoals = safe(m, 'goals', 'away') as number | undefined;
    const hName = safe(m, 'teams', 'home', 'name') as string | undefined;
    const date = safe(m, 'fixture', 'date') as string | undefined;

    if (hGoals == null || aGoals == null) continue;

    const isHomeTeamHome = hName?.includes(homeTeam.split(' ')[0]);
    if (hGoals > aGoals) isHomeTeamHome ? homeWins++ : awayWins++;
    else if (hGoals < aGoals) isHomeTeamHome ? awayWins++ : homeWins++;
    else draws++;

    const dateStr = date ? date.split('T')[0] : '?';
    recentResults.push(`${dateStr}: ${hName ?? '?'} ${hGoals}-${aGoals} ${safe(m, 'teams', 'away', 'name') ?? '?'}`);
  }

  const lines = [
    `Last ${matches.length} meetings: ${homeTeam} ${homeWins}W ${draws}D ${awayWins}L`,
    'Recent:',
    ...recentResults.slice(0, 5).map(r => `  ${r}`),
  ];
  return lines.join('\n');
}

function extractInjuries(raw: unknown): string {
  const injuries = Array.isArray(raw) ? raw : [];
  if (injuries.length === 0) return 'No injuries reported';

  const lines: string[] = [];
  for (const inj of injuries.slice(0, 10)) {
    const name = safe(inj, 'player', 'name') as string | undefined;
    const type = safe(inj, 'player', 'type') as string | undefined;
    const reason = safe(inj, 'player', 'reason') as string | undefined;
    if (name) {
      lines.push(`- ${name}: ${reason || type || 'Unknown'}`);
    }
  }
  return lines.length > 0 ? lines.join('\n') : 'No injuries reported';
}

function extractStandings(raw: unknown, homeTeamId: number, awayTeamId: number): string {
  const standings = Array.isArray(raw) ? raw : [];
  if (standings.length === 0) return 'No standings data';

  // Standings response is nested: [{ league: { standings: [[...]] } }]
  const leagueStandings = safe(standings, '0', 'league', 'standings', '0') as unknown[] | undefined;
  if (!Array.isArray(leagueStandings)) return 'No standings data';

  const lines: string[] = ['Pos | Team | P | W | D | L | GF | GA | GD | Pts'];
  lines.push('--- | ---- | - | - | - | - | -- | -- | -- | ---');

  for (const entry of leagueStandings) {
    const team = entry as Record<string, unknown>;
    const teamId = safe(team, 'team', 'id') as number | undefined;
    const rank = team.rank as number;
    const name = safe(team, 'team', 'name') as string;
    const all = team.all as Record<string, number>;
    const pts = team.points as number;
    const gd = team.goalsDiff as number;
    const marker = teamId === homeTeamId || teamId === awayTeamId ? ' <<<' : '';
    lines.push(`${rank} | ${name} | ${all?.played ?? '?'} | ${all?.win ?? '?'} | ${all?.draw ?? '?'} | ${all?.lose ?? '?'} | ${safe(all, 'goals', 'for') ?? '?'} | ${safe(all, 'goals', 'against') ?? '?'} | ${gd ?? '?'} | ${pts ?? '?'}${marker}`);
  }

  return lines.join('\n');
}

function extractXgData(raw: unknown, homeTeam: string, awayTeam: string): string {
  const data = raw as { homeXg: Array<{ xg: string; fixture: string }>; awayXg: Array<{ xg: string; fixture: string }> } | null;
  if (!data) return 'No xG data available';

  const lines: string[] = [];
  if (data.homeXg?.length > 0) {
    const avgXg = data.homeXg.reduce((sum, d) => sum + parseFloat(d.xg || '0'), 0) / data.homeXg.length;
    lines.push(`${homeTeam} xG (last ${data.homeXg.length} games): avg ${avgXg.toFixed(2)}`);
    for (const g of data.homeXg) lines.push(`  ${g.fixture}: xG ${g.xg}`);
  }
  if (data.awayXg?.length > 0) {
    const avgXg = data.awayXg.reduce((sum, d) => sum + parseFloat(d.xg || '0'), 0) / data.awayXg.length;
    lines.push(`${awayTeam} xG (last ${data.awayXg.length} games): avg ${avgXg.toFixed(2)}`);
    for (const g of data.awayXg) lines.push(`  ${g.fixture}: xG ${g.xg}`);
  }
  return lines.length > 0 ? lines.join('\n') : 'No xG data available';
}

function extractOdds(raw: unknown): string {
  const data = Array.isArray(raw) ? raw : [];
  if (data.length === 0) return 'No odds data';

  const bookmakers = safe(data, '0', 'bookmakers') as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) return 'No odds data';

  // Take first 3 bookmakers for comparison
  const lines: string[] = ['Bookmaker | Home | Draw | Away'];
  lines.push('--------- | ---- | ---- | ----');

  for (const bm of bookmakers.slice(0, 5)) {
    const name = bm.name as string;
    const bets = bm.bets as Array<Record<string, unknown>> | undefined;
    const matchWinner = bets?.find((b) => b.name === 'Match Winner' || b.name === '1X2');
    if (!matchWinner) continue;

    const values = matchWinner.values as Array<{ value: string; odd: string }>;
    const home = values?.find(v => v.value === 'Home')?.odd ?? '?';
    const draw = values?.find(v => v.value === 'Draw')?.odd ?? '?';
    const away = values?.find(v => v.value === 'Away')?.odd ?? '?';
    lines.push(`${name} | ${home} | ${draw} | ${away}`);
  }

  return lines.join('\n');
}

function extractApiPredictions(raw: unknown): string {
  const preds = Array.isArray(raw) ? raw[0] : raw;
  if (!preds) return 'No API predictions';

  const lines: string[] = [];
  const predictions = safe(preds, 'predictions') as Record<string, unknown> | undefined;
  if (predictions) {
    if (predictions.winner) {
      const winner = predictions.winner as Record<string, unknown>;
      lines.push(`Predicted Winner: ${winner.name || '?'} (${winner.comment || ''})`);
    }
    if (predictions.percent) {
      const pct = predictions.percent as Record<string, string>;
      lines.push(`Win %: Home ${pct.home}, Draw ${pct.draw}, Away ${pct.away}`);
    }
    if (predictions.advice) {
      lines.push(`Advice: ${predictions.advice}`);
    }
  }

  const comparison = safe(preds, 'comparison') as Record<string, Record<string, string>> | undefined;
  if (comparison) {
    lines.push('Comparison:');
    for (const [key, val] of Object.entries(comparison)) {
      lines.push(`  ${key}: Home ${val.home}, Away ${val.away}`);
    }
  }

  return lines.length > 0 ? lines.join('\n') : JSON.stringify(preds).slice(0, 500);
}
