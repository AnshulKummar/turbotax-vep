# TurboTax Virtual Expert Platform — Prototype

> **Live demo:** (coming soon — pending Vercel deployment in Sprint 2 Phase 4. URL to be assigned by Vercel.)

An independent product review and working prototype of a redesigned **TurboTax Virtual Expert Platform**, the layer that powers TurboTax Live Assisted, TurboTax Live Full Service, and Expert Full Service.

## Try the demo

The deployed prototype is a three-page public tour of **Big Bet B1 — a Goal-Aligned Recommendation System**. Visitors land on `/`, complete a 3-goal intake form at `/intake` (pick three priorities like "maximize refund", "minimize audit risk", "plan a life event", rank them, and set weights), and land on `/workbench?intake=<id>` where the recommendation engine has already re-ranked expert findings on a synthetic married-filing-jointly return (Olivia & Ryan Mitchell) against the submitted goal mix. Changing the goals demonstrably re-ranks the top five recommendations — which is the whole point.

Everything is synthetic data, there is no auth, and the marginal cost per visitor is **$0** (cassette replay + local goal-fit scorer; no live LLM calls in the public hot path).

Read more:

- [docs/PRD.md](docs/PRD.md) — full product requirements document, including Big Bets, MVP scope, and success metrics
- [backlog/sprint-02.md](backlog/sprint-02.md) — Sprint 2 plan for this public-demo milestone
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

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript (strict)
- **UI**: Tailwind 4 (dark theme only)
- **AI**: Anthropic Claude (`claude-sonnet-4-6`) via the official Anthropic SDK
- **Storage**: Neon Postgres via Drizzle ORM (HTTP driver, serverless-compatible); in-process pglite for local tests
- **Tests**: Vitest + integration tests against the synthetic return
- **Data**: 100% synthetic, zero real PII

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
