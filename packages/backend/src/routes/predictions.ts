import { Hono } from 'hono';
import { eq, desc, and, gte, lte } from 'drizzle-orm';
import { db, schema } from '../db/index.js';
import { authMiddleware, requirePlan } from '../middleware/auth.js';
import type { JWTPayload } from '../middleware/auth.js';

export const predictionRoutes = new Hono();

// GET /predictions/today - Get today's predictions (requires Pro subscription)
predictionRoutes.get('/today', authMiddleware, requirePlan('pro'), async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const todaysPredictions = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(
      and(
        gte(schema.matches.kickoff, today),
        lte(schema.matches.kickoff, tomorrow)
      )
    )
    .orderBy(schema.matches.kickoff);

  return c.json({
    date: today.toISOString().split('T')[0],
    count: todaysPredictions.length,
    predictions: todaysPredictions.map(({ prediction, match }) => ({
      id: prediction.id,
      match: {
        id: match.id,
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.leagueName,
        kickoff: match.kickoff,
        venue: match.venue,
      },
      prediction: {
        homeWinProb: prediction.homeWinProb,
        drawProb: prediction.drawProb,
        awayWinProb: prediction.awayWinProb,
        overUnder25: prediction.overUnder25,
        btts: prediction.btts,
        predictedScore: prediction.predictedScore,
        confidence: prediction.confidence,
        details: prediction.predictionData,
      },
    })),
  });
});

// GET /predictions/free - Get one free prediction per day
predictionRoutes.get('/free', async (c) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [freePrediction] = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(
      and(
        gte(schema.matches.kickoff, today),
        lte(schema.matches.kickoff, tomorrow),
        eq(schema.predictions.tier, 'free')
      )
    )
    .orderBy(desc(schema.predictions.confidence))
    .limit(1);

  if (!freePrediction) {
    return c.json({ prediction: null, message: 'No free prediction available today' });
  }

  return c.json({
    prediction: {
      id: freePrediction.prediction.id,
      match: {
        homeTeam: freePrediction.match.homeTeam,
        awayTeam: freePrediction.match.awayTeam,
        league: freePrediction.match.leagueName,
        kickoff: freePrediction.match.kickoff,
      },
      prediction: {
        homeWinProb: freePrediction.prediction.homeWinProb,
        drawProb: freePrediction.prediction.drawProb,
        awayWinProb: freePrediction.prediction.awayWinProb,
        confidence: freePrediction.prediction.confidence,
      },
    },
    upgradeMessage: 'Upgrade to Pro for all predictions, value bets, and detailed analysis.',
  });
});

// GET /predictions/:matchId - Get detailed prediction for a match (requires Pro)
predictionRoutes.get('/:matchId', authMiddleware, requirePlan('pro'), async (c) => {
  const matchId = c.req.param('matchId');

  const [result] = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .where(eq(schema.matches.id, matchId))
    .limit(1);

  if (!result) {
    return c.json({ error: 'Prediction not found' }, 404);
  }

  // Get value bets for this match
  const matchValueBets = await db
    .select()
    .from(schema.valueBets)
    .where(eq(schema.valueBets.matchId, matchId));

  return c.json({
    prediction: {
      id: result.prediction.id,
      match: {
        id: result.match.id,
        homeTeam: result.match.homeTeam,
        awayTeam: result.match.awayTeam,
        league: result.match.leagueName,
        kickoff: result.match.kickoff,
        venue: result.match.venue,
      },
      prediction: result.prediction.predictionData,
      probabilities: {
        homeWin: result.prediction.homeWinProb,
        draw: result.prediction.drawProb,
        awayWin: result.prediction.awayWinProb,
      },
      overUnder25: result.prediction.overUnder25,
      btts: result.prediction.btts,
      predictedScore: result.prediction.predictedScore,
      confidence: result.prediction.confidence,
      valueBets: matchValueBets.map((vb) => ({
        betType: vb.betType,
        ourProbability: vb.ourProbability,
        bestOdds: vb.bestOdds,
        bookmaker: vb.bookmaker,
        edge: vb.edge,
        kellyStake: vb.kellyStake,
      })),
    },
  });
});

// GET /predictions/history - Past predictions with results
predictionRoutes.get('/history', authMiddleware, async (c) => {
  const user = c.get('user') as JWTPayload;
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = parseInt(c.req.query('offset') || '0');

  const history = await db
    .select({
      prediction: schema.predictions,
      match: schema.matches,
      performance: schema.performance,
    })
    .from(schema.predictions)
    .innerJoin(schema.matches, eq(schema.predictions.matchId, schema.matches.id))
    .leftJoin(schema.performance, eq(schema.performance.predictionId, schema.predictions.id))
    .where(lte(schema.matches.kickoff, new Date()))
    .orderBy(desc(schema.matches.kickoff))
    .limit(limit)
    .offset(offset);

  return c.json({
    history: history.map(({ prediction, match, performance: perf }) => ({
      match: {
        homeTeam: match.homeTeam,
        awayTeam: match.awayTeam,
        league: match.leagueName,
        kickoff: match.kickoff,
        result: match.homeScore !== null ? `${match.homeScore}-${match.awayScore}` : null,
      },
      prediction: {
        predictedScore: prediction.predictedScore,
        confidence: prediction.confidence,
      },
      result: perf ? {
        wasCorrect: perf.wasCorrect,
        profitLoss: perf.profitLoss,
      } : null,
    })),
  });
});
