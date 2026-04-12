# Demo Script — TurboTax Virtual Expert Platform Prototype

> **Audience:** Intuit hiring panel for the Principal PM, Virtual Expert Platform role.
> **Length:** ~10 minutes live, ~3 minutes if narrated against the screenshots.
> **Goal:** Prove that Big Bet B1 (Goal-Aligned Recommendation System) is buildable
> end-to-end on top of the existing four-layer architecture, using a single
> realistic synthetic return (Olivia & Ryan Mitchell, MFJ, AGI ~$326K).

This script walks the prototype against the ten demo points in PRD §8. Every step
maps to a panel that is actually wired up in `app/(workbench)/workbench/page.tsx`
and exercised by the integration test in `tests/integration/end-to-end.test.ts`.

---

## Pre-flight (60 seconds, off-camera)

```bash
# From the repo root
npm install
cp .env.example .env.local           # add ANTHROPIC_API_KEY if recording
npm run dev                          # http://localhost:3000
```

`http://localhost:3000` redirects to `/workbench`. The page hydrates from
local fixtures first, then issues parallel `fetch` calls to the live API
routes (`/api/prework`, `/api/recommendations`, `/api/audit`) and replaces
state when they return — so the demo never shows a loading state, even on a
cold cassette.

> **Cost discipline (ADR-003 + cassette pattern).** The recommendation engine
> replays `tests/recommendations/cassettes/mitchell-rec-cassette.json` unless
> `RECORD_CASSETTES=1` is set. A normal demo run is **$0**. The committed
> cassette was recorded against `claude-sonnet-4-6` and reflects ~3,950 input
> tokens / ~1,880 output tokens (~$0.043 per record).

---

## Step 1 — Customer goal capture (PRD §8 #1)

**What you say:**
> "Olivia and Ryan came in with three goals, ranked. Maximize refund, don't
> get audited, and start positioning for a smaller TY2026 bill. The intake
> screen captured them in plain language, attached the canonical goal-tag
> vector, and dropped them into the case. That goal vector is what the
> recommendation engine ranks against — not the form fields, not the prior
> preparer's notes."

**What you click:**
- The intake panel is mocked at this stage of the prototype — point at
  the three goal chips inside the **Goal Dashboard** card. Each one
  carries a rank, a weight, and a tag list. Those came from
  `mitchellGoalsFixture` and would have come from `validate_intake()` in
  production (`src/lib/goals/intake.ts`).

**Code reference:** `src/lib/goals/taxonomy.ts`, `src/lib/goals/intake.ts`,
ADR-005 in `docs/architecture/decisions/ADR-005-goal-taxonomy.md`.

---

## Step 2 — Goal dashboard on the workbench (PRD §8 #2)

**What you say:**
> "The Goal Dashboard is the part of the workbench that didn't exist
> before this PRD. Every recommendation in the queue carries a per-goal
> fit score in [0,1], and the dashboard rolls them up by goal. As I
> accept or reject items in the recommendation list on the right, the
> ring on the left fills up — the expert is no longer optimizing for AHT,
> they're optimizing for goal coverage."

**What you click:**
- The three columns of the Goal Dashboard. Hover the goal-fit pill on
  each recommendation card; explain that those numbers come from
  `score_recommendation` in `src/lib/recommendations/goal-fit.ts`, not
  from the LLM.
- The two pre-accepted recommendations (`rec-001` RSU double-count and
  `rec-006` HSA Form 8889) — these are the ones already showing as
  "Resolved" against the Maximize Refund goal.

**Why it matters:** This is the surface that converts the workbench from
a return-throughput tool into a goal-fulfillment tool.

---

## Step 3 — Ranked recommendation list tied to goals (PRD §8 #3)

**What you say:**
> "Six recommendations on the Mitchell return. Every one of them has:
> a dollar impact, a confidence score, a per-goal fit, an evidence chain
> that points back to the rules engine, an audit-risk delta, and a
> 'why this matters for Olivia's stated goal' line. The list is generated
> by the recommendation engine in three steps: deterministic rules engine
> finds the lots, the LLM ranks and explains them, and a hallucination
> filter drops anything whose `rule_id` isn't in the rules corpus.
> ADR-003 — the deterministic layer is the safety net, never the
> backup."

**What you click:**
- Walk down the right rail. Hit the five must-appear items from the
  golden file:
  - `rsu-double-count-001` ($3,200 — Maximize Refund)
  - `wash-sale-code-w-001` ($152 — Minimize Audit Risk)
  - `section-469-passive-loss-001` ($1,425 — Maximize Refund)
  - `hsa-form-8889-001` ($550 — Maximize Refund)
  - `salt-cap-mfj-2025-001` ($30,000 — TY2026 Setup)
- Plus the two ranking-only items: PTET election + retirement headroom.

**Code reference:** `src/lib/recommendations/engine.ts:116`
(`produce_recommendations`), `src/lib/rules/index.ts` (50-rule corpus),
`src/data/golden-recommendations.json`, the `mitchell-rec-cassette.json`
under `tests/recommendations/cassettes/`.

---

## Step 4 — Routing rationale chip (PRD §8 #4)

**What you say:**
> "Every other workbench in this category drops the expert into the case
> with no context about why they got it. Big Bet B5 turns routing into a
> marketplace; the prototype shows the chip the marketplace would emit.
> 'Routed to you because: 5+ years RSU specialty, multi-state IL+CA,
> prior-year preparer for this customer, complexity 8/10.' The routing
> engine is mocked for the MVP — but the chip and the contract behind it
> are not."

**What you click:**
- The top-left **Routing Rationale Chip** above the customer header.
- Read the four chips out loud — they correspond to the four routing
  dimensions in PRD §9.

---

## Step 5 — Pre-populated return surface with confidence + provenance (PRD §8 #5)

**What you say:**
> "The Layer 1 Pre-Work engine has already populated every line on the
> return from the source documents (mocked OCR for the prototype). Each
> line carries a confidence score and a click-through to the source
> document that fed it. When the expert disagrees, they edit in place.
> When the edit is interesting, the next panel lights up."

**What you click:**
- The **Return Surface** in the center. Hover a line — show the
  confidence pill and the provenance source.
- Click into 1040 line 7 (Capital Gain or Loss) to set up the next
  step. Type any number into one of the editable cells.

**Code reference:** `components/workbench/ReturnSurface.tsx`,
`src/lib/prework/index.ts:run_prework`, the YoY delta engine in
`src/lib/prework/yoy-delta.ts`.

---

## Step 6 — Live quality co-pilot (PRD §8 #6)

**What you say:**
> "I just edited a 1099-B line. The Quality Co-pilot watches the return
> surface and runs deterministic consistency checks the moment an edit
> lands. The wash-sale lots on Olivia's brokerage account include three
> rows where `wash_sale_loss_disallowed > 0` but `code = null`. The
> co-pilot flashes that mismatch in red and tells the expert exactly which
> rows to fix. This is the demo plant — but the underlying check is the
> same one the rules engine runs."

**What you click:**
- The **Quality Co-pilot** card on the right rail. The "Wash-sale lot
  mismatch" warning should be visible with a pulsing border for ~3
  seconds after the edit.

**Code reference:** `components/workbench/QualityCopilot.tsx:compute_warnings`.

---

## Step 7 — AI suggested question list (PRD §8 #7)

**What you say:**
> "Before the expert calls the customer, the AI ranks the questions
> they should ask, by dollar impact and goal fit. Top of the list:
> 'Ask Olivia whether the rental was rented at fair market value to a
> related party — this changes passive loss treatment, $1,425 impact on
> her Maximize Refund goal.' The expert opens the call with the
> highest-leverage question instead of with 'so... tell me about your
> taxes.'"

**What you click:**
- The **Suggested Questions** card. Read the top two out loud. Each one
  is keyed to a recommendation `id`.

**Code reference:** `components/workbench/SuggestedQuestions.tsx`.

---

## Step 8 — "What AI saw" panel (PRD §8 #8)

**What you say:**
> "Trust is the variable Intuit's customer reviews keep pointing at —
> the Washington Post test showed Intuit Assist was wrong on more than
> half of test questions, and customers know it. The 'What AI Saw' panel
> shows the redacted version of every prompt that went to the model.
> Olivia's SSN, Ryan's SSN, the employer EIN, the rental property
> address — all tokenized via `redact_prompt` before the prompt left the
> process. No raw PII ever touched the wire. ADR-006 covers the strategy."

**What you click:**
- The **What AI Saw** card, bottom-left. Highlight the `[SSN_001]`,
  `[EIN_001]`, `[ADDRESS_001]` tokens in the visible prompt body.
- Mention that the integration test in `tests/integration/end-to-end.test.ts`
  asserts zero raw `\b\d{3}-\d{2}-\d{4}\b` matches in the redacted prompt.

**Code reference:** `src/lib/pii/redact.ts:redact_prompt`,
`docs/architecture/decisions/ADR-006-pii-redaction-strategy.md`.

---

## Step 9 — Audit trail timeline (PRD §8 #9)

**What you say:**
> "Every AI suggestion, every expert action, every edit — captured to
> SQLite with a timestamp, an actor, and the prompt-hash that produced
> it. This is the data substrate Big Bet B4 (Expert as Trainer) compounds
> on top of. Every accept becomes a positive label, every reject becomes
> a negative label. After three seasons we have ten million labeled
> expert decisions and a model nobody outside Intuit can replicate."

**What you click:**
- The **Audit Trail Timeline** card, bottom-right. Walk down the events:
  the LLM call, the two acceptances, any reject/override, and the
  redacted-prompt hash.

**Code reference:** `src/lib/audit/capture.ts`,
`docs/architecture/decisions/ADR-004-sqlite-for-audit-trail.md`.

---

## Step 10 — Expert minutes counter (PRD §8 #10)

**What you say:**
> "Top right of the screen, the **Expert Minutes Counter** is ticking
> against two baselines: the legacy 25-to-35 minute number for a return
> like this one, and Intuit's stated TY2025 ~20% AI-driven reduction.
> The MVP target on the synthetic Mitchell return is under 10 minutes
> wall-clock. The bigger production target in PRD §9 is a combined ~50%
> reduction off the legacy baseline. This counter is the metric that
> closes the loop on the demo — every panel above this one exists to
> push that number down without sacrificing accuracy."

**What you click:**
- The **Expert Minutes Counter** in the top-right corner. Note the two
  comparison bars (legacy vs TY2025 baseline) and the green "under
  target" state.

---

## Bonus — `/metrics` dashboard (T-603)

**What you say:**
> "I built a separate `/metrics` route that walks every success metric
> from PRD §9 against the live test suite. Goal dashboard coverage,
> recommendation recall against the golden file, expert-minutes target,
> calibration drift on the 50-return synthetic test set, PII leakage
> count, routing chip dimension count, audit-trail capture coverage,
> auto-close rate. This is the page the program manager would screenshot
> for a roadmap review."

**What you click:**
- Navigate to `http://localhost:3000/metrics`. Read the column headers,
  point at the green checks, mention which tests back each row.

---

## Closing

**What you say:**
> "What you just saw is one big bet — B1 — fully built on the existing
> Layer 3 surface, with the other three layers either real (Pre-Work,
> Trust) or stubbed at a contract boundary (Routing). The same six-agent
> contract-bounded build I used to ship this prototype is the same shape
> Intuit could use to ship the production version on GenOS:
> deterministic rules engine first, LLM ranking second, audit trail
> always-on, goal vector as the new primary KPI. Every code path you saw
> is covered by the integration test in `tests/integration/end-to-end.test.ts`,
> and the full 260-test Vitest suite gates every commit."

---

## Demo recovery script (if something breaks live)

| Symptom | Recovery |
|---|---|
| Blank panel | Hard reload — fixtures hydrate first, so the only way the panel is empty is a build error. Run `npx tsc --noEmit` in another terminal. |
| Recommendations panel shows fixture data only | Cassette is missing. Rerun `RECORD_CASSETTES=1 npm test -- tests/recommendations/engine.test.ts` to regenerate it (live API call, ~$0.04). |
| Quality Co-pilot doesn't flash | The wash-sale warning only triggers on edits to lines starting with `1040.line.7` or `8949`. Click directly into a 1099-B row and re-edit. |
| `/api/recommendations` returns 500 | The route logs the underlying error in the dev server output. The most common cause during development is a missing `ANTHROPIC_API_KEY` combined with `RECORD_CASSETTES=1`. Unset `RECORD_CASSETTES` to fall back to the cassette. |

---

## Appendix — what was deliberately left out of this script

- **B2 Multi-Year Tax Co-Pilot:** the goal vector and audit trail are
  the data substrate, but the connected-accounts layer is Phase 2.
- **B4 Expert-as-Trainer learning loop:** the capture layer is live;
  the quarterly fine-tune cadence is documented in PRD §10 but not
  executed in the prototype.
- **B5 Routing marketplace:** the rationale chip is real, the matching
  engine is mocked.
- **Real OCR:** the Mitchell return is hand-crafted; production would
  layer this on top of the existing 200+ partner ingestion fabric.
- **Real authentication & multi-tenancy:** single hard-coded expert
  ("Anshul, EA") per ADR-008, no organizations, no Stripe.

These are tracked in `backlog/sprint-02-plus.md`.
