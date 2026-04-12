# Sprint 4 — App Cues, Recommendation Tiers, Customer Approval

**Goal:** Elevate the demo from "expert-only tool" to a full two-way recommendation flow. Demo viewers see contextual cues explaining the significance of each section. The 8-recommendation fixture expands to ~27 covering all 13 rule categories, segmented into high/medium/low tiers. The expert surfaces selected recommendations to the customer, and the customer can approve or decline each one before the expert finalizes.

**Definition of done:**

1. Every workbench section has a visible "app cue" explaining what it demonstrates and why it matters for B1.
2. The recommendation set contains ~27 items spanning all 13 rule categories, segmented into high (severity 5 + high goal-fit), medium (severity 3-4 or moderate goal-fit), and low (severity 1-2 or low goal-fit) tiers.
3. The expert can select recommendations to surface to the customer via a "Share with customer" action.
4. A new `/review?intake=<id>` page shows the customer the surfaced recommendations with approve/decline toggles.
5. The customer can submit approvals, which persist and are visible to the expert.
6. All tests green (345 baseline + new Sprint 4 tests).
7. Disclaimer banner present on the review page.

**Non-goals:** real-time WebSocket sync between expert and customer, partial approval persistence (all-or-nothing submit), expert editing recommendations before sharing.

---

## Architectural decisions (locked at sprint start)

Sprint 2 decisions AD-S2-01 through AD-S2-05 and Sprint 3 decisions AD-S3-01 through AD-S3-08 **remain in force**.

| ID | Decision | Rationale |
|---|---|---|
| AD-S4-01 | Recommendation tier is a **derived field** computed from severity + composite_goal_fit + dollar_impact. Not stored in DB. | Tiers are a display concern. Recomputing is cheap and keeps the recommendation contract stable. |
| AD-S4-02 | Expert's selected recommendation IDs stored as **`selected_recommendations JSONB NULL`** on `intake_sessions`. | Follows AD-S3-01 pattern (JSONB on existing table). No new table needed for a demo. |
| AD-S4-03 | Customer approvals stored as **`customer_approvals JSONB NULL`** on `intake_sessions`. Shape: `{ approved: string[], declined: string[] }`. | Same JSONB-on-existing-table pattern. Atomic write on submit. |
| AD-S4-04 | **No new LLM calls** in the entire Sprint 4 flow. Tier classification and approval are pure data operations. | $0 marginal cost thesis (AD-S2-01) is non-negotiable. |
| AD-S4-05 | App cues are **static tooltip/banner components** with hardcoded copy. Not stored in DB, not configurable. | Demo-only feature. Hardcoded is simplest and fastest. |
| AD-S4-06 | The expanded ~27 recommendations are a **static fixture expansion**. The fixture is the source of truth for the demo. | Consistent with Sprint 1-3 pattern. No need to re-record cassettes. |
| AD-S4-07 | Customer review page uses the **same dark palette** with `data-flow="customer"` (AD-S3-04). | Consistent customer-side styling. |
| AD-S4-08 | **Two new API routes**: `POST /api/intake/[id]/selections` (expert saves selections) and `POST /api/intake/[id]/approvals` (customer submits approvals). `GET /api/intake/[id]` extended to return selections + approvals. | Clean REST semantics. Rate-limited like existing routes. |

---

## Recommendation tier classification logic

A recommendation is classified into a tier based on a composite score:

```
tier_score = (severity / 5) * 0.4 + composite_goal_fit * 0.35 + min(dollar_impact.estimate / 10000, 1) * 0.25
```

| Tier | tier_score range | Expected count (~27 recs) | Color |
|---|---|---|---|
| High | >= 0.65 | ~8-10 | Red/amber badge |
| Medium | >= 0.40 and < 0.65 | ~10-12 | Yellow badge |
| Low | < 0.40 | ~5-7 | Gray badge |

---

## Tasks

### Phase 1 — Foundation (Agent I, sequential)

| ID | Task | Definition of done |
|---|---|---|
| T-I01 | **Expand recommendation fixture** to ~27 items covering all 13 rule categories. Each rec has realistic IRC citations, dollar impacts, goal fits, and confidence scores. Maintain the 8 existing recs, add ~19 new ones across categories: foreign_tax_credit, section_121, credit_eligibility, amt, estimated_tax, plus additional wash_sale, depreciation, retirement, and hsa findings. | Fixture exports 27 recommendations. All existing tests still pass. |
| T-I02 | **Tier classification utility.** `src/lib/recommendations/tiers.ts` — pure function `classify_tier(rec: Recommendation): "high" \| "medium" \| "low"` using the formula above. Also `classify_all(recs: Recommendation[]): Map<string, TierClassification>` returning tier + tier_score per rec ID. | Function exported. Unit tests cover edge cases (boundary scores, all tiers represented in fixture). |
| T-I03 | **Drizzle migration:** add `selected_recommendations JSONB NULL` and `customer_approvals JSONB NULL` to `intake_sessions`. | Migration applied to prod Neon + test pglite. Existing tests unbroken. |
| T-I04 | **Selection + approval Zod schemas.** `src/lib/intake/selections.ts` — `validate_selections(raw)` for `string[]` of rec IDs, `validate_approvals(raw)` for `{ approved: string[], declined: string[] }`. | Schemas exported. Validation rejects invalid shapes. |
| T-I05 | **Extend `create_intake` / `get_intake`** for `selected_recommendations` and `customer_approvals`. Add `update_selections(intake_id, rec_ids)` and `update_approvals(intake_id, approvals)`. | Store functions work. Tests cover round-trip persistence. |
| T-I06 | **API route: `POST /api/intake/[id]/selections`**. Expert saves selected recommendation IDs. Validates intake exists + not expired. Rate-limited. | Route works. Returns 200 on success, 400/404/429 on errors. |
| T-I07 | **API route: `POST /api/intake/[id]/approvals`**. Customer submits approve/decline decisions. Validates intake exists + has selections. Rate-limited. | Route works. Returns 200 on success, 400/404/429 on errors. |
| T-I08 | **Extend `GET /api/intake/[id]`** (or create if needed) to return `selected_recommendations` and `customer_approvals` alongside existing fields. | Endpoint returns full intake state. |
| T-I09 | **Tests** for T-I01 through T-I08. | All green. |

### Phase 2 — Expert UX (Agent J, after Phase 1)

| ID | Task | Definition of done |
|---|---|---|
| T-J01 | **App cues component.** `components/workbench/AppCue.tsx` — a subtle banner/tooltip component with an icon, title, and body. Dismissible per-section (client state). Styled as a glass-card with a left accent border. | Component renders. Testable. |
| T-J02 | **App cues on all 6 workbench sections.** Add an `<AppCue>` at the top of BriefSection, GoalsSection, DocumentsSection, PreworkSection, RecommendationsSection, AuditSection. Each cue explains what the section demonstrates and why it matters for B1. | All 6 sections show cues. Copy is clear and concise. |
| T-J03 | **Recommendation tier badges.** In RecommendationsSection, each recommendation card shows a tier badge (High/Medium/Low) with color coding. Add tier filter tabs at the top: All / High / Medium / Low. | Badges render. Filter works. Counts shown per tier. |
| T-J04 | **"Share with customer" selection UI.** Add checkboxes on each recommendation card. A sticky footer shows count of selected recs + "Share N recommendations with customer" CTA. On click, calls `POST /api/intake/[id]/selections`. | Selection works. API call succeeds. Success toast shown. |
| T-J05 | **Customer approval status display.** After customer submits approvals, the expert's recommendation cards show approved/declined badges. Polling or refetch on section focus. | Status badges render correctly for approved/declined recs. |
| T-J06 | **Tests** for T-J01 through T-J05. | All green. |

### Phase 3 — Customer Approval (Agent K, parallel with Phase 2)

| ID | Task | Definition of done |
|---|---|---|
| T-K01 | **Customer review page.** `app/(customer)/review/page.tsx` — receives `?intake=<id>`, fetches selections via API, renders each surfaced recommendation as a card with approve/decline toggle. Uses customer layout with DisclaimerBanner. | Page renders. Recommendations displayed with tier badges. |
| T-K02 | **Approve/decline toggle UI.** Each recommendation card has approve (green) and decline (red) buttons. Visual state updates immediately on click. Summary bar shows count of approved/declined/pending. | Toggle works. Visual feedback is clear. |
| T-K03 | **Submit approvals CTA.** "Confirm my decisions" button at bottom. Calls `POST /api/intake/[id]/approvals`. Shows success state + "Your expert will review your decisions" message. Disables re-submission. | Submit works. Success state shown. |
| T-K04 | **Link from handoff.** After expert shares recommendations, the handoff page or workbench shows a "Customer review link" that can be shared. For the demo, auto-navigate to `/review?intake=<id>` from the expert's "Share" action success state. | Link is visible and works. |
| T-K05 | **Tests** for T-K01 through T-K04. | All green. |

### Phase 4 — Validation + polish (Agent L, after J + K merge)

| ID | Task | Definition of done |
|---|---|---|
| T-L01 | **End-to-end test:** full flow — `/start` → goals → `/handoff` → `/workbench` → select recs → share → `/review` → approve/decline → submit → expert sees status. | Test passes. |
| T-L02 | **Disclaimer + footer sweep.** Verify DisclaimerBanner on `/review`. | Present. |
| T-L03 | **Update `docs/DeploymentGuide.md`** smoke checklist with `/review` route. | Checklist covers full flow. |
| T-L04 | **Update `README.md`** with Sprint 4 features. | README describes the approval flow. |
| T-L05 | **Update `backlog/product-backlog.md`** with Sprint 4 epics. | Backlog reflects Sprint 4 scope. |
| T-L06 | **Final validation gate:** tsc + vitest + lint + build. | All green. |

---

## Sequencing

1. **Phase 1 (Agent I, sequential).** T-I01 → T-I09. Foundation must land before UI agents start.
2. **Phase 2 + 3 (Agents J + K, parallel after Phase 1 merges).** Disjoint file scopes:
   - Agent J owns: `components/workbench/AppCue.tsx`, `components/workbench/sections/*` (app cues + tier badges + selection UI), expert-side approval status
   - Agent K owns: `app/(customer)/review/*`, customer-side approval UI
   - Conflict risk: minimal (disjoint page/component scopes)
3. **Phase 4 (Agent L, after J + K merge).** Validation, polish, doc updates.

## Multi-agent worktree plan

| Agent | Worktree branch | Phase | Tasks |
|---|---|---|---|
| I | `sprint-04-foundation` | 1 | T-I01 through T-I09 |
| J | `sprint-04-expert-ux` | 2 | T-J01 through T-J06 |
| K | `sprint-04-customer-approval` | 3 | T-K01 through T-K05 |
| L | `sprint-04-validation` | 4 | T-L01 through T-L06 |
