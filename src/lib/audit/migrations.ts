/**
 * Drizzle migration runners for the audit DB.
 *
 * Two callable surfaces:
 *   - `run_migrations_neon()` — production / dev. Uses the Neon HTTP
 *     migrator from drizzle-orm/neon-http/migrator. Reads DATABASE_URL
 *     from the environment via the singleton in ./db.ts.
 *   - `apply_migrations_to_pglite(db)` — test only. Reads the SQL files
 *     from ./drizzle/ and applies them statement-by-statement to a pglite
 *     instance. Lets us run the audit tests against a real Postgres
 *     dialect with no network. Pglite is a devDependency, so we lazy-import
 *     it inside the test setup file rather than from this module.
 *
 * `verify_schema(db)` is preserved for the legacy schema test — it asks
 * the catalog for the expected table names and returns true iff they all
 * exist. Works against both drivers because the SQL is bog-standard.
 */

import fs from "node:fs";
import path from "node:path";

import { sql } from "drizzle-orm";
import { migrate as migrate_neon } from "drizzle-orm/neon-http/migrator";

import { get_db, type AuditDb } from "./db";
import { AUDIT_TABLES } from "./schema";

// ---------------------------------------------------------------------------
// Production migrator
// ---------------------------------------------------------------------------

/**
 * Apply every drizzle/* migration against the configured Neon Postgres
 * database. Idempotent — drizzle's migrator records applied migrations in
 * the `__drizzle_migrations` table.
 */
export async function run_migrations_neon(): Promise<void> {
  const db = get_db();
  // The Neon HTTP migrator wants a Drizzle handle constructed from
  // drizzle-orm/neon-http. The shared get_db() returns exactly that
  // (or, in tests, a pglite handle that should never reach this code path).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await migrate_neon(db as any, {
    migrationsFolder: path.resolve(process.cwd(), "drizzle"),
  });
}

// ---------------------------------------------------------------------------
// Test migrator (pglite)
// ---------------------------------------------------------------------------

/**
 * Read every drizzle/*.sql migration in numerical order, split on the
 * `--> statement-breakpoint` marker drizzle-kit emits, and run each
 * statement against the supplied pglite-backed Drizzle handle.
 *
 * The Drizzle pglite migrator works too, but it requires the meta journal
 * to live next to the SQL files at runtime AND a slightly different driver
 * shape than the one we type in db.ts. Hand-rolling the runner is ~15 lines
 * and gives us total control over the test path.
 */
export async function apply_migrations_to_pglite(db: AuditDb): Promise<void> {
  const dir = path.resolve(process.cwd(), "drizzle");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const raw = fs.readFileSync(path.join(dir, file), "utf8");
    const statements = raw
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    for (const stmt of statements) {
      // Drizzle's pglite handle exposes .execute() that takes a SQL tag.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).execute(sql.raw(stmt));
    }
  }
}

// ---------------------------------------------------------------------------
// Schema verification (used by tests)
// ---------------------------------------------------------------------------

interface SchemaRow {
  table_name: string;
}

/**
 * Returns true iff every audit table from AUDIT_TABLES exists on the
 * supplied DB handle. Works against both Neon and pglite because both
 * speak Postgres.
 */
export async function verify_schema(db: AuditDb): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = await (db as any).execute(
    sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  // Both drivers return either { rows: [...] } or [...] depending on version.
  const rows: SchemaRow[] = Array.isArray(result)
    ? (result as SchemaRow[])
    : ((result as { rows: SchemaRow[] }).rows ?? []);
  const existing = new Set(rows.map((r) => r.table_name));
  return AUDIT_TABLES.every((t) => existing.has(t));
}
