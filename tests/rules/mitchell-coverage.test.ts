import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import {
  evaluate_all,
  MITCHELL_EXPECTED_RULE_IDS,
  tax_rules,
} from "@/lib/rules";

describe("rule corpus size", () => {
  it("contains exactly 50 rules", () => {
    expect(tax_rules).toHaveLength(50);
  });
  it("has unique rule ids", () => {
    const ids = tax_rules.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("every rule has a non-empty IRC citation", () => {
    for (const rule of tax_rules) {
      expect(rule.irc_citation.length).toBeGreaterThan(0);
    }
  });
});

describe("Mitchell return coverage", () => {
  const findings = evaluate_all(mitchell_return);
  const fired_rule_ids = new Set(findings.map((f) => f.rule_id));

  it("fires every expected rule id", () => {
    for (const expected_id of MITCHELL_EXPECTED_RULE_IDS) {
      expect(
        fired_rule_ids.has(expected_id),
        `expected ${expected_id} to fire on Mitchell return`,
      ).toBe(true);
    }
  });

  it("fires all 8 known-bug rules", () => {
    const matched = MITCHELL_EXPECTED_RULE_IDS.filter((id) =>
      fired_rule_ids.has(id),
    );
    expect(matched).toHaveLength(8);
  });

  it("produces at least 8 findings", () => {
    expect(findings.length).toBeGreaterThanOrEqual(8);
  });

  it("every finding references a real rule", () => {
    const rule_ids = new Set(tax_rules.map((r) => r.id));
    for (const f of findings) {
      expect(rule_ids.has(f.rule_id)).toBe(true);
    }
  });
});
