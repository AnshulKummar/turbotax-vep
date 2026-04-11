# ADR-004 — SQLite for the audit trail

**Status:** Accepted

## Context

Layer 4 (Trust + Learning) captures every AI suggestion and every expert action: the model used, the prompt context (after PII redaction), the recommendation produced, the expert's accept/edit/reject, the reason, and the eventual downstream IRS outcome (in production). The audit trail is queryable from the workbench and is the labeled training data for B4 (Expert as Trainer Learning Loop).

The prototype must be runnable with a single `npm run dev`, with no external services to provision.

## Decision

Use **better-sqlite3** with a local file at `data/audit.db`. Schema is defined as TypeScript with a small migration runner in `src/lib/audit/migrations.ts`. Queries are written by hand (no ORM) because the schema is small and the prototype does not benefit from the abstraction overhead.

Tables:

- `audit_events` — every AI suggestion and expert action
- `customers` — synthetic customer profiles + goals
- `recommendations` — denormalized snapshot of each recommendation as it was shown
- `expert_actions` — accept / edit / reject with reason
- `calibration_runs` — output of the 50-return calibration eval

## Why

Zero ops, synchronous API (better-sqlite3 is the only fast option for Node), local file means the entire demo is self-contained, and the schema can evolve without a migration tool.

## Consequences

Production would not be SQLite. Production would be Postgres on Neon (already in use by the parent PairEval Next stack), with the same schema. The prototype's `src/lib/audit/` interface is written so that swapping the storage layer is a single file change.
