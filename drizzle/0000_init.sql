CREATE TABLE "audit_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"ts" text NOT NULL,
	"case_id" text NOT NULL,
	"event_type" text NOT NULL,
	"model" text,
	"redacted_prompt" text,
	"response_summary" text,
	"expert_action" text,
	"expert_reason" text,
	"metadata_json" text
);
--> statement-breakpoint
CREATE TABLE "calibration_runs" (
	"id" serial PRIMARY KEY NOT NULL,
	"ts" text,
	"test_set_size" integer,
	"max_calibration_error" real,
	"decile_curve_json" text,
	"passed_gate" integer
);
--> statement-breakpoint
CREATE TABLE "customers" (
	"id" text PRIMARY KEY NOT NULL,
	"display_name" text,
	"prior_year_preparer" text,
	"goals_json" text
);
--> statement-breakpoint
CREATE TABLE "expert_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"recommendation_id" text,
	"action" text,
	"reason" text,
	"ts" text
);
--> statement-breakpoint
CREATE TABLE "intake_sessions" (
	"intake_id" serial PRIMARY KEY NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL,
	"goals" jsonb NOT NULL,
	"ip_hash" text NOT NULL,
	"user_agent_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendations" (
	"id" text PRIMARY KEY NOT NULL,
	"case_id" text,
	"rule_id" text,
	"dollar_impact" real,
	"confidence" real,
	"goal_fit_score" real,
	"produced_at" text
);
--> statement-breakpoint
CREATE INDEX "idx_audit_events_case_id" ON "audit_events" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "idx_audit_events_ts" ON "audit_events" USING btree ("ts");--> statement-breakpoint
CREATE INDEX "idx_expert_actions_recommendation_id" ON "expert_actions" USING btree ("recommendation_id");--> statement-breakpoint
CREATE INDEX "idx_recommendations_case_id" ON "recommendations" USING btree ("case_id");