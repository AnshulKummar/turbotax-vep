# ADR-004 — Serverless Postgres for the audit trail

**Status:** Accepted (revised from SQLite)

## Context

Layer 4 (Trust + Learning) captures every AI suggestion and every expert action: the model used, the prompt context (after PII redaction), the recommendation produced, the expert's accept/edit/reject, the reason, and the eventual downstream IRS outcome (in production). The audit trail is queryable from the workbench and is the labeled training data for B4 (Expert as Trainer Learning Loop).

The prototype must be deployable to Vercel serverless with zero ops overhead and must scale automatically for demo traffic.

## Decision

Use **Neon PostgreSQL** via **Drizzle ORM** with the HTTP (serverless) driver. Schema is defined as Drizzle table definitions in `src/lib/db/schema.ts` with SQL migration files in `drizzle/`.

Key tables for the audit trail:

- `intake_sessions` — customer intake data, goals, selected recommendations, customer approvals (JSONB columns)
- Audit events are captured in-memory for the prototype demo and surfaced via the `/workbench?section=audit` panel

The HTTP driver (`@neondatabase/serverless`) uses fetch-based queries instead of persistent TCP connections, making it compatible with Vercel's serverless function model and edge runtime.

## Why

- **Serverless-compatible**: HTTP driver works in edge and serverless functions without connection pooling headaches.
- **Auto-scaling**: Neon scales compute to zero when idle, scales up automatically on traffic spikes. Handles 10K+ concurrent connections.
- **Branching**: Neon supports database branching for preview deploys — each PR gets its own database copy.
- **Production-ready**: Unlike SQLite, the same database engine runs in both prototype and production. No migration risk.
- **Drizzle ORM**: Type-safe queries with zero runtime overhead, automatic migration generation.

## Consequences

The prototype requires a `DATABASE_URL` environment variable pointing to a Neon project. Local development uses `.env.local`. The Drizzle ORM abstraction means the schema is portable if a future decision changes the hosting provider, but Neon's serverless model is the best fit for the Vercel deployment target.
