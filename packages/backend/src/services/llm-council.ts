import { config } from '../config.js';

export interface LlmMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CouncilMatchMeta {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  kickoff?: Date;
}

export interface CouncilModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  promptCostUsd?: number;
  completionCostUsd?: number;
  totalCostUsd?: number;
}

export interface CouncilMemberTrace {
  model: string;
  success: boolean;
  durationMs: number;
  attempts: number;
  usage?: CouncilModelUsage;
  parsedResult?: Record<string, unknown>;
  rawResponse?: string;
  parseError?: string;
  error?: string;
}

export interface CouncilTrace {
  startedAt: string;
  finishedAt: string;
  quorumRequired: number;
  memberModels: string[];
  successfulMembers: number;
  fallbackUsed: boolean;
  source: 'decider' | 'fallback';
  members: CouncilMemberTrace[];
  deciderModel: string;
  deciderDurationMs?: number;
  deciderAttempts?: number;
  deciderUsage?: CouncilModelUsage;
  deciderInput?: Record<string, unknown>;
  deciderRawResponse?: string;
  deciderParsedResult?: Record<string, unknown>;
  deciderError?: string;
  aggregation?: {
    method: 'weighted_confidence_mean';
    disagreementSpread1X2: number;
    confidencePenalty: number;
    chosenScoreModel: string;
  };
}

export interface CouncilRunInput<T extends Record<string, unknown>> {
  systemPrompt: string;
  userPrompt: string;
  matchMeta: CouncilMatchMeta;
  validateResult: (value: unknown) => T;
  modelCaller?: ModelCaller;
}

export interface CouncilRunResult<T extends Record<string, unknown>> {
  finalResult: T;
  councilTrace: CouncilTrace;
}

interface GatewayResponse {
  content: string;
  usage?: CouncilModelUsage;
  attempts: number;
}

interface ModelCallInput {
  model: string;
  messages: LlmMessage[];
  timeoutMs: number;
  maxRetries: number;
  webSearchEnabled: boolean;
  reasoningEffort: string;
}

type ModelCaller = (input: ModelCallInput) => Promise<GatewayResponse>;

interface AggregatablePrediction {
  homeWinProb: number;
  drawProb: number;
  awayWinProb: number;
  overUnder25: 'over' | 'under';
  overUnder25Prob: number;
  btts: boolean;
  bttsProb: number;
  predictedScore: string;
  confidence: number;
  analysis: Record<string, unknown>;
}

interface MemberResult<T extends Record<string, unknown>> {
  model: string;
  parsedResult: T;
  rawResponse: string;
  durationMs: number;
  attempts: number;
  usage?: CouncilModelUsage;
}

function parseJsonResponse(raw: string): unknown {
  const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  return JSON.parse(jsonStr);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toOptionalNumber(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function pickUsageNumber(source: Record<string, unknown>, keys: string[]): number | undefined {
  for (const key of keys) {
    if (key in source) {
      const parsed = toOptionalNumber(source[key]);
      if (parsed != null) return parsed;
    }
  }
  return undefined;
}

function normalize1X2(result: AggregatablePrediction): void {
  const sum = toNumber(result.homeWinProb) + toNumber(result.drawProb) + toNumber(result.awayWinProb);
  if (sum <= 0) {
    result.homeWinProb = 46;
    result.drawProb = 26;
    result.awayWinProb = 28;
    return;
  }

  const factor = 100 / sum;
  const home = Math.round(toNumber(result.homeWinProb) * factor * 100) / 100;
  const draw = Math.round(toNumber(result.drawProb) * factor * 100) / 100;
  const away = Math.round((100 - home - draw) * 100) / 100;

  result.homeWinProb = clamp(home, 0, 100);
  result.drawProb = clamp(draw, 0, 100);
  result.awayWinProb = clamp(away, 0, 100);
}

function maxSpread(values: number[]): number {
  if (values.length === 0) return 0;
  return Math.max(...values) - Math.min(...values);
}

function calculateDisagreementSpread(members: Array<MemberResult<Record<string, unknown>>>): number {
  const home = members.map((member) => toNumber(member.parsedResult.homeWinProb));
  const draw = members.map((member) => toNumber(member.parsedResult.drawProb));
  const away = members.map((member) => toNumber(member.parsedResult.awayWinProb));

  return Math.max(maxSpread(home), maxSpread(draw), maxSpread(away));
}

function buildDeciderMessages(
  systemPrompt: string,
  userPrompt: string,
  matchMeta: CouncilMatchMeta,
  members: Array<MemberResult<Record<string, unknown>>>
): LlmMessage[] {
  const memberJson = members.map((member) => ({
    model: member.model,
    result: member.parsedResult,
  }));

  const deciderInstruction = [
    'You are the final decision-maker in a football prediction council.',
    'Your job is to synthesize all member outputs and produce one final JSON answer.',
    'Respect the original schema exactly and resolve contradictions explicitly in analysis.summary and analysis.keyFactors.',
    'Do not output markdown. Return JSON only.',
  ].join(' ');

  const deciderUserPrompt = [
    `Council final decision for fixture ${matchMeta.fixtureId}: ${matchMeta.homeTeam} vs ${matchMeta.awayTeam} (${matchMeta.leagueName}).`,
    '',
    'Original prediction request:',
    userPrompt,
    '',
    'Member outputs (validated JSON):',
    JSON.stringify(memberJson, null, 2),
    '',
    'Now produce the final decision JSON.',
  ].join('\n');

  return [
    { role: 'system', content: `${systemPrompt}\n\n${deciderInstruction}` },
    { role: 'user', content: deciderUserPrompt },
  ];
}

function parseToolsEnabledBody(
  model: string,
  messages: LlmMessage[],
  webSearchEnabled: boolean,
  reasoningEffort: string,
  variant: 'full' | 'reasoning_only' | 'search_only' | 'baseline'
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };

  const includeReasoning = variant === 'full' || variant === 'reasoning_only';
  const includeSearch = webSearchEnabled && (variant === 'full' || variant === 'search_only');

  if (includeReasoning) {
    body.reasoning_effort = reasoningEffort;
    body.reasoning = { effort: reasoningEffort };
  }

  if (includeSearch) {
    body.tools = [{ type: 'perplexity_search' }];
    body.tool_choice = 'auto';
  }

  return body;
}

async function callGateway(
  model: string,
  messages: LlmMessage[],
  timeoutMs: number,
  webSearchEnabled: boolean,
  reasoningEffort: string
): Promise<{ content: string; usage?: CouncilModelUsage }> {
  const apiKey = process.env.AI_GATEWAY_API_KEY;
  if (!apiKey) throw new Error('AI_GATEWAY_API_KEY not set');

  const baseUrl = process.env.AI_GATEWAY_BASE_URL || 'https://ai-gateway.vercel.sh/v1';

  const variants: Array<'full' | 'reasoning_only' | 'search_only' | 'baseline'> =
    webSearchEnabled
      ? ['full', 'reasoning_only', 'search_only', 'baseline']
      : ['reasoning_only', 'baseline'];

  let lastError: Error | null = null;

  for (const variant of variants) {
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(parseToolsEnabledBody(model, messages, webSearchEnabled, reasoningEffort, variant)),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.text();
        lastError = new Error(`AI Gateway ${response.status} [${model}/${variant}]: ${err}`);
        continue;
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string | Array<{ type?: string; text?: string }> } }>;
        usage?: Record<string, unknown>;
      };

      const contentValue = data.choices?.[0]?.message?.content;
      const content =
        typeof contentValue === 'string'
          ? contentValue
          : Array.isArray(contentValue)
            ? contentValue.map((part) => part?.text || '').join('\n').trim()
            : '';

      if (!content) {
        lastError = new Error(`AI Gateway empty content [${model}/${variant}]`);
        continue;
      }

      const usageRecord =
        data.usage && typeof data.usage === 'object' && !Array.isArray(data.usage)
          ? (data.usage as Record<string, unknown>)
          : {};

      return {
        content,
        usage: {
          promptTokens: pickUsageNumber(usageRecord, ['prompt_tokens', 'promptTokens', 'input_tokens', 'inputTokens']),
          completionTokens: pickUsageNumber(usageRecord, ['completion_tokens', 'completionTokens', 'output_tokens', 'outputTokens']),
          totalTokens: pickUsageNumber(usageRecord, ['total_tokens', 'totalTokens', 'tokens']),
          promptCostUsd: pickUsageNumber(usageRecord, ['prompt_cost_usd', 'promptCostUsd', 'input_cost_usd', 'inputCostUsd', 'prompt_cost', 'input_cost']),
          completionCostUsd: pickUsageNumber(usageRecord, ['completion_cost_usd', 'completionCostUsd', 'output_cost_usd', 'outputCostUsd', 'completion_cost', 'output_cost']),
          totalCostUsd: pickUsageNumber(usageRecord, ['total_cost_usd', 'totalCostUsd', 'cost_usd', 'costUsd', 'total_cost', 'cost']),
        },
      };
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        lastError = new Error(`AI Gateway timeout [${model}/${variant}] after ${timeoutMs}ms`);
      } else {
        const msg = error instanceof Error ? error.message : String(error);
        lastError = new Error(`AI Gateway request failed [${model}/${variant}]: ${msg}`);
      }
    } finally {
      clearTimeout(timeoutHandle);
    }
  }

  throw lastError ?? new Error(`AI Gateway call failed for ${model}`);
}

async function callGatewayWithRetries(input: ModelCallInput): Promise<GatewayResponse> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= input.maxRetries; attempt++) {
    try {
      const result = await callGateway(
        input.model,
        input.messages,
        input.timeoutMs,
        input.webSearchEnabled,
        input.reasoningEffort,
      );

      return {
        content: result.content,
        usage: result.usage,
        attempts: attempt,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lastError = new Error(msg);
      if (attempt < input.maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, 800 * attempt));
      }
    }
  }

  throw lastError ?? new Error(`Model call failed for ${input.model}`);
}

function buildFallbackPrediction(
  members: Array<MemberResult<Record<string, unknown>>>
): {
  prediction: AggregatablePrediction;
  disagreementSpread: number;
  confidencePenalty: number;
  chosenScoreModel: string;
} {
  const weighted = members.map((member) => {
    const confidence = clamp(toNumber(member.parsedResult.confidence, 50), 20, 95);
    return { ...member, weight: confidence };
  });

  const sumWeight = weighted.reduce((acc, member) => acc + member.weight, 0);

  const weightedMean = (key: keyof AggregatablePrediction): number => {
    let weightedSum = 0;
    for (const member of weighted) {
      weightedSum += toNumber(member.parsedResult[key]) * member.weight;
    }
    return sumWeight > 0 ? weightedSum / sumWeight : 0;
  };

  const overWeight = weighted
    .filter((member) => member.parsedResult.overUnder25 === 'over')
    .reduce((acc, member) => acc + member.weight, 0);
  const underWeight = sumWeight - overWeight;

  const bttsYesWeight = weighted
    .filter((member) => Boolean(member.parsedResult.btts))
    .reduce((acc, member) => acc + member.weight, 0);
  const bttsNoWeight = sumWeight - bttsYesWeight;

  const spread = calculateDisagreementSpread(members);
  const confidencePenalty = spread > 15 ? clamp(Math.round((spread - 15) * 0.8), 0, 25) : 0;

  const homeAvg = weightedMean('homeWinProb');
  const drawAvg = weightedMean('drawProb');
  const awayAvg = weightedMean('awayWinProb');

  let chosenScoreModel = weighted[0]?.model || 'unknown';
  let closestDistance = Number.POSITIVE_INFINITY;
  for (const member of weighted) {
    const h = toNumber(member.parsedResult.homeWinProb);
    const d = toNumber(member.parsedResult.drawProb);
    const a = toNumber(member.parsedResult.awayWinProb);
    const distance = Math.abs(h - homeAvg) + Math.abs(d - drawAvg) + Math.abs(a - awayAvg);
    if (distance < closestDistance) {
      closestDistance = distance;
      chosenScoreModel = member.model;
    }
  }

  const primary = [...weighted].sort((a, b) => b.weight - a.weight)[0];

  const prediction: AggregatablePrediction = {
    homeWinProb: Math.round(homeAvg * 100) / 100,
    drawProb: Math.round(drawAvg * 100) / 100,
    awayWinProb: Math.round(awayAvg * 100) / 100,
    overUnder25: overWeight >= underWeight ? 'over' : 'under',
    overUnder25Prob: Math.round(weightedMean('overUnder25Prob') * 100) / 100,
    btts: bttsYesWeight >= bttsNoWeight,
    bttsProb: Math.round(weightedMean('bttsProb') * 100) / 100,
    predictedScore: String(
      weighted.find((member) => member.model === chosenScoreModel)?.parsedResult.predictedScore ||
      primary?.parsedResult.predictedScore ||
      '1-1'
    ),
    confidence: clamp(Math.round(weightedMean('confidence')) - confidencePenalty, 20, 95),
    analysis:
      (primary?.parsedResult.analysis && typeof primary.parsedResult.analysis === 'object'
        ? (primary.parsedResult.analysis as Record<string, unknown>)
        : {
            summary: 'Council fallback synthesis used due decider failure.',
            keyFactors: ['Council fallback path triggered'],
            homeStrengths: [],
            awayStrengths: [],
          }),
  };

  normalize1X2(prediction);

  return {
    prediction,
    disagreementSpread: spread,
    confidencePenalty,
    chosenScoreModel,
  };
}

export async function runPredictionCouncil<T extends Record<string, unknown>>(
  input: CouncilRunInput<T>
): Promise<CouncilRunResult<T>> {
  const startedAt = new Date();
  const modelCaller = input.modelCaller || callGatewayWithRetries;

  const memberModels = config.COUNCIL_MEMBER_MODELS.split(',').map((m) => m.trim()).filter(Boolean);
  const quorumRequired = clamp(config.COUNCIL_QUORUM, 1, memberModels.length);

  if (memberModels.length === 0) {
    throw new Error('COUNCIL_MEMBER_MODELS is empty');
  }

  const memberMessages: LlmMessage[] = [
    { role: 'system', content: input.systemPrompt },
    { role: 'user', content: input.userPrompt },
  ];

  const memberResults = await Promise.all(
    memberModels.map(async (model): Promise<{ trace: CouncilMemberTrace; success?: MemberResult<T> }> => {
      const memberStart = Date.now();
      try {
        const response = await modelCaller({
          model,
          messages: memberMessages,
          timeoutMs: config.COUNCIL_MEMBER_TIMEOUT_MS,
          maxRetries: config.COUNCIL_MAX_RETRIES,
          webSearchEnabled: config.COUNCIL_WEB_SEARCH_ENABLED,
          reasoningEffort: config.COUNCIL_REASONING_EFFORT,
        });

        let parsedJson: unknown;
        try {
          parsedJson = parseJsonResponse(response.content);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return {
            trace: {
              model,
              success: false,
              durationMs: Date.now() - memberStart,
              attempts: response.attempts,
              usage: response.usage,
              rawResponse: config.COUNCIL_TRACE_FULL_JSON ? response.content : undefined,
              parseError: `JSON parse failed: ${msg}`,
            },
          };
        }

        let validated: T;
        try {
          validated = input.validateResult(parsedJson);
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error);
          return {
            trace: {
              model,
              success: false,
              durationMs: Date.now() - memberStart,
              attempts: response.attempts,
              usage: response.usage,
              rawResponse: config.COUNCIL_TRACE_FULL_JSON ? response.content : undefined,
              parsedResult: config.COUNCIL_TRACE_FULL_JSON ? (parsedJson as Record<string, unknown>) : undefined,
              parseError: `Schema validation failed: ${msg}`,
            },
          };
        }

        const success: MemberResult<T> = {
          model,
          parsedResult: validated,
          rawResponse: response.content,
          durationMs: Date.now() - memberStart,
          attempts: response.attempts,
          usage: response.usage,
        };

        return {
          trace: {
            model,
            success: true,
            durationMs: success.durationMs,
            attempts: success.attempts,
            usage: success.usage,
            rawResponse: config.COUNCIL_TRACE_FULL_JSON ? success.rawResponse : undefined,
            parsedResult: config.COUNCIL_TRACE_FULL_JSON ? (success.parsedResult as Record<string, unknown>) : undefined,
          },
          success,
        };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        return {
          trace: {
            model,
            success: false,
            durationMs: Date.now() - memberStart,
            attempts: config.COUNCIL_MAX_RETRIES,
            error: msg,
          },
        };
      }
    })
  );

  const successfulMembers = memberResults
    .filter((result): result is { trace: CouncilMemberTrace; success: MemberResult<T> } => Boolean(result.success))
    .map((result) => result.success);

  if (successfulMembers.length < quorumRequired) {
    throw new Error(
      `LLM council quorum not reached: ${successfulMembers.length}/${memberModels.length} valid member results (required: ${quorumRequired})`
    );
  }

  const deciderMessages = buildDeciderMessages(
    input.systemPrompt,
    input.userPrompt,
    input.matchMeta,
    successfulMembers as Array<MemberResult<Record<string, unknown>>>
  );

  const trace: CouncilTrace = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    quorumRequired,
    memberModels,
    successfulMembers: successfulMembers.length,
    fallbackUsed: false,
    source: 'decider',
    members: memberResults.map((result) => result.trace),
    deciderModel: config.COUNCIL_DECIDER_MODEL,
    deciderInput: config.COUNCIL_TRACE_FULL_JSON
      ? {
          matchMeta: {
            fixtureId: input.matchMeta.fixtureId,
            homeTeam: input.matchMeta.homeTeam,
            awayTeam: input.matchMeta.awayTeam,
            leagueName: input.matchMeta.leagueName,
            kickoff: input.matchMeta.kickoff?.toISOString(),
          },
          members: successfulMembers.map((member) => ({
            model: member.model,
            result: member.parsedResult,
          })),
        }
      : undefined,
  };

  const deciderStart = Date.now();
  try {
    const deciderResponse = await modelCaller({
      model: config.COUNCIL_DECIDER_MODEL,
      messages: deciderMessages,
      timeoutMs: config.COUNCIL_DECIDER_TIMEOUT_MS,
      maxRetries: config.COUNCIL_MAX_RETRIES,
      webSearchEnabled: config.COUNCIL_WEB_SEARCH_ENABLED,
      reasoningEffort: config.COUNCIL_REASONING_EFFORT,
    });

    const parsedJson = parseJsonResponse(deciderResponse.content);
    const finalResult = input.validateResult(parsedJson);

    trace.deciderDurationMs = Date.now() - deciderStart;
    trace.deciderAttempts = deciderResponse.attempts;
    trace.deciderUsage = deciderResponse.usage;
    trace.deciderRawResponse = config.COUNCIL_TRACE_FULL_JSON ? deciderResponse.content : undefined;
    trace.deciderParsedResult = config.COUNCIL_TRACE_FULL_JSON ? (parsedJson as Record<string, unknown>) : undefined;
    trace.finishedAt = new Date().toISOString();

    return {
      finalResult,
      councilTrace: trace,
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    trace.fallbackUsed = true;
    trace.source = 'fallback';
    trace.deciderDurationMs = Date.now() - deciderStart;
    trace.deciderAttempts = config.COUNCIL_MAX_RETRIES;
    trace.deciderError = msg;

    const fallback = buildFallbackPrediction(
      successfulMembers as Array<MemberResult<Record<string, unknown>>>
    );

    const fallbackResult = input.validateResult(fallback.prediction);
    trace.aggregation = {
      method: 'weighted_confidence_mean',
      disagreementSpread1X2: Math.round(fallback.disagreementSpread * 100) / 100,
      confidencePenalty: fallback.confidencePenalty,
      chosenScoreModel: fallback.chosenScoreModel,
    };
    trace.finishedAt = new Date().toISOString();

    return {
      finalResult: fallbackResult,
      councilTrace: trace,
    };
  }
}

export const __testing = {
  parseJsonResponse,
  buildFallbackPrediction,
  normalize1X2,
  calculateDisagreementSpread,
};
