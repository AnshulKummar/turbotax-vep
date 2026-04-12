/**
 * T-L01 — Sprint 4 end-to-end: recommendation tiers + customer approval flow.
 *
 * In-process test (same pattern as sprint2/sprint3 e2e tests). Exercises:
 *
 *   1. Create an intake with goals
 *   2. Produce recommendations and verify 27 recs with tier classification
 *   3. Save selections via update_selections()
 *   4. Verify get_intake() returns the selections
 *   5. Save approvals via update_approvals()
 *   6. Verify get_intake() returns the approvals matching what was submitted
 *
 * Uses the pglite test DB (wired through tests/audit/setup.ts).
 */

import { describe, expect, it, beforeEach } from "vitest";

// Types used implicitly via validate_intake return
import { mitchell_return } from "@/data/mitchell-return";
import { create_intake, get_intake, update_selections, update_approvals } from "@/lib/intake/store";
import { validate_intake } from "@/lib/goals/intake";
import { produce_recommendations } from "@/lib/recommendations/engine";
import { classify_all, group_by_tier } from "@/lib/recommendations/tiers";
import { _reset_rate_limit_store_for_tests } from "@/lib/rate-limit";

import { POST as selections_POST } from "../../app/api/intake/[id]/selections/route";
import { POST as approvals_POST } from "../../app/api/intake/[id]/approvals/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validated_goals = validate_intake([
  { id: "maximize_refund", rank: 1, weight: 5 },
  { id: "minimize_audit_risk", rank: 2, weight: 3 },
  { id: "optimize_next_year", rank: 3, weight: 2 },
]);

const sample_input = {
  goals: validated_goals,
  ip_hash: "ip-hash-sprint4-e2e",
  user_agent_hash: "ua-hash-sprint4-e2e",
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function make_selections_request(
  intake_id: number,
  selections: string[],
  ip = "203.0.113.80",
): Request {
  return new Request(
    `http://localhost/api/intake/${intake_id}/selections`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "vitest-sprint4-e2e",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ selections }),
    },
  );
}

function make_approvals_request(
  intake_id: number,
  approvals: { approved: string[]; declined: string[] },
  ip = "203.0.113.81",
): Request {
  return new Request(
    `http://localhost/api/intake/${intake_id}/approvals`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "user-agent": "vitest-sprint4-e2e",
        "x-forwarded-for": ip,
      },
      body: JSON.stringify({ approvals }),
    },
  );
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  _reset_rate_limit_store_for_tests();
});

describe("T-L01 Sprint 4 end-to-end: tiers + selections + approvals", () => {
  it("produces 27 recommendations with tier classification (high/medium/low)", async () => {
    const created = await create_intake(sample_input);
    const row = await get_intake(created.intake_id);
    expect(row).not.toBeNull();

    const customer_context = {
      case_id: mitchell_return.case_id,
      customer_display_name: "Mitchell",
      goals: row!.goals,
    };

    const result = await produce_recommendations(
      mitchell_return,
      row!.goals,
      customer_context,
    );

    // Sprint 4 expands to 27 recommendations
    expect(result.recommendations.length).toBe(27);

    // Tier classification works on all 27
    const tiers = classify_all(result.recommendations);
    expect(tiers.size).toBe(27);

    // Every recommendation gets a valid tier
    for (const [, classification] of tiers) {
      expect(["high", "medium", "low"]).toContain(classification.tier);
      expect(classification.tier_score).toBeGreaterThanOrEqual(0);
      expect(classification.tier_score).toBeLessThanOrEqual(1);
    }

    // group_by_tier produces non-empty groups (at least high and medium)
    const groups = group_by_tier(result.recommendations);
    expect(groups.high.length).toBeGreaterThan(0);
    expect(groups.medium.length).toBeGreaterThan(0);
    // Total across groups equals 27
    expect(
      groups.high.length + groups.medium.length + groups.low.length,
    ).toBe(27);
  });

  it("full flow: create intake → save selections → verify round-trip", async () => {
    const created = await create_intake(sample_input);
    const intake_id = created.intake_id;

    // Produce recommendations to get valid IDs
    const row = await get_intake(intake_id);
    const customer_context = {
      case_id: mitchell_return.case_id,
      customer_display_name: "Mitchell",
      goals: row!.goals,
    };
    const result = await produce_recommendations(
      mitchell_return,
      row!.goals,
      customer_context,
    );

    // Expert selects 5 recommendations to share with customer
    const selected_ids = result.recommendations.slice(0, 5).map((r) => r.id);
    await update_selections(intake_id, selected_ids);

    // Verify get_intake returns the selections
    const after_selections = await get_intake(intake_id);
    expect(after_selections).not.toBeNull();
    expect(after_selections!.selected_recommendations).toEqual(selected_ids);
  });

  it("full flow: selections → approvals → verify approval state", async () => {
    const created = await create_intake(sample_input);
    const intake_id = created.intake_id;

    // Produce recommendations
    const row = await get_intake(intake_id);
    const customer_context = {
      case_id: mitchell_return.case_id,
      customer_display_name: "Mitchell",
      goals: row!.goals,
    };
    const result = await produce_recommendations(
      mitchell_return,
      row!.goals,
      customer_context,
    );

    // Expert selects 5 recommendations
    const selected_ids = result.recommendations.slice(0, 5).map((r) => r.id);
    await update_selections(intake_id, selected_ids);

    // Customer approves 3, declines 2
    const approvals = {
      approved: selected_ids.slice(0, 3),
      declined: selected_ids.slice(3, 5),
    };
    await update_approvals(intake_id, approvals);

    // Verify get_intake returns the approvals
    const after_approvals = await get_intake(intake_id);
    expect(after_approvals).not.toBeNull();
    expect(after_approvals!.customer_approvals).toEqual(approvals);
    expect(after_approvals!.customer_approvals!.approved).toHaveLength(3);
    expect(after_approvals!.customer_approvals!.declined).toHaveLength(2);

    // Verify approval state matches what was submitted
    expect(after_approvals!.customer_approvals!.approved).toEqual(
      selected_ids.slice(0, 3),
    );
    expect(after_approvals!.customer_approvals!.declined).toEqual(
      selected_ids.slice(3, 5),
    );
  });

  it("API route: POST /api/intake/[id]/selections returns 200", async () => {
    const created = await create_intake(sample_input);
    const intake_id = created.intake_id;

    const selections = ["rec-001", "rec-002", "rec-003"];
    const res = await selections_POST(
      make_selections_request(intake_id, selections),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // Verify persisted
    const row = await get_intake(intake_id);
    expect(row!.selected_recommendations).toEqual(selections);
  });

  it("API route: POST /api/intake/[id]/approvals returns 200 after selections", async () => {
    const created = await create_intake(sample_input);
    const intake_id = created.intake_id;

    // Must have selections first
    await update_selections(intake_id, ["rec-001", "rec-002", "rec-003"]);

    const approvals = { approved: ["rec-001", "rec-002"], declined: ["rec-003"] };
    const res = await approvals_POST(
      make_approvals_request(intake_id, approvals),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);

    // Verify persisted
    const row = await get_intake(intake_id);
    expect(row!.customer_approvals).toEqual(approvals);
  });

  it("API route: approvals rejected when no selections exist", async () => {
    const created = await create_intake(sample_input);
    const intake_id = created.intake_id;

    const approvals = { approved: ["rec-001"], declined: [] };
    const res = await approvals_POST(
      make_approvals_request(intake_id, approvals),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("Selections must be submitted before approvals");
  });

  it("API route: selections rejected for non-existent intake", async () => {
    const res = await selections_POST(
      make_selections_request(9_999_999, ["rec-001"]),
      { params: Promise.resolve({ id: "9999999" }) },
    );

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toContain("not found or expired");
  });
});
