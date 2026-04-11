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
| E7 | Multi year tax co pilot | B2 | Sprint 2+ |
| E8 | Real OCR and partner ingestion | B3 production | Sprint 2+ |
| E9 | Routing marketplace, full | B5 production | Sprint 2+ |
| E10 | Expert as trainer learning loop, full pipeline | B4 production | Sprint 2+ |

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

### E7 — Multi year tax co pilot
Sprint 2+. Connected accounts data layer, tax planning simulation engine, event-based trigger system, expert outreach queue, customer-facing year-round tax health dashboard.

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
