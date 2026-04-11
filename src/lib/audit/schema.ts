/**
 * SQLite schema definitions for the audit trail.
 *
 * Per ADR-004, we use better-sqlite3 with a local file at
 * `process.env.AUDIT_DB_PATH || ./data/audit.db`. Schema is declared as a
 * single SQL string so `migrations.ts` can run it idempotently on first
 * boot. Every CREATE uses `IF NOT EXISTS` so repeated invocations are safe.
 */

export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  case_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  model TEXT,
  redacted_prompt TEXT,
  response_summary TEXT,
  expert_action TEXT,
  expert_reason TEXT,
  metadata_json TEXT
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  prior_year_preparer TEXT,
  goals_json TEXT
);

CREATE TABLE IF NOT EXISTS recommendations (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  rule_id TEXT,
  dollar_impact REAL,
  confidence REAL,
  goal_fit_score REAL,
  produced_at TEXT
);

CREATE TABLE IF NOT EXISTS expert_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_id TEXT,
  action TEXT,
  reason TEXT,
  ts TEXT
);

CREATE TABLE IF NOT EXISTS calibration_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT,
  test_set_size INTEGER,
  max_calibration_error REAL,
  decile_curve_json TEXT,
  passed_gate INTEGER
);

CREATE INDEX IF NOT EXISTS idx_audit_events_case_id ON audit_events (case_id);
CREATE INDEX IF NOT EXISTS idx_audit_events_ts ON audit_events (ts);
CREATE INDEX IF NOT EXISTS idx_recommendations_case_id ON recommendations (case_id);
CREATE INDEX IF NOT EXISTS idx_expert_actions_recommendation_id ON expert_actions (recommendation_id);
`;

export const AUDIT_TABLES = [
  "audit_events",
  "customers",
  "recommendations",
  "expert_actions",
  "calibration_runs",
] as const;

export type AuditTableName = (typeof AUDIT_TABLES)[number];
