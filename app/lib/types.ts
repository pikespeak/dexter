// API Response Types

export interface ApiSuccessResponse<T> {
  data: T;
  ticker?: string;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  offset: number;
  limit: number;
  total: number;
}

export interface ApiErrorResponse {
  error: string;
  code: ErrorCode;
  status: number;
}

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "INVALID_PARAMS"
  | "UPSTREAM_ERROR"
  | "INTERNAL_ERROR";

// Search
export interface SearchResult {
  ticker: string;
  name: string;
  exchange: string;
  sector: string;
}

// Chat
export interface ChatMessage {
  id: string;
  type: "user" | "thinking" | "tool" | "answer" | "error";
  content: string;
  toolName?: string;
  timestamp: number;
}

// Price Types
export interface PriceSnapshot {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  time: string;
  change?: number;
  change_percent?: number;
}

export interface PriceBar {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

// Financial Types
export interface IncomeStatement {
  ticker: string;
  report_period: string;
  period: string;
  revenue: number;
  cost_of_revenue: number;
  gross_profit: number;
  operating_expense: number;
  operating_income: number;
  net_income: number;
  eps_basic: number;
  eps_diluted: number;
  [key: string]: string | number | null;
}

export interface BalanceSheet {
  ticker: string;
  report_period: string;
  period: string;
  total_assets: number;
  total_liabilities: number;
  total_equity: number;
  cash_and_equivalents: number;
  total_debt: number;
  [key: string]: string | number | null;
}

export interface CashflowStatement {
  ticker: string;
  report_period: string;
  period: string;
  operating_cash_flow: number;
  investing_cash_flow: number;
  financing_cash_flow: number;
  free_cash_flow: number;
  net_cash_flow: number;
  [key: string]: string | number | null;
}

// Metrics Types
export interface MetricsSnapshot {
  ticker: string;
  market_cap: number;
  pe_ratio: number;
  eps: number;
  price_to_book: number;
  price_to_sales: number;
  dividend_yield: number;
  [key: string]: string | number | null;
}

export interface Metrics {
  ticker: string;
  report_period: string;
  period: string;
  market_cap: number;
  pe_ratio: number;
  eps: number;
  [key: string]: string | number | null;
}

export interface Estimate {
  ticker: string;
  report_period: string;
  period: string;
  [key: string]: string | number | null;
}

// Filing Types
export interface Filing {
  ticker: string;
  filing_type: string;
  filing_date: string;
  report_url: string;
  [key: string]: string | number | null;
}

export interface FilingItem {
  ticker: string;
  filing_type: string;
  filing_date: string;
  [key: string]: string | number | null;
}

// Company Types
export interface Company {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  exchange: string;
  currency: string;
  country: string;
  employees: number;
  website: string;
  [key: string]: string | number | null;
}

export interface NewsArticle {
  title: string;
  description: string;
  url: string;
  source: string;
  published_at: string;
  ticker: string;
}

export interface InsiderTrade {
  ticker: string;
  filing_date: string;
  trade_date: string;
  owner_name: string;
  owner_title: string;
  transaction_type: string;
  shares: number;
  price_per_share: number;
  total_value: number;
  [key: string]: string | number | null;
}

export interface Segment {
  ticker: string;
  report_period: string;
  period: string;
  [key: string]: string | number | null;
}

// Crypto Types
export interface CryptoSnapshot {
  ticker: string;
  price: number;
  volume: number;
  time: string;
  [key: string]: string | number | null;
}

// SSE Event Types
export type SSEEventType =
  | "thinking"
  | "tool_start"
  | "tool_end"
  | "done"
  | "error"
  | "ping";

export interface SSEEvent {
  type: SSEEventType;
  data?: Record<string, unknown>;
  toolName?: string;
  error?: string;
  answer?: string;
}

// Health
export interface HealthResponse {
  status: string;
  service: string;
  timestamp: string;
  upstream?: {
    status: string;
    service: string;
  };
}

// Pagination Params
export interface PaginationParams {
  offset?: number;
  limit?: number;
}

export interface PriceParams extends PaginationParams {
  start_date: string;
  end_date: string;
  interval?: "minute" | "hour" | "day" | "week" | "month";
  interval_multiplier?: number;
}

export interface FinancialParams extends PaginationParams {
  period?: "annual" | "quarterly" | "ttm";
  limit?: number;
}

export interface FilingParams extends PaginationParams {
  filing_type?: string;
  limit?: number;
}
