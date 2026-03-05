import { mkdir, open, rename, copyFile } from 'node:fs/promises';
import { isAbsolute, resolve, join } from 'node:path';
import { and, eq, inArray, ne } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { config } from '../config.js';
import { evaluatePredictionOutcome } from './result-tracker.js';

export interface MatchCsvExportOptions {
  includePending?: boolean;
  includeFinished?: boolean;
  outputDir?: string;
  outputFileName?: string;
  batchSize?: number;
  snapshotEnabled?: boolean;
  timezone?: string;
}

export interface MatchCsvExportResult {
  rows: number;
  path: string;
  durationMs: number;
  warnings: string[];
}

interface CsvRow {
  schema_version: string;
  match_id: string;
  api_football_id: number;
  prediction_id: string;
  prediction_version_id: string;
  version_no: number;
  model_version: string;
  tier: string;
  league_id: number;
  league_name: string;
  home_team: string;
  away_team: string;
  kickoff_utc: string;
  match_status: string | null;
  system_prompt: string;
  user_prompt: string;
  prompt_hash: string;
  council_source: string | null;
  fallback_used: boolean | null;
  council_disagreement: number | null;
  member_models_json: string;
  member_results_raw_json: string;
  member_results_parsed_json: string;
  decider_model: string | null;
  decider_raw_json: string;
  decider_parsed_json: string;
  usage_json: string;
  llm_call_costs_json: string;
  llm_costs_by_model_json: string;
  llm_total_cost_usd: string | null;
  llm_total_cost_source: string;
  llm_total_cost_complete: boolean;
  home_win_prob: string | null;
  draw_prob: string | null;
  away_win_prob: string | null;
  over_under_25: string | null;
  over_under_25_prob: string | null;
  btts: boolean | null;
  btts_prob: string | null;
  predicted_score: string | null;
  confidence: string;
  final_prediction_json: string;
  actual_home_score: number | null;
  actual_away_score: number | null;
  actual_result: string | null;
  predicted_outcome: string | null;
  was_correct: boolean | null;
  brier_score: number | null;
  ou_correct: boolean | null;
  btts_correct: boolean | null;
  exact_score_correct: boolean | null;
  predicted_at_utc: string;
  evaluated_at_utc: string | null;
  hours_to_kickoff: number;
  value_bets_json: string;
  value_bets_versioned: boolean;
  has_web_intel: boolean;
  has_injuries: boolean;
  has_council: boolean;
  has_prompt_context: boolean;
  has_odds: boolean;
}

interface ModelPricingUsdPer1M {
  input: number;
  output: number;
}

interface CouncilUsageMetrics {
  promptTokens: number | null;
  completionTokens: number | null;
  totalTokens: number | null;
  promptCostUsd: number | null;
  completionCostUsd: number | null;
  totalCostUsd: number | null;
}

interface CouncilCallCostEntry {
  role: 'member' | 'decider';
  model: string | null;
  prompt_tokens: number | null;
  completion_tokens: number | null;
  total_tokens: number | null;
  cost_usd: number | null;
  cost_source: 'reported' | 'estimated' | 'missing';
}

const DEFAULT_COUNCIL_MODEL_PRICING_USD_PER_1M: Record<string, ModelPricingUsdPer1M> = {
  'anthropic/claude-opus-4.6': { input: 5, output: 25 },
  'xai/grok-4': { input: 3, output: 15 },
  'google/gemini-3.1-pro-preview': { input: 2, output: 12 },
  'openai/gpt-5.2': { input: 1.75, output: 14 },
};

function roundUsd(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatUsd(value: number | null): string | null {
  return value == null ? null : value.toFixed(6);
}

function normalizeModelPricing(value: unknown): ModelPricingUsdPer1M | null {
  if (!isRecord(value)) return null;

  const input = toNumber(value.input);
  const output = toNumber(value.output);
  if (input == null || output == null || input < 0 || output < 0) return null;

  return { input, output };
}

function parseModelPricingConfig(
  raw: string,
  warnings: string[],
): Record<string, ModelPricingUsdPer1M> {
  const normalizedRaw = raw.trim();
  if (!normalizedRaw) {
    return { ...DEFAULT_COUNCIL_MODEL_PRICING_USD_PER_1M };
  }

  try {
    const parsed = JSON.parse(normalizedRaw);
    if (!isRecord(parsed)) {
      warnings.push('COUNCIL_MODEL_PRICING_USD_PER_1M is not a JSON object; using defaults.');
      return { ...DEFAULT_COUNCIL_MODEL_PRICING_USD_PER_1M };
    }

    const merged: Record<string, ModelPricingUsdPer1M> = {
      ...DEFAULT_COUNCIL_MODEL_PRICING_USD_PER_1M,
    };
    for (const [model, value] of Object.entries(parsed)) {
      const normalized = normalizeModelPricing(value);
      if (normalized) {
        merged[model] = normalized;
      }
    }

    return merged;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    warnings.push(`COUNCIL_MODEL_PRICING_USD_PER_1M parse failed (${msg}); using defaults.`);
    return { ...DEFAULT_COUNCIL_MODEL_PRICING_USD_PER_1M };
  }
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function jsonStringify(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function csvEscape(value: unknown): string {
  if (value == null) return '';
  const stringValue = String(value);
  if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n') || stringValue.includes('\r')) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function rowToCsvLine(row: CsvRow): string {
  return CSV_COLUMNS.map((column) => csvEscape(row[column])).join(',');
}

function getPredictedOutcome(homeProb: number, drawProb: number, awayProb: number): 'home' | 'draw' | 'away' {
  if (homeProb >= drawProb && homeProb >= awayProb) return 'home';
  if (awayProb >= homeProb && awayProb >= drawProb) return 'away';
  return 'draw';
}

function computeHoursToKickoff(predictedAt: Date, kickoffAt: Date): number {
  return Math.round(((kickoffAt.getTime() - predictedAt.getTime()) / 36e5) * 1000) / 1000;
}

function resolveOutputDir(raw: string): string {
  if (isAbsolute(raw)) return raw;
  if (raw.startsWith('output/')) {
    return resolve(process.cwd(), '../../', raw);
  }
  return resolve(process.cwd(), raw);
}

function pickNumber(source: Record<string, unknown>, keys: string[]): number | null {
  for (const key of keys) {
    if (key in source) {
      const parsed = toNumber(source[key]);
      if (parsed != null) return parsed;
    }
  }
  return null;
}

function parseCouncilUsageMetrics(usage: unknown): CouncilUsageMetrics {
  if (!isRecord(usage)) {
    return {
      promptTokens: null,
      completionTokens: null,
      totalTokens: null,
      promptCostUsd: null,
      completionCostUsd: null,
      totalCostUsd: null,
    };
  }

  const promptTokens = pickNumber(usage, ['promptTokens', 'prompt_tokens', 'inputTokens', 'input_tokens']);
  const completionTokens = pickNumber(usage, ['completionTokens', 'completion_tokens', 'outputTokens', 'output_tokens']);
  const totalTokens = pickNumber(usage, ['totalTokens', 'total_tokens', 'tokens']);

  const promptCostUsd = pickNumber(usage, [
    'promptCostUsd',
    'prompt_cost_usd',
    'inputCostUsd',
    'input_cost_usd',
    'prompt_cost',
    'input_cost',
  ]);
  const completionCostUsd = pickNumber(usage, [
    'completionCostUsd',
    'completion_cost_usd',
    'outputCostUsd',
    'output_cost_usd',
    'completion_cost',
    'output_cost',
  ]);
  const totalCostUsd = pickNumber(usage, [
    'totalCostUsd',
    'total_cost_usd',
    'costUsd',
    'cost_usd',
    'total_cost',
    'cost',
  ]);

  return {
    promptTokens,
    completionTokens,
    totalTokens,
    promptCostUsd,
    completionCostUsd,
    totalCostUsd,
  };
}

function estimateCallCost(
  role: 'member' | 'decider',
  model: string | null,
  usage: unknown,
  pricingByModel: Record<string, ModelPricingUsdPer1M>,
): CouncilCallCostEntry {
  const usageMetrics = parseCouncilUsageMetrics(usage);

  let costUsd: number | null = null;
  let costSource: CouncilCallCostEntry['cost_source'] = 'missing';

  if (usageMetrics.totalCostUsd != null) {
    costUsd = roundUsd(usageMetrics.totalCostUsd);
    costSource = 'reported';
  } else if (usageMetrics.promptCostUsd != null || usageMetrics.completionCostUsd != null) {
    const promptCost = usageMetrics.promptCostUsd ?? 0;
    const completionCost = usageMetrics.completionCostUsd ?? 0;
    costUsd = roundUsd(promptCost + completionCost);
    costSource = 'reported';
  } else if (model && pricingByModel[model]) {
    const pricing = pricingByModel[model];

    if (usageMetrics.promptTokens != null || usageMetrics.completionTokens != null) {
      const promptTokens = usageMetrics.promptTokens ?? 0;
      const completionTokens = usageMetrics.completionTokens ?? 0;
      const promptCost = (promptTokens / 1_000_000) * pricing.input;
      const completionCost = (completionTokens / 1_000_000) * pricing.output;
      costUsd = roundUsd(promptCost + completionCost);
      costSource = 'estimated';
    } else if (usageMetrics.totalTokens != null) {
      const avgRate = (pricing.input + pricing.output) / 2;
      costUsd = roundUsd((usageMetrics.totalTokens / 1_000_000) * avgRate);
      costSource = 'estimated';
    }
  }

  return {
    role,
    model,
    prompt_tokens: usageMetrics.promptTokens,
    completion_tokens: usageMetrics.completionTokens,
    total_tokens: usageMetrics.totalTokens,
    cost_usd: costUsd,
    cost_source: costSource,
  };
}

function summarizeCallCosts(entries: CouncilCallCostEntry[]): {
  callCosts: CouncilCallCostEntry[];
  costsByModel: Array<{ model: string; calls: number; total_cost_usd: number }>;
  totalCostUsd: number | null;
  totalCostSource: 'reported' | 'estimated' | 'mixed' | 'partial' | 'missing';
  totalCostComplete: boolean;
} {
  const withCost = entries.filter((entry) => entry.cost_usd != null);
  const withoutCost = entries.filter((entry) => entry.cost_usd == null);

  if (withCost.length === 0) {
    return {
      callCosts: entries,
      costsByModel: [],
      totalCostUsd: null,
      totalCostSource: 'missing',
      totalCostComplete: false,
    };
  }

  const totalCostUsd = roundUsd(withCost.reduce((sum, entry) => sum + (entry.cost_usd ?? 0), 0));
  const totalCostComplete = withoutCost.length === 0;

  const sources = new Set(withCost.map((entry) => entry.cost_source));
  let totalCostSource: 'reported' | 'estimated' | 'mixed' | 'partial' | 'missing';
  if (!totalCostComplete) {
    totalCostSource = 'partial';
  } else if (sources.size === 1) {
    totalCostSource = sources.has('reported') ? 'reported' : 'estimated';
  } else {
    totalCostSource = 'mixed';
  }

  const byModelMap = new Map<string, { calls: number; totalCostUsd: number }>();
  for (const entry of withCost) {
    if (!entry.model || entry.cost_usd == null) continue;
    const current = byModelMap.get(entry.model) ?? { calls: 0, totalCostUsd: 0 };
    current.calls += 1;
    current.totalCostUsd += entry.cost_usd;
    byModelMap.set(entry.model, current);
  }

  const costsByModel = [...byModelMap.entries()]
    .map(([model, value]) => ({
      model,
      calls: value.calls,
      total_cost_usd: roundUsd(value.totalCostUsd),
    }))
    .sort((a, b) => a.model.localeCompare(b.model));

  return {
    callCosts: entries,
    costsByModel,
    totalCostUsd,
    totalCostSource,
    totalCostComplete,
  };
}

function extractCouncilFields(
  councilTrace: unknown,
  pricingByModel: Record<string, ModelPricingUsdPer1M> = DEFAULT_COUNCIL_MODEL_PRICING_USD_PER_1M,
): {
  source: string | null;
  fallbackUsed: boolean | null;
  disagreement: number | null;
  memberModels: unknown[];
  memberRaw: unknown[];
  memberParsed: unknown[];
  deciderModel: string | null;
  deciderRaw: unknown;
  deciderParsed: unknown;
  usage: Record<string, unknown>;
  callCosts: CouncilCallCostEntry[];
  costsByModel: Array<{ model: string; calls: number; total_cost_usd: number }>;
  totalCostUsd: number | null;
  totalCostSource: 'reported' | 'estimated' | 'mixed' | 'partial' | 'missing';
  totalCostComplete: boolean;
} {
  if (!isRecord(councilTrace)) {
    return {
      source: null,
      fallbackUsed: null,
      disagreement: null,
      memberModels: [],
      memberRaw: [],
      memberParsed: [],
      deciderModel: null,
      deciderRaw: null,
      deciderParsed: null,
      usage: { members: [], decider: null },
      callCosts: [],
      costsByModel: [],
      totalCostUsd: null,
      totalCostSource: 'missing',
      totalCostComplete: false,
    };
  }

  const members = Array.isArray(councilTrace.members) ? councilTrace.members : [];
  const memberRaw = members
    .filter((m) => isRecord(m))
    .map((m) => ({ model: m.model ?? null, rawResponse: m.rawResponse ?? null }));
  const memberParsed = members
    .filter((m) => isRecord(m))
    .map((m) => ({ model: m.model ?? null, parsedResult: m.parsedResult ?? null }));
  const usageMembers = members
    .filter((m) => isRecord(m))
    .map((m) => ({ model: m.model ?? null, usage: m.usage ?? null }));

  const aggregation = isRecord(councilTrace.aggregation) ? councilTrace.aggregation : null;
  const callCosts: CouncilCallCostEntry[] = members
    .filter((m) => isRecord(m))
    .map((m) => estimateCallCost(
      'member',
      typeof m.model === 'string' ? m.model : null,
      m.usage,
      pricingByModel,
    ));

  if (isRecord(councilTrace) && typeof councilTrace.deciderModel === 'string') {
    callCosts.push(estimateCallCost('decider', councilTrace.deciderModel, councilTrace.deciderUsage, pricingByModel));
  }

  const costSummary = summarizeCallCosts(callCosts);

  return {
    source: typeof councilTrace.source === 'string' ? councilTrace.source : null,
    fallbackUsed: typeof councilTrace.fallbackUsed === 'boolean' ? councilTrace.fallbackUsed : null,
    disagreement:
      aggregation && typeof aggregation.disagreementSpread1X2 === 'number'
        ? aggregation.disagreementSpread1X2
        : null,
    memberModels: Array.isArray(councilTrace.memberModels) ? councilTrace.memberModels : [],
    memberRaw,
    memberParsed,
    deciderModel: typeof councilTrace.deciderModel === 'string' ? councilTrace.deciderModel : null,
    deciderRaw: councilTrace.deciderRawResponse ?? null,
    deciderParsed: councilTrace.deciderParsedResult ?? null,
    usage: {
      members: usageMembers,
      decider: councilTrace.deciderUsage ?? null,
    },
    callCosts: costSummary.callCosts,
    costsByModel: costSummary.costsByModel,
    totalCostUsd: costSummary.totalCostUsd,
    totalCostSource: costSummary.totalCostSource,
    totalCostComplete: costSummary.totalCostComplete,
  };
}

const CSV_COLUMNS: Array<keyof CsvRow> = [
  'schema_version',
  'match_id',
  'api_football_id',
  'prediction_id',
  'prediction_version_id',
  'version_no',
  'model_version',
  'tier',
  'league_id',
  'league_name',
  'home_team',
  'away_team',
  'kickoff_utc',
  'match_status',
  'system_prompt',
  'user_prompt',
  'prompt_hash',
  'council_source',
  'fallback_used',
  'council_disagreement',
  'member_models_json',
  'member_results_raw_json',
  'member_results_parsed_json',
  'decider_model',
  'decider_raw_json',
  'decider_parsed_json',
  'usage_json',
  'llm_call_costs_json',
  'llm_costs_by_model_json',
  'llm_total_cost_usd',
  'llm_total_cost_source',
  'llm_total_cost_complete',
  'home_win_prob',
  'draw_prob',
  'away_win_prob',
  'over_under_25',
  'over_under_25_prob',
  'btts',
  'btts_prob',
  'predicted_score',
  'confidence',
  'final_prediction_json',
  'actual_home_score',
  'actual_away_score',
  'actual_result',
  'predicted_outcome',
  'was_correct',
  'brier_score',
  'ou_correct',
  'btts_correct',
  'exact_score_correct',
  'predicted_at_utc',
  'evaluated_at_utc',
  'hours_to_kickoff',
  'value_bets_json',
  'value_bets_versioned',
  'has_web_intel',
  'has_injuries',
  'has_council',
  'has_prompt_context',
  'has_odds',
];

export async function exportMatchPredictionVersionsCsv(options: MatchCsvExportOptions = {}): Promise<MatchCsvExportResult> {
  const startedAt = Date.now();
  const warnings: string[] = [];

  const includePending = options.includePending ?? config.MATCH_CSV_EXPORT_INCLUDE_PENDING;
  const includeFinished = options.includeFinished ?? config.MATCH_CSV_EXPORT_INCLUDE_FINISHED;
  const rawOutputDir = options.outputDir ?? config.MATCH_CSV_EXPORT_DIR;
  const outputFileName = options.outputFileName ?? config.MATCH_CSV_EXPORT_FILENAME;
  const batchSize = options.batchSize ?? 500;
  const snapshotEnabled = options.snapshotEnabled ?? config.MATCH_CSV_EXPORT_SNAPSHOT_ENABLED;
  const timezone = options.timezone ?? config.MATCH_CSV_EXPORT_TIMEZONE;
  const pricingByModel = parseModelPricingConfig(config.COUNCIL_MODEL_PRICING_USD_PER_1M, warnings);

  if (!includePending && !includeFinished) {
    throw new Error('MATCH_CSV export disabled by filters: includePending=false and includeFinished=false');
  }

  if (timezone.toUpperCase() !== 'UTC') {
    warnings.push(`Non-UTC timezone requested (${timezone}); exporter currently writes UTC timestamps.`);
  }

  const outputDir = resolveOutputDir(rawOutputDir);
  const finalPath = join(outputDir, outputFileName);
  const tmpPath = join(outputDir, `${outputFileName}.tmp-${Date.now()}`);

  await mkdir(outputDir, { recursive: true });

  const file = await open(tmpPath, 'w');
  let rowsWritten = 0;

  try {
    await file.write(`${CSV_COLUMNS.join(',')}\n`);

    let offset = 0;

    while (true) {
      let whereClause: ReturnType<typeof and> | undefined;
      if (includeFinished && !includePending) {
        whereClause = and(eq(schema.matches.status, 'finished'));
      } else if (!includeFinished && includePending) {
        whereClause = and(ne(schema.matches.status, 'finished'));
      }

      const query = db
        .select({
          predictionVersion: schema.predictionVersions,
          match: schema.matches,
          performance: schema.performance,
        })
        .from(schema.predictionVersions)
        .innerJoin(schema.matches, eq(schema.predictionVersions.matchId, schema.matches.id))
        .leftJoin(schema.performance, eq(schema.performance.predictionId, schema.predictionVersions.predictionId))
        .orderBy(schema.predictionVersions.createdAt, schema.predictionVersions.id)
        .limit(batchSize)
        .offset(offset);

      const batch = whereClause ? await query.where(whereClause) : await query;

      if (batch.length === 0) break;

      const matchIds = [...new Set(batch.map((row) => row.match.id))];
      const valueBets = matchIds.length > 0
        ? await db
          .select()
          .from(schema.valueBets)
          .where(inArray(schema.valueBets.matchId, matchIds))
        : [];

      const valueBetsMap = new Map<string, unknown[]>();
      for (const bet of valueBets) {
        const existing = valueBetsMap.get(bet.matchId) || [];
        existing.push(bet);
        valueBetsMap.set(bet.matchId, existing);
      }

      for (const row of batch) {
        const match = row.match;
        const version = row.predictionVersion;
        const performance = row.performance;

        const predictionSnapshot = isRecord(version.predictionSnapshot)
          ? version.predictionSnapshot
          : {};

        const analysis = isRecord(predictionSnapshot.analysis)
          ? predictionSnapshot.analysis
          : {};

        const council = extractCouncilFields(version.councilTrace, pricingByModel);

        let predictedOutcome: string | null = null;
        let wasCorrect: boolean | null = null;
        let brierScore: number | null = null;
        let ouCorrect: boolean | null = null;
        let bttsCorrect: boolean | null = null;
        let exactScoreCorrect: boolean | null = null;

        if (match.homeScore != null && match.awayScore != null) {
          const outcome = evaluatePredictionOutcome(
            {
              homeWinProb: version.homeWinProb,
              drawProb: version.drawProb,
              awayWinProb: version.awayWinProb,
              overUnder25: version.overUnder25,
              btts: version.btts,
              predictedScore: version.predictedScore,
              bestOddsHome: null,
              bestOddsDraw: null,
              bestOddsAway: null,
            },
            match.homeScore,
            match.awayScore,
          );

          predictedOutcome = outcome.predictedOutcome;
          wasCorrect = outcome.wasCorrect;
          brierScore = Math.round(outcome.brierScore * 1000000) / 1000000;
          ouCorrect = outcome.overUnderCorrect;
          bttsCorrect = outcome.bttsCorrect;
          exactScoreCorrect = outcome.exactScoreCorrect;
        } else {
          const hp = toNumber(version.homeWinProb) ?? 0;
          const dp = toNumber(version.drawProb) ?? 0;
          const ap = toNumber(version.awayWinProb) ?? 0;
          predictedOutcome = getPredictedOutcome(hp, dp, ap);
        }

        const predictedAt = version.createdAt;
        const kickoffAt = match.kickoff;

        const csvRow: CsvRow = {
          schema_version: 'match_csv_v2',
          match_id: match.id,
          api_football_id: match.apiFootballId,
          prediction_id: version.predictionId,
          prediction_version_id: version.id,
          version_no: version.versionNo,
          model_version: version.modelVersion,
          tier: version.tier,
          league_id: match.leagueId,
          league_name: match.leagueName,
          home_team: match.homeTeam,
          away_team: match.awayTeam,
          kickoff_utc: kickoffAt.toISOString(),
          match_status: match.status,
          system_prompt: version.systemPrompt,
          user_prompt: version.userPrompt,
          prompt_hash: version.promptHash,
          council_source: council.source,
          fallback_used: council.fallbackUsed,
          council_disagreement: council.disagreement,
          member_models_json: jsonStringify(council.memberModels),
          member_results_raw_json: jsonStringify(council.memberRaw),
          member_results_parsed_json: jsonStringify(council.memberParsed),
          decider_model: council.deciderModel,
          decider_raw_json: jsonStringify(council.deciderRaw),
          decider_parsed_json: jsonStringify(council.deciderParsed),
          usage_json: jsonStringify(council.usage),
          llm_call_costs_json: jsonStringify(council.callCosts),
          llm_costs_by_model_json: jsonStringify(council.costsByModel),
          llm_total_cost_usd: formatUsd(council.totalCostUsd),
          llm_total_cost_source: council.totalCostSource,
          llm_total_cost_complete: council.totalCostComplete,
          home_win_prob: version.homeWinProb,
          draw_prob: version.drawProb,
          away_win_prob: version.awayWinProb,
          over_under_25: version.overUnder25,
          over_under_25_prob: version.overUnder25Prob,
          btts: version.btts,
          btts_prob: version.bttsProb,
          predicted_score: version.predictedScore,
          confidence: version.confidence,
          final_prediction_json: jsonStringify(version.predictionSnapshot),
          actual_home_score: match.homeScore,
          actual_away_score: match.awayScore,
          actual_result: match.homeScore != null && match.awayScore != null ? `${match.homeScore}-${match.awayScore}` : null,
          predicted_outcome: predictedOutcome,
          was_correct: wasCorrect,
          brier_score: brierScore,
          ou_correct: ouCorrect,
          btts_correct: bttsCorrect,
          exact_score_correct: exactScoreCorrect,
          predicted_at_utc: predictedAt.toISOString(),
          evaluated_at_utc: toIso(performance?.evaluatedAt),
          hours_to_kickoff: computeHoursToKickoff(predictedAt, kickoffAt),
          value_bets_json: jsonStringify(valueBetsMap.get(match.id) || []),
          value_bets_versioned: false,
          has_web_intel: Boolean(analysis.webSummary) || (Array.isArray(analysis.webSignals) && analysis.webSignals.length > 0),
          has_injuries: typeof analysis.injuries === 'string' && analysis.injuries.length > 0,
          has_council: Boolean(version.councilTrace),
          has_prompt_context: version.systemPrompt.length > 0 || version.userPrompt.length > 0,
          has_odds: Boolean(predictionSnapshot.bestOddsHome || predictionSnapshot.bestOddsDraw || predictionSnapshot.bestOddsAway),
        };

        await file.write(`${rowToCsvLine(csvRow)}\n`);
        rowsWritten += 1;
      }

      offset += batch.length;
    }
  } finally {
    await file.close();
  }

  await rename(tmpPath, finalPath);

  if (snapshotEnabled) {
    const snapshotName = outputFileName.replace(/\.csv$/i, '') + `-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`;
    await copyFile(finalPath, join(outputDir, snapshotName));
  }

  return {
    rows: rowsWritten,
    path: finalPath,
    durationMs: Date.now() - startedAt,
    warnings,
  };
}

export const __testing = {
  csvEscape,
  rowToCsvLine,
  getPredictedOutcome,
  computeHoursToKickoff,
  extractCouncilFields,
};
