/**
 * Prediction Agent - Bridge between Sports Tools and LLM
 *
 * Calls sports data APIs directly (no full agent loop),
 * then uses LLM with structured output for prediction synthesis.
 *
 * LLM model is configurable via PREDICTION_MODEL env var.
 * Supports Anthropic (claude-*), OpenAI (gpt-*), and Google (gemini-*).
 */

import { z } from 'zod';
import { callFootballApi, callOddsApi } from '../../../../src/tools/sports/api.js';

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const PREDICTION_MODEL = process.env.PREDICTION_MODEL || 'claude-sonnet-4-5-20250514';
const MAX_RETRIES = 2;

// ---------------------------------------------------------------------------
// Zod Schema for structured LLM output
// ---------------------------------------------------------------------------

export const PredictionResultSchema = z.object({
  homeWinProb: z.number().min(0).max(100),
  drawProb: z.number().min(0).max(100),
  awayWinProb: z.number().min(0).max(100),
  overUnder25: z.enum(['over', 'under']),
  btts: z.boolean(),
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

async function callLlm(messages: LlmMessage[]): Promise<string> {
  const model = PREDICTION_MODEL;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (model.startsWith('claude-')) {
        return await callAnthropic(model, messages);
      } else if (model.startsWith('gemini-')) {
        return await callGoogle(model, messages);
      } else {
        return await callOpenAI(model, messages);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`[PredictionAgent] LLM call attempt ${attempt + 1}/${MAX_RETRIES} failed: ${msg}`);
      if (attempt === MAX_RETRIES - 1) throw error;
      await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
  throw new Error('Unreachable');
}

async function callAnthropic(model: string, messages: LlmMessage[]): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

  const systemMsg = messages.find((m) => m.role === 'system');
  const userMsgs = messages.filter((m) => m.role !== 'system');

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 4096,
      ...(systemMsg ? { system: systemMsg.content } : {}),
      messages: userMsgs.map((m) => ({ role: m.role, content: m.content })),
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Anthropic API ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { content: Array<{ type: string; text: string }> };
  return data.content[0].text;
}

async function callOpenAI(model: string, messages: LlmMessage[]): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
    throw new Error(`OpenAI API ${response.status}: ${err}`);
  }

  const data = (await response.json()) as { choices: Array<{ message: { content: string } }> };
  return data.choices[0].message.content;
}

async function callGoogle(model: string, messages: LlmMessage[]): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error('GOOGLE_API_KEY not set');

  const systemMsg = messages.find((m) => m.role === 'system');
  const userMsgs = messages.filter((m) => m.role !== 'system');

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        ...(systemMsg ? { systemInstruction: { parts: [{ text: systemMsg.content }] } } : {}),
        contents: userMsgs.map((m) => ({
          role: m.role === 'user' ? 'user' : 'model',
          parts: [{ text: m.content }],
        })),
        generationConfig: {
          responseMimeType: 'application/json',
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Google API ${response.status}: ${err}`);
  }

  const data = (await response.json()) as {
    candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
  };
  return data.candidates[0].content.parts[0].text;
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
}

export async function gatherMatchData(match: MatchInput): Promise<GatheredData> {
  const season = new Date().getFullYear();

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
    // Home injuries
    callFootballApi('/injuries', {
      team: match.homeTeamId,
      season,
    }),
    // Away injuries
    callFootballApi('/injuries', {
      team: match.awayTeamId,
      season,
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
  ]);

  const extract = (r: PromiseSettledResult<{ data: Record<string, unknown> }>) =>
    r.status === 'fulfilled' ? (r.value.data as { response?: unknown }).response ?? null : null;

  return {
    homeStats: extract(results[0]),
    awayStats: extract(results[1]),
    h2h: extract(results[2]),
    homeInjuries: extract(results[3]),
    awayInjuries: extract(results[4]),
    standings: extract(results[5]),
    odds: extract(results[6]),
    apiPredictions: extract(results[7]),
  };
}

// ---------------------------------------------------------------------------
// Prediction Generation
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `You are an expert football/soccer analyst and betting advisor.
You analyze match data to generate accurate predictions with calibrated probabilities.

IMPORTANT RULES:
- Probabilities for homeWin + draw + awayWin MUST sum to exactly 100
- Confidence reflects how certain you are in your overall analysis (0-100)
- predictedScore must be in "X-Y" format (e.g., "2-1")
- Be data-driven: weigh form, H2H, injuries, home advantage, league position
- If data is missing or limited, lower your confidence accordingly

Respond ONLY with valid JSON matching this schema:
{
  "homeWinProb": number (0-100),
  "drawProb": number (0-100),
  "awayWinProb": number (0-100),
  "overUnder25": "over" | "under",
  "btts": boolean,
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

export async function generateMatchPrediction(match: MatchInput): Promise<PredictionResult> {
  console.log(`[PredictionAgent] Gathering data for ${match.homeTeam} vs ${match.awayTeam}...`);
  const data = await gatherMatchData(match);

  const prompt = buildPredictionPrompt(match, data);

  console.log(`[PredictionAgent] Calling LLM (${PREDICTION_MODEL})...`);
  const rawResponse = await callLlm([
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: prompt },
  ]);

  // Extract JSON from response (handle markdown code blocks)
  const jsonStr = rawResponse.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`Failed to parse LLM response as JSON: ${jsonStr.slice(0, 200)}`);
  }

  // Normalize probabilities to sum to 100
  const raw = parsed as Record<string, unknown>;
  const sum =
    Number(raw.homeWinProb || 0) + Number(raw.drawProb || 0) + Number(raw.awayWinProb || 0);
  if (sum > 0 && Math.abs(sum - 100) > 1) {
    const factor = 100 / sum;
    raw.homeWinProb = Math.round(Number(raw.homeWinProb || 0) * factor * 100) / 100;
    raw.drawProb = Math.round(Number(raw.drawProb || 0) * factor * 100) / 100;
    raw.awayWinProb = 100 - Number(raw.homeWinProb) - Number(raw.drawProb);
  }

  // Validate with Zod
  const result = PredictionResultSchema.parse(parsed);
  return result;
}

function buildPredictionPrompt(match: MatchInput, data: GatheredData): string {
  const sections: string[] = [
    `## Match: ${match.homeTeam} vs ${match.awayTeam}`,
    `League: ${match.leagueName} (ID: ${match.leagueId})`,
    `Fixture ID: ${match.fixtureId}`,
    '',
  ];

  if (data.homeStats) {
    sections.push('## Home Team Statistics');
    sections.push(truncateJson(data.homeStats));
    sections.push('');
  }

  if (data.awayStats) {
    sections.push('## Away Team Statistics');
    sections.push(truncateJson(data.awayStats));
    sections.push('');
  }

  if (data.h2h) {
    sections.push('## Head-to-Head History');
    sections.push(truncateJson(data.h2h));
    sections.push('');
  }

  if (data.homeInjuries) {
    sections.push('## Home Team Injuries');
    sections.push(truncateJson(data.homeInjuries));
    sections.push('');
  }

  if (data.awayInjuries) {
    sections.push('## Away Team Injuries');
    sections.push(truncateJson(data.awayInjuries));
    sections.push('');
  }

  if (data.standings) {
    sections.push('## League Standings');
    sections.push(truncateJson(data.standings));
    sections.push('');
  }

  if (data.odds) {
    sections.push('## Bookmaker Odds');
    sections.push(truncateJson(data.odds));
    sections.push('');
  }

  if (data.apiPredictions) {
    sections.push('## API-Football Predictions (baseline)');
    sections.push(truncateJson(data.apiPredictions));
    sections.push('');
  }

  sections.push('Based on all the data above, provide your match prediction as JSON.');

  return sections.join('\n');
}

function truncateJson(data: unknown, maxLength = 3000): string {
  const json = JSON.stringify(data, null, 2);
  if (json.length <= maxLength) return json;
  return json.slice(0, maxLength) + '\n... (truncated)';
}
