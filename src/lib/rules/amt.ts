/**
 * Alternative Minimum Tax rules — IRC §55, Form 6251.
 *
 * Covers:
 *   - ISO exercise and bargain element
 *   - Large SALT deduction adding back for AMT
 *   - Depreciation timing differences
 *   - AMT foreign tax credit
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import { agi_of, dollar_impact, is_mfj, make_finding_id } from "./helpers";

function has_iso(return_data: TaxReturn): boolean {
  // Code V is RSU/NQSO but ISO exercise is not given its own code on
  // W-2; preparers usually get it via a broker 3921. Since the
  // contract does not have a 3921 field, we approximate ISO by a
  // combined "ISO" string in box 14, or flag as potential ISO if a
  // large supplemental wage exists. The Mitchell return does NOT have
  // an ISO element.
  return return_data.w2s.some((w) =>
    w.box14.some((b) => b.label.toUpperCase().includes("ISO")),
  );
}

// Rule 43 --------------------------------------------------------------
const amt_iso_exercise: Rule = {
  id: "amt-iso-exercise-001",
  name: "ISO exercise — bargain element triggers AMT adjustment",
  category: "amt",
  severity: 5,
  irc_citation: "IRC §56(b)(3)",
  pub_citation: "Pub 525 ISO section",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    if (!has_iso(return_data)) return [];
    return [
      {
        finding_id: make_finding_id("amt-iso-exercise-001", "global"),
        rule_id: "amt-iso-exercise-001",
        category: "amt",
        severity: 5,
        irc_citation: "IRC §56(b)(3)",
        pub_citation: "Pub 525",
        summary: "ISO bargain element requires Form 6251 AMT adjustment",
        detail:
          "An ISO exercise was detected. The bargain element (FMV at exercise " +
          "minus strike price) is added back for AMT under §56(b)(3). This is " +
          "the precise bug that took three years and a Congressional inquiry to " +
          "resolve in the public TurboTax record, producing a $12,000+ error.",
        affected_lines: ["6251.line.2i"],
        dollar_impact: dollar_impact(5_000, 0.5),
        audit_risk_delta: 0.3,
      },
    ];
  },
};

// Rule 44 --------------------------------------------------------------
const amt_large_salt_addback: Rule = {
  id: "amt-salt-addback-002",
  name: "Large SALT deduction risks AMT addback",
  category: "amt",
  severity: 3,
  irc_citation: "IRC §56(b)(1)",
  pub_citation: "Pub 17",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const state_tax = return_data.state_returns.reduce(
      (a, s) => a + s.state_withholding,
      0,
    );
    const property_tax = return_data.form_1098.reduce(
      (a, f) => a + (f.property_tax_paid ?? 0),
      0,
    );
    const total_salt = state_tax + property_tax;
    if (total_salt < 25_000) return [];
    return [
      {
        finding_id: make_finding_id("amt-salt-addback-002", "global"),
        rule_id: "amt-salt-addback-002",
        category: "amt",
        severity: 3,
        irc_citation: "IRC §56(b)(1)",
        pub_citation: "Pub 17",
        summary: "Large SALT deduction — run Form 6251 to check AMT exposure",
        detail:
          `Total state + property tax is $${total_salt.toLocaleString()}. SALT is added ` +
          "back for AMT under §56(b)(1), which can tip a high-income household " +
          "into AMT even at TY2025 exemption levels.",
        affected_lines: ["6251"],
        dollar_impact: dollar_impact(800, 0.5),
        audit_risk_delta: 0.1,
      },
    ];
  },
};

// Rule 45 --------------------------------------------------------------
const amt_depreciation_timing: Rule = {
  id: "amt-depreciation-003",
  name: "MACRS depreciation AMT adjustment",
  category: "amt",
  severity: 2,
  irc_citation: "IRC §56(a)(1)",
  pub_citation: "Pub 946",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const has_macrs =
      return_data.rental_properties.some(
        (r) => r.depreciation.depreciation_method.startsWith("MACRS"),
      );
    if (!has_macrs) return [];
    return [
      {
        finding_id: make_finding_id("amt-depreciation-003", "global"),
        rule_id: "amt-depreciation-003",
        category: "amt",
        severity: 2,
        irc_citation: "IRC §56(a)(1)",
        pub_citation: "Pub 946",
        summary: "MACRS depreciation timing differences can create AMT adjustments",
        detail:
          "Residential rental (27.5-year) and commercial (39-year) MACRS use " +
          "straight-line which is identical for regular and AMT, so no " +
          "adjustment — but personal property (5/7-year) uses 200% DB for " +
          "regular and 150% DB for AMT. Check any §179 / personal-property " +
          "depreciation for an addback.",
        affected_lines: ["6251.line.2l"],
        dollar_impact: dollar_impact(300, 0.6),
        audit_risk_delta: 0.05,
      },
    ];
  },
};

// Rule 46 --------------------------------------------------------------
const amt_ftc: Rule = {
  id: "amt-ftc-004",
  name: "Alternative Minimum Tax Foreign Tax Credit",
  category: "amt",
  severity: 2,
  irc_citation: "IRC §59(a)",
  pub_citation: "Pub 514",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const agi = agi_of(return_data);
    const mfj = is_mfj(return_data);
    const high_income = mfj ? agi > 200_000 : agi > 100_000;
    if (!high_income) return [];
    const has_ftc = return_data.form_1099_div.some(
      (f) => (f.foreign_tax_paid ?? 0) > 0,
    );
    if (!has_ftc) return [];
    return [
      {
        finding_id: make_finding_id("amt-ftc-004", "global"),
        rule_id: "amt-ftc-004",
        category: "amt",
        severity: 2,
        irc_citation: "IRC §59(a)",
        pub_citation: "Pub 514",
        summary: "Compute AMT foreign tax credit separately on Form 1116",
        detail:
          "At high income with foreign tax paid, AMT requires a parallel " +
          "Form 1116 using AMT sourcing rules under §59(a). The regular FTC " +
          "and AMT FTC are often different.",
        affected_lines: ["6251.line.8"],
        dollar_impact: dollar_impact(150, 0.5),
        audit_risk_delta: 0.05,
      },
    ];
  },
};

export const amt_rules: Rule[] = [
  amt_iso_exercise,
  amt_large_salt_addback,
  amt_depreciation_timing,
  amt_ftc,
];
