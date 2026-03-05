CREATE TABLE "prediction_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"prediction_id" uuid NOT NULL,
	"version_no" integer NOT NULL,
	"model_version" varchar(50) DEFAULT 'council-v1' NOT NULL,
	"tier" "subscription_plan" DEFAULT 'pro' NOT NULL,
	"system_prompt" text NOT NULL,
	"user_prompt" text NOT NULL,
	"prompt_hash" varchar(64) NOT NULL,
	"prediction_snapshot" jsonb NOT NULL,
	"council_trace" jsonb,
	"home_win_prob" numeric(5, 2),
	"draw_prob" numeric(5, 2),
	"away_win_prob" numeric(5, 2),
	"over_under_25" varchar(10),
	"over_under_25_prob" numeric(5, 2),
	"btts" boolean,
	"btts_prob" numeric(5, 2),
	"predicted_score" varchar(10),
	"confidence" numeric(5, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "prediction_versions" ADD CONSTRAINT "prediction_versions_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prediction_versions" ADD CONSTRAINT "prediction_versions_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "prediction_versions_match_version_unique" ON "prediction_versions" USING btree ("match_id","version_no");--> statement-breakpoint
CREATE INDEX "prediction_versions_match_idx" ON "prediction_versions" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "prediction_versions_prediction_idx" ON "prediction_versions" USING btree ("prediction_id");--> statement-breakpoint
CREATE INDEX "prediction_versions_created_at_idx" ON "prediction_versions" USING btree ("created_at");