import { describe, expect, it } from "vitest";

import type { Goal, RuleFinding } from "@/contracts";
import { mitchell_return } from "@/data/mitchell-return";
import { validate_intake } from "@/lib/goals/intake";
import {
  score_recommendation,
  type GoalFitInput,
} from "@/lib/recommendations/goal-fit";
import { evaluate_all } from "@/lib/rules";

function to_input(f: RuleFinding): GoalFitInput {
  return {
    category: f.category,
    dollar_impact: f.dollar_impact,
    audit_risk_delta: f.audit_risk_delta,
  };
}

function rank_findings(
  findings: RuleFinding[],
  goals: Goal[],
): { rule_id: string; composite: number }[] {
  return findings
    .map((f) => ({
      rule_id: f.rule_id,
      composite: score_recommendation(to_input(f), goals).composite,
    }))
    .sort((a, b) => b.composite - a.composite);
}

describe("score_recommendation (T-203)", () => {
  const findings = evaluate_all(mitchell_return);

  it("produces scores in [0, 1] for every (finding, goal) pair", () => {
    const goals = validate_intake([
      { id: "maximize_refund", rank: 1, weight: 5 },
      { id: "minimize_audit_risk", rank: 2, weight: 4 },
      { id: "optimize_retirement", rank: 3, weight: 3 },
    ]);
    for (const f of findings) {
      const res = score_recommendation(to_input(f), goals);
      expect(res.composite).toBeGreaterThanOrEqual(0);
      expect(res.composite).toBeLessThanOrEqual(1);
      for (const fit of res.goal_fits) {
        expect(fit.score).toBeGreaterThanOrEqual(0);
        expect(fit.score).toBeLessThanOrEqual(1);
      }
      expect(res.goal_fits).toHaveLength(goals.length);
    }
  });

  it("swapping maximize_refund <-> minimize_audit_risk reorders Mitchell recs", () => {
    const refund_goals = validate_intake([
      { id: "maximize_refund", rank: 1, weight: 5 },
    ]);
    const audit_goals = validate_intake([
      { id: "minimize_audit_risk", rank: 1, weight: 5 },
    ]);

    const refund_order = rank_findings(findings, refund_goals);
    const audit_order = rank_findings(findings, audit_goals);

    // The top rule id should differ OR the ordering should be materially
    // different (at least one rule shifts position).
    let shifted = false;
    for (let i = 0; i < Math.min(refund_order.length, audit_order.length); i++) {
      if (refund_order[i].rule_id !== audit_order[i].rule_id) {
        shifted = true;
        break;
      }
    }
    expect(shifted).toBe(true);
  });

  it("harvest_losses goal raises wash-sale recommendations to the top", () => {
    const goals = validate_intake([
      { id: "harvest_losses", rank: 1, weight: 5 },
    ]);
    const ranked = rank_findings(findings, goals);
    const wash_sale_findings = findings.filter((f) => f.category === "wash_sale");
    // There's at least one wash-sale finding on the Mitchell return.
    expect(wash_sale_findings.length).toBeGreaterThan(0);
    // Its rule_id appears in the top 3.
    const top_three_ids = new Set(ranked.slice(0, 3).map((r) => r.rule_id));
    const wash_sale_rule_ids = wash_sale_findings.map((f) => f.rule_id);
    const hit = wash_sale_rule_ids.some((id) => top_three_ids.has(id));
    expect(hit).toBe(true);
  });

  it("plan_life_event goal raises §121 / dependent / CTC recs to the top", () => {
    const goals = validate_intake([
      { id: "plan_life_event", rank: 1, weight: 5 },
    ]);
    // Mitchell doesn't necessarily have a §121 finding; inject a synthetic
    // one representative of what a home-sale return would produce.
    const synthetic_life_event: RuleFinding = {
      finding_id: "synthetic-sec121-001",
      rule_id: "section-121-test",
      category: "section_121",
      severity: 4,
      irc_citation: "IRC §121",
      summary: "Primary residence exclusion window",
      detail: "test",
      affected_lines: [],
      dollar_impact: { estimate: 2000, low: 1000, high: 5000 },
      audit_risk_delta: -0.1,
    };
    const augmented = [...findings, synthetic_life_event];
    const ranked = rank_findings(augmented, goals);

    // Per ADR-005, plan_life_event favours §121 / dependent / CTC recs. The
    // top slot should go to one of those categories.
    const top_id = ranked[0].rule_id;
    const top_finding = augmented.find((f) => f.rule_id === top_id);
    expect(top_finding).toBeDefined();
    expect(
      ["section_121", "credit_eligibility"].includes(
        top_finding!.category,
      ),
    ).toBe(true);
  });

  it("optimize_retirement goal raises retirement_contribution recs to the top", () => {
    const goals = validate_intake([
      { id: "optimize_retirement", rank: 1, weight: 5 },
    ]);
    const ranked = rank_findings(findings, goals);
    const retirement_ids = findings
      .filter((f) => f.category === "retirement_contribution")
      .map((f) => f.rule_id);
    expect(retirement_ids.length).toBeGreaterThan(0);
    const top_three = new Set(ranked.slice(0, 3).map((r) => r.rule_id));
    const hit = retirement_ids.some((id) => top_three.has(id));
    expect(hit).toBe(true);
  });
});
