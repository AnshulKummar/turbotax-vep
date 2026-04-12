/**
 * T-701 — load-bearing test for the entire Sprint 2 thesis.
 *
 * The LLM cassette is goal-AGNOSTIC: it explains and ranks rule findings
 * on intrinsic severity / dollar impact only. Goal-aware re-ranking lives
 * in the local `score_recommendation()` scorer, which means a single
 * cassette can serve any visitor goal mix at $0 marginal cost.
 *
 * This test feeds the engine TWO different goal mixes against the SAME
 * cassette and asserts the top-5 `composite_goal_fit` ordering is
 * different. If this test fails, the public Sprint 2 demo's value
 * proposition is broken — every visitor would see the same ranking
 * regardless of what they said they cared about.
 */

import { describe, expect, it } from "vitest";

import type { CustomerContext } from "@/contracts";
import { mitchell_return } from "@/data/mitchell-return";
import { validate_intake } from "@/lib/goals/intake";
import { produce_recommendations } from "@/lib/recommendations/engine";

const refund_first_goals = validate_intake([
  { id: "maximize_refund", rank: 1, weight: 5 },
  { id: "minimize_audit_risk", rank: 2, weight: 2 },
  { id: "optimize_next_year", rank: 3, weight: 1 },
]);

const audit_risk_first_goals = validate_intake([
  { id: "minimize_audit_risk", rank: 1, weight: 5 },
  { id: "harvest_losses", rank: 2, weight: 4 },
  { id: "optimize_next_year", rank: 3, weight: 2 },
]);

const mitchell_context: CustomerContext = {
  case_id: mitchell_return.case_id,
  customer_display_name: "Mitchell Household",
  goals: refund_first_goals,
  prior_year_summary:
    "TY2024 prepared by Harmon Tax Services. Refund $6,812. No IRS correspondence.",
  prior_expert_notes:
    "Customer flagged the 2024 RSU basis reconciliation was painful — keep an eye on it.",
};

const cassette_path = "tests/recommendations/cassettes/mitchell-rec-cassette.json";

describe("goal-mix re-rank against a goal-agnostic cassette (T-701)", () => {
  it("two different goal mixes produce different top-5 composite_goal_fit orderings", async () => {
    const refund_run = await produce_recommendations(
      mitchell_return,
      refund_first_goals,
      { ...mitchell_context, goals: refund_first_goals },
      { cassette_path },
    );

    const audit_run = await produce_recommendations(
      mitchell_return,
      audit_risk_first_goals,
      { ...mitchell_context, goals: audit_risk_first_goals },
      { cassette_path },
    );

    // Both runs MUST share the same recommendation set (the LLM cassette is
    // identical). Only the per-recommendation scoring + ordering changes.
    const refund_rule_set = new Set(refund_run.recommendations.map((r) => r.rule_id));
    const audit_rule_set = new Set(audit_run.recommendations.map((r) => r.rule_id));
    expect(refund_rule_set).toEqual(audit_rule_set);

    // The thesis: top-5 ordering by id MUST differ between the two mixes.
    // We compare `id` (which is stable per finding) so two recs that score
    // identically across both mixes still surface as a real ordering match.
    const refund_top5 = refund_run.recommendations.slice(0, 5).map((r) => r.id);
    const audit_top5 = audit_run.recommendations.slice(0, 5).map((r) => r.id);

    expect(
      refund_top5,
      `top-5 ordering must differ between goal mixes — got identical ordering: ${refund_top5.join(", ")}`,
    ).not.toEqual(audit_top5);

    // Sanity: at least one recommendation has a measurably different
    // composite_goal_fit between the two runs.
    const refund_composites = new Map(
      refund_run.recommendations.map((r) => [r.id, r.composite_goal_fit]),
    );
    const some_drift = audit_run.recommendations.some((r) => {
      const refund_score = refund_composites.get(r.id);
      if (refund_score === undefined) return false;
      return Math.abs(refund_score - r.composite_goal_fit) > 0.01;
    });
    expect(
      some_drift,
      "expected at least one recommendation's composite_goal_fit to drift between goal mixes",
    ).toBe(true);
  });

  it("recommendation set itself is identical across goal mixes (cassette is goal-agnostic)", async () => {
    const refund_run = await produce_recommendations(
      mitchell_return,
      refund_first_goals,
      { ...mitchell_context, goals: refund_first_goals },
      { cassette_path },
    );

    const audit_run = await produce_recommendations(
      mitchell_return,
      audit_risk_first_goals,
      { ...mitchell_context, goals: audit_risk_first_goals },
      { cassette_path },
    );

    // Same set of finding_ids — only the ordering and scoring differ.
    const refund_findings = new Set(
      refund_run.recommendations.map((r) => r.finding_id),
    );
    const audit_findings = new Set(
      audit_run.recommendations.map((r) => r.finding_id),
    );
    expect(refund_findings).toEqual(audit_findings);
  });
});
