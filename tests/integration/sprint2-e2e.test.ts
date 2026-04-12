/**
 * T-713 — Sprint 2 end-to-end demo flow.
 *
 * Design note on why this is an in-process test rather than a
 * `next start` harness:
 *
 *   The original T-713 spec said "hit the deployed URL", but Sprint 2
 *   Phase 4 (Vercel provisioning) is deferred to the user, so there is no
 *   URL to hit. Agent D's options were (a) spawn `next start` from inside
 *   vitest or (b) import the server-side entry points directly and drive
 *   them without HTTP. Option (a) is fragile on Windows (child-process
 *   zombies, port contention, and a ~10s cold-start per test file);
 *   option (b) exercises the exact same code paths — `apply_rate_limit`,
 *   `validate_intake`, `create_intake`, `get_intake`, and
 *   `produce_recommendations` — with zero flake risk. Once a real URL is
 *   live in Phase 4, a separate smoke-test file (`docs/DeploymentGuide.md`)
 *   runs the HTTP version.
 *
 * What this test proves:
 *   1. POST /api/intake accepts a 3-goal payload, validates it, persists
 *      it, and returns a numeric intake_id.
 *   2. GET /api/intake/[id] round-trips the stored goal vector.
 *   3. The workbench server-side loader (the same `get_intake` +
 *      `produce_recommendations` path `app/(workbench)/workbench/page.tsx`
 *      takes) resolves to the Mitchell return's display name ("Mitchell")
 *      and a non-empty recommendation list.
 *   4. Two intakes with different goal mixes produce different top-5
 *      recommendation orderings — the core "it actually re-ranks" claim
 *      the public demo makes.
 *
 * The test uses the same pglite test DB the rest of the suite uses
 * (wired through `tests/audit/setup.ts`), so it costs essentially nothing
 * to include in the default run.
 */

import { describe, expect, it, beforeEach } from "vitest";

import type { Goal, Recommendation } from "@/contracts";
import { mitchell_return } from "@/data/mitchell-return";
import { get_intake } from "@/lib/intake/store";
import { produce_recommendations } from "@/lib/recommendations/engine";
import { _reset_rate_limit_store_for_tests } from "@/lib/rate-limit";
import { SECTION_IDS, DEFAULT_SECTION } from "../../components/workbench/WorkbenchShell";

import { POST as intake_POST } from "../../app/api/intake/route";
import { GET as intake_GET } from "../../app/api/intake/[id]/route";

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

function make_post(goals: Goal[], ip = "203.0.113.1"): Request {
  return new Request("http://localhost/api/intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest-e2e",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ goals }),
  });
}

async function post_intake(goals: Goal[], ip?: string): Promise<number> {
  const res = await intake_POST(make_post(goals, ip));
  expect(res.status).toBe(201);
  const body = (await res.json()) as { intake_id: number };
  return body.intake_id;
}

async function run_workbench_loader(intake_id: number): Promise<{
  display_name: string;
  recommendations: Recommendation[];
}> {
  // This mirrors the exact sequence in app/(workbench)/workbench/page.tsx
  // for the `?intake=<id>` branch. We intentionally re-run the same calls
  // rather than importing the page component, because RSC server entry
  // points aren't directly callable from vitest without jsx tooling.
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

beforeEach(() => {
  // Keep the rate-limit bucket clean so the 21st request in some OTHER
  // test file can't nudge this file's 429 threshold. Each T-713 test
  // posts at most a handful of times.
  _reset_rate_limit_store_for_tests();
});

describe("T-713 Sprint 2 end-to-end demo flow", () => {
  it("POST /api/intake → GET /api/intake/[id] round-trips the goal vector", async () => {
    const intake_id = await post_intake(REFUND_HEAVY);
    expect(intake_id).toBeGreaterThan(0);

    const get_res = await intake_GET(
      new Request(`http://localhost/api/intake/${intake_id}`),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(get_res.status).toBe(200);
    const body = (await get_res.json()) as {
      intake_id: number;
      goals: { id: string; rank: number; weight: number }[];
    };
    expect(body.intake_id).toBe(intake_id);
    expect(body.goals.map((g) => g.id)).toEqual([
      "maximize_refund",
      "minimize_audit_risk",
      "optimize_next_year",
    ]);
  });

  it("workbench loader resolves the Mitchell customer name and non-empty recs", async () => {
    const intake_id = await post_intake(REFUND_HEAVY);
    const resolved = await run_workbench_loader(intake_id);
    expect(resolved.display_name).toContain("Mitchell");
    expect(resolved.recommendations.length).toBeGreaterThan(0);
  });

  it("two different goal mixes produce different top-5 recommendation orderings", async () => {
    const refund_id = await post_intake(REFUND_HEAVY, "203.0.113.10");
    const audit_id = await post_intake(AUDIT_HEAVY, "203.0.113.11");

    const refund_result = await run_workbench_loader(refund_id);
    const audit_result = await run_workbench_loader(audit_id);

    expect(refund_result.recommendations.length).toBeGreaterThan(0);
    expect(audit_result.recommendations.length).toBeGreaterThan(0);
    // Both flows should surface Mitchell as the customer.
    expect(refund_result.display_name).toContain("Mitchell");
    expect(audit_result.display_name).toContain("Mitchell");
    // Core claim of the demo: swapping the goal mix demonstrably
    // re-orders the top 5.
    expect(top_five_signature(refund_result.recommendations)).not.toBe(
      top_five_signature(audit_result.recommendations),
    );
  });

  it("WorkbenchShell section nav includes Brief and Recommendations", () => {
    // Sprint 3: verify the section structure the shell will render
    expect(SECTION_IDS).toContain("brief");
    expect(SECTION_IDS).toContain("recommendations");
    expect(DEFAULT_SECTION).toBe("brief");
    expect(SECTION_IDS.length).toBe(6);
  });
});
