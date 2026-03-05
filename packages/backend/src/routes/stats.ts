import { Hono } from 'hono';
import {
  getOverallPerformance,
  getMarketBreakdown,
  getLeagueBreakdown,
  getCalibrationData,
  getBrierScoreAnalysis,
  getValueBetROI,
  getPoissonVsLlmAnalysis,
  getCLVAnalysis,
  getCalibrationCurve,
  getDashboard,
  type DateFilters,
} from '../services/analytics.js';

export const statsRoutes = new Hono();

// ---------------------------------------------------------------------------
// Helper: parse query filters
// ---------------------------------------------------------------------------

function parseFilters(query: Record<string, string | undefined>): DateFilters {
  const filters: DateFilters = {};
  if (query.from) filters.from = new Date(query.from);
  if (query.to) filters.to = new Date(query.to);
  if (query.league_id) filters.leagueId = Number(query.league_id);
  if (query.model_version) filters.modelVersion = query.model_version;
  return filters;
}

// ---------------------------------------------------------------------------
// GET /stats/performance — Extended overall statistics
// ---------------------------------------------------------------------------

statsRoutes.get('/performance', async (c) => {
  const filters = parseFilters(c.req.query());
  const performance = await getOverallPerformance(filters);
  return c.json({ performance });
});

// ---------------------------------------------------------------------------
// GET /stats/markets — Per-market breakdown (1X2, O/U, BTTS, Exact)
// ---------------------------------------------------------------------------

statsRoutes.get('/markets', async (c) => {
  const filters = parseFilters(c.req.query());
  const markets = await getMarketBreakdown(filters);
  return c.json({ markets });
});

// ---------------------------------------------------------------------------
// GET /stats/leagues — Per-league breakdown
// ---------------------------------------------------------------------------

statsRoutes.get('/leagues', async (c) => {
  const filters = parseFilters(c.req.query());
  const leagues = await getLeagueBreakdown(filters);
  return c.json({ leagues });
});

// ---------------------------------------------------------------------------
// GET /stats/calibration — Calibration curve data
// ---------------------------------------------------------------------------

statsRoutes.get('/calibration', async (c) => {
  const filters = parseFilters(c.req.query());
  const calibration = await getCalibrationCurve(filters);
  return c.json({ calibration });
});

// ---------------------------------------------------------------------------
// GET /stats/brier — Brier score decomposition
// ---------------------------------------------------------------------------

statsRoutes.get('/brier', async (c) => {
  const filters = parseFilters(c.req.query());
  const brier = await getBrierScoreAnalysis(filters);
  return c.json({ brier });
});

// ---------------------------------------------------------------------------
// GET /stats/value-bets — Value bet ROI
// ---------------------------------------------------------------------------

statsRoutes.get('/value-bets', async (c) => {
  const filters = parseFilters(c.req.query());
  const valueBets = await getValueBetROI(filters);
  return c.json({ valueBets });
});

// ---------------------------------------------------------------------------
// GET /stats/poisson-vs-llm — Poisson baseline vs LLM comparison
// ---------------------------------------------------------------------------

statsRoutes.get('/poisson-vs-llm', async (c) => {
  const filters = parseFilters(c.req.query());
  const comparison = await getPoissonVsLlmAnalysis(filters);
  return c.json({ comparison });
});

// ---------------------------------------------------------------------------
// GET /stats/clv — Closing Line Value analysis
// ---------------------------------------------------------------------------

statsRoutes.get('/clv', async (c) => {
  const filters = parseFilters(c.req.query());
  const clv = await getCLVAnalysis(filters);
  return c.json({ clv });
});

// ---------------------------------------------------------------------------
// GET /stats/dashboard — All metrics combined (admin overview)
// ---------------------------------------------------------------------------

statsRoutes.get('/dashboard', async (c) => {
  const filters = parseFilters(c.req.query());
  const dashboard = await getDashboard(filters);
  return c.json({ dashboard });
});
