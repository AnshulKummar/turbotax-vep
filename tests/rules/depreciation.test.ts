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
    placed_in_service: "2021-01-01",
    depreciation_method: "MACRS_27.5",
    prior_year_depreciation: 40_000,
    current_year_depreciation: 10_909,
  },
};

describe("depreciation-land-split-001", () => {
  const rule = get("depreciation-land-split-001");
  it("fires when land_value and building_value are undefined", () => {
    expect(rule.evaluate(make_return({ rental_properties: [base_rental], agi: 200_000 }))).toHaveLength(1);
  });
  it("does not fire when land_value and building_value are both set", () => {
    const with_split: RentalProperty = {
      ...base_rental,
      depreciation: {
        ...base_rental.depreciation,
        land_value: 75_000,
        building_value: 225_000,
      },
    };
    expect(rule.evaluate(make_return({ rental_properties: [with_split] }))).toHaveLength(0);
  });
});

describe("depreciation-qip-002", () => {
  const rule = get("depreciation-qip-002");
  it("fires on MACRS_39 rentals", () => {
    const r: RentalProperty = {
      ...base_rental,
      depreciation: {
        ...base_rental.depreciation,
        depreciation_method: "MACRS_39",
      },
    };
    expect(rule.evaluate(make_return({ rental_properties: [r] }))).toHaveLength(1);
  });
  it("does not fire on MACRS_27.5 rentals", () => {
    expect(rule.evaluate(make_return({ rental_properties: [base_rental] }))).toHaveLength(0);
  });
});

describe("depreciation-bonus-phase-down-003", () => {
  const rule = get("depreciation-bonus-phase-down-003");
  it("fires when dep ratio > 15%", () => {
    const r: RentalProperty = {
      ...base_rental,
      depreciation: {
        ...base_rental.depreciation,
        purchase_price: 100_000,
        current_year_depreciation: 30_000, // 30% ratio
      },
    };
    expect(rule.evaluate(make_return({ rental_properties: [r] }))).toHaveLength(1);
  });
  it("does not fire at normal ratio", () => {
    expect(rule.evaluate(make_return({ rental_properties: [base_rental] }))).toHaveLength(0);
  });
});

describe("depreciation-recapture-1250-004", () => {
  const rule = get("depreciation-recapture-1250-004");
  it("fires when prior_year dep > 0 and current_year dep = 0", () => {
    const r: RentalProperty = {
      ...base_rental,
      depreciation: {
        ...base_rental.depreciation,
        prior_year_depreciation: 40_000,
        current_year_depreciation: 0,
      },
    };
    expect(rule.evaluate(make_return({ rental_properties: [r] }))).toHaveLength(1);
  });
  it("does not fire on an active rental", () => {
    expect(rule.evaluate(make_return({ rental_properties: [base_rental] }))).toHaveLength(0);
  });
});
