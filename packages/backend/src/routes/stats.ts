import { Hono } from 'hono';
import { eq, count, avg, sql } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export const statsRoutes = new Hono();

// GET /stats/performance - Public performance stats (builds trust)
statsRoutes.get('/performance', async (c) => {
  // Overall accuracy
  const [accuracy] = await db
    .select({
      total: count(),
      correct: count(sql`CASE WHEN ${schema.performance.wasCorrect} = true THEN 1 END`),
      avgProfitLoss: avg(schema.performance.profitLoss),
    })
    .from(schema.performance);

  const totalPredictions = Number(accuracy?.total || 0);
  const correctPredictions = Number(accuracy?.correct || 0);
  const hitRate = totalPredictions > 0 ? (correctPredictions / totalPredictions * 100).toFixed(1) : '0.0';
  const avgPL = accuracy?.avgProfitLoss || '0.00';

  return c.json({
    performance: {
      totalPredictions,
      correctPredictions,
      hitRate: `${hitRate}%`,
      averageProfitLoss: avgPL,
      lastUpdated: new Date().toISOString(),
    },
  });
});
