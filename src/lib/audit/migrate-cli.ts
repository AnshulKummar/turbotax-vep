#!/usr/bin/env tsx
/**
 * `npm run db:migrate` entry point.
 *
 * Reads DATABASE_URL from the environment, applies every drizzle/* SQL
 * migration to the configured Neon Postgres database, and exits.
 *
 * Use this against a real Neon DB or against a local Postgres URL — the
 * Neon HTTP driver speaks the wire-compatible HTTP edge endpoint, not the
 * standard Postgres protocol, so it won't connect to a vanilla local
 * Postgres. For local-only test runs, use the pglite path inside vitest
 * (see tests/audit/setup.ts).
 */

/* eslint-disable no-console */
import { run_migrations_neon } from "./migrations";

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL || process.env.DATABASE_URL.length === 0) {
    console.error(
      "DATABASE_URL is not set. Populate .env.local or the environment.",
    );
    process.exit(1);
  }

  console.info("[db:migrate] applying migrations against Neon Postgres...");
  await run_migrations_neon();
  console.info("[db:migrate] done");
}

main().catch((err) => {
  console.error("[db:migrate] failed:", err);
  process.exit(1);
});
