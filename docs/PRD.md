# TurboTax Virtual Expert Platform — Product Requirements Document

> Independent product review and proposed redesign of the TurboTax Virtual Expert Platform, the layer that powers TurboTax Live Assisted, TurboTax Live Full Service, and Expert Full Service.

## 1. Context

This is an independent product review of the TurboTax Virtual Expert Platform, built entirely on publicly available data: Intuit investor disclosures and earnings transcripts (FY2024 and FY2025), Intuit recruitment FAQs for tax experts, 88 verbatim customer quotes sampled across Trustpilot (1,166 reviews), BBB (3,720 complaints), the TurboTax community forum, ComplaintsBoard, the Apple App Store, Glassdoor, Indeed, NerdWallet's 2026 review, Washington Post and Futurism investigative reporting, FTC filings, and class action filings. Full methodology, source coverage, and the verbatim quote bank are in `docs/appendices/voice-of-customer.md`.

## 2. Strategic Stakes (Top 5 Metrics)

| Metric | Value | Why it matters |
|---|---|---|
| TurboTax Live revenue, FY2025 | $2.0B (+47% YoY) | Live is Intuit's largest growth engine. The expert layer gates further acceleration. |
| Live as % of Consumer Group revenue, FY2025 | 41% | The franchise is now structurally dependent on the expert experience. |
| Expert headcount | 13,000 (Nov 2025), up from 12,000 (Oct 2024) | The capacity layer the workbench touches. Routing efficiency compounds with network size. |
| AI driven expert time reduction per Full Service return, TY2025 | ~20% | Intuit's stated AI productivity baseline this PRD proposes to extend. |
| Customer trust gap on the expert experience | Trustpilot 1.2 / 5 (1,166 reviews); BBB 1.07 / 5 (532 reviews); 3,720 BBB complaints in 3 years | The single most important credibility input to any growth forecast. |

<sub>Sources: Intuit Q4 FY2025 results (investors.intuit.com/news-events/press-releases/detail/1266); Intuit press releases 1229 (Oct 2024) and 1279 (Nov 2025); Intuit Q3 FY2025 earnings transcript via investing.com; Trustpilot turbotax.intuit.com page; BBB Intuit Inc. profile pages.</sub>

## 3. The Core Insight

Two findings from the research drive every recommendation in this document.

**Finding 1, mechanical errors are common everywhere.** Audits of independently prepared returns and the public TurboTax record consistently surface the same mechanically detectable errors: missed depreciation allocation on rental property (IRS Pub 527), missing wash sale Code W on Form 8949, Form 8889 HSA contribution mismatches, RSU income double counting between W-2 Box 1 and 1099-B (a $3,200 refund delta is documented in the public record), a $12,000+ ISO Alternative Minimum Tax bug that took three years and a congressional inquiry to resolve, and a Washington Post test of Intuit Assist that found it wrong on more than half of 16 tax questions reviewed by credentialed pros, and still wrong on roughly 25% even after Intuit was given a chance to patch the issues. These errors are mechanically detectable from the source documents and the IRS code given the right tooling.

**Finding 2, the expert layer is misaligned with what customers actually want.** Customers do not hire an expert to "fill out the return correctly." They hire an expert to deliver against a goal: maximize my refund, do not get me audited, plan my life event, simplify next year. The current TurboTax Live model has no place to capture those goals, no recommendation engine that ranks suggestions by goal fit, no multi year continuity, and an evaluation system that grades experts on customer surveys and a 23 minute average handle time rather than goal outcomes. NerdWallet's structural critique makes this concrete: in Live Assisted, the person the customer reaches during preparation is a "product expert" trained only on the product, not a credentialed tax expert. The customer's goals never reach a credentialed brain until the optional final review.

These two findings unlock the big bets in Part I. The friction research drives the incremental fixes in Part II.

## 4. Customer Friction (Top Five)

| # | Friction theme | Severity | % of 88 quote sample | Representative example |
|---|---|---|---|---|
| 1 | Expert quality and accuracy errors | 5 | 18% | $12K ISO bug; doubled income causing $12K IRS clawback; RSU double count |
| 2 | Communication breakdowns and case auto closure | 5 | 20% | 34 day Full Service case auto closed 7 days before deadline |
| 3 | Generalist routed to a complex return | 5 | 6% | Cross border 95K CAD case; seven year city tax error |
| 4 | Hand off and continuity loss | 4 | 7% | Customer told it is structurally impossible to reach last year's expert |
| 5 | Long wait times and queue pain | 4 | 11% | 4.5 hours of waiting after six callback attempts |

<sub>Frequency from 88 verbatim quote sample. Methodology in `docs/appendices/voice-of-customer.md`. Vignettes in `docs/appendices/vignettes.md`. Backlog (themes 6 to 10) in `docs/appendices/backlog-deferred.md`.</sub>

## 5. Expert Pain Points (Top Three)

| # | Pain point | Customer themes it causes | Public evidence |
|---|---|---|---|
| 1 | No return surface, no anomaly flags, no prior year side by side, no risk register. The tooling is a knowledge base search box. | 1, 4 | Intuit recruitment FAQ describes tooling as "TurboTax knowledge base, IRS resources, and a popular tax library" |
| 2 | Routing is a queue. No specialty, complexity, jurisdiction, language, or continuity matching. | 3, 4, 5 | Intuit recruitment FAQ: "TurboTax customer contacts are in a queue and they are routed to the next available Tax Expert" |
| 3 | Performance is graded on customer surveys and a 23 minute AHT. Accuracy is not measured. AI assistance, where it exists, is unreliable. | 1, 2 | Intuit recruitment FAQ on metrics; Washington Post test on Intuit Assist accuracy |

<sub>Full expert side theme table with seven themes is in `docs/appendices/expert-side-themes.md`.</sub>

---

# Part I — Big Bets

The big bets share one thesis: **the Virtual Expert Platform should optimize for customer outcomes against stated goals, not for return throughput.** Each big bet below changes the operating model rather than improving the existing one. Together they convert TurboTax Live from an annual one shot transaction into a continuous, goal aligned, AI native advisory relationship that gets smarter every season.

## B1. Goal Aligned Recommendation System (anchor bet)

**The bet.** At intake, the customer states their goals in plain language: "maximize my refund," "do not get me audited," "plan for my new baby," "harvest my losses without messing up my carryforward," "set me up for a smaller tax bill in 2026." A recommendation engine generates a ranked list of suggestions, each tagged with dollar impact, confidence, goal fit score, evidence (specific IRC section or IRS publication), audit risk delta, and multi year impact. The expert workbench shows a goal dashboard that tracks progress against each stated goal in real time. Every expert action is logged against the goal it served.

**Why this is visionary.** It reframes the expert's job from "fill out the form correctly" to "deliver outcomes against the customer's stated goals." It addresses the NerdWallet structural critique directly: the AI captures goals, the expert delivers against them, and the goal fit score becomes the primary success metric instead of CSAT. It also creates the connective tissue for B2 (multi year planning) and B4 (the learning loop), because every recommendation is now labeled with a goal, an action, and an outcome.

**What is built.** A goal taxonomy (10 canonical goals plus free text), a goal capture intake flow, a recommendation engine that retrieves from a deterministic tax rules corpus and ranks via an LLM scoring pass, a goal dashboard panel on the expert workbench, a goal aligned audit trail, and a reporting layer that aggregates goal outcomes across customers and experts.

**Customer frictions this addresses.** Themes 1 (accuracy errors, because every recommendation is rule cited), 3 (mismatch, because routing now considers goals), and 4 (continuity, because goals carry from year to year).

## B2. Multi Year Tax Co Pilot (always on advisory)

**The bet.** Today, TurboTax Live is an annual transaction. The customer files in March, disappears, and shows up again next March with a new expert and zero context. The Multi Year Tax Co Pilot turns the relationship into a continuous subscription advised by a year round AI co pilot with periodic expert touch points. The co pilot watches connected accounts (W-2 changes, brokerage activity, 1099 issuance, life events, IRS notices), tracks tax law changes (SALT cap, retirement contribution limits, SCOTUS rulings), runs forward looking simulations (Roth conversion windows, RSU sell decisions, estimated tax payments, loss harvesting, retirement headroom), and triggers expert outreach proactively when an action is time sensitive or high dollar.

**Why this is visionary.** It is the difference between a tax preparer and a wealth advisor. The TAM expands from "people who file" to "people who optimize." It also creates the data flywheel that makes B1's goal alignment compound: a goal stated in 2026 becomes a tracked plan with quarterly check ins through TY2027 and TY2028.

**What is built.** A connected accounts data layer (Plaid for banking, brokerage data partnerships already in place via the 200+ Intuit partners list, IRS transcript pull, secure document vault), a tax planning simulation engine, an event based trigger system, an expert outreach queue tied to the routing engine, and a customer facing dashboard that shows year round tax health.

**Customer frictions this addresses.** Theme 4 (continuity, structurally), theme 1 (accuracy, because errors get caught months before filing), and the core complaint that experts are "just data entry."

## B3. Autonomous AI Pre Work and Living Risk Register

**The bet.** Before the expert ever opens the return, an autonomous AI pre work step ingests every document (W-2, 1099 family, K-1, 1098, brokerage statements, prior year 1040, county property records), populates the current year return with line level provenance, runs year over year deltas with explanations for every change above a threshold, runs a mechanically detectable error sweep against a deterministic rules corpus (wash sale Code W, Form 8889 HSA limits, RSU double count detection, IRC §469 passive activity loss, Section 121 exclusion, depreciation allocation, foreign tax credit triggers, SALT cap), and outputs a complexity score, a ranked risk register, and an AI suggested question list. The risk register is "living" in the sense that it updates continuously as the expert makes edits and as new documents arrive.

**Why this is visionary.** Intuit has publicly stated a ~20% reduction in expert time per Full Service return in TY2025 from AI. This bet pushes that further by removing the most error prone, lowest judgment work from the expert's plate entirely. It also creates the structured input that B1's recommendation engine and B4's learning loop both depend on.

**What is built.** A document ingestion pipeline (OCR plus structured form parsing), a deterministic tax rules corpus (initial scope ~200 rules covering the highest frequency Form 1040 errors), an LLM orchestration layer that uses the rules engine as the safety net rather than as a backup, a confidence calibration layer, a year over year delta engine, and the risk register UI on the workbench.

**Customer frictions this addresses.** Theme 1 directly. Themes 2 and 5 indirectly because returns get faster.

## B4. Expert as Trainer Learning Loop (compounding moat)

**The bet.** Every expert edit, accept, reject, and override on an AI suggestion becomes labeled training data. The system gets measurably smarter every season. Senior experts effectively become RLHF labelers without having to do anything other than their normal job. The labeled data is used to fine tune the recommendation engine, the confidence calibration, the risk register prioritization, and the goal fit scoring from B1. Intuit's competitive moat shifts from "we have 13,000 experts" to "we have 13,000 experts whose judgment is encoded in the system every season."

**Why this is visionary.** It is the only big bet that compounds over time without proportional capital investment. After three seasons, the system has been trained on roughly 10 million labeled expert decisions, which no competitor (including a hypothetical Anthropic or OpenAI tax product) can replicate without access to credentialed expert workflows. It also fixes the misaligned performance metric problem from Expert Pain Point 3 because accuracy and goal fit can finally be measured.

**What is built.** A capture layer on every workbench interaction, a labeling pipeline that converts those interactions to training examples, a model evaluation harness with a golden test set of synthetic returns, a calibration monitoring dashboard, and a quarterly model release cadence.

**Moat compounding timeline:**

| Season | Labeled decisions | Expected accuracy lift | Moat status |
|---|---|---|---|
| Season 1 (TY2026) | ~500K labels (13,000 experts × ~40 returns × ~1 action per rec) | Baseline established. No fine tuning yet — capture only. | No moat. Data collection phase. |
| Season 2 (TY2027) | ~1.5M cumulative | 5–8% accuracy improvement on recommendation ranking. First fine tuned model deployed. Confidence calibration tightens by 2–3 points. | Early moat. Competitors would need 1 season + 13K experts to replicate. |
| Season 3 (TY2028) | ~3.5M cumulative | 10–15% cumulative accuracy improvement. Goal fit scoring becomes expert-validated. Risk register prioritization reflects real expert judgment. | Defensible moat. No competitor can replicate without 3 seasons of credentialed expert workflow data. |
| Season 5+ (TY2030) | ~10M cumulative | Compounding returns flatten but breadth increases — model covers edge cases (NRA spouse, cross-border, trust returns) that no training set can synthesize. | Structural moat. The dataset is proprietary, growing, and impossible to recreate from public data. |

The minimum viable moat is Season 2: one fine tuned model that measurably outperforms the base model on recommendation ranking. The investment required to reach Season 2 is the capture layer (shipped in B4 MVP) plus one model fine tuning cycle.

**Customer frictions this addresses.** Theme 1 over time. Also addresses Expert Pain Point 3 by making accuracy measurable.

## B5. Specialty Match Routing Marketplace

**The bet.** Replace queue based routing with a marketplace style matchmaking engine that considers expert specialty (RSU, K-1, expat, retirement, small business), complexity score from B3, jurisdiction (state and local), language, capacity, customer goals from B1, and prior year continuity. Generalists are never assigned a return with a hard complexity flag without a competency matched peer reviewer. Customers can see (and request) the same expert year over year. Experts can build a reputation and specialty profile that compounds.

**Why this is visionary.** It turns 13,000 experts from a queue into a marketplace. It is the only way the platform can both grow expert headcount and improve quality at the same time. It also fixes the most viscerally complained about pattern in the public record: a generalist getting a complex return and silently making a six figure error.

**What is built.** A competency profile per expert (initial bootstrap from self assessment plus admin validation), a routing engine that takes the complexity score and goal vector as input, a continuity tracker, a customer facing "request your expert" flow, and an expert facing reputation dashboard.

**Customer frictions this addresses.** Themes 3, 4, and 5.

---

# Part II — Incremental Improvements

These are the prioritized friction fixes that do not require a change in operating model. They are smaller in scope, faster to ship, and they fit cleanly inside the four layer architecture. They are organized by the architecture layer they touch. The deferred backlog is in `docs/appendices/backlog-deferred.md`.

## I1. Expert Workbench (Layer 3) Incremental Fixes

| Fix | Friction addressed | Effort |
|---|---|---|
| Customer context header showing prior expert notes, prior year return, prior year preparer name | Theme 4 | S |
| Anomaly risk register panel surfacing the top 10 mechanically detectable red flags | Theme 1 | M |
| Confidence score per pre populated line, with click through to source document | Theme 1 | M |
| Live quality co pilot that flags inconsistencies as the expert edits | Theme 1 | M |
| AI suggested question list for the customer call, ranked by dollar impact | Theme 1 | S |
| Escalation panel showing case state (auto close countdown, customer responsiveness, document completeness) | Theme 2 | M |
| "What AI saw" panel showing the redacted PII version of every prompt sent to the model | Theme 1 + trust | S |
| Expert minutes counter against legacy and TY2025 baselines | Productivity | S |

## I2. Smart Routing (Layer 2) Incremental Fixes

| Fix | Friction addressed | Effort |
|---|---|---|
| Routing rationale chip telling the expert why the case was routed to them | Theme 3 | S |
| Hard complexity flag preventing queue routing of RSU, K-1, multi state, NRA spouse, cross border returns to a generalist without peer reviewer | Theme 3 | M |
| "Same expert as last year" preference on the customer side | Theme 4 | M |
| Capacity dashboard for leads showing complexity adjusted utilization | Theme 5 | M |

## I3. Trust and Learning (Layer 4) Incremental Fixes

| Fix | Friction addressed | Effort |
|---|---|---|
| PII redaction on every LLM call, verifiable via audit trail | Trust | M |
| Audit trail capturing model, context, expert action, downstream IRS outcome | Trust + accuracy | M |
| Composite expert performance metric weighting accuracy, AI edit signal quality, NPS, complexity adjusted AHT | Pain point 3 | L |
| "Told customer no" tracking so experts who correctly decline a deduction are not penalized on CSAT | Pain point 3 | M |

## I4. Pre Work (Layer 1) Incremental Fixes

| Fix | Friction addressed | Effort |
|---|---|---|
| Document ingestion via OCR plus partner structured feeds | Theme 1 | M |
| Year over year delta engine with plain language explanations | Theme 1 + 4 | M |
| Initial 50 rule deterministic safety net | Theme 1 | M |

---

## 6. Financial Model

### Cost of inaction

TurboTax Live generated $2.0B in FY2025 revenue. The customer trust gap is the single largest threat to sustained growth.

| Risk vector | Estimate | Basis |
|---|---|---|
| Churn from accuracy errors (theme 1) | $100M–$200M annual revenue at risk | 18% of complaints cite accuracy errors. If 5–10% of Live customers who encounter an error churn, that is 5–10% of $2.0B. |
| Churn from communication breakdown / auto closure (theme 2) | $80M–$160M annual revenue at risk | 20% of complaints. Auto closure before deadline is the single most emotionally charged failure mode. |
| Misrouted complex returns (theme 3) | $30M–$60M in remediation + refund cost | Generalist errors on complex returns generate IRS notices, amended returns, and escalation labor. At 6% frequency across ~2M Live returns, even a $250 average remediation cost reaches $30M. |
| Competitive displacement | Unquantified but structural | H&R Block, independent CPAs, and emerging AI tax tools (ChatGPT tax plugins, standalone AI preparers) all benefit from every negative TurboTax Live review. The 1.2 Trustpilot score is a public acquisition barrier. |

**Conservative total cost of inaction: $200M–$400M in annual revenue at risk**, before accounting for brand damage and competitive displacement.

### Revenue impact per bet

| Bet | Primary revenue lever | Estimated annual impact (steady state, Year 2+) | Confidence |
|---|---|---|---|
| B1 — Goal Aligned Recommendations | Retention lift from goal fulfillment. Customers whose stated goals are addressed show higher NPS and lower churn. Secondary: upsell to Full Service from Live Assisted when goal complexity exceeds self-serve threshold. | $80M–$150M (2–4 point retention lift on $2.0B base + conversion uplift) | Medium — requires A/B validation in production pilot |
| B2 — Multi Year Tax Co Pilot | TAM expansion from "filers" to "optimizers." Year-round subscription revenue. | $200M–$500M (new TAM, 3–5 year horizon) | Low — dependent on B1 proving the goal-aligned model works |
| B3 — Autonomous Pre Work | Expert throughput increase. Each expert handles more returns per day at constant or better quality, reducing seasonal hiring cost. | $40M–$80M (15–20% throughput lift across 13,000 experts × cost per expert) | High — directly measurable in shadow mode |
| B4 — Expert as Trainer | Compounding accuracy improvement reduces remediation cost, IRS notice rate, and escalation volume. | $20M Year 1 → $60M+ Year 3 (scales with labeled data volume) | Medium — requires 2+ seasons to validate compounding |
| B5 — Specialty Match Routing | Reduction in misrouted complex returns. Direct savings on remediation, amended returns, and escalation labor. | $30M–$60M (eliminates the misrouting cost vector above) | High — routing logic is deterministic and testable |

### Build cost estimate (T-shirt sizing)

| Bet | Team (PM + Eng + Design) | MVP duration | Full rollout | Estimated annual cost |
|---|---|---|---|---|
| B1 | 1 Sr PM + 4 Eng + 1 Design | 1 quarter | 2 quarters | $2M–$3M |
| B2 | 1 Sr PM + 6 Eng + 1 Design + 1 Data | 2 quarters | 4 quarters | $4M–$6M |
| B3 | 1 PM + 5 Eng + 1 ML | 1 quarter | 2 quarters | $3M–$4M |
| B4 | 1 PM + 3 Eng + 1 ML | 1 quarter (capture layer) | Ongoing | $2M–$3M |
| B5 | 1 PM + 3 Eng | 1 quarter | 2 quarters | $1.5M–$2.5M |

**Total Year 1 investment for B1 + B3 + B5 (highest confidence bets): $6.5M–$9.5M against $150M–$290M in estimated revenue impact.** ROI: 15–30x.

---

## 7. Solution Architecture

The solution is a four layer Virtual Expert Platform that hosts both the big bets and the incremental fixes.

- **Layer 1, AI Pre Work.** Document ingestion, year over year delta, deterministic rules sweep, complexity score, risk register. Hosts B3 and the I4 fixes.
- **Layer 2, Smart Routing.** Specialty, complexity, jurisdiction, language, capacity, continuity, and goal aware matching. Hosts B5 and the I2 fixes.
- **Layer 3, Expert Workbench.** Goal dashboard, return surface with confidence scores, risk register, prior year side by side, customer context, AI suggested questions, live co pilot, "what AI saw" panel, expert minutes counter. Hosts B1 (anchor), B2 (year round dashboard surface), and the I1 fixes.
- **Layer 4, Trust and Learning.** PII redaction, audit trails, calibrated confidence, expert edits as labeled training data, composite performance metric. Hosts B4 and the I3 fixes.

**Non goals:** fixing the checkout funnel auto upgrade dark pattern (separate org), replacing the underlying tax calculation engine, building net new tax content (the existing 100,000 page Intuit tax knowledge engine is reused), and IRS notice and audit defense workflow (Phase 2).

## 8. MVP Prototype Scope

The MVP demonstrates **Big Bet B1 (Goal Aligned Recommendation System)** end to end on the Layer 3 Workbench, against a single realistic synthetic Form 1040 (the "Olivia and Ryan Mitchell" return: married filing jointly, AGI ~$326K, residential rental, RSU vesting, K-1, HSA, mixed wash sale lots, 1098, multi state IL+CA, prior year return on file). Layer 1 pre work output is mocked as if a real OCR plus rules engine had produced it. Layer 2 routing is mocked as a single routing rationale chip. Layer 4 trust is partially live: PII redaction runs against the synthetic data, the audit trail is fully captured, the "what AI saw" panel renders.

**What the demo shows:**

1. Customer goal capture. A short intake flow where Olivia states three goals in priority order.
2. Goal dashboard on the workbench. A panel that tracks each goal in real time, with a goal fit score per recommendation.
3. Ranked recommendation list tied to goals. Each recommendation has dollar impact, confidence, goal fit, evidence (IRC citation), audit risk delta, and a "why this matters for the stated goal" line. Recommendations include RSU double count, Section 469 passive loss, wash sale Code W, Form 8889 mismatch, SALT cap correction from $10K to $40K MFJ for TY2025, plus state PTET election eligibility and retirement contribution headroom.
4. Routing rationale chip. "Routed to you: 5+ years RSU specialty, multi state IL+CA, prior year preparer for this customer. Complexity 8/10. ETA to handoff 4 min."
5. Pre populated return surface with confidence scores per line and click through provenance.
6. Live quality co pilot flagging an inconsistency as the expert edits.
7. AI suggested question list ranked by goal fit.
8. "What AI saw" panel showing the redacted prompt that produced each recommendation.
9. Audit trail timeline of every AI suggestion and expert action, queryable.
10. Expert minutes counter ticking against the legacy and TY2025 baselines.

**Strategically deferred (and why):**

| Deferral | Rationale |
|---|---|
| Real routing engine (B5) | Requires the complexity scoring pipeline from B3 and expert competency profiles. Ship B1 first, prove goal alignment works, then layer routing on top. |
| Full B2 connected accounts and year round simulation | Largest engineering investment. Requires B1 retention data to justify the TAM expansion thesis. Deferred to Year 2. |
| Full B4 training pipeline (model fine tune cadence) | Labeled capture is live in the prototype. The fine tuning loop requires 1+ season of production data. Season 1 is capture only; fine tuning begins Season 2. |
| Multi expert collaboration | Low-frequency use case in the current Live model. Becomes relevant only after B5 routing introduces peer review workflows. |
| IRS notice and audit defense workflow | Phase 2 feature. Depends on post-filing outcome data that takes 6–12 months to accumulate after B1 ships. |

**Production table stakes (required before pilot):**

| Requirement | Effort | When |
|---|---|---|
| Real authentication (SSO via Intuit Identity) | S | Pre-pilot gate |
| Real OCR / document ingestion (replace synthetic return) | M | Pre-pilot gate (can use existing Intuit OCR pipeline) |
| Billing integration (Stripe or internal billing service) | S | Pre-GA gate |
| HIPAA / SOX compliance review | M | Pre-pilot gate |
| Load testing at 1,000+ concurrent experts | S | Pre-GA gate |

**Tech stack:** Next.js 16 + React 19 + TypeScript + Tailwind 4 dark theme + Anthropic Claude (claude-sonnet-4-6) + Neon PostgreSQL via Drizzle ORM (HTTP driver, serverless-compatible) + Vitest. Synthetic data only with no real PII.

**Scalability note:** Every component is chosen for serverless-first deployment. The architecture scales horizontally with zero configuration changes — Vercel auto-scales the compute, Neon auto-scales the database, and the cassette pattern eliminates LLM cost in the demo path.

## 9. Success Metrics

### Prototype validation metrics

These prove the prototype works and the architecture is sound.

| Metric | Target | Status |
|---|---|---|
| Goal dashboard reflects customer's stated goals end to end | Every recommendation carries a goal fit score and a goal label | Demonstrated in prototype |
| Recommendation list catches every mechanically detectable error | 5 of 5 errors caught with rule citation and goal mapping | Demonstrated — 27 recommendations, all 13 rule categories |
| Expert minutes on the synthetic 1040 | Under 10 minutes wall clock vs 25–35 min legacy baseline | Demonstrated in prototype walkthrough |
| Confidence score calibration | Calibration curve within 5 points across deciles on 50 return synthetic test set | Demonstrated — calibration eval passes |
| PII redaction | Zero PII leakage in prompts sent to the model | Demonstrated — redaction pipeline verified |
| Routing rationale chip | Demo chip shows specialty, jurisdiction, continuity, complexity | Demonstrated — 4 dimensions rendered |
| Audit trail capture | 100% of demo interactions captured and queryable | Demonstrated — full audit timeline |
| Cases auto closed without warning | Escalation panel surfaces case state to expert in real time | Demonstrated — escalation panel rendered |

### Business metrics (production pilot and beyond)

These are the metrics that justify continued investment. Each has a clear measurement methodology and a decision gate.

| Metric | Pilot target (50 experts, 1,000 returns) | GA target (TY2026) | Measurement method |
|---|---|---|---|
| **Customer retention lift** | +1 point NPS for goal-aligned returns vs control | +2–4 point retention lift on Live customer base | A/B test: goal-aligned workbench vs current workbench. Measure 90-day retention and NPS. |
| **Revenue per customer** | 5% higher upsell rate from Live Assisted to Full Service when goals indicate complexity | 10% conversion uplift on goal-flagged customers | Funnel analysis: goal complexity score > threshold → upsell prompt → conversion rate. |
| **First touch return accuracy** | 15% reduction in IRS notice rate for pilot returns | 25% reduction across all Live returns | Post-filing IRS notice rate comparison: B1 cohort vs historical baseline. Requires 6–12 month lag. |
| **Expert throughput** | Expert handles 2 additional returns per day with pre-work (B3) | 15–20% throughput improvement across all experts | Returns per expert per day, complexity-adjusted. Control for seasonal volume. |
| **Goal fulfillment rate** (new metric) | 70% of stated customer goals addressed by accepted recommendations | 85% goal fulfillment across all Live returns | Goal dashboard tracking: goals stated at intake vs recommendations accepted by expert, scored by goal-fit. |
| **Recommendation acceptance rate** | 60% of AI recommendations accepted or edited (not rejected) | 75% acceptance rate | Expert action on each recommendation: accept / edit / reject. Edit counts as partial acceptance. |

## 10. Build Orchestration

The prototype is built by **six specialized agents running in parallel**, coordinated through the per-agent task briefs in `tasks/` and the Sprint 1 backlog in `backlog/sprint-01.md`. Each agent owns a vertical slice that can be developed and tested independently; integration points are explicit TypeScript interface contracts pinned in `src/contracts/` before the build kicks off.

| Agent | Slice | Primary outputs |
|---|---|---|
| Agent 1, Domain & Data | Synthetic data + 50-rule deterministic tax corpus + golden recommendations | `src/data/`, `src/lib/rules/`, Vitest unit tests |
| Agent 2, Recommendation Engine (B1) | Goal taxonomy, intake schema, rule-first / LLM-second recommendation engine, goal-fit scoring | `src/lib/goals/`, `src/lib/recommendations/`, `app/api/recommendations/route.ts` |
| Agent 3, Pre-Work Engine (B3 mock) | Mocked OCR output, year-over-year delta, complexity scoring, risk register | `src/lib/prework/`, `app/api/prework/route.ts` |
| Agent 4, Workbench UI (Layer 3) | Next.js app shell + dark theme + all workbench panels | `app/(workbench)/`, `components/workbench/` |
| Agent 5, Trust Layer (Layer 4) | PII redaction, audit trail, "what AI saw" data feed, calibration eval | `src/lib/pii/`, `src/lib/audit/`, SQLite schema |
| Agent 6, Quality, Tests, & Demo | Cross-slice integration tests, demo walk-through script, calibration test set, success-metric dashboard | `tests/integration/`, `docs/demo-script.md` |

After Agent 1 finishes the foundation slice, Agents 2 through 5 build in parallel and Agent 6 integrates as soon as any two slices stabilize.

## 11. Repository Layout

```
turbotax-vep/
├── README.md                            What + why + how to run
├── .gitignore
├── package.json                         Next.js 16 + React 19 + TS + Tailwind 4
├── docs/
│   ├── PRD.md                           This document
│   ├── PRD.docx                         Word version
│   ├── architecture/
│   │   ├── overview.md                  4-layer architecture diagram + narrative
│   │   └── decisions/                   ADR-001 through ADR-008
│   ├── demo-script.md                   Step-by-step live walk-through
│   └── appendices/
│       ├── voice-of-customer.md
│       ├── vignettes.md
│       ├── backlog-deferred.md
│       ├── expert-side-themes.md
│       ├── risks.md
│       └── sources.md
├── backlog/
│   ├── product-backlog.md               Epics + user stories, prioritized
│   ├── sprint-01.md                     The MVP sprint
│   └── sprint-02-plus.md                Post-MVP roadmap
├── tasks/                               Per-agent task briefs (6 files)
├── src/                                 Populated by the multi-agent build
├── app/                                 Next.js app router
│   └── tour/                            Guided tour with TTS narration
├── components/
└── tests/
```

## 12. Architecture Decision Records

The eight ADRs that pin the build live in `docs/architecture/decisions/`:

| ID | Title |
|---|---|
| ADR-001 | Tech stack |
| ADR-002 | Synthetic only data |
| ADR-003 | Deterministic rules as safety net |
| ADR-004 | Serverless Postgres for audit trail |
| ADR-005 | Goal taxonomy |
| ADR-006 | PII redaction strategy |
| ADR-007 | Confidence calibration |
| ADR-008 | Multi-agent build orchestration |

## 13. Risks and Open Questions

Full risk register and open questions are in `docs/appendices/risks.md`. Headline risks: AI quality bar (mitigated by deterministic rules safety net), expert resistance to monitoring (mitigated by co-designed metrics), senior expert friction (mitigated by collapsible UI density), competency profile bootstrap (mitigated by self-assessment + admin validation), PII redaction at scale (mitigated by phased entity resolution), CSAT vs accuracy tradeoff (mitigated by composite metric with "told customer no" tracking), and goal capture quality (mitigated by guided taxonomy + AI suggested goals).
