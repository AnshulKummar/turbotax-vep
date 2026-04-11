# Sprint 1 — MVP

**Goal:** Demo Big Bet B1 (Goal Aligned Recommendation System) end-to-end on the Layer 3 Workbench against the synthetic Olivia and Ryan Mitchell Form 1040.

**Definition of done:** the live demo walk-through (`docs/demo-script.md`) runs from goal capture through audit trail with zero manual intervention. All Sprint 1 tasks below are complete and tested.

## Tasks

### Agent 1 — Domain & Data

| ID | Task | Definition of done |
|---|---|---|
| T-101 | Build the Olivia and Ryan Mitchell synthetic return data structure | `src/data/mitchell-return.ts` exports a typed object covering W-2 (both spouses), 1099-B with mixed wash sale lots, K-1 from a small partnership, 1098 mortgage interest, HSA contributions, residential rental income/expenses, prior-year 1040, IL and CA state obligations. All numbers reconcile. Vitest snapshot test passes. |
| T-102 | Build the 50-rule deterministic tax corpus | `src/lib/rules/index.ts` exports 50 rules covering: wash sale Code W on Form 8949 (rule 1-3), Form 8889 HSA contribution limits and Schedule 1 deduction (4-7), RSU income reconciliation between W-2 Box 1 and 1099-B (8-11), IRC §469 passive activity loss limits (12-15), depreciation allocation (land vs building per county records, Pub 527) (16-19), foreign tax credit Form 1116 triggers (20-22), SALT cap with TY2025 $40K MFJ correction from prior $10K (23-25), retirement contribution headroom (IRA, 401k, SEP, solo 401k) (26-30), state PTET election eligibility (31-33), Section 121 home sale exclusion (34-36), credit eligibility (CTC, EITC, education credits, dependent care) (37-42), AMT triggers including ISO exercise (43-46), estimated tax safe harbor (47-50). Each rule has: id, name, IRC citation, severity, dollar impact estimator function, evaluator function. Vitest unit tests for every rule. |
| T-103 | Build the golden recommendations file | `src/data/golden-recommendations.json` lists every recommendation the engine must produce on the Mitchell return, with expected goal mapping and dollar impact range. Used by Agent 2's tests and Agent 6's integration tests. |

### Agent 2 — Recommendation Engine (B1)

| ID | Task | Definition of done |
|---|---|---|
| T-201 | Goal taxonomy + intake schema | `src/lib/goals/taxonomy.ts` exports the 10-goal Zod schema from ADR-005. `src/lib/goals/intake.ts` exports the validation + persistence functions. Vitest tests cover all 10 goals + free text. |
| T-202 | Recommendation engine, rule-first / LLM-second | `src/lib/recommendations/engine.ts` runs the deterministic rules engine (consuming Agent 1's corpus), then passes the findings + customer goals + customer context to Claude `claude-sonnet-4-6` for ranking, scoring, and explanation. The LLM is not allowed to invent findings (ADR-003). Returns a ranked `Recommendation[]`. |
| T-203 | Goal fit scoring | `src/lib/recommendations/goal-fit.ts` scores each recommendation against the customer's goal vector. Each recommendation carries a per-goal fit score and a composite score. Vitest tests assert that changing the goal mix changes the ranking on the Mitchell return. |
| T-204 | API route | `app/api/recommendations/route.ts` accepts the customer + goals + return data, calls the engine, returns `Recommendation[]` with audit context for Layer 4. |

### Agent 3 — Pre-Work Engine (B3 mock)

| ID | Task | Definition of done |
|---|---|---|
| T-301 | Mocked OCR output schema | `src/lib/prework/ocr.ts` exports a `MockedOCROutput` type and a function that returns the Mitchell return as if a real OCR had produced it (with confidence scores per field). |
| T-302 | Year-over-year delta engine | `src/lib/prework/yoy-delta.ts` compares current year to prior year and surfaces every line change above a threshold with a plain-language explanation. |
| T-303 | Complexity scorer | `src/lib/prework/complexity.ts` computes a 1-10 complexity score from the return structure (presence of K-1, RSU, multi-state, rental, etc). |
| T-304 | Risk register builder | `src/lib/prework/risk-register.ts` consumes the rules engine output + complexity score and produces a ranked risk register with top 10 entries. |
| T-305 | API route | `app/api/prework/route.ts` returns the full `PreWorkOutput` (OCR + YoY delta + complexity + risk register). |

### Agent 4 — Workbench UI (Layer 3)

| ID | Task | Definition of done |
|---|---|---|
| T-401 | Next.js app shell + dark theme + routing | `app/layout.tsx`, `app/(workbench)/layout.tsx`, Tailwind 4 dark theme tokens, basic routing |
| T-402 | Routing rationale chip | Single hardcoded chip at the top of the workbench with all 4 routing dimensions visible |
| T-403 | Customer context header | Customer name, prior expert notes, prior year preparer name, prior year return summary |
| T-404 | Goal dashboard panel | Renders the customer's 3 ranked goals + per-goal progress as recommendations are accepted |
| T-405 | Return surface with confidence scores | Pre-populated 1040 lines with confidence scores per line, click-through to source document |
| T-406 | Risk register panel | Top 10 ranked findings with severity, dollar impact, IRC citation |
| T-407 | AI suggested questions panel | Ranked by goal fit, with the goal each question serves |
| T-408 | Live quality co-pilot | Flags inconsistencies as the expert edits (forced demo: a wash sale lot mismatch) |
| T-409 | "What AI saw" panel | Renders the redacted prompt for the most recent recommendation |
| T-410 | Audit trail timeline panel | Queryable list of every AI suggestion and expert action |
| T-411 | Expert minutes counter | Ticks against the legacy and TY2025 baselines, color-coded |

### Agent 5 — Trust Layer (Layer 4)

| ID | Task | Definition of done |
|---|---|---|
| T-501 | PII redaction pipeline (regex + structured) | `src/lib/pii/redact.ts` implements both passes from ADR-006. Stable per-session token hashing. Test set in `tests/pii/` covers SSN, EIN, address, DOB, account, dependent SSN, with zero-leakage assertion. |
| T-502 | Audit trail capture + SQLite schema | `src/lib/audit/schema.ts`, `src/lib/audit/migrations.ts`, `src/lib/audit/capture.ts`. Tables from ADR-004. Every recommendation, expert action, and prompt is captured. |
| T-503 | "What AI saw" data feed | API route returning the redacted prompt for any recommendation by ID |
| T-504 | Calibration eval harness | `tests/calibration/run.ts` runs the recommendation engine against a 50-return synthetic test set and produces a calibration curve. CI gate at max calibration error <= 5 percentage points. |

### Agent 6 — Quality, Tests, & Demo

| ID | Task | Definition of done |
|---|---|---|
| T-601 | Cross-slice integration tests | `tests/integration/end-to-end.test.ts` walks through goal capture → pre-work → recommendations → expert actions → audit trail on the Mitchell return |
| T-602 | Demo walk-through script | `docs/demo-script.md` step-by-step matches the 10 demo points in `docs/PRD.md` Section 7 |
| T-603 | 50-return synthetic test set | `tests/calibration/test-set/*.json` (50 files) covering the parameter sweep from ADR-007 |
| T-604 | Success metric dashboard route | `app/(workbench)/metrics/page.tsx` renders the Section 8 success metrics live from the audit trail |
| T-605 | Wire CI gate for calibration | `.github/workflows/ci.yml` runs Vitest + calibration eval, blocks merge on regressions |

## Sequencing

1. **Phase 0 (now, before agents launch).** Pin contracts in `src/contracts/index.ts` per ADR-008. This is the only file that must exist before Sprint 1 starts.
2. **Phase 1 (Agent 1, sequential).** T-101, T-102, T-103. Foundation slice.
3. **Phase 2 (Agents 2, 3, 4, 5 in parallel; Agent 6 starts in parallel for integration prep).** All other tasks. The Agent tool launches all five in a single message.
4. **Phase 3 (Agent 6 finishes).** Integration tests, demo script, success metric dashboard, CI wire-up.

## Risks

- Contract drift between Agents 2/3 and Agent 4. Mitigated by Phase 0 contract pinning and Agent 6 watching for drift.
- Calibration target (5pp max error) may be hard to hit on the first pass. Mitigated by allowing the first run to be a baseline and tightening over the sprint.
- Anthropic API rate limits during 50-return calibration eval. Mitigated by caching responses keyed on (prompt hash, model) so reruns are free.
