/**
 * Lazy singleton wrapper around better-sqlite3.
 *
 * Path resolution: `process.env.AUDIT_DB_PATH` if set, otherwise
 * `./data/audit.db` relative to the process cwd. The `data/` directory
 * is created on first open if missing.
 *
 * Tests: pass a per-test temp file via `set_audit_db_path(...)` in
 * `beforeEach`, then `close_audit_db()` + `unlinkSync` in `afterEach`.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";

import BetterSqlite3, { type Database } from "better-sqlite3";

import { run_migrations } from "./migrations";

let _db: Database | null = null;
let _current_path: string | null = null;

function resolve_path(): string {
  return process.env.AUDIT_DB_PATH ?? path.resolve(process.cwd(), "data", "audit.db");
}

export function get_db(): Database {
  const target = resolve_path();
  if (_db && _current_path === target) return _db;

  // Path changed (e.g. tests) or first boot.
  if (_db) {
    _db.close();
    _db = null;
  }

  const dir = path.dirname(target);
  mkdirSync(dir, { recursive: true });

  const db = new BetterSqlite3(target);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  run_migrations(db);

  _db = db;
  _current_path = target;
  return db;
}

/**
 * Explicit override — tests call this before opening the DB to point at a
 * temp file. Closes any previously-open connection.
 */
export function set_audit_db_path(p: string): void {
  if (_db) {
    _db.close();
    _db = null;
    _current_path = null;
  }
  process.env.AUDIT_DB_PATH = p;
}

export function close_audit_db(): void {
  if (_db) {
    _db.close();
    _db = null;
    _current_path = null;
  }
}
