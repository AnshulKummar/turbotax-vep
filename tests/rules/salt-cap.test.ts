import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

describe("salt-cap-tcja-2025-001", () => {
  const rule = get("salt-cap-tcja-2025-001");
  it("fires on MFJ with SALT > $10K", () => {
    const findings = rule.evaluate(
      make_return({
        filing_status: "mfj",
        state_returns: [{ state: "IL", residency: "resident", state_wages: 0, state_withholding: 15_000 }],
        form_1098: [
          {
            lender_name: "X",
            borrower: dummy_person,
            property_address: { line1: "", city: "", state: "IL", zip: "" },
            mortgage_interest_paid: 0,
            outstanding_principal: 0,
            property_tax_paid: 6_000,
          },
        ],
        agi: 250_000,
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when total SALT is below $10K", () => {
    const findings = rule.evaluate(
      make_return({
        filing_status: "mfj",
        state_returns: [{ state: "IL", residency: "resident", state_wages: 0, state_withholding: 4_000 }],
        agi: 80_000,
      }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("salt-cap-ptet-interaction-002", () => {
  const rule = get("salt-cap-ptet-interaction-002");
  it("fires when K-1 present and state PTET eligible", () => {
    const findings = rule.evaluate(
      make_return({
        k1s: [
          {
            partnership_name: "X LP",
            partnership_ein: "99-0000001",
            partner: dummy_person,
            is_passive: true,
            ordinary_business_income: -2_000,
            rental_real_estate_income: 0,
            interest_income: 0,
            dividend_income: 0,
            guaranteed_payments: 0,
            section_179_deduction: 0,
          },
        ],
        state_returns: [
          { state: "IL", residency: "resident", state_wages: 0, state_withholding: 0, ptet_election_eligible: true },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire without K-1", () => {
    expect(
      rule.evaluate(
        make_return({
          state_returns: [
            { state: "IL", residency: "resident", state_wages: 0, state_withholding: 0, ptet_election_eligible: true },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("salt-prior-year-refund-003", () => {
  const rule = get("salt-prior-year-refund-003");
  it("fires when prior year had a refund", () => {
    expect(
      rule.evaluate(
        make_return({
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 100_000,
            total_tax: 10_000,
            refund_or_owed: 500,
            filed_date: "2025-03-01",
          },
        }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire when prior year owed", () => {
    expect(
      rule.evaluate(
        make_return({
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 100_000,
            total_tax: 10_000,
            refund_or_owed: -1_000,
            filed_date: "2025-03-01",
          },
        }),
      ),
    ).toHaveLength(0);
  });
});
