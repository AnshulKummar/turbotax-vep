/**
 * Snapshot and structural tests for the Mitchell synthetic return.
 *
 * These tests lock down the shape of the synthetic return so downstream
 * agents can rely on it, and assert every deliberate bug is still
 * present in the expected location.
 */

import { describe, expect, it } from "vitest";

import { mitchell_known_bugs, mitchell_return } from "@/data/mitchell-return";
import type { TaxReturn } from "@/contracts";

describe("Mitchell synthetic return — structural shape", () => {
  it("is typed as a TaxReturn", () => {
    // Type-level check: the assignment below must compile.
    const typed: TaxReturn = mitchell_return;
    expect(typed).toBeDefined();
  });

  it("has MFJ filing status for TY2025", () => {
    expect(mitchell_return.tax_year).toBe(2025);
    expect(mitchell_return.filing_status).toBe("mfj");
    expect(mitchell_return.taxpayer.first_name).toBe("Olivia");
    expect(mitchell_return.spouse?.first_name).toBe("Ryan");
  });

  it("reconciles to AGI 325,850", () => {
    expect(mitchell_return.agi).toBe(325_850);
  });

  it("has a prior year snapshot from Pat Daniels, CPA", () => {
    expect(mitchell_return.prior_year).toBeDefined();
    expect(mitchell_return.prior_year?.prior_preparer_name).toBe(
      "Pat Daniels, CPA",
    );
    expect(mitchell_return.prior_year?.prior_preparer_credential).toBe("CPA");
    expect(mitchell_return.prior_year?.tax_year).toBe(2024);
  });

  it("has one dependent (Emma)", () => {
    expect(mitchell_return.dependents).toHaveLength(1);
    expect(mitchell_return.dependents[0]!.first_name).toBe("Emma");
  });
});

describe("Mitchell synthetic return — wages and W-2s", () => {
  it("has two W-2s totalling $317,000 Box 1", () => {
    expect(mitchell_return.w2s).toHaveLength(2);
    const total_box1 = mitchell_return.w2s.reduce(
      (acc, w2) => acc + w2.box1_wages,
      0,
    );
    expect(total_box1).toBe(317_000);
  });

  it("Olivia's W-2 includes $48K RSU in box 12 code V", () => {
    const olivia = mitchell_return.w2s[0]!;
    expect(olivia.employee.first_name).toBe("Olivia");
    const rsu = olivia.box12.find((b) => b.code === "V");
    expect(rsu).toBeDefined();
    expect(rsu?.amount).toBe(48_000);
  });

  it("Olivia has multi-state IL + CA allocation", () => {
    const olivia = mitchell_return.w2s[0]!;
    const states = olivia.state_wages.map((s) => s.state);
    expect(states).toContain("IL");
    expect(states).toContain("CA");
  });

  it("Olivia's 401k deferral is $14,000 (code D)", () => {
    const olivia = mitchell_return.w2s[0]!;
    const deferral = olivia.box12.find((b) => b.code === "D");
    expect(deferral?.amount).toBe(14_000);
  });
});

describe("Mitchell synthetic return — 1099-B", () => {
  it("has exactly 12 lots", () => {
    const lots = mitchell_return.form_1099_b[0]!.lots;
    expect(lots).toHaveLength(12);
  });

  it("has exactly 3 RSU sell-to-cover lots with basis 0 (the double-count bug)", () => {
    const lots = mitchell_return.form_1099_b[0]!.lots;
    const rsu_bugs = lots.filter(
      (l) =>
        l.lot_id.startsWith("RSU-VEST") &&
        l.cost_basis === 0 &&
        l.date_acquired === l.date_sold,
    );
    expect(rsu_bugs).toHaveLength(3);
  });

  it("has exactly 3 wash sale lots with loss disallowed but code != W (the Code W bug)", () => {
    const lots = mitchell_return.form_1099_b[0]!.lots;
    const wash_bugs = lots.filter(
      (l) =>
        (l.wash_sale_loss_disallowed ?? 0) > 0 && l.code !== "W",
    );
    expect(wash_bugs).toHaveLength(3);
    const total_disallowed = wash_bugs.reduce(
      (acc, l) => acc + (l.wash_sale_loss_disallowed ?? 0),
      0,
    );
    expect(total_disallowed).toBe(4_180);
  });
});

describe("Mitchell synthetic return — K-1, HSA, rental", () => {
  it("has a passive K-1 with a ~$2,800 loss", () => {
    expect(mitchell_return.k1s).toHaveLength(1);
    const k1 = mitchell_return.k1s[0]!;
    expect(k1.is_passive).toBe(true);
    expect(k1.ordinary_business_income).toBe(-2_800);
    expect(k1.partnership_name).toContain("Blackwood");
  });

  it("has a Will County, IL rental with depreciation NOT split between land and building", () => {
    expect(mitchell_return.rental_properties).toHaveLength(1);
    const rental = mitchell_return.rental_properties[0]!;
    expect(rental.address.state).toBe("IL");
    expect(rental.address.county).toBe("Will");
    expect(rental.depreciation.land_value).toBeUndefined();
    expect(rental.depreciation.building_value).toBeUndefined();
    expect(rental.depreciation.purchase_price).toBe(310_000);
  });

  it("has HSA with stale line 6 allowable (TY2024 $8,300 instead of TY2025 $8,550)", () => {
    expect(mitchell_return.hsa).toHaveLength(1);
    const hsa = mitchell_return.hsa[0]!;
    expect(hsa.coverage).toBe("family");
    expect(hsa.line2_contributions).toBe(4_150);
    expect(hsa.line6_allowable).toBe(8_300);
    expect(hsa.line13_deduction).toBe(4_150);
  });
});

describe("Mitchell synthetic return — state returns", () => {
  it("has an IL resident return and a CA non-resident return, both PTET eligible", () => {
    expect(mitchell_return.state_returns).toHaveLength(2);
    const il = mitchell_return.state_returns.find((s) => s.state === "IL");
    const ca = mitchell_return.state_returns.find((s) => s.state === "CA");
    expect(il?.residency).toBe("resident");
    expect(ca?.residency).toBe("non_resident");
    expect(il?.ptet_election_eligible).toBe(true);
    expect(ca?.ptet_election_eligible).toBe(true);
  });
});

describe("Mitchell synthetic return — PII safety", () => {
  it("uses SSA-reserved 9XX-XX-XXXX SSN format for every person", () => {
    const people = [
      mitchell_return.taxpayer,
      mitchell_return.spouse!,
      ...mitchell_return.dependents,
    ];
    for (const p of people) {
      expect(p.ssn).toMatch(/^9\d{2}-\d{2}-\d{4}$/);
    }
  });

  it("uses 99- prefixed EINs for every employer and payer", () => {
    const eins = [
      ...mitchell_return.w2s.map((w) => w.employer_ein),
      ...mitchell_return.form_1099_b.map((f) => f.payer_ein),
      ...mitchell_return.form_1099_div.map((f) => f.payer_ein),
      ...mitchell_return.k1s.map((k) => k.partnership_ein),
    ];
    for (const ein of eins) {
      expect(ein).toMatch(/^99-\d{7}$/);
    }
  });
});

describe("Mitchell synthetic return — known-bugs summary", () => {
  it("exports mitchell_known_bugs covering all 8 deliberate errors", () => {
    expect(mitchell_known_bugs).toHaveLength(8);
    expect(mitchell_known_bugs).toContain("rsu-double-count");
    expect(mitchell_known_bugs).toContain("wash-sale-code-w-missing");
    expect(mitchell_known_bugs).toContain("hsa-8889-line-reconcile");
    expect(mitchell_known_bugs).toContain("rental-depreciation-no-land-split");
    expect(mitchell_known_bugs).toContain("passive-activity-loss-agi-phaseout");
    expect(mitchell_known_bugs).toContain("salt-cap-40k-mfj-ty2025");
    expect(mitchell_known_bugs).toContain("ptet-election-eligible-not-taken");
    expect(mitchell_known_bugs).toContain("retirement-headroom-401k");
  });
});

describe("Mitchell synthetic return — structural snapshot", () => {
  it("matches the inline snapshot of the top-level shape", () => {
    const shape = {
      tax_year: mitchell_return.tax_year,
      filing_status: mitchell_return.filing_status,
      case_id: mitchell_return.case_id,
      taxpayer_name: `${mitchell_return.taxpayer.first_name} ${mitchell_return.taxpayer.last_name}`,
      spouse_name: `${mitchell_return.spouse?.first_name} ${mitchell_return.spouse?.last_name}`,
      num_dependents: mitchell_return.dependents.length,
      num_w2s: mitchell_return.w2s.length,
      num_1099b_lots: mitchell_return.form_1099_b[0]!.lots.length,
      num_1099_div: mitchell_return.form_1099_div.length,
      num_k1s: mitchell_return.k1s.length,
      num_1098: mitchell_return.form_1098.length,
      num_rentals: mitchell_return.rental_properties.length,
      num_hsa: mitchell_return.hsa.length,
      num_state_returns: mitchell_return.state_returns.length,
      agi: mitchell_return.agi,
    };
    expect(shape).toMatchInlineSnapshot(`
      {
        "agi": 325850,
        "case_id": "mitchell-2025-001",
        "filing_status": "mfj",
        "num_1098": 1,
        "num_1099_div": 1,
        "num_1099b_lots": 12,
        "num_dependents": 1,
        "num_hsa": 1,
        "num_k1s": 1,
        "num_rentals": 1,
        "num_state_returns": 2,
        "num_w2s": 2,
        "spouse_name": "Ryan Mitchell",
        "tax_year": 2025,
        "taxpayer_name": "Olivia Mitchell",
      }
    `);
  });
});
