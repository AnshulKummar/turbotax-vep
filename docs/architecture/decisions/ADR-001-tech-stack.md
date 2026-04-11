# ADR-001 — Tech Stack

**Status:** Accepted

## Context

The prototype must demonstrate four layers of a redesigned Virtual Expert Platform (Pre-Work, Routing, Workbench, Trust + Learning) end-to-end against a synthetic Form 1040, with confidence-scored AI recommendations, PII redaction, and an audit trail. It must build fast (multi-agent parallel execution), it must be runnable on a laptop with one command, and it must be readable by a Principal Product Manager hiring panel.

## Decision

- **Framework**: Next.js 16 (App Router)
- **UI**: React 19 + Tailwind 4 (dark theme only) + shadcn/ui primitives
- **Language**: TypeScript strict mode (no `any`)
- **LLM**: Anthropic Claude `claude-sonnet-4-6` via the official Anthropic SDK
- **Storage**: better-sqlite3 (local file)
- **Validation**: Zod v4 imported as `zod/v4`
- **Tests**: Vitest

## Why

Mirrors the parent PairEval Next stack the developer already operates daily. Build velocity is measured in days, not weeks. The Anthropic SDK is a one-line API call which keeps the recommendation engine slice small. Tailwind 4 dark theme keeps the workbench visually consistent without a design system investment. Better-sqlite3 is synchronous and zero-ops, which removes a database from the demo path.

## Consequences

Production would not be Next.js + SQLite. Production would sit on Intuit's GenOS infrastructure with Postgres (or whatever the GenOS data plane uses). The prototype proves the surfaces and the contracts, not the data plumbing. ADR-002 is the related decision on data.
