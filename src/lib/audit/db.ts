/**
 * Lazy singleton wrapper around the audit database.
 *
 * Two drivers, same Drizzle ORM surface:
 *   - Production / dev: `@neondatabase/serverless` HTTP client →
 *     `drizzle-orm/neon-http`. Reads DATABASE_URL from env.
 *   - Tests: an in-process `@electric-sql/pglite` instance →
 *     `drizzle-orm/pglite`. Wired up by `tests/audit/setup.ts`.
 *
 * The test layer calls `set_test_db(db, run_migrations_fn)` to inject the
 * pglite-backed Drizzle handle before any test imports the audit capture
 * layer. Production code paths never see the pglite branch — the import
 * stays tree-shakeable and the @electric-sql/pglite package remains a
 * devDependency only.
 */

import { drizzle as drizzle_neon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

import * as schema from "./schema";

// The pglite Drizzle handle has a different generic type than the Neon HTTP
// one, but the runtime query API we use (db.insert, db.select, db.delete,
// db.transaction, db.execute) is identical. We type the singleton as a
// loose union of "anything that exposes those methods" via a structural
// interface.
//
// Strict TypeScript: this is the one place where we accept a wider type
// because the test driver (pglite) and the prod driver (neon-http) cannot
// be merged at the type level without pulling pglite into the prod bundle.
export type AuditDb =
  | NeonHttpDatabase<typeof schema>
  | (object & { __pglite_marker?: true });

let _db: AuditDb | null = null;
let _is_test_driver = false;

/**
 * Test-only injection point. `tests/audit/setup.ts` calls this before any
 * test imports the audit capture layer; production code never touches it.
 */
export function set_test_db(db: AuditDb): void {
  _db = db;
  _is_test_driver = true;
}

/**
 * Test-only — drop the cached handle so the next get_db() either rebuilds
 * the production client or fails loudly if DATABASE_URL is missing.
 */
export function reset_db_for_tests(): void {
  _db = null;
  _is_test_driver = false;
}

export function get_db(): AuditDb {
  if (_db) return _db;

  const url = process.env.DATABASE_URL;
  if (!url || url.length === 0) {
    throw new Error(
      "DATABASE_URL is not set and no test database has been injected. " +
        "Set DATABASE_URL in .env.local for dev/prod, or call set_test_db() " +
        "from a vitest setup file for tests.",
    );
  }

  const sql = neon(url);
  _db = drizzle_neon(sql, { schema });
  _is_test_driver = false;
  return _db;
}

export function is_test_driver(): boolean {
  return _is_test_driver;
}

// ---------------------------------------------------------------------------
// Backwards-compat shims used by the legacy SQLite tests.
// ---------------------------------------------------------------------------

/**
 * No-op in the Postgres world. Better-sqlite3 used to need an explicit
 * close to release the file handle; the Neon HTTP client is stateless and
 * the pglite test instance is closed by the test setup.
 */
export function close_audit_db(): void {
  if (_is_test_driver) {
    _db = null;
    _is_test_driver = false;
  }
}

/**
 * Legacy SQLite tests called set_audit_db_path() to point at a temp file.
 * In the Postgres world this is meaningless — kept as a no-op so the old
 * tests can still call it without import errors during the transition.
 * The real per-test isolation now comes from pglite via tests/audit/setup.ts.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function set_audit_db_path(path: string): void {
  // intentionally a no-op; the test setup file owns DB lifecycle.
}
