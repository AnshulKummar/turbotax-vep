# Sprint 3 — Customer Flow + Expert View Redesign

**Goal:** Transform the public demo from an expert-only tool into a full customer-to-expert handoff experience. A recruiter hits `/`, walks through a simulated TurboTax intake (basic info + document upload + goal capture), sees a branded handoff transition, and arrives at a redesigned expert workbench with left-hand navigation and clear section-based layout. The demo now tells the B1 story end-to-end in under 2 minutes.

**Scalability target:** Architecture must support ~12,000 sessions/day (30% of 4,000 concurrent experts reviewing 5-10 cases/day). Neon pooler + Vercel serverless + indexed session lookups.

**Definition of done:**

1. `https://turbotax-vep.vercel.app` serves the full customer-to-expert flow.
2. A first-time visitor lands on `/`, clicks "Try the customer flow," completes info + doc selection + goals in 2 screens, sees a handoff transition, and arrives at the redesigned expert view with left-nav in under 90 seconds.
3. The expert view has 6 sections accessible via left nav: Brief, Goals, Documents, Pre-work, Recommendations, Audit. One section visible at a time with clear primary CTAs.
4. The existing `/workbench?intake=<id>` URL still works as a direct link (backward compat).
5. Marginal cost per visitor is still **$0** (AD-S2-01 cassette replay invariant holds).
6. All tests green (304 baseline + new Sprint 3 tests).
7. Disclaimer banner present on every page that accepts input.

**Non-goals:** real TurboTax branding, real document upload/OCR, mobile-optimized expert view, authentication, multi-tenancy.

---

## Architectural decisions (locked at sprint start)

Sprint 2 decisions AD-S2-01 through AD-S2-05 **remain in force**.

| ID | Decision | Rationale |
|---|---|---|
| AD-S3-01 | Customer metadata stored as **nullable JSONB** on `intake_sessions` table. No new table. | Keeps data model simple. JSONB is schema-validated in TypeScript via Zod but schema-flexible at the DB level, allowing field evolution without migrations. |
| AD-S3-02 | Customer flow state is **client-only** until final submit. Single `POST /api/intake` writes goals + metadata in one batch. | Zero intermediate DB writes. Simplest possible data flow. Eliminates partial-session cleanup. |
| AD-S3-03 | Expert view defaults to **Brief** section on first load. Left nav is **fixed at >=1024px**, hidden with toggle under 1024px. | Brief sells the narrative in one card before details. Desktop-first demo. |
| AD-S3-04 | Customer screens use the **same dark palette** with a subtle CSS variable override (`body[data-flow="customer"]`) for a warmer feel. | One CSS line, no design system fork, significant vibe shift. |
| AD-S3-05 | Customer metadata **never enters the LLM prompt**. Engine invariant from AD-S2-01 holds: cassette is goal-agnostic, re-ranking is local. | $0 marginal cost thesis is non-negotiable. |
| AD-S3-06 | Document catalogue is a **static module** (`src/lib/customer/documents.ts`) with 8 synthetic documents. No real upload, no file storage. | Pure choreography. Keeps the demo deterministic and free. |
| AD-S3-07 | **No new LLM calls** in the entire Sprint 3 flow. Handoff screen is pure client-side visual choreography (setTimeout + redirect). | Budget stays $0. |
| AD-S3-08 | `customer_metadata` is **not included in audit capture**. Audit stays narrow: case_id only. | Prevents audit bloat. Metadata is queryable via `get_intake()` when needed. |

---

## Persona review (locked rationale for key design choices)

| Persona | Key concern | Resolution |
|---|---|---|
| **Principal PM** | Demo must be < 2 min end-to-end, with two entry paths on `/` (customer flow vs skip-to-expert). | Customer flow is 2 screens + handoff. Landing has dual CTAs. |
| **Principal UX** | Every screen has one hero affordance. Expert view is section-nav, not panel-sprawl. Document picker is a card grid, not a form. | Left nav with 6 sections. Doc cards with checkmarks. One primary CTA per section. |
| **Principal SWE** | Reuse existing panels — re-parent, don't rewrite. Backward compat on `/workbench?intake=<id>`. | WorkbenchShell wraps existing panel components. Old URL still works. |
| **Distinguished Architect** | AD-S2-01 cassette invariant. No new LLM calls. No PII in prompt. | Customer metadata is display-only. Engine sees only goals + synthetic return. |
| **Principal DevSecOps** | Disclaimer on all input surfaces. Rate limits hold. Bundle budget. | DisclaimerBanner on `/start`, `/start?step=goals`, `/handoff`. Rate limits unchanged. |

---

## Tasks

### Phase 1 — Foundation (Agent E, sequential)

| ID | Task | Definition of done |
|---|---|---|
| T-E01 | **Drizzle migration:** add `customer_metadata JSONB NULL` to `intake_sessions`. Add `expires_at` index for scale. Update Drizzle schema + pglite test setup. | Migration applied to prod Neon + test pglite. Existing tests unbroken. |
| T-E02 | **CustomerMetadata contract + Zod schema.** `src/contracts/customer-metadata.ts` + `src/lib/intake/metadata.ts`. Strict validation: display_name max 40 chars, filing_status enum, agi_band enum, document_ids array max 20. | Types exported. Zod schema covers all fields. |
| T-E03 | **Extend `create_intake` / `get_intake`** for optional `customer_metadata` param. Backward compatible — existing callers unaffected. Parse JSONB on read with graceful fallback. | Store tests cover: with metadata, without metadata, corrupt metadata. |
| T-E04 | **Document catalogue.** `src/lib/customer/documents.ts` with 8 synthetic docs (W-2, 1099-INT, 1099-DIV, 1099-B, 1098, 1099-R, K-1, 1095-A). All issuers obviously synthetic. | Module exports `DEMO_DOCUMENTS`, `DOCUMENT_IDS`, `get_documents_by_ids`. Tests verify uniqueness, lookup, count. |
| T-E05 | **Tests** for T-E01 through T-E04. Extend `tests/intake/store.test.ts`, new `tests/intake/metadata.test.ts`, new `tests/customer/documents.test.ts`. | All green. |
| T-E06 | **Run migration against prod Neon.** | Column exists in production. |

### Phase 2 — Customer surface (Agent F, after Phase 1)

| ID | Task | Definition of done |
|---|---|---|
| T-F01 | **Customer layout.** `app/(customer)/layout.tsx` with DisclaimerBanner, PublicFooter, `data-flow="customer"` body attribute for CSS override. | Layout renders. Disclaimer + footer present. |
| T-F02 | **Screen 1: Welcome + info + doc picker.** `app/(customer)/start/page.tsx` + `StartFlow.tsx`. Client component with: name field (max 40, PII guard hint), filing status dropdown, AGI band dropdown, document card grid (8 cards, selectable). Sticky "Continue" CTA. | Form validates. Doc cards toggle. State persists to step 2. |
| T-F03 | **Screen 2: Goal selection.** `app/(customer)/start/page.tsx?step=goals` — re-skinned version of `/intake` form, same validation, warmer card layout. "Connect me with my expert" CTA submits to `POST /api/intake`. | 3 goals validated. Submits goals + customer_metadata in one POST. |
| T-F04 | **Handoff transition.** `app/(customer)/handoff/page.tsx` — "Connecting you to Alex, your tax expert." 1.8s auto-redirect to `/workbench?intake=<id>`. Shows summary of what was shared. | Page renders, auto-redirects. No server work. |
| T-F05 | **Extend `POST /api/intake`** to accept optional `customer_metadata` in the request body. Zod-validated. Passed to `create_intake()`. | Existing clients (no metadata) still work. New clients (with metadata) persist it. Tests cover both paths. |
| T-F06 | **Update landing page** `/`. Replace single CTA with dual: "Try the customer flow" → `/start`, "Skip to expert view" → `/workbench`. | Both CTAs visible. Mobile-friendly. |
| T-F07 | **Tests.** `tests/customer/start-flow.test.ts` (form validation logic). Extend `tests/api/intake.test.ts` (metadata persistence). | All green. |

### Phase 3 — Expert shell redesign (Agent G, parallel with Phase 2)

| ID | Task | Definition of done |
|---|---|---|
| T-G01 | **WorkbenchShell.** `components/workbench/WorkbenchShell.tsx` — left nav (6 sections) + top bar (customer name, filing status, AGI) + main content frame. Left nav fixed >=1024px, hidden <1024px. Section selection via `?section=` query param. | Shell renders. Nav highlights active section. Top bar populated from intake metadata. |
| T-G02 | **BriefSection.** Summary card: customer metadata, goal summary, document list, key metrics (complexity score, estimated savings). The "punchline" screen that sells B1 in one view. | Renders customer name, filing, goals, docs, metrics. |
| T-G03 | **GoalsSection.** Display captured goals with rank, weight, and label in a readable card layout. Not editable — display only. "Try different goals" secondary CTA. | Goals rendered from intake. CTA links to `/start`. |
| T-G04 | **DocumentsSection.** Display selected documents as cards matching the customer's selection. Show form type, issuer, description. | Documents rendered from customer_metadata.document_ids. |
| T-G05 | **PreworkSection.** Wraps existing pre-work panels (YoY delta, complexity, risk register) in the new section container. Minimal refactor — re-parent, don't rewrite. | Existing pre-work content renders in new shell. |
| T-G06 | **RecommendationsSection.** Wraps existing recommendation panels. Clear primary CTA: "Accept recommendations & draft reply" (fires a synthetic confirmation toast). | Recs render with goal-fit scores. CTA shows success state. |
| T-G07 | **AuditSection.** Wraps existing audit trail panel. | Audit trail renders in new shell. |
| T-G08 | **Refactor `app/(workbench)/workbench/page.tsx`** to render `<WorkbenchShell>` with the new sections. Backward compat: `/workbench?intake=<id>` still works. Default to Brief section. No intake = default Mitchell goals. | Old URL works. Section nav works. All gates green. |
| T-G09 | **Tests.** `tests/workbench/shell.test.ts`. Update `tests/integration/sprint2-e2e.test.ts`. | All green. |

### Phase 4 — Validation + polish (Agent H, after F + G merge)

| ID | Task | Definition of done |
|---|---|---|
| T-H01 | **End-to-end test:** full customer flow `/` → `/start` → doc select → goals → `POST /api/intake` → `/handoff` → `/workbench?section=brief` → nav to recommendations. | Test passes. |
| T-H02 | **Disclaimer + footer sweep.** Verify DisclaimerBanner on `/start`, `/start?step=goals`, `/handoff`, `/workbench`. Verify PublicFooter on all public pages. | All present. |
| T-H03 | **Update `docs/DeploymentGuide.md`** smoke checklist with new routes. | Checklist covers full flow. |
| T-H04 | **Update `README.md`** with the new customer-to-expert flow description. | README describes the full demo arc. |
| T-H05 | **Update `backlog/product-backlog.md`** with Sprint 3 epics. | Backlog reflects Sprint 3 scope. |
| T-H06 | **Final validation gate:** tsc + vitest + lint + build. | All green. Route count includes new `/start`, `/handoff`. |

### Phase 5 — Deploy

| ID | Task | Definition of done |
|---|---|---|
| T-D01 | **Push to GitHub.** Vercel auto-deploys from main. | Build succeeds on Vercel. |
| T-D02 | **Prod smoke test:** full customer-to-expert flow on live URL. | All smoke checks pass. |
| T-D03 | **Update README hero** with live URL link. | README links to `https://turbotax-vep.vercel.app`. |

---

## Sequencing

1. **Phase 1 (Agent E, sequential).** T-E01 → T-E06. Foundation must land before UI agents start.
2. **Phase 2 + 3 (Agents F + G, parallel after Phase 1 merges).** Disjoint file scopes:
   - Agent F owns: `app/(customer)/*`, `components/customer/*`, `app/page.tsx` (hero CTAs), `app/api/intake/route.ts` (metadata support)
   - Agent G owns: `components/workbench/*`, `app/(workbench)/*`
   - Conflict risk: minimal (only `app/page.tsx` — F updates CTAs, G doesn't touch it)
3. **Phase 4 (Agent H, after F + G merge).** Validation, polish, doc updates.
4. **Phase 5 (orchestrator).** Push, deploy, smoke test.

## Multi-agent worktree plan

| Agent | Worktree branch | Phase | Tasks |
|---|---|---|---|
| E | `sprint-03-foundation` | 1 | T-E01 through T-E06 |
| F | `sprint-03-customer` | 2 | T-F01 through T-F07 |
| G | `sprint-03-expert` | 3 | T-G01 through T-G09 |
| H | `sprint-03-validation` | 4 | T-H01 through T-H06 |
