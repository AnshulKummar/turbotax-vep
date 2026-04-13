# Architecture Overview

The Virtual Expert Platform redesign is built as four cooperating layers. Each layer has a single responsibility, an explicit contract with the next layer, and is independently testable.

## The four layers

```
┌─────────────────────────────────────────────────────────────────┐
│ Layer 1 — AI Pre-Work                                           │
│ Document ingestion, YoY delta, deterministic rules sweep,       │
│ complexity score, ranked risk register                          │
└─────────────────────────────┬───────────────────────────────────┘
                              │ PreWorkOutput contract
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 2 — Smart Routing                                         │
│ Specialty + complexity + jurisdiction + language + capacity +   │
│ continuity + goal-aware matching                                │
└─────────────────────────────┬───────────────────────────────────┘
                              │ RoutingDecision contract
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 3 — Expert Workbench                                      │
│ Goal dashboard, return surface, risk register, prior year       │
│ side-by-side, customer context, AI suggested questions,         │
│ live co-pilot, "what AI saw" panel, expert minutes counter      │
└─────────────────────────────┬───────────────────────────────────┘
                              │ ExpertAction events
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ Layer 4 — Trust and Learning                                    │
│ PII redaction, audit trail, calibrated confidence,              │
│ expert edits as labeled training data, composite metrics       │
└─────────────────────────────────────────────────────────────────┘
```

## What sits where

| Concern | Layer | Big bet / increment |
|---|---|---|
| Customer goal capture | 3 (intake) | B1 |
| Goal dashboard | 3 | B1 |
| Recommendation engine | 1 + 3 | B1 |
| Year-round monitoring | 1 (subscription mode) | B2 |
| Document ingestion | 1 | B3 + I4 |
| Risk register | 1 → 3 | B3 + I1 |
| Routing match | 2 | B5 + I2 |
| PII redaction | 4 (wraps every LLM call) | I3 |
| Audit trail | 4 | I3 + B4 capture |
| Calibration eval | 4 | B4 |
| Composite expert metric | 4 | I3 + B4 |

## Contract pinning

Before any agent writes code, the cross-layer contracts are pinned in `src/contracts/` as TypeScript interfaces and Zod schemas:

- `PreWorkOutput` — what Layer 1 hands to Layer 2 and Layer 3
- `RoutingDecision` — what Layer 2 hands to Layer 3
- `Recommendation` — the unit of value the recommendation engine produces
- `Goal` — the customer goal, with rank, weight, and free-text rationale
- `RiskRegisterEntry` — a mechanically detectable red flag with rule citation
- `AuditEvent` — every AI suggestion and expert action captured by Layer 4
- `RedactedPrompt` — the structured prompt that goes to the LLM after PII redaction

These contracts are the only shared surface between agents. Agents do not import each other's internals.

## Tech stack

| Concern | Choice | Why |
|---|---|---|
| Web framework | Next.js 16 (App Router) | Server components for the workbench shell, route handlers for the AI APIs |
| UI | React 19 + Tailwind 4 (dark theme) | Matches the parent PairEval Next stack for build velocity |
| Language | TypeScript strict mode | Required by the cross-layer contract approach |
| LLM | Anthropic Claude `claude-sonnet-4-6` | Best calibration on long-context tax reasoning |
| Storage | Neon PostgreSQL via Drizzle ORM (HTTP driver) | Serverless-compatible, auto-scaling, branching for preview deploys. Handles 10K+ concurrent connections. |
| Validation | Zod v4 (`zod/v4`) | Single source of truth for contracts and runtime validation |
| Tests | Vitest | Matches PairEval Next; fast |
| Calibration eval | Custom harness on a 50-return synthetic test set | See ADR-007 |
| Scalability | Serverless-first on Vercel | Scales to zero, auto-scales on spikes. Global CDN. $0 at rest. |

See `docs/architecture/decisions/` for the eight ADRs that explain why.
