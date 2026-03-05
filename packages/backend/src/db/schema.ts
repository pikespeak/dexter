import { pgTable, uuid, varchar, text, timestamp, integer, boolean, jsonb, pgEnum, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';

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
}, (table) => [
  index('matches_kickoff_idx').on(table.kickoff),
  index('matches_status_idx').on(table.status),
  index('matches_league_id_idx').on(table.leagueId),
]);

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
  overUnder25Prob: decimal('over_under_25_prob', { precision: 5, scale: 2 }),
  btts: boolean('btts'),
  bttsProb: decimal('btts_prob', { precision: 5, scale: 2 }),
  predictedScore: varchar('predicted_score', { length: 10 }),
  // Poisson model baseline probabilities (stored for comparison)
  poissonHomeProb: decimal('poisson_home_prob', { precision: 5, scale: 2 }),
  poissonDrawProb: decimal('poisson_draw_prob', { precision: 5, scale: 2 }),
  poissonAwayProb: decimal('poisson_away_prob', { precision: 5, scale: 2 }),
  poissonOver25Prob: decimal('poisson_over_25_prob', { precision: 5, scale: 2 }),
  poissonBttsProb: decimal('poisson_btts_prob', { precision: 5, scale: 2 }),
  // Best bookmaker odds at time of prediction (for real P/L calculation)
  bestOddsHome: decimal('best_odds_home', { precision: 6, scale: 2 }),
  bestOddsDraw: decimal('best_odds_draw', { precision: 6, scale: 2 }),
  bestOddsAway: decimal('best_odds_away', { precision: 6, scale: 2 }),
  bestOddsOver25: decimal('best_odds_over_25', { precision: 6, scale: 2 }),
  bestOddsUnder25: decimal('best_odds_under_25', { precision: 6, scale: 2 }),
  bestOddsBttsYes: decimal('best_odds_btts_yes', { precision: 6, scale: 2 }),
  bestOddsBttsNo: decimal('best_odds_btts_no', { precision: 6, scale: 2 }),
  tier: subscriptionPlanEnum('tier').notNull().default('pro'),
  modelVersion: varchar('model_version', { length: 50 }).default('v1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('predictions_match_id_idx').on(table.matchId),
  index('predictions_tier_idx').on(table.tier),
  index('predictions_created_at_idx').on(table.createdAt),
]);

// Prediction versions table (append-only history per match)
export const predictionVersions = pgTable('prediction_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  matchId: uuid('match_id').notNull().references(() => matches.id),
  predictionId: uuid('prediction_id').notNull().references(() => predictions.id),
  versionNo: integer('version_no').notNull(),
  modelVersion: varchar('model_version', { length: 50 }).notNull().default('council-v1'),
  tier: subscriptionPlanEnum('tier').notNull().default('pro'),
  systemPrompt: text('system_prompt').notNull(),
  userPrompt: text('user_prompt').notNull(),
  promptHash: varchar('prompt_hash', { length: 64 }).notNull(),
  predictionSnapshot: jsonb('prediction_snapshot').notNull(),
  councilTrace: jsonb('council_trace'),
  homeWinProb: decimal('home_win_prob', { precision: 5, scale: 2 }),
  drawProb: decimal('draw_prob', { precision: 5, scale: 2 }),
  awayWinProb: decimal('away_win_prob', { precision: 5, scale: 2 }),
  overUnder25: varchar('over_under_25', { length: 10 }),
  overUnder25Prob: decimal('over_under_25_prob', { precision: 5, scale: 2 }),
  btts: boolean('btts'),
  bttsProb: decimal('btts_prob', { precision: 5, scale: 2 }),
  predictedScore: varchar('predicted_score', { length: 10 }),
  confidence: decimal('confidence', { precision: 5, scale: 2 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('prediction_versions_match_version_unique').on(table.matchId, table.versionNo),
  index('prediction_versions_match_idx').on(table.matchId),
  index('prediction_versions_prediction_idx').on(table.predictionId),
  index('prediction_versions_created_at_idx').on(table.createdAt),
]);

// Performance tracking table
export const performance = pgTable('performance', {
  id: uuid('id').primaryKey().defaultRandom(),
  predictionId: uuid('prediction_id').notNull().references(() => predictions.id),
  wasCorrect: boolean('was_correct'),
  actualResult: varchar('actual_result', { length: 20 }),
  profitLoss: decimal('profit_loss', { precision: 10, scale: 2 }),
  // Real P/L using actual bookmaker odds
  realProfitLoss: decimal('real_profit_loss', { precision: 10, scale: 2 }),
  // Brier Score: (predicted_prob - actual_outcome)^2 for 1X2
  brierScore: decimal('brier_score', { precision: 8, scale: 6 }),
  // O/U and BTTS evaluation
  overUnderCorrect: boolean('over_under_correct'),
  bttsCorrect: boolean('btts_correct'),
  exactScoreCorrect: boolean('exact_score_correct'),
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
  // Result tracking for value bets
  result: varchar('result', { length: 20 }), // 'won' | 'lost' | 'void'
  actualProfitLoss: decimal('actual_profit_loss', { precision: 10, scale: 2 }),
  closingOdds: decimal('closing_odds', { precision: 6, scale: 2 }),
  tier: subscriptionPlanEnum('tier').notNull().default('pro'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('value_bets_match_id_idx').on(table.matchId),
]);

// Model metrics — daily snapshots of model performance
export const modelMetrics = pgTable('model_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  date: timestamp('date').notNull(),
  modelVersion: varchar('model_version', { length: 50 }).notNull(),
  leagueId: integer('league_id'),
  sampleSize: integer('sample_size').notNull(),
  accuracy1X2: decimal('accuracy_1x2', { precision: 5, scale: 4 }),
  accuracyOU: decimal('accuracy_ou', { precision: 5, scale: 4 }),
  accuracyBTTS: decimal('accuracy_btts', { precision: 5, scale: 4 }),
  avgBrierScore: decimal('avg_brier_score', { precision: 8, scale: 6 }),
  totalProfitLoss: decimal('total_profit_loss', { precision: 10, scale: 2 }),
  roi: decimal('roi', { precision: 8, scale: 4 }),
  calibrationSlope: decimal('calibration_slope', { precision: 5, scale: 4 }),
  avgClv: decimal('avg_clv', { precision: 8, scale: 6 }),
  poissonBrier: decimal('poisson_brier', { precision: 8, scale: 6 }),
  llmBrier: decimal('llm_brier', { precision: 8, scale: 6 }),
  poissonAccuracy: decimal('poisson_accuracy', { precision: 5, scale: 4 }),
  llmAccuracy: decimal('llm_accuracy', { precision: 5, scale: 4 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('model_metrics_date_idx').on(table.date),
  index('model_metrics_model_version_idx').on(table.modelVersion),
]);

// Push notification tokens table
export const pushTokens = pgTable('push_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id),
  token: varchar('token', { length: 255 }).notNull().unique(),
  platform: varchar('platform', { length: 10 }).notNull(), // 'ios' | 'android'
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('push_tokens_user_id_idx').on(table.userId),
]);
