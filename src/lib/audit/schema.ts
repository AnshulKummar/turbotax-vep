/**
 * Drizzle Postgres schema for the audit trail.
 *
 * Per AD-S2-02 the audit trail moved off better-sqlite3 onto Neon Postgres
 * via Drizzle ORM. The same five logical tables ride along — `audit_events`
 * is the chronological case timeline, the rest are denormalised views the
 * "what AI saw" feed reads from in a single query.
 *
 * The intake_sessions table is added by T-703 for the public Sprint 2 demo
 * (see ./../intake/store.ts). It lives here so a single Drizzle config
 * picks up every table on the audit DB.
 */

import {
  index,
  integer,
  jsonb,
  pgTable,
  real,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// audit_events — chronological case timeline
// ---------------------------------------------------------------------------

export const audit_events = pgTable(
  "audit_events",
  {
    id: serial("id").primaryKey(),
    ts: text("ts").notNull(),
    case_id: text("case_id").notNull(),
    event_type: text("event_type").notNull(),
    model: text("model"),
    redacted_prompt: text("redacted_prompt"),
    response_summary: text("response_summary"),
    expert_action: text("expert_action"),
    expert_reason: text("expert_reason"),
    metadata_json: text("metadata_json"),
  },
  (t) => [
    index("idx_audit_events_case_id").on(t.case_id),
    index("idx_audit_events_ts").on(t.ts),
  ],
);

// ---------------------------------------------------------------------------
// customers — denormalised customer card
// ---------------------------------------------------------------------------

export const customers = pgTable("customers", {
  id: text("id").primaryKey(),
  display_name: text("display_name"),
  prior_year_preparer: text("prior_year_preparer"),
  goals_json: text("goals_json"),
});

// ---------------------------------------------------------------------------
// recommendations — denormalised recommendation row
// ---------------------------------------------------------------------------

export const recommendations = pgTable(
  "recommendations",
  {
    id: text("id").primaryKey(),
    case_id: text("case_id"),
    rule_id: text("rule_id"),
    dollar_impact: real("dollar_impact"),
    confidence: real("confidence"),
    goal_fit_score: real("goal_fit_score"),
    produced_at: text("produced_at"),
  },
  (t) => [index("idx_recommendations_case_id").on(t.case_id)],
);

// ---------------------------------------------------------------------------
// expert_actions — accept/edit/reject/defer log
// ---------------------------------------------------------------------------

export const expert_actions = pgTable(
  "expert_actions",
  {
    id: serial("id").primaryKey(),
    recommendation_id: text("recommendation_id"),
    action: text("action"),
    reason: text("reason"),
    ts: text("ts"),
  },
  (t) => [
    index("idx_expert_actions_recommendation_id").on(t.recommendation_id),
  ],
);

// ---------------------------------------------------------------------------
// calibration_runs — ADR-007 calibration eval rows
// ---------------------------------------------------------------------------

export const calibration_runs = pgTable("calibration_runs", {
  id: serial("id").primaryKey(),
  ts: text("ts"),
  test_set_size: integer("test_set_size"),
  max_calibration_error: real("max_calibration_error"),
  decile_curve_json: text("decile_curve_json"),
  passed_gate: integer("passed_gate"),
});

// ---------------------------------------------------------------------------
// intake_sessions — T-703 public Sprint 2 demo intake persistence
// ---------------------------------------------------------------------------

export const intake_sessions = pgTable(
  "intake_sessions",
  {
    intake_id: serial("intake_id").primaryKey(),
    captured_at: timestamp("captured_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    goals: jsonb("goals").notNull(),
    ip_hash: text("ip_hash").notNull(),
    user_agent_hash: text("user_agent_hash").notNull(),
    expires_at: timestamp("expires_at", { withTimezone: true }).notNull(),
    customer_metadata: jsonb("customer_metadata"),
    selected_recommendations: jsonb("selected_recommendations"),
    customer_approvals: jsonb("customer_approvals"),
  },
  (t) => [index("idx_intake_sessions_expires_at").on(t.expires_at)],
);

// ---------------------------------------------------------------------------
// Compatibility surface for legacy callers (tests)
// ---------------------------------------------------------------------------

export const AUDIT_TABLES = [
  "audit_events",
  "customers",
  "recommendations",
  "expert_actions",
  "calibration_runs",
] as const;

export type AuditTableName = (typeof AUDIT_TABLES)[number];
