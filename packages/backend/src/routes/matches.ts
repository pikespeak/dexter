import { Hono } from 'hono';
import { eq, gte, desc } from 'drizzle-orm';
import { db, schema } from '../db/index.js';

export const matchRoutes = new Hono();

// GET /matches/upcoming - Free endpoint for upcoming matches
matchRoutes.get('/upcoming', async (c) => {
  const limit = parseInt(c.req.query('limit') || '20');
  const leagueId = c.req.query('league_id');

  let query = db
    .select()
    .from(schema.matches)
    .where(gte(schema.matches.kickoff, new Date()))
    .orderBy(schema.matches.kickoff)
    .limit(limit);

  const matches = await query;

  return c.json({
    count: matches.length,
    matches: matches.map((m) => ({
      id: m.id,
      homeTeam: m.homeTeam,
      awayTeam: m.awayTeam,
      league: m.leagueName,
      leagueId: m.leagueId,
      kickoff: m.kickoff,
      venue: m.venue,
      status: m.status,
    })),
  });
});

// GET /matches/:id - Match details
matchRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const [match] = await db
    .select()
    .from(schema.matches)
    .where(eq(schema.matches.id, id))
    .limit(1);

  if (!match) {
    return c.json({ error: 'Match not found' }, 404);
  }

  return c.json({
    match: {
      id: match.id,
      homeTeam: match.homeTeam,
      homeTeamId: match.homeTeamId,
      awayTeam: match.awayTeam,
      awayTeamId: match.awayTeamId,
      league: match.leagueName,
      leagueId: match.leagueId,
      kickoff: match.kickoff,
      venue: match.venue,
      status: match.status,
      result: match.homeScore !== null ? {
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      } : null,
    },
  });
});
