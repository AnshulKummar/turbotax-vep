import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { HSAContribution } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const base_hsa: HSAContribution = {
  account_holder: dummy_person,
  line2_contributions: 4_150,
  line6_allowable: 8_550,
  line13_deduction: 4_150,
  coverage: "family",
  employer_contributions: 0,
};

describe("hsa-over-limit-001", () => {
  const rule = get("hsa-over-limit-001");
  it("fires when contribution exceeds family limit", () => {
    const findings = rule.evaluate(
      make_return({
        hsa: [{ ...base_hsa, line2_contributions: 9_500 }],
        agi: 200_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire at the limit", () => {
    const findings = rule.evaluate(
      make_return({
        hsa: [{ ...base_hsa, line2_contributions: 8_550 }],
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("hsa-8889-reconcile-001", () => {
  const rule = get("hsa-8889-reconcile-001");
  it("fires when line 6 uses the stale TY2024 family limit ($8,300)", () => {
    const findings = rule.evaluate(
      make_return({
        hsa: [{ ...base_hsa, line6_allowable: 8_300 }],
        agi: 200_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when line 6 matches TY2025 family limit ($8,550) and line 13 reconciles", () => {
    const findings = rule.evaluate(
      make_return({ hsa: [base_hsa], agi: 200_000 }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("hsa-schedule-1-003", () => {
  const rule = get("hsa-schedule-1-003");
  it("fires when line 2 > 0 and line 13 = 0", () => {
    const findings = rule.evaluate(
      make_return({
        hsa: [{ ...base_hsa, line2_contributions: 3_000, line13_deduction: 0 }],
        agi: 200_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when line 13 matches line 2", () => {
    const findings = rule.evaluate(make_return({ hsa: [base_hsa], agi: 200_000 }));
    expect(findings).toHaveLength(0);
  });
});

describe("hsa-employer-contribution-004", () => {
  const rule = get("hsa-employer-contribution-004");
  it("fires when line 2 equals employer contribution exactly", () => {
    const findings = rule.evaluate(
      make_return({
        hsa: [
          {
            ...base_hsa,
            employer_contributions: 2_000,
            line2_contributions: 2_000,
          },
        ],
        agi: 200_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when line 2 is distinct from employer contribution", () => {
    const findings = rule.evaluate(
      make_return({
        hsa: [
          {
            ...base_hsa,
            employer_contributions: 2_000,
            line2_contributions: 4_150,
          },
        ],
      }),
    );
    expect(findings).toHaveLength(0);
  });
});
