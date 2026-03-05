import { createHash } from 'crypto';
import { z } from 'zod';
import { cacheGet, cacheSet } from '../cache.js';
import { config } from '../../config.js';
import { buildContextPlaceholders } from '../context-enrichment/index.js';
import {
  ContextEnrichmentSchema,
  WebIntelSchema,
  type ContextEnrichment,
  type WebFeatureSnapshot,
  type WebIntel,
  type WebSourceMetadata,
} from '../context-enrichment/types.js';
import { buildWebIntelQueries } from './query-builder.js';
import { classifySourceType, inferEntityType, scoreSourceTrust } from './trust-score.js';
import type { NormalizedWebResult, TavilyResultItem } from './types-internal.js';

const TAVILY_BASE_URL = 'https://api.tavily.com/search';

const TavilyResultSchema = z.object({
  title: z.string().default('Untitled'),
  url: z.string().min(1),
  content: z.string().default(''),
  score: z.coerce.number().default(0.5),
  published_date: z.string().nullable().optional(),
  publishedAt: z.string().nullable().optional(),
});

const TavilyResponseSchema = z.object({
  results: z.array(TavilyResultSchema).default([]),
});

export interface WebIntelInput {
  homeTeam: string;
  awayTeam: string;
  leagueName: string;
  kickoff?: Date;
  homeRecentFixtures?: unknown;
  awayRecentFixtures?: unknown;
}

interface WebIntelRuntimeConfig {
  enabled: boolean;
  apiKey?: string;
  recencyHours: number;
  maxQueries: number;
  maxResults: number;
  timeoutMs: number;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function toCanonicalUrl(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const paramsToDrop = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'fbclid'];
    for (const key of paramsToDrop) {
      url.searchParams.delete(key);
    }
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function getDomain(rawUrl: string): string {
  try {
    return new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return 'unknown';
  }
}

function buildCacheKey(query: string, recencyHours: number, maxResults: number): string {
  const canonical = `${query}|r:${recencyHours}|m:${maxResults}`;
  const hash = createHash('sha1').update(canonical).digest('hex').slice(0, 16);
  return `web-intel:tavily:${hash}`;
}

function parsePublishedAt(item: z.infer<typeof TavilyResultSchema>): string | null {
  const raw = item.published_date ?? item.publishedAt ?? null;
  if (!raw) return null;
  const timestamp = Date.parse(raw);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function isWithinRecency(publishedAt: string | null, recencyHours: number): boolean {
  if (!publishedAt) return true;
  const ageMs = Date.now() - Date.parse(publishedAt);
  return ageMs <= recencyHours * 60 * 60 * 1000;
}

function sentimentFromText(text: string): number {
  const lower = text.toLowerCase();
  const positive = ['boost', 'fit', 'returns', 'available', 'confident', 'sharp', 'strong'];
  const negative = ['injury', 'injured', 'out', 'doubtful', 'suspended', 'controversy', 'fatigue', 'crisis'];

  let score = 0;
  for (const word of positive) {
    if (lower.includes(word)) score += 1;
  }
  for (const word of negative) {
    if (lower.includes(word)) score -= 1;
  }

  return clamp(score / 4, -1, 1);
}

function mentionsTeam(text: string, team: string): boolean {
  const normalizedText = text.toLowerCase();
  const normalizedTeam = team.toLowerCase();
  if (normalizedText.includes(normalizedTeam)) return true;

  const firstToken = normalizedTeam.split(' ')[0];
  return firstToken.length >= 4 && normalizedText.includes(firstToken);
}

function extractFixtureDate(fixture: unknown): Date | null {
  if (!fixture || typeof fixture !== 'object') return null;
  const rec = fixture as Record<string, unknown>;
  const fixtureObj = rec.fixture as Record<string, unknown> | undefined;
  const dateStr = fixtureObj?.date;
  if (typeof dateStr !== 'string') return null;
  const ts = Date.parse(dateStr);
  if (Number.isNaN(ts)) return null;
  return new Date(ts);
}

function calcRestDays(fixtures: unknown, kickoff?: Date): number {
  if (!kickoff || !Array.isArray(fixtures)) return 3;

  const dates = fixtures
    .map(extractFixtureDate)
    .filter((d): d is Date => d instanceof Date)
    .filter((d) => d.getTime() <= kickoff.getTime())
    .sort((a, b) => b.getTime() - a.getTime());

  if (dates.length === 0) return 3;

  const diffMs = kickoff.getTime() - dates[0].getTime();
  return clamp(Math.floor(diffMs / (24 * 60 * 60 * 1000)), 0, 14);
}

function calculateAdjustments(
  featureSnapshot: WebFeatureSnapshot,
  sourceCount: number,
  avgTrust: number,
): WebIntel['adjustments'] {
  const availabilityDelta = (featureSnapshot.availabilityHome - featureSnapshot.availabilityAway) / 100;
  const sentimentDelta = featureSnapshot.sentimentIndexHome - featureSnapshot.sentimentIndexAway;
  const restDelta = clamp((featureSnapshot.restDaysHome - featureSnapshot.restDaysAway) / 4, -1, 1);

  let homeShift =
    availabilityDelta * 2.5 +
    sentimentDelta * 1.5 +
    restDelta * 1.0 +
    (featureSnapshot.coachChangeActiveAway ? 1.5 : 0) -
    (featureSnapshot.coachChangeActiveHome ? 1.5 : 0);

  homeShift = clamp(homeShift, -4, 4);
  const awayShift = clamp(-homeShift, -4, 4);

  const controversyAvg = (featureSnapshot.controversyIndexHome + featureSnapshot.controversyIndexAway) / 2;
  const drawShift = clamp(controversyAvg * 2 - Math.abs(homeShift) * 0.2, -4, 4);

  const sentimentAvg = (featureSnapshot.sentimentIndexHome + featureSnapshot.sentimentIndexAway) / 2;
  const overUnderShift = clamp(sentimentAvg * 2 - controversyAvg * 3, -5, 5);
  const bttsShift = clamp((1 - Math.abs(availabilityDelta)) * 2 + sentimentAvg * 2 - 2, -5, 5);

  const confidenceShift = clamp(
    (sourceCount >= 3 ? 2 : 0) + avgTrust * 3 - controversyAvg * 6,
    -10,
    5,
  );

  return {
    homeShift: Math.round(homeShift * 100) / 100,
    drawShift: Math.round(drawShift * 100) / 100,
    awayShift: Math.round(awayShift * 100) / 100,
    overUnderShift: Math.round(overUnderShift * 100) / 100,
    bttsShift: Math.round(bttsShift * 100) / 100,
    confidenceShift: Math.round(confidenceShift * 100) / 100,
  };
}

function buildSignals(
  featureSnapshot: WebFeatureSnapshot,
  homeTeam: string,
  awayTeam: string,
): string[] {
  const signals: string[] = [];

  if (featureSnapshot.coachChangeActiveHome) signals.push(`${homeTeam}: recent coach change signal detected`);
  if (featureSnapshot.coachChangeActiveAway) signals.push(`${awayTeam}: recent coach change signal detected`);

  const availabilityGap = featureSnapshot.availabilityHome - featureSnapshot.availabilityAway;
  if (availabilityGap >= 12) signals.push(`${homeTeam}: healthier squad signal vs ${awayTeam}`);
  if (availabilityGap <= -12) signals.push(`${awayTeam}: healthier squad signal vs ${homeTeam}`);

  const restGap = featureSnapshot.restDaysHome - featureSnapshot.restDaysAway;
  if (Math.abs(restGap) >= 2) {
    const rested = restGap > 0 ? homeTeam : awayTeam;
    signals.push(`${rested}: rest advantage in recent schedule window`);
  }

  if (featureSnapshot.controversyIndexHome >= 0.45) signals.push(`${homeTeam}: elevated controversy/noise in recent media`);
  if (featureSnapshot.controversyIndexAway >= 0.45) signals.push(`${awayTeam}: elevated controversy/noise in recent media`);

  if (signals.length === 0) {
    signals.push('No major disruptive web signal detected in the recency window');
  }

  return signals.slice(0, 8);
}

function summarizeWebIntel(
  sourceCount: number,
  featureSnapshot: WebFeatureSnapshot,
  homeTeam: string,
  awayTeam: string,
): string {
  const availabilityGap = featureSnapshot.availabilityHome - featureSnapshot.availabilityAway;
  const sentimentGap = featureSnapshot.sentimentIndexHome - featureSnapshot.sentimentIndexAway;

  const availabilityText = availabilityGap >= 8
    ? `${homeTeam} appears more available`
    : availabilityGap <= -8
      ? `${awayTeam} appears more available`
      : 'availability signals are balanced';

  const sentimentText = sentimentGap >= 0.2
    ? `${homeTeam} has more positive sentiment`
    : sentimentGap <= -0.2
      ? `${awayTeam} has more positive sentiment`
      : 'sentiment is mixed';

  return `Web radar scanned ${sourceCount} recent sources: ${availabilityText}, and ${sentimentText}.`;
}

function extractFeatures(input: WebIntelInput, items: NormalizedWebResult[]): Pick<WebIntel, 'featureSnapshot' | 'signals' | 'summary' | 'adjustments'> {
  let availabilityHome = 100;
  let availabilityAway = 100;
  let lineupStabilityHome = 100;
  let lineupStabilityAway = 100;
  let coachChangeActiveHome = false;
  let coachChangeActiveAway = false;
  let controversyIndexHome = 0;
  let controversyIndexAway = 0;
  let sentimentSumHome = 0;
  let sentimentWeightHome = 0;
  let sentimentSumAway = 0;
  let sentimentWeightAway = 0;
  let trustSum = 0;

  const negativeAvailabilityKeywords = ['injury', 'injured', 'out', 'doubtful', 'suspended', 'absence'];
  const positiveAvailabilityKeywords = ['fit', 'returns', 'available', 'back in training'];
  const rotationKeywords = ['rotation', 'rotated', 'rested', 'benching'];
  const coachChangeKeywords = ['sacked', 'appointed', 'interim', 'new manager', 'new coach', 'new trainer'];
  const controversyKeywords = ['controversy', 'scandal', 'conflict', 'tension', 'dispute', 'criticism'];

  for (const item of items) {
    trustSum += item.trust;
    const text = item.text;
    const lower = text.toLowerCase();

    const homeMentioned = mentionsTeam(lower, input.homeTeam);
    const awayMentioned = mentionsTeam(lower, input.awayTeam);

    if (homeMentioned) {
      sentimentSumHome += item.sentiment * item.trust;
      sentimentWeightHome += item.trust;

      if (negativeAvailabilityKeywords.some((k) => lower.includes(k))) availabilityHome -= 7 * item.trust;
      if (positiveAvailabilityKeywords.some((k) => lower.includes(k))) availabilityHome += 4 * item.trust;
      if (rotationKeywords.some((k) => lower.includes(k))) lineupStabilityHome -= 5 * item.trust;
      if (coachChangeKeywords.some((k) => lower.includes(k))) {
        coachChangeActiveHome = true;
        lineupStabilityHome -= 8 * item.trust;
      }
      if (controversyKeywords.some((k) => lower.includes(k))) controversyIndexHome += 0.15 * item.trust;
    }

    if (awayMentioned) {
      sentimentSumAway += item.sentiment * item.trust;
      sentimentWeightAway += item.trust;

      if (negativeAvailabilityKeywords.some((k) => lower.includes(k))) availabilityAway -= 7 * item.trust;
      if (positiveAvailabilityKeywords.some((k) => lower.includes(k))) availabilityAway += 4 * item.trust;
      if (rotationKeywords.some((k) => lower.includes(k))) lineupStabilityAway -= 5 * item.trust;
      if (coachChangeKeywords.some((k) => lower.includes(k))) {
        coachChangeActiveAway = true;
        lineupStabilityAway -= 8 * item.trust;
      }
      if (controversyKeywords.some((k) => lower.includes(k))) controversyIndexAway += 0.15 * item.trust;
    }
  }

  const featureSnapshot: WebFeatureSnapshot = {
    availabilityHome: Math.round(clamp(availabilityHome, 0, 100) * 100) / 100,
    availabilityAway: Math.round(clamp(availabilityAway, 0, 100) * 100) / 100,
    lineupStabilityHome: Math.round(clamp(lineupStabilityHome, 0, 100) * 100) / 100,
    lineupStabilityAway: Math.round(clamp(lineupStabilityAway, 0, 100) * 100) / 100,
    coachChangeActiveHome,
    coachChangeActiveAway,
    sentimentIndexHome: Math.round(clamp(sentimentWeightHome > 0 ? sentimentSumHome / sentimentWeightHome : 0, -1, 1) * 100) / 100,
    sentimentIndexAway: Math.round(clamp(sentimentWeightAway > 0 ? sentimentSumAway / sentimentWeightAway : 0, -1, 1) * 100) / 100,
    controversyIndexHome: Math.round(clamp(controversyIndexHome, 0, 1) * 100) / 100,
    controversyIndexAway: Math.round(clamp(controversyIndexAway, 0, 1) * 100) / 100,
    restDaysHome: calcRestDays(input.homeRecentFixtures, input.kickoff),
    restDaysAway: calcRestDays(input.awayRecentFixtures, input.kickoff),
  };

  const signals = buildSignals(featureSnapshot, input.homeTeam, input.awayTeam);
  const avgTrust = items.length > 0 ? trustSum / items.length : 0;
  const adjustments = calculateAdjustments(featureSnapshot, items.length, avgTrust);
  const summary = summarizeWebIntel(items.length, featureSnapshot, input.homeTeam, input.awayTeam);

  return { featureSnapshot, signals, summary, adjustments };
}

async function fetchTavilyResults(
  apiKey: string | undefined,
  query: string,
  maxResults: number,
  timeoutMs: number,
): Promise<TavilyResultItem[]> {
  if (!apiKey) return [];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(TAVILY_BASE_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        topic: 'news',
        search_depth: 'basic',
        max_results: maxResults,
        include_answer: false,
        include_raw_content: false,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Tavily ${response.status}: ${details}`);
    }

    const raw = (await response.json()) as unknown;
    const parsed = TavilyResponseSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid Tavily response: ${parsed.error.issues.map(i => i.message).join(', ')}`);
    }

    return parsed.data.results.map((r) => ({
      title: r.title,
      url: r.url,
      content: r.content,
      score: r.score,
      publishedAt: parsePublishedAt(r),
    }));
  } finally {
    clearTimeout(timer);
  }
}

async function searchWithCache(
  apiKey: string | undefined,
  query: string,
  recencyHours: number,
  maxResults: number,
  timeoutMs: number,
): Promise<TavilyResultItem[]> {
  const cacheKey = buildCacheKey(query, recencyHours, maxResults);
  const cached = await cacheGet<TavilyResultItem[]>(cacheKey);
  if (cached) return cached;

  const live = await fetchTavilyResults(apiKey, query, maxResults, timeoutMs);
  await cacheSet(cacheKey, live, 15 * 60);
  return live;
}

function normalizeResults(input: WebIntelInput, raw: TavilyResultItem[], recencyHours: number): NormalizedWebResult[] {
  const deduped = new Map<string, NormalizedWebResult>();

  for (const item of raw) {
    const canonicalUrl = toCanonicalUrl(item.url);
    if (!canonicalUrl) continue;

    if (!isWithinRecency(item.publishedAt, recencyHours)) continue;

    const domain = getDomain(canonicalUrl);
    const sourceType = classifySourceType(domain, input.leagueName);
    const entityType = inferEntityType(`${item.title}\n${item.content}`, input.homeTeam, input.awayTeam);
    const trust = scoreSourceTrust(sourceType, canonicalUrl, item.title);
    const sentiment = sentimentFromText(`${item.title}\n${item.content}`);
    const relevance = clamp(item.score > 1 ? item.score / 10 : item.score, 0, 1);

    const normalized: NormalizedWebResult = {
      ...item,
      url: canonicalUrl,
      domain,
      sourceType,
      entityType,
      trust,
      relevance,
      sentiment,
      text: `${item.title}\n${item.content}`,
    };

    const existing = deduped.get(canonicalUrl);
    if (!existing || normalized.relevance > existing.relevance) {
      deduped.set(canonicalUrl, normalized);
    }
  }

  return Array.from(deduped.values())
    .sort((a, b) => (b.relevance + b.trust * 0.3) - (a.relevance + a.trust * 0.3));
}

function mapToSourceMetadata(items: NormalizedWebResult[], maxSources: number): WebSourceMetadata[] {
  return items.slice(0, maxSources).map((item) => ({
    url: item.url,
    title: item.title,
    domain: item.domain,
    sourceType: item.sourceType,
    entityType: item.entityType,
    publishedAt: item.publishedAt,
    relevance: Math.round(item.relevance * 100) / 100,
    sentiment: Math.round(item.sentiment * 100) / 100,
  }));
}

function resolveRuntimeConfig(overrides?: Partial<WebIntelRuntimeConfig>): WebIntelRuntimeConfig {
  return {
    enabled: config.WEB_INTEL_ENABLED,
    apiKey: config.TAVILY_API_KEY,
    recencyHours: config.WEB_INTEL_RECENCY_HOURS,
    maxQueries: config.WEB_INTEL_MAX_QUERIES_PER_MATCH,
    maxResults: config.WEB_INTEL_MAX_RESULTS_PER_QUERY,
    timeoutMs: config.WEB_INTEL_TIMEOUT_MS,
    ...overrides,
  };
}

function shouldUseWebIntel(runtime: WebIntelRuntimeConfig): boolean {
  return runtime.enabled && Boolean(runtime.apiKey);
}

export async function getContextEnrichment(
  input: WebIntelInput,
  runtimeOverrides?: Partial<WebIntelRuntimeConfig>,
): Promise<ContextEnrichment> {
  const runtime = resolveRuntimeConfig(runtimeOverrides);
  const recencyHours = runtime.recencyHours;
  const maxQueries = runtime.maxQueries;
  const maxResults = runtime.maxResults;
  const timeoutMs = runtime.timeoutMs;

  const context: ContextEnrichment = {
    ...buildContextPlaceholders(),
  };

  if (!shouldUseWebIntel(runtime)) {
    return ContextEnrichmentSchema.parse(context);
  }

  try {
    const queries = buildWebIntelQueries({
      homeTeam: input.homeTeam,
      awayTeam: input.awayTeam,
      leagueName: input.leagueName,
      maxQueries,
    });

    const queryResults = await Promise.allSettled(
      queries.map((query) => searchWithCache(runtime.apiKey, query, recencyHours, maxResults, timeoutMs))
    );

    const flattened = queryResults.flatMap((result) =>
      result.status === 'fulfilled' ? result.value : []
    );

    const normalized = normalizeResults(input, flattened, recencyHours);
    const features = extractFeatures(input, normalized);
    const sourceMetadata = mapToSourceMetadata(normalized, 5);

    const parsedWebIntel = WebIntelSchema.parse({
      summary: features.summary,
      signals: features.signals,
      sources: sourceMetadata,
      featureSnapshot: features.featureSnapshot,
      adjustments: features.adjustments,
    });

    context.webIntel = parsedWebIntel;
    return ContextEnrichmentSchema.parse(context);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[WebIntel] Disabled for this run due to error: ${msg}`);
    return ContextEnrichmentSchema.parse(context);
  }
}

export function applyWebIntelAdjustments(raw: Record<string, unknown>, webIntel: WebIntel): void {
  const nextHome = clamp(Number(raw.homeWinProb || 0) + webIntel.adjustments.homeShift, 5, 95);
  const nextDraw = clamp(Number(raw.drawProb || 0) + webIntel.adjustments.drawShift, 5, 95);
  const nextAway = clamp(Number(raw.awayWinProb || 0) + webIntel.adjustments.awayShift, 5, 95);

  raw.homeWinProb = Math.round(nextHome * 100) / 100;
  raw.drawProb = Math.round(nextDraw * 100) / 100;
  raw.awayWinProb = Math.round(nextAway * 100) / 100;

  const nextOverUnder = clamp(Number(raw.overUnder25Prob || 0) + webIntel.adjustments.overUnderShift, 0, 100);
  const nextBtts = clamp(Number(raw.bttsProb || 0) + webIntel.adjustments.bttsShift, 0, 100);
  const nextConfidence = clamp(Number(raw.confidence || 0) + webIntel.adjustments.confidenceShift, 0, 100);

  raw.overUnder25Prob = Math.round(nextOverUnder * 100) / 100;
  raw.bttsProb = Math.round(nextBtts * 100) / 100;
  raw.confidence = Math.round(nextConfidence * 100) / 100;
  raw.overUnder25 = Number(raw.overUnder25Prob) >= 50 ? 'over' : 'under';
  raw.btts = Number(raw.bttsProb) >= 50;
}
