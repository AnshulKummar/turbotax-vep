ALTER TABLE "intake_sessions" ADD COLUMN "selected_recommendations" jsonb;
--> statement-breakpoint
ALTER TABLE "intake_sessions" ADD COLUMN "customer_approvals" jsonb;