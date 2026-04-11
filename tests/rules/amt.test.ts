import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { Form1098, RentalProperty, W2 } from "@/contracts";

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

describe("amt-iso-exercise-001", () => {
  const rule = get("amt-iso-exercise-001");
  it("fires when a W-2 box 14 label contains ISO", () => {
    const w2: W2 = {
      ...base_w2,
      box14: [{ label: "ISO BARGAIN", amount: 30_000 }],
    };
    expect(rule.evaluate(make_return({ w2s: [w2] }))).toHaveLength(1);
  });
  it("does not fire without ISO in box 14", () => {
    expect(rule.evaluate(make_return({ w2s: [base_w2] }))).toHaveLength(0);
  });
});

describe("amt-salt-addback-002", () => {
  const rule = get("amt-salt-addback-002");
  it("fires when total SALT exceeds $25K", () => {
    const form1098: Form1098 = {
      lender_name: "Test",
      borrower: dummy_person,
      property_address: { line1: "", city: "", state: "IL", zip: "" },
      mortgage_interest_paid: 0,
      outstanding_principal: 0,
      property_tax_paid: 15_000,
    };
    expect(
      rule.evaluate(
        make_return({
          state_returns: [
            {
              state: "IL",
              residency: "resident",
              state_wages: 0,
              state_withholding: 15_000,
            },
          ],
          form_1098: [form1098],
        }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire at low SALT", () => {
    expect(
      rule.evaluate(
        make_return({
          state_returns: [
            {
              state: "IL",
              residency: "resident",
              state_wages: 0,
              state_withholding: 5_000,
            },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("amt-depreciation-003", () => {
  const rule = get("amt-depreciation-003");
  const rental: RentalProperty = {
    property_id: "r1",
    address: { line1: "1", city: "Joliet", state: "IL", zip: "60432", county: "Will" },
    fair_rental_days: 365,
    personal_use_days: 0,
    related_party_rental: false,
    rents_received: 0,
    expenses: {
      advertising: 0,
      auto_travel: 0,
      cleaning_maintenance: 0,
      commissions: 0,
      insurance: 0,
      legal_professional: 0,
      management_fees: 0,
      mortgage_interest: 0,
      repairs: 0,
      supplies: 0,
      taxes: 0,
      utilities: 0,
      other: 0,
    },
    depreciation: {
      purchase_price: 300_000,
      placed_in_service: "2020-01-01",
      depreciation_method: "MACRS_27.5",
      prior_year_depreciation: 40_000,
      current_year_depreciation: 10_000,
    },
  };
  it("fires when MACRS rental exists", () => {
    expect(rule.evaluate(make_return({ rental_properties: [rental] }))).toHaveLength(1);
  });
  it("does not fire when no rental exists", () => {
    expect(rule.evaluate(make_return({}))).toHaveLength(0);
  });
});

describe("amt-ftc-004", () => {
  const rule = get("amt-ftc-004");
  it("fires at high income with foreign tax paid", () => {
    expect(
      rule.evaluate(
        make_return({
          agi: 300_000,
          form_1099_div: [
            {
              payer_name: "Broker",
              payer_ein: "99-0000001",
              recipient: dummy_person,
              ordinary_dividends: 2_000,
              qualified_dividends: 1_500,
              capital_gain_distributions: 0,
              foreign_tax_paid: 800,
            },
          ],
        }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire at low income", () => {
    expect(
      rule.evaluate(
        make_return({
          agi: 50_000,
          form_1099_div: [
            {
              payer_name: "Broker",
              payer_ein: "99-0000001",
              recipient: dummy_person,
              ordinary_dividends: 1_000,
              qualified_dividends: 800,
              capital_gain_distributions: 0,
              foreign_tax_paid: 100,
            },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});
