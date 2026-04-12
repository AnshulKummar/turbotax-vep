/**
 * T-H01 — Sprint 3 end-to-end customer-to-expert flow.
 *
 * In-process test (same pattern as sprint2-e2e.test.ts — import route
 * handlers directly, no server spawn). Exercises the full Sprint 3 path:
 *
 *   1. POST /api/intake with goals + customer_metadata
 *   2. Assert 201 + intake_id returned
 *   3. get_intake round-trips customer_metadata correctly
 *   4. Goal-mix re-ranking still works with customer_metadata present
 *
 * Uses the pglite test DB (wired through tests/audit/setup.ts).
 */

import { describe, expect, it, beforeEach } from "vitest";

import type { Goal, Recommendation } from "@/contracts";
import { mitchell_return } from "@/data/mitchell-return";
import { get_intake } from "@/lib/intake/store";
import { produce_recommendations } from "@/lib/recommendations/engine";
import { _reset_rate_limit_store_for_tests } from "@/lib/rate-limit";
import { SECTION_IDS, DEFAULT_SECTION } from "../../components/workbench/WorkbenchShell";

import { POST as intake_POST } from "../../app/api/intake/route";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const REFUND_HEAVY: Goal[] = [
  { id: "maximize_refund", rank: 1, weight: 5 } as Goal,
  { id: "minimize_audit_risk", rank: 2, weight: 2 } as Goal,
  { id: "optimize_next_year", rank: 3, weight: 1 } as Goal,
];

const AUDIT_HEAVY: Goal[] = [
  { id: "minimize_audit_risk", rank: 1, weight: 5 } as Goal,
  { id: "plan_life_event", rank: 2, weight: 3 } as Goal,
  { id: "simplify_filing", rank: 3, weight: 2 } as Goal,
];

const TEST_METADATA = {
  display_name: "Test User",
  filing_status: "mfj" as const,
  agi_band: "250_500k" as const,
  document_ids: ["w2-acme", "1099-div", "1098"],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function make_post(
  goals: Goal[],
  customer_metadata?: Record<string, unknown>,
  ip = "203.0.113.50",
): Request {
  const body: Record<string, unknown> = { goals };
  if (customer_metadata !== undefined) {
    body.customer_metadata = customer_metadata;
  }
  return new Request("http://localhost/api/intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest-sprint3-e2e",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

async function post_intake(
  goals: Goal[],
  customer_metadata?: Record<string, unknown>,
  ip?: string,
): Promise<number> {
  const res = await intake_POST(make_post(goals, customer_metadata, ip));
  expect(res.status).toBe(201);
  const body = (await res.json()) as { intake_id: number };
  expect(body.intake_id).toBeGreaterThan(0);
  return body.intake_id;
}

async function run_workbench_loader(intake_id: number): Promise<{
  display_name: string;
  recommendations: Recommendation[];
}> {
  const row = await get_intake(intake_id);
  expect(row).not.toBeNull();
  const goals = row!.goals;
  const customer_context = {
    case_id: mitchell_return.case_id,
    customer_display_name: `${mitchell_return.taxpayer.first_name} & ${
      mitchell_return.spouse?.first_name ?? ""
    } ${mitchell_return.taxpayer.last_name}`,
    goals,
  };
  const result = await produce_recommendations(
    mitchell_return,
    goals,
    customer_context,
  );
  return {
    display_name: customer_context.customer_display_name,
    recommendations: result.recommendations,
  };
}

function top_five_signature(recs: Recommendation[]): string {
  return recs
    .slice(0, 5)
    .map((r) => r.rule_id)
    .join("|");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  _reset_rate_limit_store_for_tests();
});

describe("T-H01 Sprint 3 end-to-end customer-to-expert flow", () => {
  it("POST /api/intake with customer_metadata returns 201 + intake_id", async () => {
    const intake_id = await post_intake(REFUND_HEAVY, TEST_METADATA);
    expect(intake_id).toBeGreaterThan(0);
  });

  it("get_intake round-trips customer_metadata correctly", async () => {
    const intake_id = await post_intake(REFUND_HEAVY, TEST_METADATA);
    const row = await get_intake(intake_id);

    expect(row).not.toBeNull();
    expect(row!.customer_metadata).toBeDefined();
    expect(row!.customer_metadata!.display_name).toBe("Test User");
    expect(row!.customer_metadata!.filing_status).toBe("mfj");
    expect(row!.customer_metadata!.agi_band).toBe("250_500k");
    expect(row!.customer_metadata!.document_ids).toEqual(
      expect.arrayContaining(["w2-acme", "1099-div", "1098"]),
    );
    expect(row!.customer_metadata!.document_ids).toHaveLength(3);
  });

  it("goals are persisted alongside customer_metadata", async () => {
    const intake_id = await post_intake(REFUND_HEAVY, TEST_METADATA);
    const row = await get_intake(intake_id);

    expect(row).not.toBeNull();
    expect(row!.goals.map((g) => g.id)).toEqual([
      "maximize_refund",
      "minimize_audit_risk",
      "optimize_next_year",
    ]);
  });

  it("goal-mix re-ranking works with customer_metadata present", async () => {
    const refund_id = await post_intake(
      REFUND_HEAVY,
      TEST_METADATA,
      "203.0.113.60",
    );
    const audit_id = await post_intake(
      AUDIT_HEAVY,
      { ...TEST_METADATA, display_name: "Audit User" },
      "203.0.113.61",
    );

    const refund_result = await run_workbench_loader(refund_id);
    const audit_result = await run_workbench_loader(audit_id);

    expect(refund_result.recommendations.length).toBeGreaterThan(0);
    expect(audit_result.recommendations.length).toBeGreaterThan(0);

    // Core claim: different goal mixes produce different top-5 orderings
    expect(top_five_signature(refund_result.recommendations)).not.toBe(
      top_five_signature(audit_result.recommendations),
    );
  });

  it("backward compat: POST without customer_metadata still works", async () => {
    const intake_id = await post_intake(REFUND_HEAVY, undefined, "203.0.113.70");
    const row = await get_intake(intake_id);

    expect(row).not.toBeNull();
    expect(row!.customer_metadata).toBeUndefined();
    expect(row!.goals.map((g) => g.id)).toEqual([
      "maximize_refund",
      "minimize_audit_risk",
      "optimize_next_year",
    ]);
  });

  it("WorkbenchShell section structure is correct for Sprint 3", () => {
    expect(SECTION_IDS).toContain("brief");
    expect(SECTION_IDS).toContain("goals");
    expect(SECTION_IDS).toContain("documents");
    expect(SECTION_IDS).toContain("prework");
    expect(SECTION_IDS).toContain("recommendations");
    expect(SECTION_IDS).toContain("audit");
    expect(DEFAULT_SECTION).toBe("brief");
    expect(SECTION_IDS.length).toBe(6);
  });
});
