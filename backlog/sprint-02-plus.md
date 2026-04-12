# Sprint 2+ — Post-MVP Roadmap

After Sprint 1 ships the MVP demo of B1, the post-MVP roadmap is structured by big bet rather than by sprint, because each big bet is a multi-sprint workstream.

> **Sprint 2 has been carved out as a concrete sprint.** See `sprint-02.md`.
> Sprint 2's goal is to take the Sprint 1 prototype and make it a publicly
> deployable, anyone-can-try-it demonstration of B1 with a real intake UI,
> a Postgres-backed audit trail, and a Vercel deployment on the
> auto-assigned `*.vercel.app` URL. **Sprint 2 is complete and deployed.**
>
> **Sprint 3 has been carved out.** See `sprint-03.md`.
> Sprint 3 adds the customer-side flow (simulated TurboTax intake with
> document upload), a handoff transition, and a redesigned expert workbench
> with left-hand navigation and section-based layout. Scalability target:
> 12,000 sessions/day (30% of 4K concurrent experts x 5-10 cases/day).
> The big-bet workstreams below pick up after Sprint 3 lands.

## B2 — Multi Year Tax Co Pilot

- Connected accounts data layer (Plaid, brokerage data partnerships from existing 200+ Intuit partners, IRS transcript pull, secure document vault)
- Tax planning simulation engine (Roth conversion windows, RSU sell decisions, estimated tax payments, loss harvesting, retirement contribution headroom)
- Event-based trigger system (life events, tax law changes, account-level changes)
- Expert outreach queue tied to the routing engine
- Customer-facing year-round tax health dashboard

## B3 — Autonomous AI Pre-Work, full

- Replace mocked OCR with real document parsing (textract + structured form parsers)
- Integrate the existing 200+ Intuit partner structured feeds
- Expand the rules corpus from 50 to ~200 (the highest-frequency Form 1040 errors)
- Add the LLM orchestration layer that uses the rules engine as the safety net
- Confidence calibration in production against real return outcomes (not synthetic)

## B4 — Expert as Trainer Learning Loop, full

- Labeling pipeline converting captured workbench interactions to training examples
- Model evaluation harness on a growing golden test set
- Calibration monitoring dashboard (production)
- Quarterly model release cadence
- Senior expert "label this" UX for high-disagreement cases

## B5 — Specialty Match Routing Marketplace

- Competency profile per expert (self-assessment + admin validation, then bootstrapped from edit history)
- Routing engine consuming complexity score + goal vector + jurisdiction + language + capacity + continuity
- Continuity tracker (same expert as last year)
- Customer-facing "request your expert" flow
- Expert-facing reputation dashboard

## Incremental fixes (not blocked on a big bet)

The Section 11 incremental fixes from `docs/PRD.md` Part II that were not in Sprint 1:

| Fix | Layer | Why deferred from Sprint 1 |
|---|---|---|
| Hard complexity flag preventing generalist routing | 2 | Requires real routing engine |
| "Same expert as last year" preference | 2 | Requires real routing engine |
| Capacity dashboard for leads | 2 | Out of MVP demo path |
| Composite expert performance metric | 4 | Requires production metric infrastructure |
| "Told customer no" tracking | 4 | Requires production metric infrastructure |
| Real OCR ingestion | 1 | B3 production scope |
| Year-round delta engine | 1 | B2 scope |
| Initial 50 → 200 rule expansion | 1 | B3 production scope |

## Phase 2 (post Sprint 4+)

- IRS notice and audit defense workflow (renegotiate the TaxAudit.com subcontract or build in-house)
- Refund and return delay tracking integrated into the workbench
- Full security and trust workstream addressing the Twilio class action and Intuit data breach exposure
- Expert L&D redesign (training inadequacy from Expert Side Theme E2)
