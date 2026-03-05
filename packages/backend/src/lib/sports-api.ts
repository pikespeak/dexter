import { createHash } from 'crypto';
import { cacheGet, cacheSet } from '../services/cache.js';

const API_FOOTBALL_BASE_URL = 'https://v3.football.api-sports.io';
const ODDS_API_BASE_URL = 'https://api.the-odds-api.com/v4';
const API_FOOTBALL_MAX_REQUESTS = Number.parseInt(process.env.API_FOOTBALL_MAX_REQUESTS || '0', 10) || 0;
let apiFootballUsedRequests = 0;

export interface ApiResponse {
  data: Record<string, unknown>;
  url: string;
}

type ApiParams = Record<string, string | number | string[] | undefined>;
type Provider = 'football' | 'odds';

interface ApiCallOptions {
  cacheable?: boolean;
  cacheTtlSeconds?: number;
}

function normalizeEndpoint(endpoint: string): string {
  return endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
}

function serializeParams(params: ApiParams): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => {
      if (Array.isArray(value)) {
        return `${key}=${[...value].sort().join(',')}`;
      }
      return `${key}=${String(value)}`;
    })
    .join('&');
}

function buildCacheKey(provider: Provider, endpoint: string, params: ApiParams): string {
  const normalized = normalizeEndpoint(endpoint);
  const canonical = `${normalized}?${serializeParams(params)}`;
  const hash = createHash('sha1').update(canonical).digest('hex').slice(0, 16);
  const endpointLabel = normalized.replace(/\//g, '_').replace(/^_+/, '') || 'root';
  return `sports:${provider}:${endpointLabel}:${hash}`;
}

function buildUrl(baseUrl: string, endpoint: string, params: ApiParams): URL {
  const url = new URL(`${baseUrl}${normalizeEndpoint(endpoint)}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const item of value) {
        url.searchParams.append(key, item);
      }
      continue;
    }
    url.searchParams.append(key, String(value));
  }
  return url;
}

function getFootballCacheTtl(endpoint: string): number {
  const normalized = normalizeEndpoint(endpoint);
  if (normalized === '/teams/statistics') return 86_400;
  if (normalized === '/standings') return 86_400;
  if (normalized === '/fixtures/headtohead') return 43_200;
  if (normalized === '/fixtures/statistics') return 21_600;
  if (normalized === '/injuries') return 3_600;
  if (normalized === '/odds') return 120;
  if (normalized === '/predictions') return 300;
  if (normalized === '/fixtures') return 300;
  return 300;
}

function getOddsCacheTtl(endpoint: string): number {
  const normalized = normalizeEndpoint(endpoint);
  if (normalized.includes('/odds')) return 120;
  return 300;
}

function consumeFootballRequestBudgetOrThrow(): void {
  if (API_FOOTBALL_MAX_REQUESTS <= 0) return;

  if (apiFootballUsedRequests >= API_FOOTBALL_MAX_REQUESTS) {
    throw new Error(
      `[API-Football] request budget exhausted (API_FOOTBALL_MAX_REQUESTS=${API_FOOTBALL_MAX_REQUESTS}, used=${apiFootballUsedRequests})`
    );
  }

  apiFootballUsedRequests += 1;
}

export function getApiFootballBudgetStatus(): {
  maxRequests: number;
  usedRequests: number;
  remainingRequests: number | null;
} {
  return {
    maxRequests: API_FOOTBALL_MAX_REQUESTS,
    usedRequests: apiFootballUsedRequests,
    remainingRequests: API_FOOTBALL_MAX_REQUESTS > 0
      ? Math.max(0, API_FOOTBALL_MAX_REQUESTS - apiFootballUsedRequests)
      : null,
  };
}

async function requestJson(
  providerLabel: string,
  url: URL,
  init?: RequestInit
): Promise<Record<string, unknown>> {
  let response: Response;
  try {
    response = await fetch(url.toString(), init);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`[${providerLabel}] network error: ${message}`);
  }

  if (!response.ok) {
    const details = await response.text().catch(() => '');
    const msg = details ? `${response.status} ${response.statusText} - ${details}` : `${response.status} ${response.statusText}`;
    throw new Error(`[${providerLabel}] request failed: ${msg}`);
  }

  try {
    return (await response.json()) as Record<string, unknown>;
  } catch {
    throw new Error(`[${providerLabel}] invalid JSON response`);
  }
}

async function tryReadCache(key: string): Promise<ApiResponse | null> {
  const cached = await cacheGet<ApiResponse>(key);
  if (!cached || typeof cached !== 'object') return null;
  if (!('url' in cached) || !('data' in cached)) return null;
  return cached;
}

export async function callFootballApi(
  endpoint: string,
  params: ApiParams,
  options?: ApiCallOptions
): Promise<ApiResponse> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  const cacheKey = buildCacheKey('football', endpoint, params);

  if (options?.cacheable) {
    const cached = await tryReadCache(cacheKey);
    if (cached) return cached;
  }

  consumeFootballRequestBudgetOrThrow();

  const url = buildUrl(API_FOOTBALL_BASE_URL, endpoint, params);
  const data = await requestJson('API-Football', url, {
    headers: {
      'x-apisports-key': apiKey ?? '',
    },
  });

  const result = { data, url: url.toString() };
  if (options?.cacheable) {
    const ttl = options.cacheTtlSeconds ?? getFootballCacheTtl(endpoint);
    await cacheSet(cacheKey, result, ttl);
  }

  return result;
}

export async function callOddsApi(
  endpoint: string,
  params: ApiParams,
  options?: ApiCallOptions
): Promise<ApiResponse> {
  const apiKey = process.env.ODDS_API_KEY;
  const cacheKey = buildCacheKey('odds', endpoint, params);

  if (options?.cacheable) {
    const cached = await tryReadCache(cacheKey);
    if (cached) return cached;
  }

  const url = buildUrl(ODDS_API_BASE_URL, endpoint, params);
  url.searchParams.set('apiKey', apiKey ?? '');
  const data = await requestJson('Odds API', url);

  const result = { data, url: url.toString() };
  if (options?.cacheable) {
    const ttl = options.cacheTtlSeconds ?? getOddsCacheTtl(endpoint);
    await cacheSet(cacheKey, result, ttl);
  }

  return result;
}
