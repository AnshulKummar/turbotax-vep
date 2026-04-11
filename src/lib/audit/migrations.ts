/**
 * Audit trail migrations. Runs the schema on first boot. Idempotent via
 * CREATE TABLE IF NOT EXISTS, so safe to invoke every time `get_db()` is
 * called. Not a real migration tool; the schema is small enough that
 * in-place ALTERs are an explicit, manual step.
 */

import type BetterSqlite3 from "better-sqlite3";

import { AUDIT_TABLES, SCHEMA_SQL } from "./schema";

export function run_migrations(db: BetterSqlite3.Database): void {
  db.exec(SCHEMA_SQL);
}

/**
 * Returns `true` iff every expected table exists on the given connection.
 * Used by the schema test to confirm migrations ran.
 */
export function verify_schema(db: BetterSqlite3.Database): boolean {
  const rows = db
    .prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
    )
    .all() as { name: string }[];
  const existing = new Set(rows.map((r) => r.name));
  return AUDIT_TABLES.every((t) => existing.has(t));
}
