import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { get_db } from "@/lib/audit/db";
import { verify_schema } from "@/lib/audit/migrations";
import { AUDIT_TABLES } from "@/lib/audit/schema";

interface TableRow {
  table_name: string;
}

interface IndexRow {
  indexname: string;
}

describe("audit schema + migrations (Drizzle / Postgres)", () => {
  it("creates every expected table on first boot", async () => {
    const db = get_db();
    expect(await verify_schema(db)).toBe(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any).execute(
      sql`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`,
    );
    const rows: TableRow[] = Array.isArray(result)
      ? (result as TableRow[])
      : ((result as { rows: TableRow[] }).rows ?? []);
    const names = rows.map((r) => r.table_name);
    for (const t of AUDIT_TABLES) {
      expect(names).toContain(t);
    }
  });

  it("verify_schema is idempotent across calls", async () => {
    const db = get_db();
    expect(await verify_schema(db)).toBe(true);
    expect(await verify_schema(db)).toBe(true);
  });

  it("creates the indexes declared in the schema", async () => {
    const db = get_db();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await (db as any).execute(
      sql`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`,
    );
    const rows: IndexRow[] = Array.isArray(result)
      ? (result as IndexRow[])
      : ((result as { rows: IndexRow[] }).rows ?? []);
    const idx = rows.map((r) => r.indexname);
    expect(idx).toContain("idx_audit_events_case_id");
    expect(idx).toContain("idx_audit_events_ts");
    expect(idx).toContain("idx_recommendations_case_id");
    expect(idx).toContain("idx_expert_actions_recommendation_id");
  });
});
