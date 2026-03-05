-- Migration: Add prediction quality fields
-- Adds O/U probability, BTTS probability, Poisson baselines, bookmaker odds,
-- comprehensive performance tracking, and value bet outcome fields.

-- Predictions: O/U and BTTS probabilities
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "over_under_25_prob" decimal(5, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "btts_prob" decimal(5, 2);

-- Predictions: Poisson model baselines
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "poisson_home_prob" decimal(5, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "poisson_draw_prob" decimal(5, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "poisson_away_prob" decimal(5, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "poisson_over_25_prob" decimal(5, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "poisson_btts_prob" decimal(5, 2);

-- Predictions: Best bookmaker odds at time of prediction
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_home" decimal(6, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_draw" decimal(6, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_away" decimal(6, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_over_25" decimal(6, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_under_25" decimal(6, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_btts_yes" decimal(6, 2);
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "best_odds_btts_no" decimal(6, 2);

-- Predictions: Model version tracking
ALTER TABLE "predictions" ADD COLUMN IF NOT EXISTS "model_version" varchar(50) DEFAULT 'v1';

-- Performance: Comprehensive tracking
ALTER TABLE "performance" ADD COLUMN IF NOT EXISTS "real_profit_loss" decimal(10, 2);
ALTER TABLE "performance" ADD COLUMN IF NOT EXISTS "brier_score" decimal(8, 6);
ALTER TABLE "performance" ADD COLUMN IF NOT EXISTS "over_under_correct" boolean;
ALTER TABLE "performance" ADD COLUMN IF NOT EXISTS "btts_correct" boolean;
ALTER TABLE "performance" ADD COLUMN IF NOT EXISTS "exact_score_correct" boolean;

-- Value bets: Outcome tracking
ALTER TABLE "value_bets" ADD COLUMN IF NOT EXISTS "result" varchar(20);
ALTER TABLE "value_bets" ADD COLUMN IF NOT EXISTS "actual_profit_loss" decimal(10, 2);
ALTER TABLE "value_bets" ADD COLUMN IF NOT EXISTS "closing_odds" decimal(6, 2);
