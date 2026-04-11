import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { close_audit_db, get_db, set_audit_db_path } from "@/lib/audit/db";
import { run_migrations, verify_schema } from "@/lib/audit/migrations";
import { AUDIT_TABLES } from "@/lib/audit/schema";

let tmp_dir: string;
let db_path: string;

beforeEach(() => {
  tmp_dir = mkdtempSync(path.join(tmpdir(), "audit-schema-"));
  db_path = path.join(tmp_dir, "audit.db");
  set_audit_db_path(db_path);
});

afterEach(() => {
  close_audit_db();
  rmSync(tmp_dir, { recursive: true, force: true });
});

describe("audit schema + migrations", () => {
  it("creates the DB file and every expected table on first boot", () => {
    const db = get_db();
    expect(existsSync(db_path)).toBe(true);
    expect(verify_schema(db)).toBe(true);

    const names = (db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`,
      )
      .all() as { name: string }[]).map((r) => r.name);
    for (const t of AUDIT_TABLES) {
      expect(names).toContain(t);
    }
  });

  it("is idempotent — running migrations twice does not throw", () => {
    const db = get_db();
    expect(() => run_migrations(db)).not.toThrow();
    expect(() => run_migrations(db)).not.toThrow();
    expect(verify_schema(db)).toBe(true);
  });

  it("creates the indexes declared in the schema", () => {
    const db = get_db();
    const idx = (db
      .prepare(
        `SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%'`,
      )
      .all() as { name: string }[]).map((r) => r.name);
    expect(idx).toContain("idx_audit_events_case_id");
    expect(idx).toContain("idx_audit_events_ts");
    expect(idx).toContain("idx_recommendations_case_id");
    expect(idx).toContain("idx_expert_actions_recommendation_id");
  });
});
