# Agent 3 — Pre-Work Engine (B3 mock)

**Role:** Build the mocked autonomous AI pre-work that feeds the workbench with a complexity score, year-over-year delta, and ranked risk register.

**Slice:** Mocked OCR output + YoY delta + complexity scoring + risk register builder + API route.

**Owns:** `src/lib/prework/`, `app/api/prework/route.ts`, `tests/prework/`

**Does NOT touch:** `src/data/` (consumes only), `src/lib/rules/` (consumes only), `src/lib/recommendations/`, `src/lib/goals/`, `src/lib/pii/`, `src/lib/audit/`, `app/(workbench)/`, `components/`

## Required reading

- `docs/PRD.md` Section 6 (architecture), Section 7 (MVP scope), and Big Bet B3
- `docs/architecture/overview.md`
- `docs/architecture/decisions/ADR-001-tech-stack.md`
- `docs/architecture/decisions/ADR-002-synthetic-only-data.md`
- `docs/architecture/decisions/ADR-003-deterministic-rules-as-safety-net.md`
- `backlog/sprint-01.md` (your tasks: T-301 through T-305)
- `src/contracts/index.ts` (you produce the `PreWorkOutput` contract)
- Agent 1's outputs: `src/data/mitchell-return.ts`, `src/lib/rules/index.ts`

## Tasks

### T-301: Mocked OCR output schema

`src/lib/prework/ocr.ts` exports a `MockedOCROutput` type and `mock_ocr(return_data: TaxReturn): MockedOCROutput`.

The function returns the Mitchell return as if a real OCR had produced it: every parsed field carries a `confidence` in [0, 1], a `source_document` (e.g. "W2_Olivia.pdf:page1:box1"), and a `bbox` for click-through provenance. Most fields should have confidence 0.9-1.0; a few should be 0.6-0.8 to give the workbench something to surface as low-confidence.

### T-302: Year-over-year delta engine

`src/lib/prework/yoy-delta.ts` exports `compute_yoy_delta(current: TaxReturn, prior: TaxReturn): YoYDelta[]`.

Returns one delta entry per line that changed by more than a threshold ($500 or 10%, whichever is greater). Each entry carries:
- `line_id`
- `current_value`
- `prior_value`
- `delta`
- `delta_percent`
- `explanation` (plain language: "RSU vesting increased by $42K, likely from a new vest tranche")

The Mitchell return must have at least 5 deltas vs the TY2024 prior year.

### T-303: Complexity scorer

`src/lib/prework/complexity.ts` exports `compute_complexity(return_data: TaxReturn): ComplexityScore`.

Score is 1-10. Score increases for: K-1 (+1), RSU (+1), multi-state (+2), rental property (+2), wash sale (+1), HSA (+0.5), foreign tax credit (+1), AMT exposure (+1), self-employment (+1.5).

The Mitchell return should score 8/10.

### T-304: Risk register builder

`src/lib/prework/risk-register.ts` exports `build_risk_register(return_data: TaxReturn, rule_findings: RuleFinding[]): RiskRegisterEntry[]`.

Consumes the rules engine output (passed in, not called directly) plus the complexity score, and produces a ranked list of up to 10 risk register entries. Each entry carries:
- `id`
- `severity` (1-5)
- `dollar_impact_estimate`
- `audit_risk_delta`
- `rule_citation`
- `one_line_summary`
- `affected_lines` (array of line IDs)

Ranking is by `severity * dollar_impact_estimate`, with audit risk as a tiebreaker.

### T-305: API route

`app/api/prework/route.ts` accepts `{ return_data, prior_return }` and returns the full `PreWorkOutput`:

```ts
type PreWorkOutput = {
  ocr: MockedOCROutput;
  yoy_delta: YoYDelta[];
  complexity: ComplexityScore;
  risk_register: RiskRegisterEntry[];
}
```

Validate input with Zod. Use Next.js 16 App Router route handler.

**Definition of done:** `npm test` passes for all your tests; running the API against the Mitchell return + TY2024 prior year produces a complexity score of 8, at least 5 YoY deltas, and at least 5 risk register entries that match the golden recommendations from Agent 1.

## Out of scope

- The recommendation engine (Agent 2)
- The deterministic rules (Agent 1)
- Real OCR (B3 production scope, not MVP)
- PII redaction (Agent 5)
- Audit trail (Agent 5)
- UI (Agent 4)
