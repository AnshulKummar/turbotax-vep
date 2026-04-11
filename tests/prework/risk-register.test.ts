import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import golden from "@/data/golden-recommendations.json";
import { evaluate_all } from "@/lib/rules";
import { build_risk_register } from "@/lib/prework/risk-register";
import type { RuleFinding } from "@/contracts";

type GoldenEntry = {
  id: string;
  rule_id: string;
  expected_severity: number;
  expected_dollar_impact_min: number;
  expected_dollar_impact_max: number;
  must_appear: boolean;
};

const golden_recs = (golden as { recommendations: GoldenEntry[] })
  .recommendations;

// Rank the must_appear golden recommendations by severity * midpoint
// dollar impact. This is the oracle definition of "highest priority"
// golden recommendations that the risk register is required to surface.
const top_5_golden_rule_ids = golden_recs
  .filter((g) => g.must_appear)
  .slice()
  .sort((a, b) => {
    const midpoint_a = (a.expected_dollar_impact_max + a.expected_dollar_impact_min) / 2;
    const midpoint_b = (b.expected_dollar_impact_max + b.expected_dollar_impact_min) / 2;
    return b.expected_severity * midpoint_b - a.expected_severity * midpoint_a;
  })
  .slice(0, 5)
  .map((g) => g.rule_id);

describe("build_risk_register — Mitchell return", () => {
  const findings = evaluate_all(mitchell_return);
  const register = build_risk_register(mitchell_return, findings);

  it("produces at most 10 entries", () => {
    expect(register.length).toBeLessThanOrEqual(10);
    expect(register.length).toBeGreaterThan(0);
  });

  it("assigns contiguous ranks starting at 1", () => {
    register.forEach((entry, idx) => {
      expect(entry.rank).toBe(idx + 1);
    });
  });

  it("is sorted by severity * dollar_impact_estimate descending", () => {
    for (let i = 1; i < register.length; i++) {
      const prev = register[i - 1];
      const cur = register[i];
      const prev_score = prev.severity * prev.dollar_impact_estimate;
      const cur_score = cur.severity * cur.dollar_impact_estimate;
      expect(prev_score).toBeGreaterThanOrEqual(cur_score);
    }
  });

  it("dedupes by rule_id", () => {
    const rule_ids = register.map((e) => e.rule_id);
    const unique = new Set(rule_ids);
    expect(rule_ids.length).toBe(unique.size);
  });

  it("top 5 highest-priority golden rule_ids all appear in the register", () => {
    const register_rule_ids = new Set(register.map((e) => e.rule_id));
    for (const rule_id of top_5_golden_rule_ids) {
      expect(
        register_rule_ids.has(rule_id),
        `expected top-5 golden ${rule_id} to appear in risk register`,
      ).toBe(true);
    }
  });

  it("top entry is the RSU double-count finding", () => {
    expect(register[0]?.rule_id).toBe("rsu-double-count-001");
  });

  it("every entry carries a severity 1-5, an IRC citation, and affected lines", () => {
    for (const entry of register) {
      expect(entry.severity).toBeGreaterThanOrEqual(1);
      expect(entry.severity).toBeLessThanOrEqual(5);
      expect(entry.irc_citation.startsWith("IRC")).toBe(true);
      expect(entry.affected_lines.length).toBeGreaterThan(0);
      expect(entry.one_line_summary.length).toBeGreaterThan(0);
    }
  });
});

describe("build_risk_register — empty findings", () => {
  it("returns an empty list when no findings are passed in", () => {
    const out = build_risk_register(mitchell_return, [] as RuleFinding[]);
    expect(out).toEqual([]);
  });
});
