# Agent 2 — Recommendation Engine (B1 anchor bet)

**Role:** Build the goal-aligned recommendation engine that is the anchor of Big Bet B1.

**Slice:** Goal taxonomy + intake schema + rule-first / LLM-second recommendation engine + goal-fit scoring + API route.

**Owns:** `src/lib/goals/`, `src/lib/recommendations/`, `app/api/recommendations/route.ts`, `tests/recommendations/`, `tests/goals/`

**Does NOT touch:** `src/data/`, `src/lib/rules/` (consumes only), `src/lib/prework/`, `src/lib/pii/`, `src/lib/audit/`, `app/(workbench)/`, `components/`

## Required reading

- `docs/PRD.md` Sections 3, 4, 5, Part I (especially B1), and Section 7 (MVP scope)
- `docs/architecture/overview.md`
- `docs/architecture/decisions/ADR-001-tech-stack.md`
- `docs/architecture/decisions/ADR-003-deterministic-rules-as-safety-net.md` (critical: you may not invent findings outside the rules engine)
- `docs/architecture/decisions/ADR-005-goal-taxonomy.md`
- `docs/architecture/decisions/ADR-007-confidence-calibration.md`
- `backlog/sprint-01.md` (your tasks: T-201, T-202, T-203, T-204)
- `src/contracts/index.ts` (the cross-layer contracts you must produce — write the `Recommendation` and `Goal` interfaces)
- Agent 1's outputs: `src/data/mitchell-return.ts`, `src/lib/rules/index.ts`, `src/data/golden-recommendations.json`

## Tasks

### T-201: Goal taxonomy + intake schema

`src/lib/goals/taxonomy.ts` exports the 10-goal Zod schema from ADR-005, plus the free-text "other" field, plus the rank + weight + rationale structure.

`src/lib/goals/intake.ts` exports `validate_intake()` and `persist_intake()`.

Vitest tests cover:
- All 10 goals validate
- Free text "other" goal validates
- Rank must be 1-3 (top three only)
- Weight must be 1-5
- Goal vector tags from ADR-005 are correctly attached

### T-202: Recommendation engine (rule-first / LLM-second)

`src/lib/recommendations/engine.ts` exports `produce_recommendations(return_data, goals, customer_context): Promise<Recommendation[]>`.

Flow per ADR-003:
1. Run the deterministic rules engine from `src/lib/rules/` against `return_data`. Collect all `RuleFinding[]`.
2. Build a single LLM prompt that contains: the customer's stated goals + weights + rationales, the customer context (prior year preparer, prior year notes, complexity score from Agent 3), and the rule findings.
3. Call Claude `claude-sonnet-4-6` via the Anthropic SDK with the prompt. The system prompt explicitly forbids inventing findings outside the rule engine output.
4. Parse the LLM response into a ranked `Recommendation[]`. Each recommendation maps 1:1 to a rule finding (or, in the rare case the LLM adds context, is flagged `llm_only: true` with confidence capped at 0.5).
5. Score each recommendation against the customer's goal vector via Agent 2 T-203.
6. Return the ranked list.

**Wrap every LLM call with PII redaction from `src/lib/pii/redact.ts` (Agent 5)** — do not call the Anthropic SDK directly with raw return data.

**Wrap every LLM call with audit capture from `src/lib/audit/capture.ts` (Agent 5)** — every prompt, response, and recommendation must land in the audit trail.

Vitest tests:
- Running the engine against the Mitchell return produces at least 8 recommendations
- Every recommendation in `src/data/golden-recommendations.json` marked `must_appear: true` is in the output
- Every recommendation has a goal fit score in [0, 1]
- Every recommendation has a confidence score in [0, 1]
- Every recommendation has a rule citation
- The engine refuses to invent findings (test: ask the LLM via system prompt to invent a fake credit; assert it does not appear)

### T-203: Goal fit scoring

`src/lib/recommendations/goal-fit.ts` exports `score_recommendation(rec, goals): GoalFitResult`.

The score combines:
- Tag overlap between the recommendation's category and the goal's tag vector (ADR-005)
- The customer's weight on the goal
- Whether the recommendation's dollar impact is positive (favors `maximize_refund`) or audit-risk-reducing (favors `minimize_audit_risk`)

Vitest tests:
- Changing the goal mix from {maximize_refund: 5} to {minimize_audit_risk: 5} reorders the Mitchell return's recommendations
- A `harvest_losses` goal raises wash sale recommendations to the top
- A `plan_life_event` goal raises Section 121 / dependent / CTC recommendations to the top

### T-204: API route

`app/api/recommendations/route.ts` accepts `{ return_data, goals, customer_context }` and returns `{ recommendations: Recommendation[], audit_id: string }`.

Use Next.js 16 App Router route handler. Validate input with the Zod schemas. Errors return `{ error: "..." }` with appropriate status codes.

**Definition of done:** `npm test` passes for all your tests; the API route returns the expected recommendations against the Mitchell return; the audit_id field references a real entry in the SQLite audit trail (Agent 5).

## Out of scope

- Any UI work
- The deterministic rules engine itself (Agent 1 owns it)
- The pre-work engine (Agent 3 owns it)
- The PII redaction pipeline (Agent 5 owns it; you consume it)
- The audit trail capture (Agent 5 owns it; you consume it)
- The calibration eval harness (Agent 5 owns it)
