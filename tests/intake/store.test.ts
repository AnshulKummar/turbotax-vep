/**
 * T-703 + Sprint 3 T-E05 — intake_sessions store unit tests.
 *
 * The DB lifecycle (fresh pglite per test) is owned by tests/audit/setup.ts,
 * registered globally via vitest.config.ts. Each test sees an empty
 * intake_sessions table.
 */

import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";

import { get_db } from "@/lib/audit/db";
import { intake_sessions } from "@/lib/audit/schema";
import { validate_intake } from "@/lib/goals/intake";
import {
  _count_intake_rows,
  _insert_intake_with_expiry,
  create_intake,
  get_intake,
  update_approvals,
  update_selections,
} from "@/lib/intake/store";

import type { CustomerMetadata } from "@/lib/intake/metadata";

const sample_goals = validate_intake([
  { id: "maximize_refund", rank: 1, weight: 5 },
  { id: "minimize_audit_risk", rank: 2, weight: 3 },
  { id: "optimize_next_year", rank: 3, weight: 2 },
]);

const sample_input = {
  goals: sample_goals,
  ip_hash: "ip-hash-aaaaaaaa",
  user_agent_hash: "ua-hash-bbbbbbbb",
};

describe("create_intake / get_intake round-trip", () => {
  it("happy path: insert then read returns the same goal vector", async () => {
    const created = await create_intake(sample_input);

    expect(created.intake_id).toBeGreaterThan(0);
    expect(created.expires_at.getTime()).toBeGreaterThan(Date.now());

    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched?.goals.length).toBe(3);

    const got = fetched as { goals: typeof sample_goals; expires_at: Date };
    expect(got.goals.map((g) => g.id)).toEqual([
      "maximize_refund",
      "minimize_audit_risk",
      "optimize_next_year",
    ]);
    expect(got.goals.map((g) => g.weight)).toEqual([5, 3, 2]);
    expect(got.goals.map((g) => g.rank)).toEqual([1, 2, 3]);
    // Tags must round-trip through jsonb intact.
    for (const g of got.goals) {
      expect(Array.isArray(g.tags)).toBe(true);
    }
  });

  it("returns null for an unknown intake_id", async () => {
    // Nothing inserted in this test thanks to the per-test TRUNCATE.
    const fetched = await get_intake(9_999_999);
    expect(fetched).toBeNull();
  });

  it("returns null for an expired intake (expires_at in the past)", async () => {
    const past_expiry = new Date(Date.now() - 60 * 1000); // 1 minute ago
    const intake_id = await _insert_intake_with_expiry({
      ...sample_input,
      expires_at: past_expiry,
    });

    // Sanity: the row exists in the table.
    expect(await _count_intake_rows()).toBe(1);

    // get_intake must treat it as missing.
    const fetched = await get_intake(intake_id);
    expect(fetched).toBeNull();
  });

  it("returns null for non-positive intake_ids without hitting the DB", async () => {
    expect(await get_intake(0)).toBeNull();
    expect(await get_intake(-7)).toBeNull();
    expect(await get_intake(Number.NaN)).toBeNull();
  });

  it("rejects insert with empty ip_hash / user_agent_hash / goals", async () => {
    await expect(
      create_intake({ ...sample_input, ip_hash: "" }),
    ).rejects.toThrow(/ip_hash/);
    await expect(
      create_intake({ ...sample_input, user_agent_hash: "" }),
    ).rejects.toThrow(/user_agent_hash/);
    await expect(
      create_intake({ ...sample_input, goals: [] }),
    ).rejects.toThrow(/goals/);
  });
});

// ---------------------------------------------------------------------------
// Sprint 3 — customer_metadata round-trip tests (T-E05)
// ---------------------------------------------------------------------------

describe("create_intake / get_intake with customer_metadata", () => {
  const full_metadata: CustomerMetadata = {
    display_name: "Jane Mitchell (synthetic)",
    filing_status: "mfj",
    agi_band: "100_250k",
    document_ids: ["w2-acme", "1098"],
  };

  it("happy path: stores and retrieves customer_metadata", async () => {
    const created = await create_intake({
      ...sample_input,
      customer_metadata: full_metadata,
    });

    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.customer_metadata).toEqual(full_metadata);
  });

  it("backward compat: create_intake without customer_metadata returns undefined on get", async () => {
    const created = await create_intake(sample_input);

    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.customer_metadata).toBeUndefined();
  });

  it("corrupt JSONB: returns customer_metadata undefined without throwing", async () => {
    // Insert a row, then manually corrupt the customer_metadata column.
    const created = await create_intake({
      ...sample_input,
      customer_metadata: full_metadata,
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = get_db() as any;
    // Write an object that won't validate (invalid filing_status).
    await db.execute(
      sql`UPDATE intake_sessions SET customer_metadata = '{"filing_status": "INVALID_VALUE"}'::jsonb WHERE intake_id = ${created.intake_id}`,
    );

    // get_intake should NOT throw — it logs and returns undefined.
    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.customer_metadata).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Sprint 4 — selections + approvals round-trip tests (T-I09)
// ---------------------------------------------------------------------------

describe("update_selections / update_approvals round-trip", () => {
  it("stores and retrieves selections", async () => {
    const created = await create_intake(sample_input);
    const selections = ["rec-001", "rec-002", "rec-005"];

    await update_selections(created.intake_id, selections);

    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.selected_recommendations).toEqual(selections);
  });

  it("stores and retrieves approvals", async () => {
    const created = await create_intake(sample_input);
    const selections = ["rec-001", "rec-002", "rec-003"];
    await update_selections(created.intake_id, selections);

    const approvals = {
      approved: ["rec-001", "rec-002"],
      declined: ["rec-003"],
    };
    await update_approvals(created.intake_id, approvals);

    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.customer_approvals).toEqual(approvals);
  });

  it("returns undefined for selections when not yet set", async () => {
    const created = await create_intake(sample_input);
    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.selected_recommendations).toBeUndefined();
  });

  it("returns undefined for approvals when not yet set", async () => {
    const created = await create_intake(sample_input);
    const fetched = await get_intake(created.intake_id);
    expect(fetched).not.toBeNull();
    expect(fetched!.customer_approvals).toBeUndefined();
  });

  it("rejects update_selections for non-existent intake", async () => {
    await expect(
      update_selections(9_999_999, ["rec-001"]),
    ).rejects.toThrow(/not found or expired/);
  });

  it("rejects update_approvals for non-existent intake", async () => {
    await expect(
      update_approvals(9_999_999, { approved: ["rec-001"], declined: [] }),
    ).rejects.toThrow(/not found or expired/);
  });

  it("rejects update_selections for expired intake", async () => {
    const past = new Date(Date.now() - 60_000);
    const intake_id = await _insert_intake_with_expiry({
      ...sample_input,
      expires_at: past,
    });
    await expect(
      update_selections(intake_id, ["rec-001"]),
    ).rejects.toThrow(/not found or expired/);
  });

  it("rejects update_approvals for expired intake", async () => {
    const past = new Date(Date.now() - 60_000);
    const intake_id = await _insert_intake_with_expiry({
      ...sample_input,
      expires_at: past,
    });
    await expect(
      update_approvals(intake_id, { approved: ["rec-001"], declined: [] }),
    ).rejects.toThrow(/not found or expired/);
  });

  it("rejects non-positive intake_id for update_selections", async () => {
    await expect(update_selections(0, ["rec-001"])).rejects.toThrow(
      /positive integer/,
    );
    await expect(update_selections(-1, ["rec-001"])).rejects.toThrow(
      /positive integer/,
    );
  });

  it("rejects non-positive intake_id for update_approvals", async () => {
    await expect(
      update_approvals(0, { approved: [], declined: [] }),
    ).rejects.toThrow(/positive integer/);
  });
});
