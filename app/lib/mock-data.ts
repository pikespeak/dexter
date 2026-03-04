import type {
  PriceSnapshot,
  PriceBar,
  MetricsSnapshot,
  Company,
  IncomeStatement,
  BalanceSheet,
  CashflowStatement,
  NewsArticle,
  Filing,
  FilingItem,
  InsiderTrade,
  Estimate,
  Segment,
  CryptoSnapshot,
  SearchResult,
  HealthResponse,
} from "./types";

// --- Helpers ---

function generatePriceBars(basePrice: number, days: number, ticker: string): PriceBar[] {
  const bars: PriceBar[] = [];
  let price = basePrice;
  const now = new Date();
  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const change = (Math.random() - 0.48) * basePrice * 0.03;
    price = Math.max(price + change, basePrice * 0.7);
    const high = price * (1 + Math.random() * 0.02);
    const low = price * (1 - Math.random() * 0.02);
    bars.push({
      time: date.toISOString().split("T")[0],
      open: +(price - change * 0.5).toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +price.toFixed(2),
      volume: Math.floor(20_000_000 + Math.random() * 60_000_000),
    });
  }
  return bars;
}

function delay(min = 200, max = 500): Promise<void> {
  const ms = min + Math.random() * (max - min);
  return new Promise((r) => setTimeout(r, ms));
}

// --- Stock Data ---

const STOCKS: Record<string, { name: string; sector: string; industry: string; exchange: string; price: number; marketCap: number; pe: number; eps: number; employees: number; website: string; description: string }> = {
  AAPL: {
    name: "Apple Inc.",
    sector: "Technology",
    industry: "Consumer Electronics",
    exchange: "NASDAQ",
    price: 178.72,
    marketCap: 2_800_000_000_000,
    pe: 29.5,
    eps: 6.06,
    employees: 164000,
    website: "https://apple.com",
    description: "Apple Inc. designs, manufactures, and markets smartphones, personal computers, tablets, wearables, and accessories worldwide.",
  },
  MSFT: {
    name: "Microsoft Corporation",
    sector: "Technology",
    industry: "Software — Infrastructure",
    exchange: "NASDAQ",
    price: 415.60,
    marketCap: 3_100_000_000_000,
    pe: 36.2,
    eps: 11.48,
    employees: 221000,
    website: "https://microsoft.com",
    description: "Microsoft Corporation develops and supports software, services, devices, and solutions worldwide.",
  },
  TSLA: {
    name: "Tesla, Inc.",
    sector: "Consumer Cyclical",
    industry: "Auto Manufacturers",
    exchange: "NASDAQ",
    price: 248.50,
    marketCap: 790_000_000_000,
    pe: 72.8,
    eps: 3.41,
    employees: 140473,
    website: "https://tesla.com",
    description: "Tesla, Inc. designs, develops, manufactures, and sells electric vehicles and energy generation and storage systems.",
  },
  GOOG: {
    name: "Alphabet Inc.",
    sector: "Technology",
    industry: "Internet Content & Information",
    exchange: "NASDAQ",
    price: 175.98,
    marketCap: 2_180_000_000_000,
    pe: 25.1,
    eps: 7.01,
    employees: 182502,
    website: "https://abc.xyz",
    description: "Alphabet Inc. offers various products and platforms in the United States, Europe, the Middle East, Africa, the Asia-Pacific, Canada, and Latin America.",
  },
  AMZN: {
    name: "Amazon.com, Inc.",
    sector: "Consumer Cyclical",
    industry: "Internet Retail",
    exchange: "NASDAQ",
    price: 185.60,
    marketCap: 1_940_000_000_000,
    pe: 60.4,
    eps: 3.07,
    employees: 1541000,
    website: "https://amazon.com",
    description: "Amazon.com, Inc. engages in the retail sale of consumer products, advertising, and subscription services through online and physical stores.",
  },
};

const CRYPTO: Record<string, { name: string; price: number; volume: number }> = {
  BTC: { name: "Bitcoin", price: 67_420.50, volume: 28_500_000_000 },
  ETH: { name: "Ethereum", price: 3_520.80, volume: 15_200_000_000 },
  SOL: { name: "Solana", price: 172.35, volume: 3_800_000_000 },
};

// --- Cached generated bars ---
const barsCache: Record<string, PriceBar[]> = {};

function getBars(ticker: string, basePrice: number): PriceBar[] {
  if (!barsCache[ticker]) {
    barsCache[ticker] = generatePriceBars(basePrice, 30, ticker);
  }
  return barsCache[ticker];
}

// --- Public Mock Functions ---

export { delay };

export function mockSearchResults(query: string): SearchResult[] {
  const q = query.toUpperCase();
  const allResults: SearchResult[] = [
    ...Object.entries(STOCKS).map(([ticker, s]) => ({
      ticker,
      name: s.name,
      exchange: s.exchange,
      sector: s.sector,
    })),
    ...Object.entries(CRYPTO).map(([ticker, c]) => ({
      ticker,
      name: c.name,
      exchange: "CRYPTO",
      sector: "Cryptocurrency",
    })),
  ];
  if (!q) return allResults.slice(0, 5);
  return allResults.filter(
    (r) => r.ticker.includes(q) || r.name.toUpperCase().includes(q)
  );
}

export function mockPriceSnapshot(ticker: string): PriceSnapshot {
  const stock = STOCKS[ticker.toUpperCase()];
  const price = stock?.price ?? 100 + Math.random() * 200;
  const change = +(Math.random() * 6 - 3).toFixed(2);
  return {
    ticker: ticker.toUpperCase(),
    price: +price.toFixed(2),
    open: +(price - 1.2).toFixed(2),
    high: +(price + 2.5).toFixed(2),
    low: +(price - 2.8).toFixed(2),
    close: +price.toFixed(2),
    volume: Math.floor(30_000_000 + Math.random() * 50_000_000),
    time: new Date().toISOString(),
    change,
    change_percent: +((change / price) * 100).toFixed(2),
  };
}

export function mockPriceBars(ticker: string): PriceBar[] {
  const stock = STOCKS[ticker.toUpperCase()];
  return getBars(ticker.toUpperCase(), stock?.price ?? 150);
}

export function mockCryptoSnapshot(ticker: string): CryptoSnapshot {
  const crypto = CRYPTO[ticker.toUpperCase()];
  return {
    ticker: ticker.toUpperCase(),
    price: crypto?.price ?? 50 + Math.random() * 1000,
    volume: crypto?.volume ?? 1_000_000_000,
    time: new Date().toISOString(),
  };
}

export function mockCryptoPriceBars(ticker: string): PriceBar[] {
  const crypto = CRYPTO[ticker.toUpperCase()];
  return getBars(`CRYPTO_${ticker.toUpperCase()}`, crypto?.price ?? 500);
}

export function mockCryptoTickers(): string[] {
  return Object.keys(CRYPTO);
}

export function mockMetricsSnapshot(ticker: string): MetricsSnapshot {
  const stock = STOCKS[ticker.toUpperCase()];
  return {
    ticker: ticker.toUpperCase(),
    market_cap: stock?.marketCap ?? 500_000_000_000,
    pe_ratio: stock?.pe ?? 25,
    eps: stock?.eps ?? 5.0,
    price_to_book: +(3 + Math.random() * 10).toFixed(2),
    price_to_sales: +(2 + Math.random() * 8).toFixed(2),
    dividend_yield: +(Math.random() * 2).toFixed(2),
  };
}

export function mockCompany(ticker: string): Company {
  const stock = STOCKS[ticker.toUpperCase()];
  return {
    ticker: ticker.toUpperCase(),
    name: stock?.name ?? `${ticker.toUpperCase()} Corp`,
    description: stock?.description ?? "A publicly traded company.",
    sector: stock?.sector ?? "Technology",
    industry: stock?.industry ?? "Software",
    exchange: stock?.exchange ?? "NASDAQ",
    currency: "USD",
    country: "US",
    employees: stock?.employees ?? 10000,
    website: stock?.website ?? "https://example.com",
  };
}

export function mockIncomeStatements(ticker: string): IncomeStatement[] {
  const t = ticker.toUpperCase();
  const baseRev = STOCKS[t] ? STOCKS[t].marketCap / 8 : 50_000_000_000;
  return ["2024-12-31", "2024-09-30", "2024-06-30", "2024-03-31"].map((period, i) => ({
    ticker: t,
    report_period: period,
    period: "quarterly",
    revenue: Math.floor(baseRev * (1 - i * 0.02)),
    cost_of_revenue: Math.floor(baseRev * 0.58 * (1 - i * 0.02)),
    gross_profit: Math.floor(baseRev * 0.42 * (1 - i * 0.02)),
    operating_expense: Math.floor(baseRev * 0.12),
    operating_income: Math.floor(baseRev * 0.30 * (1 - i * 0.02)),
    net_income: Math.floor(baseRev * 0.24 * (1 - i * 0.02)),
    eps_basic: +(6.0 - i * 0.15).toFixed(2),
    eps_diluted: +(5.95 - i * 0.15).toFixed(2),
  }));
}

export function mockBalanceSheets(ticker: string): BalanceSheet[] {
  const t = ticker.toUpperCase();
  const baseAssets = STOCKS[t] ? STOCKS[t].marketCap / 5 : 100_000_000_000;
  return ["2024-12-31", "2024-09-30", "2024-06-30", "2024-03-31"].map((period) => ({
    ticker: t,
    report_period: period,
    period: "quarterly",
    total_assets: Math.floor(baseAssets),
    total_liabilities: Math.floor(baseAssets * 0.6),
    total_equity: Math.floor(baseAssets * 0.4),
    cash_and_equivalents: Math.floor(baseAssets * 0.12),
    total_debt: Math.floor(baseAssets * 0.25),
  }));
}

export function mockCashflowStatements(ticker: string): CashflowStatement[] {
  const t = ticker.toUpperCase();
  const baseCF = STOCKS[t] ? STOCKS[t].marketCap / 25 : 20_000_000_000;
  return ["2024-12-31", "2024-09-30", "2024-06-30", "2024-03-31"].map((period) => ({
    ticker: t,
    report_period: period,
    period: "quarterly",
    operating_cash_flow: Math.floor(baseCF),
    investing_cash_flow: -Math.floor(baseCF * 0.3),
    financing_cash_flow: -Math.floor(baseCF * 0.4),
    free_cash_flow: Math.floor(baseCF * 0.7),
    net_cash_flow: Math.floor(baseCF * 0.3),
  }));
}

export function mockNews(ticker: string): NewsArticle[] {
  const stock = STOCKS[ticker.toUpperCase()];
  const name = stock?.name ?? ticker.toUpperCase();
  const now = Date.now();
  return [
    { title: `${name} Reports Strong Q4 Earnings`, description: `${name} beat analyst expectations with revenue growth of 12% year over year.`, url: "https://example.com/news/1", source: "Reuters", published_at: new Date(now - 86400000).toISOString(), ticker: ticker.toUpperCase() },
    { title: `${name} Announces New Product Line`, description: `The company revealed plans for expansion into new markets starting next quarter.`, url: "https://example.com/news/2", source: "Bloomberg", published_at: new Date(now - 172800000).toISOString(), ticker: ticker.toUpperCase() },
    { title: `Analysts Upgrade ${name} to Buy`, description: `Multiple Wall Street firms raised their price targets following strong guidance.`, url: "https://example.com/news/3", source: "CNBC", published_at: new Date(now - 259200000).toISOString(), ticker: ticker.toUpperCase() },
    { title: `${name} Expands AI Initiatives`, description: `The company is investing heavily in artificial intelligence capabilities across its product portfolio.`, url: "https://example.com/news/4", source: "TechCrunch", published_at: new Date(now - 345600000).toISOString(), ticker: ticker.toUpperCase() },
  ];
}

export function mockFilings(ticker: string): Filing[] {
  const t = ticker.toUpperCase();
  return [
    { ticker: t, filing_type: "10-K", filing_date: "2024-11-01", report_url: "https://sec.gov/example/10k" },
    { ticker: t, filing_type: "10-Q", filing_date: "2024-08-01", report_url: "https://sec.gov/example/10q-q3" },
    { ticker: t, filing_type: "10-Q", filing_date: "2024-05-01", report_url: "https://sec.gov/example/10q-q2" },
    { ticker: t, filing_type: "8-K", filing_date: "2024-10-15", report_url: "https://sec.gov/example/8k" },
  ];
}

export function mockFilingItems(ticker: string): FilingItem[] {
  const t = ticker.toUpperCase();
  return [
    { ticker: t, filing_type: "10-K", filing_date: "2024-11-01" },
    { ticker: t, filing_type: "10-Q", filing_date: "2024-08-01" },
  ];
}

export function mockInsiderTrades(ticker: string): InsiderTrade[] {
  const t = ticker.toUpperCase();
  const stock = STOCKS[t];
  const price = stock?.price ?? 150;
  return [
    { ticker: t, filing_date: "2024-11-15", trade_date: "2024-11-13", owner_name: "John Smith", owner_title: "CEO", transaction_type: "S-Sale", shares: 50000, price_per_share: price, total_value: 50000 * price },
    { ticker: t, filing_date: "2024-10-20", trade_date: "2024-10-18", owner_name: "Jane Doe", owner_title: "CFO", transaction_type: "P-Purchase", shares: 10000, price_per_share: price * 0.95, total_value: 10000 * price * 0.95 },
    { ticker: t, filing_date: "2024-09-05", trade_date: "2024-09-03", owner_name: "Bob Wilson", owner_title: "VP Engineering", transaction_type: "S-Sale", shares: 25000, price_per_share: price * 1.02, total_value: 25000 * price * 1.02 },
  ];
}

export function mockEstimates(ticker: string): Estimate[] {
  const t = ticker.toUpperCase();
  const stock = STOCKS[t];
  const eps = stock?.eps ?? 5.0;
  return [
    { ticker: t, report_period: "2025-03-31", period: "quarterly", eps_estimate: +(eps * 1.05).toFixed(2), revenue_estimate: stock ? Math.floor(stock.marketCap / 7.5) : 55_000_000_000, num_analysts: 38 },
    { ticker: t, report_period: "2025-06-30", period: "quarterly", eps_estimate: +(eps * 1.08).toFixed(2), revenue_estimate: stock ? Math.floor(stock.marketCap / 7.2) : 58_000_000_000, num_analysts: 35 },
    { ticker: t, report_period: "2025-12-31", period: "annual", eps_estimate: +(eps * 4.3).toFixed(2), revenue_estimate: stock ? Math.floor(stock.marketCap / 1.8) : 220_000_000_000, num_analysts: 42 },
  ];
}

export function mockSegments(ticker: string): Segment[] {
  const t = ticker.toUpperCase();
  const segmentsByTicker: Record<string, Array<{ name: string; revenue: number }>> = {
    AAPL: [
      { name: "iPhone", revenue: 200_000_000_000 },
      { name: "Services", revenue: 85_000_000_000 },
      { name: "Mac", revenue: 30_000_000_000 },
      { name: "iPad", revenue: 28_000_000_000 },
      { name: "Wearables", revenue: 40_000_000_000 },
    ],
    MSFT: [
      { name: "Intelligent Cloud", revenue: 96_000_000_000 },
      { name: "Productivity & Business", revenue: 75_000_000_000 },
      { name: "More Personal Computing", revenue: 58_000_000_000 },
    ],
    GOOG: [
      { name: "Google Search", revenue: 175_000_000_000 },
      { name: "YouTube", revenue: 35_000_000_000 },
      { name: "Google Cloud", revenue: 33_000_000_000 },
      { name: "Other", revenue: 15_000_000_000 },
    ],
    AMZN: [
      { name: "Online Stores", revenue: 230_000_000_000 },
      { name: "AWS", revenue: 91_000_000_000 },
      { name: "Third-Party Seller", revenue: 140_000_000_000 },
      { name: "Advertising", revenue: 47_000_000_000 },
    ],
    TSLA: [
      { name: "Automotive", revenue: 82_000_000_000 },
      { name: "Energy Generation", revenue: 6_000_000_000 },
      { name: "Services", revenue: 8_700_000_000 },
    ],
  };
  const segs = segmentsByTicker[t] ?? [
    { name: "Core Business", revenue: 50_000_000_000 },
    { name: "Other", revenue: 10_000_000_000 },
  ];
  return segs.map((seg) => ({
    ticker: t,
    report_period: "2024-12-31",
    period: "annual",
    segment_name: seg.name,
    revenue: seg.revenue,
  }));
}

export function mockHealth(): HealthResponse {
  return {
    status: "ok",
    service: "dexter-api (mock)",
    timestamp: new Date().toISOString(),
    upstream: { status: "ok", service: "mock-upstream" },
  };
}

// --- Mock Agent Responses ---

const AGENT_RESPONSES: Record<string, { tools: string[]; answer: string }> = {
  default: {
    tools: ["getMetrics", "getPriceSnapshot"],
    answer: `Based on my analysis, here's a summary:

**Key Findings:**
- The stock shows solid fundamentals with consistent revenue growth
- P/E ratio is within the industry average range
- Recent price action suggests bullish momentum

**Recommendation:** The current valuation appears reasonable given the growth trajectory. Consider monitoring upcoming earnings for potential catalysts.

*Note: This is mock data for demonstration purposes.*`,
  },
  price: {
    tools: ["getPriceSnapshot"],
    answer: `Here's the current price information:

**Price Overview:**
- Current price is showing a slight upward trend
- Trading volume is above the 30-day average
- The stock is trading near its 52-week high

The technical indicators suggest continued momentum, with support levels holding firm.

*Note: This is mock data for demonstration purposes.*`,
  },
  financials: {
    tools: ["getIncome", "getBalance", "getCashflow"],
    answer: `Here's a financial overview:

**Income Statement Highlights:**
- Revenue growth of ~12% YoY
- Gross margins stable above 40%
- Net income expanding with operating leverage

**Balance Sheet:**
- Strong cash position with low debt-to-equity
- Total assets growing steadily

**Cash Flow:**
- Positive free cash flow generation
- Operating cash flow comfortably covers capex

*Note: This is mock data for demonstration purposes.*`,
  },
};

export function getAgentResponse(query: string): { tools: string[]; answer: string } {
  const q = query.toLowerCase();
  if (q.includes("price") || q.includes("cost") || q.includes("worth")) {
    return AGENT_RESPONSES.price;
  }
  if (q.includes("financial") || q.includes("revenue") || q.includes("income") || q.includes("balance") || q.includes("cashflow")) {
    return AGENT_RESPONSES.financials;
  }
  return AGENT_RESPONSES.default;
}
