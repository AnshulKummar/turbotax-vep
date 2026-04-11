# Agent 4 — Workbench UI (Layer 3)

**Role:** Build the Next.js dark-themed Expert Workbench that hosts every Layer 3 panel.

**Slice:** Next.js app shell + Tailwind 4 dark theme + every workbench panel.

**Owns:** `app/(workbench)/`, `app/layout.tsx`, `components/workbench/`, `app/globals.css`, `tailwind.config.ts`, `tests/components/`

**Does NOT touch:** Anything under `src/lib/` or `src/data/`. You consume APIs only via fetch from the route handlers built by Agents 2 and 3.

## Required reading

- `docs/PRD.md` Sections 6 (architecture) and 7 (MVP scope, especially the 10 demo points)
- `docs/architecture/overview.md`
- `docs/architecture/decisions/ADR-001-tech-stack.md`
- `backlog/sprint-01.md` (your tasks: T-401 through T-411)
- `src/contracts/index.ts` (the data shapes you render)
- The PairEval Next stack at `C:\Users\anshu\Claude Code Projects\paireval-next\` for visual reference of the dark theme styling. **Do not import from it; reproduce the look.**

## Tasks

### T-401: Next.js app shell + dark theme + routing

`app/layout.tsx` and `app/(workbench)/layout.tsx`. Tailwind 4 dark-only theme. Inter font. Glass-card surface for panels. The workbench is at `/workbench`. There is also a `/workbench/metrics` route owned by Agent 6.

### T-402: Routing rationale chip

`components/workbench/RoutingRationaleChip.tsx`. Single hardcoded chip at the top of the workbench:

> "Routed to you because: 5+ years RSU specialty, multi state IL+CA, prior year preparer for this customer. Complexity 8 of 10. ETA to handoff 4 min."

The four dimensions (specialty, jurisdiction, continuity, complexity) are visually called out as separate badges.

### T-403: Customer context header

`components/workbench/CustomerContextHeader.tsx`. Renders customer name, prior expert notes, prior year preparer name ("Pat Daniels, CPA"), and a one-line prior year return summary (AGI, refund/owed, filed date).

### T-404: Goal dashboard panel

`components/workbench/GoalDashboard.tsx`. Renders the customer's three ranked goals as three columns. Each column shows the goal name, weight, rationale, and a progress bar driven by the goal-fit scores of accepted recommendations.

### T-405: Return surface with confidence scores

`components/workbench/ReturnSurface.tsx`. Renders the pre-populated 1040 lines (consumed from `/api/prework`). Each line shows the value, the confidence score (color coded), and a click-through to the source document (modal showing the bbox from MockedOCROutput).

### T-406: Risk register panel

`components/workbench/RiskRegister.tsx`. Renders up to 10 ranked findings. Each entry shows: severity, dollar impact, audit risk delta, IRC citation, one-line summary, and the line(s) it affects. Click expands to the full rule explanation.

### T-407: AI suggested questions panel

`components/workbench/SuggestedQuestions.tsx`. Renders the top suggested questions for the customer call, ranked by goal fit. Each question shows the goal it serves and the estimated dollar impact of asking it.

### T-408: Live quality co-pilot

`components/workbench/QualityCopilot.tsx`. Watches the editable lines on the return surface and flags inconsistencies in real time. The MVP demo forces a wash sale lot mismatch when the expert edits a 1099-B line; the co-pilot flashes a warning at the top of the panel.

### T-409: "What AI saw" panel

`components/workbench/WhatAISaw.tsx`. Renders the redacted prompt that was sent to the LLM for the most recently selected recommendation. Fetches from Agent 5's API route. Shows the tokens (`[SSN_a3f8b1c2]`) so the expert can verify nothing leaked.

### T-410: Audit trail timeline panel

`components/workbench/AuditTrailTimeline.tsx`. Renders a queryable list of every AI suggestion and expert action for the current case. Sortable by time. Filterable by event type.

### T-411: Expert minutes counter

`components/workbench/ExpertMinutesCounter.tsx`. Ticks up in real time. Shows the current return time alongside the legacy baseline (~30 min) and Intuit's stated TY2025 baseline (~24 min, which is the 20% reduction). Color-codes green if under target, red if over.

## Layout

The workbench page (`app/(workbench)/workbench/page.tsx`) lays out the panels as:

```
┌────────────────────────────────────────────────────────────────────┐
│ RoutingRationaleChip                          ExpertMinutesCounter │
├────────────────────────────────────────────────────────────────────┤
│ CustomerContextHeader                                              │
├────────────────────────────────────────────────────────────────────┤
│ GoalDashboard (3 columns)                                          │
├──────────────────────────────────┬─────────────────────────────────┤
│ ReturnSurface (left, 60%)        │ RiskRegister (right top)        │
│                                  ├─────────────────────────────────┤
│                                  │ SuggestedQuestions (right mid)  │
│                                  ├─────────────────────────────────┤
│                                  │ QualityCopilot (right bottom)   │
├──────────────────────────────────┴─────────────────────────────────┤
│ WhatAISaw                                AuditTrailTimeline        │
└────────────────────────────────────────────────────────────────────┘
```

## Definition of done

- `npm run dev` boots cleanly
- Visiting `/workbench` renders all 11 components against live data from the Agent 2 + Agent 3 APIs
- The 10 demo points in `docs/PRD.md` Section 7 can all be performed by clicking through the workbench
- Component-level Vitest tests pass
- No `any` types
- All Tailwind classes are dark-theme

## Out of scope

- Anything under `src/lib/` or `src/data/`
- The metrics page (Agent 6)
- The PII redaction or audit trail capture itself (Agent 5; you only render the data they expose)
