CREATE TYPE "public"."subscription_plan" AS ENUM('free', 'pro', 'premium');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('active', 'expired', 'cancelled', 'trial');--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"api_football_id" integer NOT NULL,
	"home_team" varchar(255) NOT NULL,
	"home_team_id" integer NOT NULL,
	"away_team" varchar(255) NOT NULL,
	"away_team_id" integer NOT NULL,
	"league_name" varchar(255) NOT NULL,
	"league_id" integer NOT NULL,
	"kickoff" timestamp NOT NULL,
	"venue" varchar(255),
	"home_score" integer,
	"away_score" integer,
	"status" varchar(20) DEFAULT 'scheduled',
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "matches_api_football_id_unique" UNIQUE("api_football_id")
);
--> statement-breakpoint
CREATE TABLE "model_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"model_version" varchar(50) NOT NULL,
	"league_id" integer,
	"sample_size" integer NOT NULL,
	"accuracy_1x2" numeric(5, 4),
	"accuracy_ou" numeric(5, 4),
	"accuracy_btts" numeric(5, 4),
	"avg_brier_score" numeric(8, 6),
	"total_profit_loss" numeric(10, 2),
	"roi" numeric(8, 4),
	"calibration_slope" numeric(5, 4),
	"avg_clv" numeric(8, 6),
	"poisson_brier" numeric(8, 6),
	"llm_brier" numeric(8, 6),
	"poisson_accuracy" numeric(5, 4),
	"llm_accuracy" numeric(5, 4),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "performance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"prediction_id" uuid NOT NULL,
	"was_correct" boolean,
	"actual_result" varchar(20),
	"profit_loss" numeric(10, 2),
	"real_profit_loss" numeric(10, 2),
	"brier_score" numeric(8, 6),
	"over_under_correct" boolean,
	"btts_correct" boolean,
	"exact_score_correct" boolean,
	"evaluated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"prediction_data" jsonb NOT NULL,
	"confidence" numeric(5, 2) NOT NULL,
	"home_win_prob" numeric(5, 2),
	"draw_prob" numeric(5, 2),
	"away_win_prob" numeric(5, 2),
	"over_under_25" varchar(10),
	"over_under_25_prob" numeric(5, 2),
	"btts" boolean,
	"btts_prob" numeric(5, 2),
	"predicted_score" varchar(10),
	"poisson_home_prob" numeric(5, 2),
	"poisson_draw_prob" numeric(5, 2),
	"poisson_away_prob" numeric(5, 2),
	"poisson_over_25_prob" numeric(5, 2),
	"poisson_btts_prob" numeric(5, 2),
	"best_odds_home" numeric(6, 2),
	"best_odds_draw" numeric(6, 2),
	"best_odds_away" numeric(6, 2),
	"best_odds_over_25" numeric(6, 2),
	"best_odds_under_25" numeric(6, 2),
	"best_odds_btts_yes" numeric(6, 2),
	"best_odds_btts_no" numeric(6, 2),
	"tier" "subscription_plan" DEFAULT 'pro' NOT NULL,
	"model_version" varchar(50) DEFAULT 'v1',
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token" varchar(255) NOT NULL,
	"platform" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "push_tokens_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"plan" "subscription_plan" DEFAULT 'free' NOT NULL,
	"status" "subscription_status" DEFAULT 'active' NOT NULL,
	"revenuecat_id" varchar(255),
	"expires_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "value_bets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"bet_type" varchar(50) NOT NULL,
	"our_probability" numeric(5, 2) NOT NULL,
	"best_odds" numeric(6, 2) NOT NULL,
	"bookmaker" varchar(100) NOT NULL,
	"edge" numeric(5, 2) NOT NULL,
	"kelly_stake" numeric(5, 2),
	"result" varchar(20),
	"actual_profit_loss" numeric(10, 2),
	"closing_odds" numeric(6, 2),
	"tier" "subscription_plan" DEFAULT 'pro' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "performance" ADD CONSTRAINT "performance_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "push_tokens" ADD CONSTRAINT "push_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "value_bets" ADD CONSTRAINT "value_bets_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "matches_kickoff_idx" ON "matches" USING btree ("kickoff");--> statement-breakpoint
CREATE INDEX "matches_status_idx" ON "matches" USING btree ("status");--> statement-breakpoint
CREATE INDEX "matches_league_id_idx" ON "matches" USING btree ("league_id");--> statement-breakpoint
CREATE INDEX "model_metrics_date_idx" ON "model_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "model_metrics_model_version_idx" ON "model_metrics" USING btree ("model_version");--> statement-breakpoint
CREATE INDEX "predictions_match_id_idx" ON "predictions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "predictions_tier_idx" ON "predictions" USING btree ("tier");--> statement-breakpoint
CREATE INDEX "predictions_created_at_idx" ON "predictions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "push_tokens_user_id_idx" ON "push_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "value_bets_match_id_idx" ON "value_bets" USING btree ("match_id");