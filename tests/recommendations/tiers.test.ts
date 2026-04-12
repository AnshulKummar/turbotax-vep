/**
 * Sprint 4 T-I09 — tier classification unit tests.
 *
 * Verifies the tier_score formula, boundary cases, and grouping logic.
 */

import { describe, expect, it } from "vitest";

import type { Recommendation } from "@/contracts";

import {
  classify_all,
  classify_tier,
  group_by_tier,
} from "@/lib/recommendations/tiers";
import { mitchellRecommendationsFixture } from "../../components/workbench/__fixtures__/mitchell-recommendations.fixture";

function make_rec(overrides: Partial<Recommendation>): Recommendation {
  return {
    id: "test-rec",
    rule_id: "test-rule",
    finding_id: "test-finding",
    category: "wash_sale",
    severity: 3,
    irc_citation: "IRC §1091",
    one_line_summary: "Test recommendation",
    detail: "Test detail",
    affected_lines: ["1040.line.1"],
    dollar_impact: { estimate: 1000, low: 500, high: 2000 },
    audit_risk_delta: 0,
    goal_fits: [
      { goal_id: "maximize_refund", score: 0.5, rationale: "Test" },
    ],
    composite_goal_fit: 0.5,
    confidence: 0.9,
    llm_only: false,
    audit_id: "audit-test",
    ...overrides,
  };
}

describe("classify_tier", () => {
  it("computes tier_score correctly for a known input", () => {
    // severity=5 → 5/5*0.4 = 0.4
    // composite_goal_fit=0.85 → 0.85*0.35 = 0.2975
    // dollar_impact.estimate=10800 → min(10800/10000,1)*0.25 = 0.25
    // total = 0.9475
    const rec = make_rec({
      severity: 5,
      composite_goal_fit: 0.85,
      dollar_impact: { estimate: 10_800, low: 5_000, high: 15_000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("high");
    expect(result.tier_score).toBeCloseTo(0.9475, 4);
  });

  it("classifies high at exactly 0.65 threshold", () => {
    // Need: severity_comp + goal_comp + dollar_comp = 0.65
    // severity=3 → 0.24, goal=0.5 → 0.175, dollar=940 → 0.0235 => 0.4385
    // severity=4 → 0.32, goal=0.6 → 0.21, dollar=4800 → 0.12 => 0.65
    const rec = make_rec({
      severity: 4,
      composite_goal_fit: 0.6,
      dollar_impact: { estimate: 4_800, low: 0, high: 10_000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("high");
    expect(result.tier_score).toBeCloseTo(0.65, 4);
  });

  it("classifies medium just below 0.65", () => {
    const rec = make_rec({
      severity: 4,
      composite_goal_fit: 0.59,
      dollar_impact: { estimate: 4_800, low: 0, high: 10_000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("medium");
    expect(result.tier_score).toBeLessThan(0.65);
  });

  it("classifies medium at exactly 0.40 threshold", () => {
    // severity=2 → 0.16, goal=0.4 → 0.14, dollar=4000 → 0.1 => 0.4
    const rec = make_rec({
      severity: 2,
      composite_goal_fit: 0.4,
      dollar_impact: { estimate: 4_000, low: 0, high: 8_000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("medium");
    expect(result.tier_score).toBeCloseTo(0.4, 4);
  });

  it("classifies low below 0.40", () => {
    const rec = make_rec({
      severity: 1,
      composite_goal_fit: 0.15,
      dollar_impact: { estimate: 0, low: 0, high: 0 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("low");
    expect(result.tier_score).toBeLessThan(0.4);
  });

  it("caps dollar impact component at 1 for very large estimates", () => {
    const rec = make_rec({
      severity: 1,
      composite_goal_fit: 0.0,
      dollar_impact: { estimate: 100_000, low: 0, high: 200_000 },
    });
    const result = classify_tier(rec);
    // 0.08 + 0 + 0.25 = 0.33
    expect(result.tier_score).toBeCloseTo(0.33, 4);
  });

  it("handles zero dollar impact", () => {
    const rec = make_rec({
      severity: 1,
      composite_goal_fit: 0.2,
      dollar_impact: { estimate: 0, low: 0, high: 0 },
    });
    const result = classify_tier(rec);
    // 0.08 + 0.07 + 0 = 0.15
    expect(result.tier_score).toBeCloseTo(0.15, 4);
  });
});

describe("classify_all", () => {
  it("returns a Map with entries for every recommendation", () => {
    const recs = [
      make_rec({ id: "a" }),
      make_rec({ id: "b" }),
    ];
    const map = classify_all(recs);
    expect(map.size).toBe(2);
    expect(map.has("a")).toBe(true);
    expect(map.has("b")).toBe(true);
  });

  it("handles empty array", () => {
    const map = classify_all([]);
    expect(map.size).toBe(0);
  });
});

describe("group_by_tier", () => {
  it("groups the Mitchell fixture into all three tiers", () => {
    const groups = group_by_tier(mitchellRecommendationsFixture);
    expect(groups.high.length).toBeGreaterThan(0);
    expect(groups.medium.length).toBeGreaterThan(0);
    expect(groups.low.length).toBeGreaterThan(0);
  });

  it("total across tiers equals input count", () => {
    const groups = group_by_tier(mitchellRecommendationsFixture);
    const total =
      groups.high.length + groups.medium.length + groups.low.length;
    expect(total).toBe(mitchellRecommendationsFixture.length);
    expect(total).toBe(27);
  });

  it("preserves input order within each tier", () => {
    const groups = group_by_tier(mitchellRecommendationsFixture);
    for (const tier of ["high", "medium", "low"] as const) {
      const ids = groups[tier].map((r) => r.id);
      // All IDs in a tier should be in ascending order (since the fixture is ordered).
      for (let i = 1; i < ids.length; i++) {
        expect(ids[i]! > ids[i - 1]!).toBe(true);
      }
    }
  });
});
