/**
 * T-703 — intake_sessions store unit tests.
 *
 * The DB lifecycle (fresh pglite per test) is owned by tests/audit/setup.ts,
 * registered globally via vitest.config.ts. Each test sees an empty
 * intake_sessions table.
 */

import { describe, expect, it } from "vitest";

import { validate_intake } from "@/lib/goals/intake";
import {
  _count_intake_rows,
  _insert_intake_with_expiry,
  create_intake,
  get_intake,
} from "@/lib/intake/store";

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
