ALTER TABLE "intake_sessions" ADD COLUMN "customer_metadata" jsonb;
--> statement-breakpoint
CREATE INDEX "idx_intake_sessions_expires_at" ON "intake_sessions" USING btree ("expires_at");