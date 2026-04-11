import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { W2 } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const w2 = (withholding: number, box12: W2["box12"] = []): W2 => ({
  employer_name: "Test Co",
  employer_ein: "99-0000001",
  employee: dummy_person,
  box1_wages: 250_000,
  box2_fed_withholding: withholding,
  box3_ss_wages: 168_000,
  box4_ss_withholding: 10_400,
  box5_medicare_wages: 250_000,
  box6_medicare_withholding: 3_600,
  box12,
  box14: [],
  state_wages: [],
});

describe("estimated-tax-safe-harbor-110-001", () => {
  const rule = get("estimated-tax-safe-harbor-110-001");
  it("fires when prior year AGI > $150K and withholding < 110% prior tax", () => {
    const findings = rule.evaluate(
      make_return({
        w2s: [w2(20_000)],
        prior_year: {
          tax_year: 2024,
          filing_status: "mfj",
          agi: 250_000,
          total_tax: 50_000,
          refund_or_owed: 0,
          filed_date: "2025-03-01",
        },
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when withholding meets 110% prior tax", () => {
    const findings = rule.evaluate(
      make_return({
        w2s: [w2(60_000)],
        prior_year: {
          tax_year: 2024,
          filing_status: "mfj",
          agi: 250_000,
          total_tax: 50_000,
          refund_or_owed: 0,
          filed_date: "2025-03-01",
        },
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("estimated-tax-safe-harbor-90-002", () => {
  const rule = get("estimated-tax-safe-harbor-90-002");
  it("fires when withholding < 90% current year tax", () => {
    expect(
      rule.evaluate(
        make_return({ w2s: [w2(20_000)], total_tax: 60_000 }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire when withholding meets 90% current year tax", () => {
    expect(
      rule.evaluate(
        make_return({ w2s: [w2(60_000)], total_tax: 60_000 }),
      ),
    ).toHaveLength(0);
  });
});

describe("estimated-tax-underpayment-003", () => {
  const rule = get("estimated-tax-underpayment-003");
  it("fires when withholding is below the required safe harbor", () => {
    expect(
      rule.evaluate(
        make_return({
          w2s: [w2(10_000)],
          total_tax: 60_000,
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 250_000,
            total_tax: 50_000,
            refund_or_owed: 0,
            filed_date: "2025-03-01",
          },
        }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire when withholding fully covers the safe harbor", () => {
    expect(
      rule.evaluate(
        make_return({
          w2s: [w2(80_000)],
          total_tax: 60_000,
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 250_000,
            total_tax: 50_000,
            refund_or_owed: 0,
            filed_date: "2025-03-01",
          },
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("estimated-tax-annualized-004", () => {
  const rule = get("estimated-tax-annualized-004");
  it("fires when there is lumpy income (RSU) and underpayment", () => {
    expect(
      rule.evaluate(
        make_return({
          w2s: [w2(10_000, [{ code: "V", amount: 50_000 }])],
          total_tax: 60_000,
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 250_000,
            total_tax: 50_000,
            refund_or_owed: 0,
            filed_date: "2025-03-01",
          },
        }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire without any lumpy income source", () => {
    expect(
      rule.evaluate(
        make_return({
          w2s: [w2(10_000)],
          total_tax: 60_000,
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 250_000,
            total_tax: 50_000,
            refund_or_owed: 0,
            filed_date: "2025-03-01",
          },
        }),
      ),
    ).toHaveLength(0);
  });
});
