import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import {
  COMPLEXITY_FACTOR_LABELS,
  compute_complexity,
} from "@/lib/prework/complexity";
import type { Person, TaxReturn, W2 } from "@/contracts";

describe("compute_complexity — Mitchell return", () => {
  const result = compute_complexity(mitchell_return);

  it("scores Mitchell at 8/10", () => {
    expect(result.score).toBe(8);
  });

  it("surfaces the expected factor breakdown", () => {
    const labels = result.factors.map((f) => f.factor);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.k1);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.rsu);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.multi_state);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.rental);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.wash_sale);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.hsa);
    expect(labels).toContain(COMPLEXITY_FACTOR_LABELS.foreign_tax_credit);
  });

  it("factor contributions sum to the floor of Mitchell's additive total", () => {
    const total = result.factors.reduce((acc, f) => acc + f.contribution, 0);
    // K-1(1) + RSU(1) + multi-state(2) + rental(2) + wash sale(1) +
    // HSA(0.5) + FTC(1) = 8.5, which floors to 8/10.
    expect(total).toBeCloseTo(8.5, 5);
    expect(result.score).toBe(Math.floor(total));
  });

  it("does not flag AMT or self-employment", () => {
    const labels = result.factors.map((f) => f.factor);
    expect(labels).not.toContain(COMPLEXITY_FACTOR_LABELS.amt_exposure);
    expect(labels).not.toContain(COMPLEXITY_FACTOR_LABELS.self_employment);
  });
});

describe("compute_complexity — stripped single-W2 return", () => {
  const bob: Person = {
    id: "fixture-bob",
    first_name: "Bob",
    last_name: "Simple",
    ssn: "900-00-0001",
    dob: "1980-05-05",
  };
  const simple_w2: W2 = {
    employer_name: "Simple Co",
    employer_ein: "99-0000009",
    employee: bob,
    box1_wages: 60_000,
    box2_fed_withholding: 6_000,
    box3_ss_wages: 60_000,
    box4_ss_withholding: 3_720,
    box5_medicare_wages: 60_000,
    box6_medicare_withholding: 870,
    box12: [],
    box14: [],
    state_wages: [{ state: "IL", wages: 60_000, withholding: 2_970 }],
  };
  const simple_return: TaxReturn = {
    tax_year: 2025,
    case_id: "simple-001",
    filing_status: "single",
    taxpayer: bob,
    dependents: [],
    address: {
      line1: "100 Main St",
      city: "Chicago",
      state: "IL",
      zip: "60601",
    },
    w2s: [simple_w2],
    form_1099_b: [],
    form_1099_div: [],
    k1s: [],
    form_1098: [],
    rental_properties: [],
    hsa: [],
    state_returns: [
      {
        state: "IL",
        residency: "resident",
        state_wages: 60_000,
        state_withholding: 2_970,
      },
    ],
    agi: 60_000,
    total_tax: 6_500,
  };

  it("scores at most 2 for a single-W2 return", () => {
    const result = compute_complexity(simple_return);
    expect(result.score).toBeLessThanOrEqual(2);
    expect(result.factors.length).toBe(0);
  });
});

describe("compute_complexity — score is clamped", () => {
  it("never exceeds 10 and never drops below 1", () => {
    const result = compute_complexity(mitchell_return);
    expect(result.score).toBeGreaterThanOrEqual(1);
    expect(result.score).toBeLessThanOrEqual(10);
  });
});
