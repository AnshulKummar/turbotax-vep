# TurboTax Virtual Expert Platform — Prototype

> **Live demo:** https://turbotax-vep.vercel.app

An independent product review and working prototype of a redesigned **TurboTax Virtual Expert Platform**, the layer that powers TurboTax Live Assisted, TurboTax Live Full Service, and Expert Full Service.

## Try the demo

The prototype delivers the full **customer-to-expert journey** for Big Bet B1. A visitor plays the role of a TurboTax customer: enters a synthetic name, picks a filing status and AGI band, selects tax documents from a card grid, then chooses three prioritized goals. After a branded handoff transition, the visitor arrives at a redesigned expert workbench with left-hand navigation and six sections (Brief, Goals, Documents, Pre-work, Recommendations, Audit). The recommendation engine re-ranks expert findings on a synthetic married-filing-jointly return (Olivia & Ryan Mitchell) against the submitted goal mix. Changing the goals demonstrably re-ranks the top five recommendations.

### Five demo paths

1. **Guided tour:** [`/tour`](https://turbotax-vep.vercel.app/tour) — narrated walkthrough of the full demo script with Web Speech API TTS narration, speech-driven advancement, auto-advancing captions, playback controls, and keyboard shortcuts
2. **Full customer flow:** `/` -> `/start` -> fill info + pick documents + select goals -> `/handoff` -> `/workbench?intake=<id>&section=brief` (expert view with customer context)
3. **Quick expert view:** `/workbench` — loads with default Mitchell goals, skips the customer flow entirely
4. **Customer review:** `/review?intake=<id>` — customer approves or declines expert-shared recommendations
5. **Legacy intake:** `/intake` — Sprint 2 style goal-only form, still works and redirects to the workbench

The app serves **16 routes** (13 app routes). Everything is synthetic data, there is no auth, and the marginal cost per visitor is **$0** (cassette replay + local goal-fit scorer; no live LLM calls in the public hot path).

The "Read the PRD" link on the landing page points to this GitHub repo.

### Sprint 4: Recommendation approval flow

- **27 tiered recommendations** segmented into High, Medium, and Low priority tiers based on severity, goal-fit, and dollar impact
- **App cues** on all 6 workbench sections with tinted background, ring styling, and diamond icon explaining what each demonstrates for demo viewers (dismissible)
- **Two-way customer approval flow:** expert selects recommendations to share -> customer reviews at `/review?intake=<id>` with approve/decline toggles -> expert sees approval status badges on each card
- **Tier filter tabs** (All/High/Medium/Low) with counts on the Recommendations section

### Pre-work: Confidence % and Quality Co-pilot

- **Confidence %** per pre-populated line combines three signals: OCR certainty, cross-document corroboration, and year-over-year consistency. Click any score to see the breakdown.
- **Real-time Quality Co-pilot** flags inconsistencies as the expert edits, surfacing rule citations and dollar impact inline.

### Success metrics dashboard

`/metrics` — dashboard tracking 8 KPIs: Goal dashboard coverage, Recommendation list completeness, Expert minutes on return, Confidence calibration, PII leakage, Routing rationale dimensions, Audit trail capture rate, Cases auto-closed without warning.

### Guided tour

`/tour` — self-running narrated walkthrough using the Web Speech API for TTS narration. Supports speech-driven advancement, playback controls (play/pause/skip), and full keyboard shortcuts.

Read more:

- [docs/PRD.md](docs/PRD.md) — full product requirements document, including Big Bets, MVP scope, and success metrics
- [backlog/sprint-03.md](backlog/sprint-03.md) — Sprint 3 plan (customer flow + expert redesign)
- [backlog/sprint-02.md](backlog/sprint-02.md) — Sprint 2 plan (public demo milestone)
- [docs/DeploymentGuide.md](docs/DeploymentGuide.md) — deploy + smoke-test checklist

## What the prototype shows

The prototype demonstrates the anchor big bet: a **Goal Aligned Recommendation System** that captures customer goals at intake (maximize refund, minimize audit risk, plan for a life event, set up next year), then ranks every AI suggestion by how well it advances those goals, with rule citations, confidence scores, dollar impact, and audit risk delta. The expert workbench surfaces the goals, the recommendations, the risk register, and the audit trail in a single dark-themed interface.

## What's in here

- `docs/PRD.md` — full product requirements document (Big Bets in Part I, Incremental Improvements in Part II, MVP scope, success metrics, build orchestration)
- `docs/PRD.docx` — Word version of the same PRD
- `docs/architecture/overview.md` — 4-layer architecture overview
- `docs/architecture/decisions/` — 8 ADRs that pin the technical decisions before the build
- `docs/appendices/` — voice of customer, vignettes, deferred backlog, expert side themes, risks, source bibliography
- `docs/demo-script.md` — step-by-step live walk-through (written by Agent 6 during the build)
- `backlog/product-backlog.md` — epics and prioritization
- `backlog/sprint-01.md` — the MVP sprint, all tasks the multi-agent build will execute
- `backlog/sprint-02-plus.md` — post-MVP roadmap
- `tasks/` — six per-agent task briefs for the parallel build (one per slice)
- `src/`, `app/`, `components/`, `tests/` — populated by the multi-agent build

## Architecture (4 layers)

1. **Layer 1, AI Pre-Work** — document ingestion, year-over-year delta, deterministic rules sweep, complexity score, risk register
2. **Layer 2, Smart Routing** — specialty, complexity, jurisdiction, language, capacity, continuity, and goal-aware matching
3. **Layer 3, Expert Workbench** — goal dashboard, return surface with confidence scores, risk register, prior year side-by-side, customer context, AI suggested questions, live co-pilot, "what AI saw" panel, expert minutes counter
4. **Layer 4, Trust and Learning** — PII redaction, audit trails, calibrated confidence, expert edits as labeled training data, composite performance metric

The MVP demonstrates Layer 3 end-to-end against a synthetic married-filing-jointly Form 1040 with RSU, K-1, rental property, HSA, wash sale lots, and multi-state IL+CA obligations. Layers 1, 2, and 4 are mocked or partially live as described in `docs/PRD.md` Section 7.

## Tech stack

| Layer | Choice | Scalability |
|---|---|---|
| Framework | Next.js 16 (App Router) + React 19 | Vercel serverless — scales to zero, auto-scales on traffic spikes. Edge-compatible route handlers. |
| Language | TypeScript (strict mode) | Type-safe contracts across all layers prevent integration drift at scale. |
| UI | Tailwind 4 (dark theme only) | Atomic CSS — zero runtime overhead, constant bundle size regardless of component count. |
| AI | Anthropic Claude (claude-sonnet-4-6) | Cassette replay pattern: $0 marginal cost in demo mode. Production: horizontal scaling via stateless API calls with per-request token budgets. |
| Database | Neon PostgreSQL via Drizzle ORM (HTTP driver) | Serverless Postgres — connection pooling, branching for preview deploys, auto-scaling compute. Handles 10K+ concurrent connections. |
| Validation | Zod v4 (`zod/v4`) | Single source of truth for API contracts — compile-time + runtime validation at every boundary. |
| Tests | Vitest (447 tests, 64 files) | Sub-second unit tests, integration tests against synthetic returns, CI-compatible. |
| Deployment | Vercel (serverless) | Global CDN, automatic preview deploys per PR, instant rollbacks. Production at paireval.com pattern. |
| Data | 100% synthetic, zero real PII | Eliminates compliance overhead for the prototype. Production: PII redaction pipeline (Layer 4) handles real data. |

## Running the prototype

```bash
# Install
npm install

# Set environment
cp .env.example .env.local
# Add ANTHROPIC_API_KEY=sk-ant-...

# Run dev server
npm run dev

# Open the workbench
# http://localhost:3000/workbench

# Run tests
npm test

# Run the calibration eval
npm run calibration
```

The live demo walk-through is in `docs/demo-script.md`.

## Build orchestration

The prototype is built by **six specialized agents running in parallel**:

| Agent | Slice | Owns |
|---|---|---|
| Agent 1 | Domain & Data | Synthetic return + 50-rule corpus + golden recommendations |
| Agent 2 | Recommendation Engine | Goal taxonomy + recommendation engine + goal-fit scoring |
| Agent 3 | Pre-Work Engine | Mocked OCR + YoY delta + complexity + risk register |
| Agent 4 | Workbench UI | Next.js shell + all Layer 3 panels |
| Agent 5 | Trust Layer | PII redaction + audit trail + calibration eval |
| Agent 6 | Quality, Tests, Demo | Integration tests + demo script + success metric dashboard |

After Agent 1 finishes the foundation slice, Agents 2 through 5 build in parallel and Agent 6 integrates as soon as any two slices stabilize. Per-agent task briefs are in `tasks/`.

## License

MIT
