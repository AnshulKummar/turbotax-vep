import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { RentalProperty } from "@/contracts";

import { make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const base_rental: RentalProperty = {
  property_id: "r1",
  address: { line1: "1", city: "Joliet", state: "IL", zip: "60432", county: "Will" },
  fair_rental_days: 200,
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
    placed_in_service: "2018-01-01",
    depreciation_method: "MACRS_27.5",
    prior_year_depreciation: 50_000,
    current_year_depreciation: 10_000,
  },
};

describe("section-121-ownership-001", () => {
  const rule = get("section-121-ownership-001");
  it("fires when rental has personal-use days and current dep is 0", () => {
    const r: RentalProperty = {
      ...base_rental,
      personal_use_days: 30,
      depreciation: {
        ...base_rental.depreciation,
        current_year_depreciation: 0,
      },
    };
    expect(rule.evaluate(make_return({ rental_properties: [r] }))).toHaveLength(1);
  });
  it("does not fire on an active rental with no personal use", () => {
    expect(rule.evaluate(make_return({ rental_properties: [base_rental] }))).toHaveLength(0);
  });
});

describe("section-121-use-002", () => {
  const rule = get("section-121-use-002");
  it("fires when there is nonqualified use on a depreciated rental", () => {
    const r: RentalProperty = {
      ...base_rental,
      personal_use_days: 60,
      fair_rental_days: 200,
    };
    expect(rule.evaluate(make_return({ rental_properties: [r] }))).toHaveLength(1);
  });
  it("does not fire when there is no personal-use time", () => {
    expect(rule.evaluate(make_return({ rental_properties: [base_rental] }))).toHaveLength(0);
  });
});

describe("section-121-partial-003", () => {
  const rule = get("section-121-partial-003");
  it("fires when prior-year notes mention a move", () => {
    expect(
      rule.evaluate(
        make_return({
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 100_000,
            total_tax: 10_000,
            refund_or_owed: 0,
            filed_date: "2025-03-01",
            notes: "Client had a job relocation to Texas.",
          },
        }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire when notes do not mention a trigger event", () => {
    expect(
      rule.evaluate(
        make_return({
          prior_year: {
            tax_year: 2024,
            filing_status: "mfj",
            agi: 100_000,
            total_tax: 10_000,
            refund_or_owed: 0,
            filed_date: "2025-03-01",
            notes: "Routine return, nothing special.",
          },
        }),
      ),
    ).toHaveLength(0);
  });
});
