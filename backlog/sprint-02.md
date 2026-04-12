# Sprint 2 — Public B1 Production Demo

**Goal:** A public URL where anyone on the internet can land, state their own tax goals, and see Big Bet B1 (Goal-Aligned Recommendation System) re-rank recommendations on the Olivia & Ryan Mitchell return against *their* stated priorities. The demo proves B1 is a working product, not a spec.

**Definition of done:**

1. `https://turbotax-vep.vercel.app` (Vercel-assigned URL) is live and reachable from any browser. A dedicated custom domain can be added later as a one-click follow-up; not blocking for Sprint 2.
2. A first-time visitor can complete intake (set 3 goals + weights) in under 60 seconds and see a re-ranked recommendation list within 2s.
3. Changing the goal mix demonstrably re-ranks the top 5 recommendations.
4. Marginal cost per visitor is **$0** (cassette replay + local goal-fit scorer; no live LLM calls in the public hot path).
5. The full Vitest suite is green against the new Postgres-backed audit trail.
6. The repo `README.md` links to the live demo and includes a 3-sentence "what you're looking at" intro.

**Non-goals:** real authentication, multi-tenancy, real OCR, real customer accounts, real tax filing, anything from B2/B3/B4/B5. Sprint 2 is the public face of the existing Sprint 1 prototype, not new big-bet scope.

---

## Architectural decisions (locked at sprint start)

| ID | Decision | Rationale |
|---|---|---|
| AD-S2-01 | LLM cassette is **goal-agnostic**; the local goal-fit scorer handles all goal-aware re-ranking. | The current prompt mixes "explain findings" (LLM strength) with "rank by goal fit" (deterministic scorer's job). Decoupling them lets one cassette serve infinite goal-mix permutations at $0 marginal cost. Architecturally sound — and fixes redundancy between `score_recommendation()` and the LLM's `goal_fits` output. |
| AD-S2-02 | Database: **Neon Postgres** via Drizzle ORM (HTTP driver). | Matches the paireval-next stack; serverless-compatible; same DATABASE_URL pattern; zero-ops on Vercel. |
| AD-S2-03 | Deployment: **Vercel** project, default `turbotax-vep.vercel.app` URL. No custom domain in Sprint 2. | Free, instant, no DNS work. A dedicated custom domain (e.g. registered fresh from Namecheap/Cloudflare) can be added after Sprint 2 lands without blocking the demo. The repo stays unaffiliated with paireval.com. |
| AD-S2-04 | Authentication: **none** (open public demo). Abuse prevention via per-IP rate limit on `/api/recommendations`. | This is a portfolio piece, not a product. Any auth wall would gate the people we want reading it. |
| AD-S2-05 | PII discipline: visitors **never enter real PII**. Disclaimer banner on every page that accepts input. The Mitchell return is the only return data the engine sees. | Per ADR-002, the prototype is synthetic-only. A public demo doesn't change that. |

---

## Tasks

### Foundation — Engine refactor + DB swap

| ID | Task | Definition of done |
|---|---|---|
| T-701 | **Decouple LLM cassette from goal mix.** Refactor `build_user_prompt` to omit goals. Update `parse_llm_response` so `goal_fits` from the LLM are ignored (or absent). Update `build_recommendations` so `score_recommendation()` is the sole source of `goal_fits` and `composite_goal_fit`. Re-record `mitchell-rec-cassette.json` once against the new prompt. | Engine produces identical recommendation set across any goal mix; only the per-goal scores and composite ranking change. Existing engine tests still pass. New test asserts that two different goal mixes produce different `composite_goal_fit` orderings against the same cassette. |
| T-702 | **Database swap: better-sqlite3 → Neon Postgres + Drizzle.** Translate `src/lib/audit/schema.ts` to a Drizzle Postgres schema. Add `drizzle.config.ts`. Add `npm run db:migrate`. Replace `src/lib/audit/capture.ts` driver with the Neon HTTP client. Update `src/lib/audit/migrations.ts` to be a Drizzle migration runner. | All audit tests pass against a Postgres test database. SQLite dependency removed from `package.json`. `data/audit.db*` deleted from working tree. |
| T-703 | **Intake table.** New `intake_sessions` table (intake_id PK, captured_at, goals JSONB, ip_hash, user_agent_hash). Persisted on intake submit so the workbench can fetch by intake_id. TTL: 7 days. | Drizzle schema + migration land. New `src/lib/intake/store.ts` exports `create_intake`, `get_intake`. Vitest covers happy path + 404. |

### Public-facing UI

| ID | Task | Definition of done |
|---|---|---|
| T-704 | **Landing page** at `/` (replaces the current redirect-to-/workbench). Hero copy explains what B1 is, who it's for, and what the visitor is about to do. Two CTAs: "Try the demo" → `/intake`, and "Read the PRD" → GitHub. Footer: author byline, GitHub repo link, "synthetic data only" disclaimer. | Lighthouse score ≥ 90 on a cold load. Mobile-friendly (320px+). Dark theme matches the workbench. |
| T-705 | **Intake form** at `/intake`. Visitor picks 3 goals from the 10-goal taxonomy (or "other" with free text), assigns rank 1/2/3 and weight 1-5 to each. Inline validation. Submit → POST `/api/intake` → redirect to `/workbench?intake=<id>`. | Form covers every goal in `GOAL_IDS`. Zod-validated client + server side. Submitting empty fields shows actionable errors. Vitest coverage on the form's pure logic. Disclaimer banner: "Don't enter real personal information." |
| T-706 | **Workbench public mode.** `/workbench?intake=<id>` reads intake from Postgres, hands the goal vector to the recommendation engine, and renders the existing Sprint 1 panels. A "Try different goals" CTA at the top returns to `/intake`. The customer-name + routing-chip strings stay hardcoded to Mitchell. | Visiting `/workbench?intake=<valid_id>` shows the goal-mix-aware ranking. `/workbench` with no intake falls back to a default Mitchell goal preset (so the page is never broken). Visiting with an invalid id shows a friendly error and a "start over" link. |
| T-707 | **`/api/intake` route.** POST: validates goals via `validate_intake`, stores via `create_intake`, returns `{intake_id}`. GET `/api/intake/[id]`: returns the stored goal vector. Both rate-limited per IP. | Vitest covers happy path, validation failure, missing intake, rate-limit hit. |

### Cost + abuse discipline

| ID | Task | Definition of done |
|---|---|---|
| T-708 | **Per-IP rate limit middleware.** In-memory token bucket on `/api/intake`, `/api/recommendations`, `/api/prework`. 20 requests / hour / IP. 429 with `Retry-After` header on overflow. Pattern lifted from `paireval-next`'s `src/lib/rate-limit.ts`. | Vitest exercises the bucket. Manually verified locally with a quick `curl` loop. |
| T-709 | **CI gate: cassette must exist + hash-pinned.** A new test asserts `tests/recommendations/cassettes/mitchell-rec-cassette.json` exists and matches a checked-in SHA-256. Prevents accidental cassette regeneration that would change demo behavior. | New `tests/recommendations/cassette-pin.test.ts` lands. CI fails on cassette drift. |

### Deployment

| ID | Task | Definition of done |
|---|---|---|
| T-710 | **Vercel project setup.** Create `turbotax-vep` Vercel project, link to GitHub repo, set environment variables: `DATABASE_URL` (Neon), `ANTHROPIC_API_KEY` (only used in `RECORD_CASSETTES=1` mode, not in prod runtime). Verify production build on Vercel matches local `next build`. | Preview URL deploys cleanly on every PR. Production deploy succeeds from `main`. |
| T-711 | **Confirm Vercel-assigned URL is live.** No custom domain work in Sprint 2 — the project ships on `turbotax-vep.vercel.app` (or the slug Vercel auto-generates). Document the live URL in `README.md` and `docs/DeploymentGuide.md`. | `https://turbotax-vep.vercel.app` resolves over TLS and serves the landing page. Custom domain is documented as a Sprint 3 follow-up. |
| T-712 | **Production database.** Provision a Neon Postgres database for the demo (free tier is fine). Run migrations against it. Smoke-test the audit trail end-to-end against Neon. | Neon project exists. Migrations applied. A POST to `/api/intake` followed by a GET round-trips through Postgres in production. |

### Validation + polish

| ID | Task | Definition of done |
|---|---|---|
| T-713 | **End-to-end test on the deployed URL.** A Vitest integration test (or Playwright if added) hits the live preview URL, walks intake → workbench → recommendations, asserts the response shape, asserts the goal-mix re-rank is observable. | Test passes against `vercel.app` preview URL. Documented in `docs/DeploymentGuide.md`. |
| T-714 | **README update.** Hero badge linking to the live demo. New "Try the demo" section above "Running the prototype." Three-sentence explainer for non-technical readers. | README shows live demo link at the top. GitHub repo card on the live page links back to the README. |
| T-715 | **Public copy pass.** Disclaimer banner everywhere visitors can input data. "What you're looking at" tooltip on every workbench panel for first-time visitors. "Synthetic data only" footer. Author byline. | Disclaimer banner is present on `/intake` and `/workbench`. Footer credit on every page. No mention of Intuit branding (it's a portfolio piece, not affiliated). |
| T-716 | **Production smoke test checklist.** A short manual checklist in `docs/DeploymentGuide.md` to run after every prod deploy: load /, click through intake, check the workbench renders, change goals, verify re-rank, verify rate limit fires after 20 calls, verify disclaimer copy is present. | Checklist exists. First production deploy passes it. |

---

## Sequencing

1. **Phase 0 (locked decisions).** AD-S2-01 through AD-S2-05 above. No code until these are confirmed.
2. **Phase 1 (foundation, sequential).** T-701 (engine decouple) → T-702 (DB swap) → T-703 (intake table). Each blocks the next.
3. **Phase 2 (UI, parallel after Phase 1).** T-704, T-705, T-706, T-707 in parallel. T-706 depends on T-707.
4. **Phase 3 (discipline, parallel with Phase 2).** T-708, T-709.
5. **Phase 4 (deployment, sequential).** T-710 → T-712 → T-711.
6. **Phase 5 (validation).** T-713 → T-714, T-715, T-716 in parallel.

A single agent can run this end-to-end; the multi-agent contract-bounded build was for Sprint 1's six independent slices and is not needed here.

---

## Risks

| Risk | Mitigation |
|---|---|
| Goal-agnostic prompt produces lower-quality LLM output | Re-record the cassette with the new prompt and visually inspect the recommendations against the golden file. The hallucination filter is unchanged, so the floor doesn't move. |
| Postgres migration breaks audit-trail tests | Run the full test suite against a local Neon branch before flipping the production driver. Drizzle's schema diff makes the migration auditable. |
| Vercel cold start > 2s on the workbench page | Pre-warm the cassette read at module-load time; cache the recommendation result by `intake_id` in Postgres so a refresh is a single SELECT. |
| Public abuse via API spam | Per-IP rate limit (T-708). If that's not enough, add Cloudflare Turnstile in front of `/intake`. |
| Visitor confusion about what they're looking at | First-page hero copy + per-panel tooltips (T-715). The "Read the PRD" CTA carries the long-form story. |
| Cost overrun if rate limit is bypassed | Hot path is cassette-only; live LLM path is gated behind `RECORD_CASSETTES=1` server env var which is not set in production. Worst case is unlimited Postgres reads, which is free on Neon's hobby tier up to 191 hours of compute / month. |

---

## Out of scope (explicitly deferred to Sprint 3+)

- Real authentication / accounts
- Real customer name in the demo (always Olivia & Ryan Mitchell)
- Multiple synthetic returns to choose from (could be a Sprint 3 task if the demo lands well)
- Live LLM mode for visitors (blocked on a real budget guard)
- B2/B3/B4/B5 production scope (still in `sprint-02-plus.md`)
- Audit trail visualization improvements
- Mobile-optimized workbench (landing + intake are mobile-friendly; workbench is desktop-only)
