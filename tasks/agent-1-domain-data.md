# Agent 1 — Domain & Data

**Role:** Build the foundation slice. Everything else depends on you.

**Slice:** Synthetic Olivia and Ryan Mitchell return + 50-rule deterministic tax corpus + golden recommendations file.

**Owns:** `src/data/`, `src/lib/rules/`, `tests/data/`, `tests/rules/`, `src/data/golden-recommendations.json`

**Does NOT touch:** `app/`, `components/`, anything under `src/lib/recommendations/`, `src/lib/prework/`, `src/lib/pii/`, `src/lib/audit/`, `src/lib/goals/`

## Required reading

- `docs/PRD.md` (full)
- `docs/architecture/overview.md`
- `docs/architecture/decisions/ADR-001-tech-stack.md`
- `docs/architecture/decisions/ADR-002-synthetic-only-data.md`
- `docs/architecture/decisions/ADR-003-deterministic-rules-as-safety-net.md`
- `docs/architecture/decisions/ADR-005-goal-taxonomy.md`
- `backlog/sprint-01.md` (your tasks: T-101, T-102, T-103)
- `src/contracts/index.ts` (the cross-layer contracts you must consume — read only)

## Tasks

### T-101: Synthetic Olivia and Ryan Mitchell return

Build `src/data/mitchell-return.ts` exporting a typed `TaxReturn` object covering:

- W-2 for Olivia Mitchell (software engineer, $215K Box 1, RSU vesting included)
- W-2 for Ryan Mitchell (high school teacher, $68K Box 1)
- 1099-B from a brokerage with 12 lots, of which 3 are wash sales (Code W on Form 8949)
- 1099-DIV (qualified + ordinary)
- K-1 from a small partnership (passive activity, $8K loss)
- 1098 mortgage interest ($14,200) on a residential rental property in Will County, IL
- HSA contribution ($4,150 family, with mismatched Form 8889 line 2/6/13 to demonstrate the bug)
- Residential rental income/expenses for the Will County property (depreciation NOT split between land and building, demonstrating the IRS Pub 527 bug)
- Multi-state IL (resident) and CA (RSU vesting workdays)
- Prior year (TY2024) 1040 on file, with prior preparer name "Pat Daniels, CPA"

All numbers must reconcile to a believable AGI ~$326K MFJ. All names, SSNs, addresses, and account numbers fabricated. No real PII.

**Definition of done:** snapshot test in `tests/data/mitchell-return.test.ts` passes; the return type-checks against the `TaxReturn` contract from `src/contracts/index.ts`; manual reconciliation document at `tests/data/mitchell-reconciliation.md` shows AGI math.

### T-102: 50-rule deterministic tax corpus

Build `src/lib/rules/index.ts` exporting `tax_rules: Rule[]` with exactly 50 rules. Each rule has:

```ts
type Rule = {
  id: string;             // "wash-sale-code-w-001"
  name: string;
  irc_citation: string;   // e.g. "IRC §1091"
  pub_citation?: string;  // e.g. "IRS Pub 550"
  severity: 1 | 2 | 3 | 4 | 5;
  category: RuleCategory;
  evaluate: (return_data: TaxReturn) => RuleFinding[];
  estimate_dollar_impact: (finding: RuleFinding) => DollarImpact;
};
```

Rule coverage (counts in parens):

| Category | Count | Rules |
|---|---|---|
| Wash sale Code W on Form 8949 | 3 | reconcile 1099-B Code W to Form 8949 column f |
| Form 8889 HSA | 4 | contribution limit, line 2/6/13 reconciliation, deduction on Schedule 1, employer contribution exclusion |
| RSU income reconciliation | 4 | W-2 Box 1 vs 1099-B basis, supplemental W-2, double-count detection, missing 1099-B |
| IRC §469 passive activity loss | 4 | rental loss limits, AGI phaseout, passive vs nonpassive K-1, suspended loss carryforward |
| Depreciation allocation | 4 | land vs building per county records (Pub 527), QIP, bonus depreciation, recapture |
| Foreign tax credit | 3 | Form 1116 trigger, $300/$600 election threshold, country-by-country |
| SALT cap | 3 | $40K MFJ for TY2025 (correction from prior $10K), state PTET interaction, prior year refund inclusion |
| Retirement contribution headroom | 5 | IRA, Roth IRA, 401k, SEP, solo 401k limits with catchup |
| State PTET election eligibility | 3 | IL PTET, CA PTET, multi-state apportionment |
| Section 121 home sale exclusion | 3 | ownership test, use test, partial exclusion |
| Credit eligibility | 6 | CTC, EITC AGI thresholds, education credits (AOTC, LLC), dependent care credit, premium tax credit reconciliation |
| AMT triggers including ISO | 4 | ISO exercise, large state tax deduction, depreciation differences, AMT FTC |
| Estimated tax safe harbor | 4 | 110% prior year safe harbor, 90% current year, underpayment penalty calc, annualized income method |

Each rule gets at least one Vitest unit test covering positive case (rule fires correctly on a return that triggers it) and negative case (rule does not fire on a return that does not trigger it).

**Definition of done:** all 50 rules implemented; all rule unit tests pass; running the corpus against the Mitchell return produces at least the 5 mechanically detectable findings called out in `docs/PRD.md` Section 7.

### T-103: Golden recommendations file

Build `src/data/golden-recommendations.json` listing every recommendation the engine must produce on the Mitchell return, with expected goal mapping and dollar impact range. This is the assertion target for Agent 2's tests and Agent 6's integration tests.

Schema:

```json
[
  {
    "id": "rec-rsu-double-count",
    "rule_id": "rsu-reconciliation-002",
    "expected_dollar_impact_min": 2000,
    "expected_dollar_impact_max": 4500,
    "expected_goals": ["maximize_refund"],
    "expected_severity": 5,
    "must_appear": true,
    "rationale": "RSU income on W-2 Box 1 must not also appear on 1099-B; this is the most common mechanically detectable error in the public TurboTax record"
  },
  ...
]
```

Cover at minimum: RSU double count, IRC §469 passive activity loss on the rental, missing wash sale Code W, Form 8889 HSA mismatch, SALT cap correction (TY2025 $40K MFJ), depreciation land/building split, state PTET election (IL or CA), retirement contribution headroom.

**Definition of done:** `src/data/golden-recommendations.json` exists; `tests/data/golden-recommendations.test.ts` validates it against the Zod schema; the file lists at least 8 recommendations.

## Sequencing

You run **before** any other agent. Agents 2 and 3 cannot start until you publish your contracts. Commit T-101, T-102, T-103 in that order on a single branch and notify the orchestrator when done.

## Out of scope

- Any UI work
- Anything that talks to the LLM
- Anything in `src/lib/recommendations/` or `src/lib/prework/`
- The PII redaction pipeline
- The audit trail
