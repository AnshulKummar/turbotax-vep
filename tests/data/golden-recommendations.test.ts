import { describe, expect, it } from "vitest";
import { z } from "zod/v4";

import golden from "@/data/golden-recommendations.json";
import { GOAL_IDS, type GoalId } from "@/contracts";
import { tax_rules } from "@/lib/rules";

/**
 * Golden recommendations schema. Each entry pairs a rule id with an
 * expected dollar-impact band, goal vector, and severity so that both
 * Agent 2's recommender and Agent 5's evaluator can assert minimum
 * coverage on the Mitchell hero return.
 */
const recommendation_schema = z.object({
  id: z.string().min(1),
  rule_id: z.string().min(1),
  headline: z.string().min(1),
  expected_dollar_impact_min: z.number().nonnegative(),
  expected_dollar_impact_max: z.number().nonnegative(),
  expected_goals: z.array(z.enum(GOAL_IDS)).min(1),
  expected_severity: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
  ]),
  must_appear: z.boolean(),
  rationale: z.string().min(10),
});

const golden_file_schema = z.object({
  $schema_version: z.string(),
  description: z.string(),
  recommendations: z.array(recommendation_schema).min(8),
});

describe("golden-recommendations.json", () => {
  it("matches the golden-recommendations schema", () => {
    const parsed = golden_file_schema.safeParse(golden);
    if (!parsed.success) {
      // Provide a readable error so the Agent 1 log shows what broke.
      throw new Error(
        "golden recommendations failed validation: " +
          JSON.stringify(parsed.error.issues, null, 2),
      );
    }
    expect(parsed.data.recommendations.length).toBeGreaterThanOrEqual(8);
  });

  it("has a unique id for every entry", () => {
    const parsed = golden_file_schema.parse(golden);
    const ids = parsed.recommendations.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every rule_id resolves to a real rule in the corpus", () => {
    const parsed = golden_file_schema.parse(golden);
    const rule_ids = new Set(tax_rules.map((r) => r.id));
    for (const rec of parsed.recommendations) {
      expect(rule_ids.has(rec.rule_id), `unknown rule_id: ${rec.rule_id}`).toBe(true);
    }
  });

  it("every expected goal is a canonical GoalId", () => {
    const parsed = golden_file_schema.parse(golden);
    const valid = new Set<GoalId>(GOAL_IDS);
    for (const rec of parsed.recommendations) {
      for (const g of rec.expected_goals) {
        expect(valid.has(g), `unknown goal id: ${g}`).toBe(true);
      }
    }
  });

  it("dollar impact min <= max for every entry", () => {
    const parsed = golden_file_schema.parse(golden);
    for (const rec of parsed.recommendations) {
      expect(rec.expected_dollar_impact_min).toBeLessThanOrEqual(
        rec.expected_dollar_impact_max,
      );
    }
  });

  it("covers at least 8 must_appear recommendations", () => {
    const parsed = golden_file_schema.parse(golden);
    const must = parsed.recommendations.filter((r) => r.must_appear);
    expect(must.length).toBeGreaterThanOrEqual(8);
  });
});
