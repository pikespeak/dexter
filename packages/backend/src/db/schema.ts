import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, pgEnum, decimal } from 'drizzle-orm/pg-core';

// Enums
export const subscriptionPlanEnum = pgEnum('subscription_plan', ['free', 'pro', 'premium']);
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'expired', 'cancelled', 'trial']);

// Users table
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 100 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Subscriptions table
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  plan: subscriptionPlanEnum('plan').notNull().default('free'),
  status: subscriptionStatusEnum('status').notNull().default('active'),
  revenuecatId: varchar('revenuecat_id', { length: 255 }),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Matches table
export const matches = pgTable('matches', {
  id: uuid('id').primaryKey().defaultRandom(),
  apiFootballId: integer('api_football_id').notNull().unique(),
  homeTeam: varchar('home_team', { length: 255 }).notNull(),
  homeTeamId: integer('home_team_id').notNull(),
  awayTeam: varchar('away_team', { length: 255 }).notNull(),
  awayTeamId: integer('away_team_id').notNull(),
  leagueName: varchar('league_name', { length: 255 }).notNull(),
  leagueId: integer('league_id').notNull(),
  kickoff: timestamp('kickoff').notNull(),
  venue: varchar('venue', { length: 255 }),
  homeScore: integer('home_score'),
  awayScore: integer('away_score'),
  status: varchar('status', { length: 20 }).default('scheduled'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Predictions table
export const predictions = pgTable('predictions', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  predictionData: jsonb('prediction_data').notNull(),
  confidence: decimal('confidence', { precision: 5, scale: 2 }).notNull(),
  homeWinProb: decimal('home_win_prob', { precision: 5, scale: 2 }),
  drawProb: decimal('draw_prob', { precision: 5, scale: 2 }),
  awayWinProb: decimal('away_win_prob', { precision: 5, scale: 2 }),
  overUnder25: varchar('over_under_25', { length: 10 }),
  btts: boolean('btts'),
  predictedScore: varchar('predicted_score', { length: 10 }),
  tier: subscriptionPlanEnum('tier').notNull().default('pro'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Performance tracking table
export const performance = pgTable('performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  predictionId: uuid('prediction_id').notNull().references(() => predictions.id),
  wasCorrect: boolean('was_correct'),
  actualResult: varchar('actual_result', { length: 20 }),
  profitLoss: decimal('profit_loss', { precision: 10, scale: 2 }),
  evaluatedAt: timestamp('evaluated_at').defaultNow().notNull(),
});

// Value bets table
export const valueBets = pgTable('value_bets', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  betType: varchar('bet_type', { length: 50 }).notNull(),
  ourProbability: decimal('our_probability', { precision: 5, scale: 2 }).notNull(),
  bestOdds: decimal('best_odds', { precision: 6, scale: 2 }).notNull(),
  bookmaker: varchar('bookmaker', { length: 100 }).notNull(),
  edge: decimal('edge', { precision: 5, scale: 2 }).notNull(),
  kellyStake: decimal('kelly_stake', { precision: 5, scale: 2 }),
  tier: subscriptionPlanEnum('tier').notNull().default('pro'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
