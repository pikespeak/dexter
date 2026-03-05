/**
 * Prediction Agent - Bridge between Sports Tools and LLM
 *
 * Calls sports data APIs directly (no full agent loop),
 * then uses LLM with structured output for prediction synthesis.
 *
 * All LLM calls go through the Vercel AI Gateway council flow.
 * Four member models vote, then a decider model synthesizes a final JSON result.
 */

import { z } from 'zod';
import { createHash } from 'node:crypto';
import { callFootballApi } from '../lib/sports-api.js';
import { getPrimaryApiFootballSeason } from '../utils/api-football-season.js';
import {
  calculatePoissonPrediction,
  extractTeamGoalStats,
  formatPoissonForPrompt,
  type PoissonPrediction,
} from './statistical-model.js';
import { applyWebIntelAdjustments, getContextEnrichment } from './web-intel/index.js';
import {
  LocationContextSchema,
  WeatherContextSchema,
  WebFeatureSnapshotSchema,
  WebSourceMetadataSchema,
  type ContextEnrichment,
} from './context-enrichment/types.js';
import { runPredictionCouncil, type CouncilTrace } from './llm-council.js';

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
    webSummary: z.string().optional(),
    webSignals: z.array(z.string()).optional(),
    webSources: z.array(WebSourceMetadataSchema).optional(),
    webFeatureSnapshot: WebFeatureSnapshotSchema.optional(),
    weatherContext: WeatherContextSchema.optional(),
    locationContext: LocationContextSchema.optional(),
    council: z.object({}).passthrough().optional(),
    councilSummary: z.string().optional(),
    councilDisagreement: z.number().min(0).max(100).optional(),
    promptContext: z.object({
      systemPrompt: z.string(),
      userPrompt: z.string(),
      promptHash: z.string().regex(/^[a-f0-9]{64}$/i),
    }).optional(),
  }),
});

export type PredictionResult = z.infer<typeof PredictionResultSchema>;

// ---------------------------------------------------------------------------
// Match Data Gathering
// ---------------------------------------------------------------------------

export interface MatchInput {
  fixtureId: number;
  homeTeam: string;
  homeTeamId: number;
  awayTeam: string;
  awayTeamId: number;
  leagueId: number;
  leagueName: string;
  kickoff?: Date;
  venue?: string;
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
  homeRecentFixtures: unknown;
  awayRecentFixtures: unknown;
}

export async function gatherMatchData(match: MatchInput): Promise<GatheredData> {
  const season = getPrimaryApiFootballSeason(match.kickoff ?? new Date());

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
    homeRecentFixtures: extract(results[7]),
    awayRecentFixtures: extract(results[8]),
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

export const SYSTEM_PROMPT = `You are an expert football/soccer analyst producing calibrated probability estimates.

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
11. If web intelligence signals are provided, treat them as secondary context; avoid large shifts unless strongly corroborated.

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
  const prepared = await preparePredictionPromptContext(match);
  console.log('[PredictionAgent] Running LLM council (4 members + decider)...');
  const councilResult = await runPredictionCouncil<PredictionResult>({
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: prepared.prompt,
    matchMeta: {
      fixtureId: match.fixtureId,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      leagueName: match.leagueName,
      kickoff: match.kickoff,
    },
    validateResult: (value) => PredictionResultSchema.parse(value),
  });

  // Apply web-intel adjustments with strict caps (if available), then normalize/fill defaults.
  const raw = structuredClone(councilResult.finalResult) as Record<string, unknown>;
  if (prepared.enrichment.webIntel) {
    applyWebIntelAdjustments(raw, prepared.enrichment.webIntel);
  }
  normalizeProbabilities(raw);
  fillDefaultProbs(raw, prepared.poissonBaseline);
  attachContextToAnalysis(raw, prepared.enrichment);
  attachCouncilToAnalysis(raw, councilResult.councilTrace);
  attachPromptContextToAnalysis(raw, SYSTEM_PROMPT, prepared.prompt);

  const result = PredictionResultSchema.parse(raw);
  return { ...result, poissonBaseline: prepared.poissonBaseline };
}

interface PreparedPredictionPromptContext {
  prompt: string;
  poissonBaseline?: PoissonPrediction;
  enrichment: ContextEnrichment;
}

async function preparePredictionPromptContext(match: MatchInput): Promise<PreparedPredictionPromptContext> {
  console.log(`[PredictionAgent] Gathering data for ${match.homeTeam} vs ${match.awayTeam}...`);
  const data = await gatherMatchData(match);

  const enrichment = await getContextEnrichment({
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    leagueName: match.leagueName,
    kickoff: match.kickoff,
    venue: match.venue,
    homeRecentFixtures: data.homeRecentFixtures,
    awayRecentFixtures: data.awayRecentFixtures,
  });

  // Calculate Poisson baseline from team stats
  let poissonBaseline: PoissonPrediction | undefined;
  const homeGoalStats = extractTeamGoalStats(data.homeStats);
  const awayGoalStats = extractTeamGoalStats(data.awayStats);

  if (homeGoalStats && awayGoalStats) {
    poissonBaseline = calculatePoissonPrediction(homeGoalStats, awayGoalStats);
    console.log(`[PredictionAgent] Poisson baseline: H${poissonBaseline.homeWinProb}% D${poissonBaseline.drawProb}% A${poissonBaseline.awayWinProb}% | O2.5:${poissonBaseline.over25Prob}% BTTS:${poissonBaseline.bttsProb}%`);
  } else {
    console.log('[PredictionAgent] Insufficient stats for Poisson model — prompt will rely on base rates');
  }

  const prompt = buildPredictionPrompt(match, data, poissonBaseline, enrichment);
  return { prompt, poissonBaseline, enrichment };
}

export async function previewMatchPredictionPrompt(match: MatchInput): Promise<{
  systemPrompt: string;
  userPrompt: string;
  poissonBaseline?: PoissonPrediction;
  context: {
    webIntelIncluded: boolean;
    weatherStatus: string;
    locationStatus: string;
  };
}> {
  const prepared = await preparePredictionPromptContext(match);
  return {
    systemPrompt: SYSTEM_PROMPT,
    userPrompt: prepared.prompt,
    poissonBaseline: prepared.poissonBaseline,
    context: {
      webIntelIncluded: Boolean(prepared.enrichment.webIntel),
      weatherStatus: prepared.enrichment.weatherContext?.status ?? 'disabled',
      locationStatus: prepared.enrichment.locationContext?.status ?? 'disabled',
    },
  };
}

export function normalizeProbabilities(raw: Record<string, unknown>): void {
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function attachContextToAnalysis(raw: Record<string, unknown>, enrichment: ContextEnrichment): void {
  if (!isRecord(raw.analysis)) return;

  if (enrichment.webIntel) {
    raw.analysis.webSummary = enrichment.webIntel.summary;
    raw.analysis.webSignals = enrichment.webIntel.signals;
    raw.analysis.webSources = enrichment.webIntel.sources;
    raw.analysis.webFeatureSnapshot = enrichment.webIntel.featureSnapshot;
  }

  if (enrichment.weatherContext) {
    raw.analysis.weatherContext = enrichment.weatherContext;
  }

  if (enrichment.locationContext) {
    raw.analysis.locationContext = enrichment.locationContext;
  }
}

function attachCouncilToAnalysis(raw: Record<string, unknown>, councilTrace: CouncilTrace): void {
  if (!isRecord(raw.analysis)) return;

  const disagreement =
    councilTrace.aggregation?.disagreementSpread1X2 != null
      ? Math.round(councilTrace.aggregation.disagreementSpread1X2 * 100) / 100
      : undefined;

  raw.analysis.council = councilTrace as unknown as Record<string, unknown>;
  raw.analysis.councilSummary =
    councilTrace.source === 'decider'
      ? `Council finalized by ${councilTrace.deciderModel} with ${councilTrace.successfulMembers}/${councilTrace.memberModels.length} valid member outputs.`
      : `Council fallback used after decider failure; synthesized from ${councilTrace.successfulMembers}/${councilTrace.memberModels.length} valid member outputs.`;
  raw.analysis.councilDisagreement = disagreement;
}

function attachPromptContextToAnalysis(raw: Record<string, unknown>, systemPrompt: string, userPrompt: string): void {
  if (!isRecord(raw.analysis)) return;

  const promptHash = createHash('sha256')
    .update(systemPrompt)
    .update('\n\n')
    .update(userPrompt)
    .digest('hex');

  raw.analysis.promptContext = {
    systemPrompt,
    userPrompt,
    promptHash,
  };
}

function extractWebIntelBlock(webIntel: ContextEnrichment['webIntel']): string {
  if (!webIntel) return 'No web-intel data';

  const lines: string[] = [];
  lines.push(`Summary: ${webIntel.summary}`);

  if (webIntel.signals.length > 0) {
    lines.push('Signals:');
    for (const signal of webIntel.signals.slice(0, 6)) {
      lines.push(`- ${signal}`);
    }
  }

  if (webIntel.sources.length > 0) {
    lines.push('Top Sources:');
    for (const source of webIntel.sources.slice(0, 5)) {
      lines.push(`- [${source.sourceType}] ${source.title} (${source.domain})`);
    }
  }

  lines.push(
    `Web feature snapshot: availability(H/A) ${webIntel.featureSnapshot.availabilityHome}/${webIntel.featureSnapshot.availabilityAway}, ` +
    `sentiment(H/A) ${webIntel.featureSnapshot.sentimentIndexHome}/${webIntel.featureSnapshot.sentimentIndexAway}, ` +
    `rest(H/A) ${webIntel.featureSnapshot.restDaysHome}/${webIntel.featureSnapshot.restDaysAway}`,
  );

  return lines.join('\n');
}

function extractWeatherContext(weatherContext: ContextEnrichment['weatherContext']): string {
  if (!weatherContext) return 'No weather context';
  if (weatherContext.status !== 'available') {
    return `Status: ${weatherContext.status}`;
  }

  return [
    `Status: ${weatherContext.status}`,
    `Temp C: ${weatherContext.temperatureC ?? '?'}`,
    `Precip mm: ${weatherContext.precipMm ?? '?'}`,
    `Wind km/h: ${weatherContext.windKph ?? '?'}`,
    `Humidity %: ${weatherContext.humidityPct ?? '?'}`,
    `Severity: ${weatherContext.weatherSeverityIndex ?? '?'}`,
    `Uncertainty: ${weatherContext.weatherUncertainty ?? '?'}`,
  ].join('\n');
}

function extractLocationContext(locationContext: ContextEnrichment['locationContext']): string {
  if (!locationContext) return 'No location context';
  if (locationContext.status !== 'available') {
    return `Status: ${locationContext.status}`;
  }

  return [
    `Status: ${locationContext.status}`,
    `Coordinates: ${locationContext.lat ?? '?'}, ${locationContext.lon ?? '?'}`,
    `Altitude m: ${locationContext.altitudeM ?? '?'}`,
    `Timezone: ${locationContext.timezone ?? '?'}`,
    `Timezone diff hours: ${locationContext.timezoneDiffHours ?? '?'}`,
    `Travel km: ${locationContext.travelDistanceKm ?? '?'}`,
    `Kickoff local hour: ${locationContext.kickoffLocalHour ?? '?'}`,
  ].join('\n');
}

function buildPredictionPrompt(
  match: MatchInput,
  data: GatheredData,
  poissonBaseline: PoissonPrediction | undefined,
  enrichment: ContextEnrichment,
): string {
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

  if (enrichment.webIntel) {
    sections.push('## Web Intelligence (News + Social Signals)');
    sections.push(extractWebIntelBlock(enrichment.webIntel));
    sections.push('');
  }

  if (enrichment.weatherContext?.status === 'available') {
    sections.push('## Weather Context');
    sections.push(extractWeatherContext(enrichment.weatherContext));
    sections.push('');
  }

  if (enrichment.locationContext?.status === 'available') {
    sections.push('## Location Context');
    sections.push(extractLocationContext(enrichment.locationContext));
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
