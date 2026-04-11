import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { W2 } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const base_w2: W2 = {
  employer_name: "Test Co",
  employer_ein: "99-0000001",
  employee: dummy_person,
  box1_wages: 100_000,
  box2_fed_withholding: 20_000,
  box3_ss_wages: 100_000,
  box4_ss_withholding: 6_200,
  box5_medicare_wages: 100_000,
  box6_medicare_withholding: 1_450,
  box12: [],
  box14: [],
  state_wages: [],
};

describe("retirement-ira-headroom-001", () => {
  const rule = get("retirement-ira-headroom-001");
  it("fires once per person (taxpayer + spouse)", () => {
    const findings = rule.evaluate(make_return({ agi: 150_000 }));
    expect(findings).toHaveLength(2);
  });
  it("fires once when spouse is missing", () => {
    const findings = rule.evaluate(
      make_return({ filing_status: "single", spouse: undefined, agi: 80_000 }),
    );
    expect(findings).toHaveLength(1);
  });
});

describe("retirement-roth-phaseout-002", () => {
  const rule = get("retirement-roth-phaseout-002");
  it("fires when MFJ AGI > $246K", () => {
    expect(rule.evaluate(make_return({ agi: 300_000 }))).toHaveLength(1);
  });
  it("does not fire when below phaseout", () => {
    expect(rule.evaluate(make_return({ agi: 150_000 }))).toHaveLength(0);
  });
});

describe("retirement-401k-headroom-003", () => {
  const rule = get("retirement-401k-headroom-003");
  it("fires when code D deferral is below the 402(g) limit", () => {
    const w2: W2 = {
      ...base_w2,
      box12: [{ code: "D", amount: 10_000 }],
    };
    expect(rule.evaluate(make_return({ w2s: [w2], agi: 200_000 }))).toHaveLength(1);
  });
  it("does not fire when deferral is 0", () => {
    expect(rule.evaluate(make_return({ w2s: [base_w2], agi: 200_000 }))).toHaveLength(0);
  });
});

describe("retirement-sep-headroom-004", () => {
  const rule = get("retirement-sep-headroom-004");
  it("fires on a nonpassive K-1 with positive SE income", () => {
    const findings = rule.evaluate(
      make_return({
        k1s: [
          {
            partnership_name: "Test LP",
            partnership_ein: "99-9999999",
            partner: dummy_person,
            is_passive: false,
            ordinary_business_income: 80_000,
            rental_real_estate_income: 0,
            interest_income: 0,
            dividend_income: 0,
            guaranteed_payments: 0,
            section_179_deduction: 0,
          },
        ],
        agi: 250_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire on a passive K-1", () => {
    expect(
      rule.evaluate(
        make_return({
          k1s: [
            {
              partnership_name: "Test LP",
              partnership_ein: "99-9999999",
              partner: dummy_person,
              is_passive: true,
              ordinary_business_income: 80_000,
              rental_real_estate_income: 0,
              interest_income: 0,
              dividend_income: 0,
              guaranteed_payments: 0,
              section_179_deduction: 0,
            },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("retirement-solo-401k-005", () => {
  const rule = get("retirement-solo-401k-005");
  it("fires on a nonpassive K-1 with ordinary income", () => {
    const findings = rule.evaluate(
      make_return({
        k1s: [
          {
            partnership_name: "Test LP",
            partnership_ein: "99-9999999",
            partner: dummy_person,
            is_passive: false,
            ordinary_business_income: 80_000,
            rental_real_estate_income: 0,
            interest_income: 0,
            dividend_income: 0,
            guaranteed_payments: 0,
            section_179_deduction: 0,
          },
        ],
        agi: 250_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire without a K-1", () => {
    expect(rule.evaluate(make_return({}))).toHaveLength(0);
  });
});
