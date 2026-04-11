/**
 * Credit eligibility rules — CTC, EITC, AOTC, LLC, Dependent Care
 * Credit, and Premium Tax Credit reconciliation.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import {
  agi_of,
  dollar_impact,
  is_mfj,
  make_finding_id,
  TY2025,
} from "./helpers";

function age_on(date_str: string, tax_year: number): number {
  const dob = new Date(date_str);
  return tax_year - dob.getFullYear();
}

// Rule 37 --------------------------------------------------------------
const ctc_eligibility: Rule = {
  id: "credit-ctc-001",
  name: "Child Tax Credit phaseout and eligibility",
  category: "credit_eligibility",
  severity: 3,
  irc_citation: "IRC §24",
  pub_citation: "Pub 972",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const qualifying = return_data.dependents.filter(
      (d) => age_on(d.dob, return_data.tax_year) < 17,
    );
    if (qualifying.length === 0) return [];
    const agi = agi_of(return_data);
    const phaseout_start = is_mfj(return_data)
      ? TY2025.ctc_phaseout_start_mfj
      : TY2025.ctc_phaseout_start_other;
    if (agi <= phaseout_start) {
      return [
        {
          finding_id: make_finding_id("credit-ctc-001", "global"),
          rule_id: "credit-ctc-001",
          category: "credit_eligibility",
          severity: 3,
          irc_citation: "IRC §24",
          pub_citation: "Pub 972",
          summary: `CTC: ${qualifying.length} × $${TY2025.ctc_amount_per_child_under17.toLocaleString()} = $${(qualifying.length * TY2025.ctc_amount_per_child_under17).toLocaleString()}`,
          detail:
            `${qualifying.length} qualifying child/ren under age 17. AGI is below ` +
            "the phaseout start, so the full $2,000 per child is available.",
          affected_lines: ["1040.line.19"],
          dollar_impact: dollar_impact(
            qualifying.length * TY2025.ctc_amount_per_child_under17,
          ),
          audit_risk_delta: 0,
        },
      ];
    }
    // Phaseout: credit reduces by $50 per $1,000 of AGI above start
    const phaseout_excess = agi - phaseout_start;
    const reduction = Math.ceil(phaseout_excess / 1_000) * 50;
    const raw = qualifying.length * TY2025.ctc_amount_per_child_under17;
    const available = Math.max(0, raw - reduction);
    return [
      {
        finding_id: make_finding_id("credit-ctc-001", "global"),
        rule_id: "credit-ctc-001",
        category: "credit_eligibility",
        severity: 3,
        irc_citation: "IRC §24",
        pub_citation: "Pub 972",
        summary: `CTC phased to $${available.toLocaleString()} at AGI $${agi.toLocaleString()}`,
        detail:
          "Child Tax Credit phases out $50 per $1,000 of AGI above the " +
          `phaseout start ($${phaseout_start.toLocaleString()} ${is_mfj(return_data) ? "MFJ" : "single"}).`,
        affected_lines: ["1040.line.19"],
        dollar_impact: dollar_impact(available),
        audit_risk_delta: 0,
      },
    ];
  },
};

// Rule 38 --------------------------------------------------------------
const eitc_agi_cap: Rule = {
  id: "credit-eitc-002",
  name: "EITC AGI cap eligibility",
  category: "credit_eligibility",
  severity: 2,
  irc_citation: "IRC §32",
  pub_citation: "Pub 596",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const agi = agi_of(return_data);
    if (agi >= TY2025.eitc_agi_limit_mfj_3plus_children) return [];
    return [
      {
        finding_id: make_finding_id("credit-eitc-002", "global"),
        rule_id: "credit-eitc-002",
        category: "credit_eligibility",
        severity: 2,
        irc_citation: "IRC §32",
        pub_citation: "Pub 596",
        summary: "AGI below EITC cap — verify EITC eligibility",
        detail:
          "AGI is below the EITC ceiling. Verify residency, earned income, " +
          "investment income (< $11,950 for TY2025), and qualifying-child tests.",
        affected_lines: ["1040.line.27"],
        dollar_impact: dollar_impact(1_000, 0.5),
        audit_risk_delta: 0.15,
      },
    ];
  },
};

// Rule 39 --------------------------------------------------------------
const aotc_eligibility: Rule = {
  id: "credit-aotc-003",
  name: "American Opportunity Tax Credit eligibility",
  category: "credit_eligibility",
  severity: 2,
  irc_citation: "IRC §25A(i)",
  pub_citation: "Pub 970",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const agi = agi_of(return_data);
    const ceiling = is_mfj(return_data)
      ? TY2025.aotc_phaseout_end_mfj
      : 90_000;
    if (agi >= ceiling) return [];
    // Fires if any dependent is age 17-23 (college age proxy).
    const college = return_data.dependents.filter((d) => {
      const age = age_on(d.dob, return_data.tax_year);
      return age >= 17 && age <= 23;
    });
    if (college.length === 0) return [];
    return [
      {
        finding_id: make_finding_id("credit-aotc-003", "global"),
        rule_id: "credit-aotc-003",
        category: "credit_eligibility",
        severity: 2,
        irc_citation: "IRC §25A(i)",
        pub_citation: "Pub 970",
        summary: "AOTC available for college-age dependent",
        detail:
          "A dependent is within typical undergraduate age. The AOTC is up to " +
          "$2,500 per student, 40% refundable, for the first four years of " +
          "post-secondary education.",
        affected_lines: ["8863"],
        dollar_impact: dollar_impact(2_500, 0.2),
        audit_risk_delta: 0.05,
      },
    ];
  },
};

// Rule 40 --------------------------------------------------------------
const llc_eligibility: Rule = {
  id: "credit-llc-004",
  name: "Lifetime Learning Credit eligibility",
  category: "credit_eligibility",
  severity: 2,
  irc_citation: "IRC §25A(c)",
  pub_citation: "Pub 970",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const agi = agi_of(return_data);
    const ceiling = is_mfj(return_data)
      ? TY2025.llc_phaseout_end_mfj
      : 90_000;
    if (agi >= ceiling) return [];
    return [
      {
        finding_id: make_finding_id("credit-llc-004", "global"),
        rule_id: "credit-llc-004",
        category: "credit_eligibility",
        severity: 2,
        irc_citation: "IRC §25A(c)",
        pub_citation: "Pub 970",
        summary: "LLC available for qualified education expenses",
        detail:
          "AGI is below the LLC phaseout. Up to $2,000 per return (20% of " +
          "first $10,000 of qualified education expenses). Non-refundable.",
        affected_lines: ["8863"],
        dollar_impact: dollar_impact(2_000, 0.4),
        audit_risk_delta: 0.05,
      },
    ];
  },
};

// Rule 41 --------------------------------------------------------------
const dependent_care_credit: Rule = {
  id: "credit-dependent-care-005",
  name: "Dependent Care Credit eligibility",
  category: "credit_eligibility",
  severity: 2,
  irc_citation: "IRC §21",
  pub_citation: "Pub 503",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const under_13 = return_data.dependents.filter(
      (d) => age_on(d.dob, return_data.tax_year) < 13,
    );
    if (under_13.length === 0) return [];
    // Both spouses must have earned income
    if (is_mfj(return_data)) {
      const both_earned = return_data.w2s.length >= 2;
      if (!both_earned) return [];
    }
    const max_qualified_expenses = under_13.length >= 2 ? 6_000 : 3_000;
    // Credit rate at high AGI is 20%
    return [
      {
        finding_id: make_finding_id("credit-dependent-care-005", "global"),
        rule_id: "credit-dependent-care-005",
        category: "credit_eligibility",
        severity: 2,
        irc_citation: "IRC §21",
        pub_citation: "Pub 503",
        summary: "Dependent care credit available (20% at high AGI)",
        detail:
          `Up to $${max_qualified_expenses.toLocaleString()} of qualified dependent-care ` +
          "expenses can support the credit, though at AGI > $43K the rate is 20%. " +
          "Requires both spouses to have earned income in MFJ.",
        affected_lines: ["2441", "1040.sch3.line.6"],
        dollar_impact: dollar_impact(Math.round(max_qualified_expenses * 0.2), 0.3),
        audit_risk_delta: 0.05,
      },
    ];
  },
};

// Rule 42 --------------------------------------------------------------
const ptc_reconciliation: Rule = {
  id: "credit-ptc-reconcile-006",
  name: "Premium Tax Credit reconciliation (Form 8962)",
  category: "credit_eligibility",
  severity: 3,
  irc_citation: "IRC §36B",
  pub_citation: "Pub 974",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // We do not model PTC or 1095-A on the contract; fire when AGI
    // looks low enough that PTC might be relevant and the return has
    // no W-2 with employer-sponsored coverage evidence. For the
    // synthetic Mitchell return, AGI is high and W-2s exist, so this
    // does NOT fire.
    const agi = agi_of(return_data);
    if (agi > 80_000) return [];
    if (return_data.w2s.length > 0) return [];
    return [
      {
        finding_id: make_finding_id("credit-ptc-reconcile-006", "global"),
        rule_id: "credit-ptc-reconcile-006",
        category: "credit_eligibility",
        severity: 3,
        irc_citation: "IRC §36B",
        pub_citation: "Pub 974",
        summary: "Request Form 1095-A to reconcile Premium Tax Credit",
        detail:
          "Return has low AGI and no W-2 employer coverage. Taxpayer may have " +
          "Marketplace coverage with advance PTC that must be reconciled on " +
          "Form 8962.",
        affected_lines: ["8962"],
        dollar_impact: dollar_impact(1_500, 0.5),
        audit_risk_delta: 0.2,
      },
    ];
  },
};

export const credit_rules: Rule[] = [
  ctc_eligibility,
  eitc_agi_cap,
  aotc_eligibility,
  llc_eligibility,
  dependent_care_credit,
  ptc_reconciliation,
];
