/**
 * Vitest setup file for tests that touch the audit DB.
 *
 * Per AD-S2-02 the audit DB now lives on Postgres. We don't have a real
 * Neon URL during local test runs, so we spin up an in-process pglite
 * (`@electric-sql/pglite`) instance and inject the resulting Drizzle handle
 * via `set_test_db()`.
 *
 * Performance note: pglite cold-start is ~1-2 seconds, so we share ONE
 * pglite instance per vitest worker (lazy-initialised on the first test
 * that needs it) and TRUNCATE the tables between tests instead of tearing
 * down the WASM runtime. This brings per-test overhead down from ~1.5s to
 * ~5ms while still giving each test a clean slate.
 *
 * This file is wired up via vitest.config.ts → test.setupFiles. It runs
 * for every test file even if that test never touches the DB — the lazy
 * init means non-DB tests pay zero cost.
 */

import { sql } from "drizzle-orm";
import { afterEach, beforeEach } from "vitest";

import { reset_db_for_tests, set_test_db, type AuditDb } from "@/lib/audit/db";
import { apply_migrations_to_pglite } from "@/lib/audit/migrations";

// Worker-local singletons. Vitest spawns one Node worker per test file by
// default; sharing inside the worker is safe and fast.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _shared_pglite: any = null;
let _shared_db: AuditDb | null = null;

async function ensure_shared_db(): Promise<AuditDb> {
  if (_shared_db) return _shared_db;
  // Lazy import — pglite is a 6MB WASM blob, only pay the cost when needed.
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle: drizzle_pglite } = await import("drizzle-orm/pglite");
  const schema = await import("@/lib/audit/schema");

  _shared_pglite = new PGlite();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = drizzle_pglite(_shared_pglite as any, { schema }) as AuditDb;
  await apply_migrations_to_pglite(db);
  _shared_db = db;
  return db;
}

beforeEach(async () => {
  const db = await ensure_shared_db();
  // Wipe every audit table so each test sees a clean slate. RESTART
  // IDENTITY resets the serial sequences so primary-key assertions still
  // see deterministic small ids.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).execute(
    sql`TRUNCATE TABLE audit_events, recommendations, expert_actions, calibration_runs, customers, intake_sessions RESTART IDENTITY CASCADE`,
  );
  set_test_db(db);
});

afterEach(() => {
  reset_db_for_tests();
});
