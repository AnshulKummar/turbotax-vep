# Product Backlog

## Epics

| ID | Epic | Big bet / increment | Sprint |
|---|---|---|---|
| E1 | Goal capture and recommendation engine | B1 anchor bet | Sprint 1 (MVP) |
| E2 | AI pre work and risk register | B3 (mocked OCR) | Sprint 1 |
| E3 | Workbench UI surfaces | I1 + B1 surface | Sprint 1 |
| E4 | Trust layer (PII, audit, what AI saw) | I3 + B4 capture | Sprint 1 |
| E5 | Routing rationale (single mocked chip) | B5 + I2 | Sprint 1 |
| E6 | Synthetic data + 50-rule tax corpus | Foundation | Sprint 1 |
| E11 | Customer intake flow (simulated TurboTax experience) | B1 customer surface | Sprint 3 |
| E12 | Document upload simulation | B1 customer surface | Sprint 3 |
| E13 | Expert workbench redesign (left-nav, section-based) | B1 expert surface | Sprint 3 |
| E14 | Customer-to-expert handoff transition | B1 end-to-end narrative | Sprint 3 |
| E7 | Multi year tax co pilot | B2 | Sprint 4+ |
| E8 | Real OCR and partner ingestion | B3 production | Sprint 4+ |
| E9 | Routing marketplace, full | B5 production | Sprint 4+ |
| E10 | Expert as trainer learning loop, full pipeline | B4 production | Sprint 4+ |

## Epic detail

### E1 — Goal capture and recommendation engine
Customer states 3 prioritized goals at intake. Recommendation engine combines deterministic rules (E6) with LLM scoring to produce a ranked list, each tagged with goal fit, dollar impact, confidence, evidence (rule citation), and audit risk delta. Exposed via `app/api/recommendations/route.ts`.

### E2 — AI pre work and risk register
Mocked OCR output is consumed by a year-over-year delta engine, a complexity scorer, and a risk register builder that ranks the top 10 mechanically detectable red flags for the expert. Exposed via `app/api/prework/route.ts`.

### E3 — Workbench UI surfaces
Next.js dark-themed app shell hosting all Layer 3 panels: routing rationale chip, customer context header, goal dashboard, return surface with confidence scores and provenance, risk register, AI suggested questions, live quality co-pilot, "what AI saw" panel, audit trail timeline, expert minutes counter.

### E4 — Trust layer (PII, audit, what AI saw)
Two-pass PII redaction (regex + structured field) wrapping every LLM call. SQLite audit trail capturing every AI suggestion and expert action. "What AI saw" panel renders the redacted prompt back to the expert. Calibration eval harness on a 50-return synthetic test set.

### E5 — Routing rationale chip (mocked)
Single hardcoded routing rationale chip at the top of the workbench: "Routed to you because: 5+ years RSU specialty, multi state IL+CA, prior year preparer for this customer. Complexity 8 of 10. ETA to handoff 4 min." Demonstrates the dimensions a real routing engine would consider.

### E6 — Synthetic data + 50-rule tax corpus
Hand-crafted Olivia and Ryan Mitchell synthetic Form 1040 covering RSU, K-1, rental, HSA, wash sale, multi-state IL+CA. 50 deterministic tax rules covering the highest-frequency mechanically detectable errors. Golden recommendations file pinning the expected output of the recommendation engine.

### E11 — Customer intake flow (simulated TurboTax experience)
Sprint 3. Two-screen customer flow at `/start`: Screen 1 captures synthetic name, filing status, AGI band, and document selection via card grid. Screen 2 captures 3 prioritized goals (re-skinned `/intake` form). Single `POST /api/intake` on submit writes goals + `customer_metadata` JSONB to `intake_sessions`. Client-only state between screens, no intermediate DB writes. Disclaimer banner on every input surface.

### E12 — Document upload simulation
Sprint 3. Static catalogue of 8 synthetic tax documents (`src/lib/customer/documents.ts`): W-2, 1099-INT, 1099-DIV, 1099-B, 1098, 1099-R, K-1, 1095-A. All issuers are obviously synthetic. Customer selects documents via a card grid with checkmark affordance. No real file upload, no OCR. Document IDs stored in `customer_metadata.document_ids`. The expert view displays the selected documents in the Documents section.

### E13 — Expert workbench redesign (left-nav, section-based)
Sprint 3. Replace the stacked-panel workbench with a section-based layout: `WorkbenchShell` with left nav (6 sections: Brief, Goals, Documents, Pre-work, Recommendations, Audit), top bar (customer name, filing status, AGI), and main content frame showing one section at a time. Existing panel components are re-parented into section wrappers — no panel logic changes. Left nav fixed >=1024px, hidden with toggle <1024px. Clear primary CTA per section. URL: `/workbench?intake=<id>&section=<name>`.

### E14 — Customer-to-expert handoff transition
Sprint 3. `/handoff` page with a 1.8-second visual transition: "Connecting you to Alex, your tax expert." Shows summary of what was shared (goals + documents). Auto-redirects to `/workbench?intake=<id>&section=brief`. Zero server work, zero LLM calls — pure client-side choreography. The transition is the narrative punchline where "B1 = goal-aligned recommendations" clicks for the viewer.

### E7 — Multi year tax co pilot
Sprint 4+. Connected accounts data layer, tax planning simulation engine, event-based trigger system, expert outreach queue, customer-facing year-round tax health dashboard.

### E8 — Real OCR and partner ingestion
Sprint 2+. Replace mocked OCR with real document parsing. Integrate the existing 200+ Intuit partner structured feeds.

### E9 — Routing marketplace, full
Sprint 2+. Competency profile per expert, routing engine taking complexity score and goal vector as input, continuity tracker, customer-facing "request your expert" flow, expert-facing reputation dashboard.

### E10 — Expert as trainer learning loop, full pipeline
Sprint 2+. Labeling pipeline converting captured workbench interactions to training examples, model evaluation harness on golden test set, calibration monitoring dashboard, quarterly model release cadence.

## Definition of done (any sprint)

- All tests in the sprint scope pass
- All ADRs referenced by the sprint scope are committed
- The demo walk-through script runs end-to-end with no manual intervention
- The success metrics dashboard renders the targets from `docs/PRD.md` Section 8
