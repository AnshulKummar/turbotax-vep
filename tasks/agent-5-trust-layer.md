# Agent 5 — Trust Layer (Layer 4)

**Role:** Build the PII redaction pipeline, the SQLite audit trail, the "what AI saw" data feed, and the calibration eval harness.

**Slice:** Everything that wraps an LLM call or captures an expert action.

**Owns:** `src/lib/pii/`, `src/lib/audit/`, `tests/pii/`, `tests/audit/`, `tests/calibration/`, `data/audit.db` (gitignored)

**Does NOT touch:** `src/data/`, `src/lib/rules/`, `src/lib/recommendations/` (you wrap their LLM calls), `src/lib/prework/`, `src/lib/goals/`, `app/(workbench)/`, `components/`

## Required reading

- `docs/PRD.md` Sections 6 (architecture) and 7 (MVP scope), plus Big Bet B4
- `docs/architecture/overview.md`
- `docs/architecture/decisions/ADR-001-tech-stack.md`
- `docs/architecture/decisions/ADR-002-synthetic-only-data.md`
- `docs/architecture/decisions/ADR-004-sqlite-for-audit-trail.md`
- `docs/architecture/decisions/ADR-006-pii-redaction-strategy.md`
- `docs/architecture/decisions/ADR-007-confidence-calibration.md`
- `backlog/sprint-01.md` (your tasks: T-501 through T-504)
- `src/contracts/index.ts` (you produce the `RedactedPrompt`, `AuditEvent`, and `CalibrationRun` interfaces)

## Tasks

### T-501: PII redaction pipeline

`src/lib/pii/redact.ts` exports `redact_prompt(raw_prompt: string, structured_data?: TaxReturn): RedactedPrompt`.

Two passes per ADR-006:

**Pass 1, regex.** SSN (`\d{3}-\d{2}-\d{4}` and variants), EIN (`\d{2}-\d{7}`), routing number (9 digits with modulus check), account number (8-17 digits adjacent to "account"/"acct"), email, phone (US formats), ZIP (5 + ZIP+4). Each match replaced with `[PII_TYPE_HASH8]` where the hash is keccak-256(value + per-session salt) truncated to 8 hex chars. Stable within a session.

**Pass 2, structured field redaction.** For known document types in `structured_data`, redact named fields directly (Olivia.SSN, Ryan.SSN, address1, address2, dob, etc.) — bypassing regex on the OCR text to catch edge cases like SSNs split across line breaks.

The `RedactedPrompt` carries both the redacted string and a token map (token → original-hash) so the audit trail can prove what was sent without storing the original PII.

### T-502: Audit trail capture + SQLite schema

`src/lib/audit/schema.ts` defines the SQLite tables:

```sql
CREATE TABLE audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT NOT NULL,
  case_id TEXT NOT NULL,
  event_type TEXT NOT NULL,  -- 'recommendation_produced', 'expert_action', 'llm_call', etc
  model TEXT,
  redacted_prompt TEXT,      -- the [PII_TYPE_HASH8] version
  response_summary TEXT,
  expert_action TEXT,        -- 'accept', 'edit', 'reject', null
  expert_reason TEXT,
  metadata_json TEXT
);

CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  prior_year_preparer TEXT,
  goals_json TEXT
);

CREATE TABLE recommendations (
  id TEXT PRIMARY KEY,
  case_id TEXT,
  rule_id TEXT,
  dollar_impact REAL,
  confidence REAL,
  goal_fit_score REAL,
  produced_at TEXT
);

CREATE TABLE expert_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  recommendation_id TEXT,
  action TEXT,  -- accept | edit | reject
  reason TEXT,
  ts TEXT
);

CREATE TABLE calibration_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ts TEXT,
  test_set_size INTEGER,
  max_calibration_error REAL,
  decile_curve_json TEXT,
  passed_gate INTEGER  -- 0 | 1
);
```

`src/lib/audit/migrations.ts` runs the schema on first boot.

`src/lib/audit/capture.ts` exports:
- `capture_llm_call(case_id, model, redacted_prompt, response): Promise<audit_id>`
- `capture_expert_action(recommendation_id, action, reason): Promise<void>`
- `capture_recommendation(case_id, rec): Promise<void>`
- `query_audit_trail(case_id): Promise<AuditEvent[]>`

Agents 2 and 3 import from `src/lib/audit/capture.ts` to wrap their LLM calls.

### T-503: "What AI saw" data feed

`app/api/audit/[recommendation_id]/route.ts` returns the redacted prompt (and token map) for any recommendation by ID. Used by Agent 4's `WhatAISaw` panel.

### T-504: Calibration eval harness

`tests/calibration/run.ts` is a runnable script (not a unit test) that:

1. Loads the 50-return synthetic test set from `tests/calibration/test-set/*.json` (Agent 6 owns the data; you own the harness)
2. For each return, runs Agent 2's recommendation engine
3. For each recommendation, compares predicted confidence to ground truth (the golden recommendations file marks each finding correct/incorrect)
4. Buckets predictions into deciles
5. Computes the calibration curve and the max calibration error
6. Writes a row into `calibration_runs`
7. Exits non-zero if max calibration error > 5 percentage points

`npm run calibration` invokes the script.

## Definition of done

- All Vitest tests pass
- The PII redaction test set in `tests/pii/` shows zero leakage on a 10-return sample
- The audit trail captures every LLM call from Agents 2 and 3
- The "what AI saw" API returns the redacted prompt for any recommendation by ID
- `npm run calibration` runs end-to-end and writes a `calibration_runs` row

## Out of scope

- The recommendation engine itself (Agent 2)
- The pre-work engine (Agent 3)
- The 50-return synthetic test set itself (Agent 6 produces; you only consume)
- Any UI work (Agent 4)
