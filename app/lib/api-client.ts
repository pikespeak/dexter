import { useAppStore } from "./store";
import type {
  ApiSuccessResponse,
  ApiErrorResponse,
  PriceSnapshot,
  PriceBar,
  IncomeStatement,
  BalanceSheet,
  CashflowStatement,
  MetricsSnapshot,
  Metrics,
  Estimate,
  Filing,
  FilingItem,
  Company,
  NewsArticle,
  InsiderTrade,
  Segment,
  CryptoSnapshot,
  HealthResponse,
  SearchResult,
  PriceParams,
  FinancialParams,
  FilingParams,
  PaginationParams,
} from "./types";

class ApiError extends Error {
  code: string;
  status: number;
  rateLimitRemaining?: number;

  constructor(response: ApiErrorResponse) {
    super(response.error);
    this.name = "ApiError";
    this.code = response.code;
    this.status = response.status;
  }
}

class RateLimitError extends ApiError {
  retryAfter: number;

  constructor(response: ApiErrorResponse, retryAfter: number) {
    super(response);
    this.name = "RateLimitError";
    this.retryAfter = retryAfter;
  }
}

function getBaseUrl(): string {
  return useAppStore.getState().serverUrl;
}

function getAuthHeaders(): Record<string, string> {
  const apiKey = useAppStore.getState().apiKey;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }
  return headers;
}

function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>
): string {
  const base = getBaseUrl();
  // Handle relative paths properly
  const fullUrl = path.startsWith("http") ? path : `${base}${path}`;
  const url = new URL(fullUrl);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        url.searchParams.set(key, String(value));
      }
    }
  }
  return url.toString();
}

const REQUEST_TIMEOUT = 10000; // 10 seconds
const RETRY_DELAY = 1000; // 1 second

async function fetchWithTimeout(
  url: string,
  options: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const existingSignal = options.signal;

  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  // If caller provided a signal, listen for its abort
  if (existingSignal) {
    if (existingSignal.aborted) {
      controller.abort();
    } else {
      existingSignal.addEventListener("abort", () => controller.abort(), { once: true });
    }
  }

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

function isRetryable(status: number): boolean {
  return status >= 500 || status === 0;
}

async function get<T>(
  path: string,
  params?: Record<string, string | number | undefined>
): Promise<ApiSuccessResponse<T>> {
  const url = buildUrl(path, params);
  const options: RequestInit = {
    method: "GET",
    headers: getAuthHeaders(),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await fetchWithTimeout(url, options);

      if (response.status === 429) {
        const retryAfter = parseInt(response.headers.get("Retry-After") || "60", 10);
        const body = await response.json().catch(() => ({
          error: "Rate limited",
          code: "RATE_LIMITED" as const,
          status: 429,
        }));
        throw new RateLimitError(body as ApiErrorResponse, retryAfter);
      }

      if (!response.ok) {
        const body = (await response.json()) as ApiErrorResponse;
        const err = new ApiError(body);
        if (isRetryable(response.status) && attempt === 0) {
          lastError = err;
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          continue;
        }
        throw err;
      }

      return (await response.json()) as ApiSuccessResponse<T>;
    } catch (err) {
      if (err instanceof RateLimitError) throw err;
      if (err instanceof ApiError && !isRetryable(err.status)) throw err;

      lastError = err as Error;
      if (attempt === 0) {
        // Network error or timeout — retry once
        await new Promise((r) => setTimeout(r, RETRY_DELAY));
        continue;
      }
    }
  }

  throw lastError || new Error("Request failed");
}

// --- Search ---

export function searchTickers(query: string) {
  return get<SearchResult[]>("/search", { q: query });
}

// --- Prices ---

export function getPriceSnapshot(ticker: string) {
  return get<PriceSnapshot>(`/prices/snapshot/${ticker}`);
}

export function getPrices(ticker: string, opts: PriceParams) {
  return get<PriceBar[]>(`/prices/${ticker}`, opts as unknown as Record<string, string | number>);
}

export function getCryptoSnapshot(ticker: string) {
  return get<CryptoSnapshot>(`/prices/crypto/snapshot/${ticker}`);
}

export function getCryptoPrices(ticker: string, opts: PriceParams) {
  return get<PriceBar[]>(`/prices/crypto/${ticker}`, opts as unknown as Record<string, string | number>);
}

export function getCryptoTickers(params?: PaginationParams) {
  return get<string[]>("/prices/crypto/tickers", params as Record<string, string | number>);
}

// --- Financials ---

export function getIncome(ticker: string, opts?: FinancialParams) {
  return get<IncomeStatement[]>(`/financials/${ticker}/income`, opts as Record<string, string | number>);
}

export function getBalance(ticker: string, opts?: FinancialParams) {
  return get<BalanceSheet[]>(`/financials/${ticker}/balance`, opts as Record<string, string | number>);
}

export function getCashflow(ticker: string, opts?: FinancialParams) {
  return get<CashflowStatement[]>(`/financials/${ticker}/cashflow`, opts as Record<string, string | number>);
}

// --- Metrics ---

export function getMetricsSnapshot(ticker: string) {
  return get<MetricsSnapshot>(`/metrics/snapshot/${ticker}`);
}

export function getMetrics(ticker: string, opts?: FinancialParams) {
  return get<Metrics[]>(`/metrics/${ticker}`, opts as Record<string, string | number>);
}

export function getEstimates(ticker: string, opts?: FinancialParams) {
  return get<Estimate[]>(`/metrics/estimates/${ticker}`, opts as Record<string, string | number>);
}

// --- Filings ---

export function getFilings(ticker: string, opts?: FilingParams) {
  return get<Filing[]>(`/filings/${ticker}`, opts as Record<string, string | number>);
}

export function getFilingItems(ticker: string, opts?: FilingParams) {
  return get<FilingItem[]>(`/filings/items/${ticker}`, opts as Record<string, string | number>);
}

// --- Company ---

export function getCompany(ticker: string) {
  return get<Company>(`/company/${ticker}`);
}

export function getNews(ticker: string, opts?: PaginationParams) {
  return get<NewsArticle[]>(`/company/${ticker}/news`, opts as Record<string, string | number>);
}

export function getInsiderTrades(ticker: string, opts?: PaginationParams) {
  return get<InsiderTrade[]>(`/company/${ticker}/insider-trades`, opts as Record<string, string | number>);
}

export function getSegments(ticker: string, opts?: FinancialParams) {
  return get<Segment[]>(`/company/${ticker}/segments`, opts as Record<string, string | number>);
}

// --- Health ---

export function getHealth(deep?: boolean) {
  return get<HealthResponse>("/health", deep ? { deep: "true" } : undefined);
}

export { ApiError, RateLimitError };
