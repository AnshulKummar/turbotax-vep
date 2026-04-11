import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { RentalProperty, ScheduleK1 } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const loss_rental: RentalProperty = {
  property_id: "rental-1",
  address: {
    line1: "1 Rental St",
    city: "Joliet",
    state: "IL",
    zip: "60432",
    county: "Will",
  },
  fair_rental_days: 365,
  personal_use_days: 0,
  related_party_rental: false,
  rents_received: 20_000,
  expenses: {
    advertising: 0,
    auto_travel: 0,
    cleaning_maintenance: 0,
    commissions: 0,
    insurance: 0,
    legal_professional: 0,
    management_fees: 0,
    mortgage_interest: 18_000,
    repairs: 0,
    supplies: 0,
    taxes: 5_000,
    utilities: 0,
    other: 0,
  },
  depreciation: {
    purchase_price: 300_000,
    placed_in_service: "2020-01-01",
    depreciation_method: "MACRS_27.5",
    prior_year_depreciation: 50_000,
    current_year_depreciation: 10_000,
  },
};

describe("passive-469-agi-phaseout-001", () => {
  const rule = get("passive-469-agi-phaseout-001");
  it("fires when AGI > $150K and there is a rental loss", () => {
    const findings = rule.evaluate(
      make_return({ rental_properties: [loss_rental], agi: 300_000 }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when AGI < $100K", () => {
    const findings = rule.evaluate(
      make_return({ rental_properties: [loss_rental], agi: 80_000 }),
    );
    expect(findings).toHaveLength(0);
  });
});

describe("passive-k1-nonpassive-002", () => {
  const rule = get("passive-k1-nonpassive-002");
  const base_k1: ScheduleK1 = {
    partnership_name: "Test LP",
    partnership_ein: "99-9999999",
    partner: dummy_person,
    is_passive: true,
    ordinary_business_income: -5_000,
    rental_real_estate_income: 0,
    interest_income: 0,
    dividend_income: 0,
    guaranteed_payments: 0,
    section_179_deduction: 0,
  };
  it("fires on a passive K-1 with an ordinary loss", () => {
    expect(rule.evaluate(make_return({ k1s: [base_k1], agi: 200_000 }))).toHaveLength(1);
  });
  it("does not fire on a nonpassive K-1 with a loss", () => {
    expect(
      rule.evaluate(
        make_return({ k1s: [{ ...base_k1, is_passive: false }], agi: 200_000 }),
      ),
    ).toHaveLength(0);
  });
});

describe("passive-suspended-cf-003", () => {
  const rule = get("passive-suspended-cf-003");
  it("fires when prior year PAL cf exists and current year has passive income", () => {
    const gain_rental: RentalProperty = {
      ...loss_rental,
      rents_received: 80_000,
      expenses: { ...loss_rental.expenses, mortgage_interest: 5_000, taxes: 2_000 },
      depreciation: { ...loss_rental.depreciation, current_year_depreciation: 5_000 },
    };
    const findings = rule.evaluate(
      make_return({
        rental_properties: [gain_rental],
        agi: 200_000,
        prior_year: {
          tax_year: 2024,
          filing_status: "mfj",
          agi: 200_000,
          total_tax: 30_000,
          refund_or_owed: 0,
          filed_date: "2025-03-01",
          carryforwards: { passive_activity_loss: 2_000 },
        },
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when no PAL carryforward exists", () => {
    expect(
      rule.evaluate(
        make_return({ rental_properties: [loss_rental], agi: 200_000 }),
      ),
    ).toHaveLength(0);
  });
});

describe("passive-rep-consider-004", () => {
  const rule = get("passive-rep-consider-004");
  it("fires on a rental in service for >200 days", () => {
    const findings = rule.evaluate(
      make_return({ rental_properties: [loss_rental], agi: 200_000 }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire on a rental with <200 fair rental days", () => {
    expect(
      rule.evaluate(
        make_return({
          rental_properties: [
            { ...loss_rental, fair_rental_days: 100 },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});
