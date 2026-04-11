/**
 * Foreign tax credit rules — IRC §901, Form 1116, IRS Pub 514.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import { dollar_impact, is_mfj, make_finding_id, TY2025 } from "./helpers";

function total_foreign_tax(return_data: TaxReturn): number {
  return return_data.form_1099_div.reduce(
    (acc, f) => acc + (f.foreign_tax_paid ?? 0),
    0,
  );
}

// Rule 20 --------------------------------------------------------------
const ftc_form_1116_required: Rule = {
  id: "ftc-form-1116-required-001",
  name: "Foreign tax exceeds $300/$600 election threshold — Form 1116 required",
  category: "foreign_tax_credit",
  severity: 3,
  irc_citation: "IRC §904(k)",
  pub_citation: "IRS Pub 514",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const total = total_foreign_tax(return_data);
    if (total <= 0) return [];
    const threshold = is_mfj(return_data)
      ? TY2025.ftc_election_threshold_mfj
      : TY2025.ftc_election_threshold_single;
    if (total > threshold) {
      return [
        {
          finding_id: make_finding_id("ftc-form-1116-required-001", "global"),
          rule_id: "ftc-form-1116-required-001",
          category: "foreign_tax_credit",
          severity: 3,
          irc_citation: "IRC §904(k)",
          pub_citation: "IRS Pub 514",
          summary: `Foreign tax $${total} exceeds $${threshold} — Form 1116 required`,
          detail:
            "Foreign tax paid exceeds the election threshold for claiming the credit " +
            "without Form 1116. Form 1116 is required and the credit may be limited.",
          affected_lines: ["1040.line.1", "1116"],
          dollar_impact: dollar_impact(Math.round(total * 0.1), 0.5),
          audit_risk_delta: 0.1,
        },
      ];
    }
    return [];
  },
};

// Rule 21 --------------------------------------------------------------
const ftc_small_election_available: Rule = {
  id: "ftc-small-election-002",
  name: "Foreign tax under threshold — claim without Form 1116",
  category: "foreign_tax_credit",
  severity: 2,
  irc_citation: "IRC §904(k)",
  pub_citation: "IRS Pub 514",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const total = total_foreign_tax(return_data);
    if (total <= 0) return [];
    const threshold = is_mfj(return_data)
      ? TY2025.ftc_election_threshold_mfj
      : TY2025.ftc_election_threshold_single;
    if (total <= threshold) {
      return [
        {
          finding_id: make_finding_id("ftc-small-election-002", "global"),
          rule_id: "ftc-small-election-002",
          category: "foreign_tax_credit",
          severity: 2,
          irc_citation: "IRC §904(k)",
          pub_citation: "IRS Pub 514",
          summary: `Foreign tax $${total} can be claimed directly without Form 1116`,
          detail:
            `Total foreign tax paid is $${total}, under the $${threshold} election ` +
            "threshold. Claim the credit on Schedule 3 without Form 1116 to save " +
            "filing complexity.",
          affected_lines: ["1040.sch3.line.1"],
          dollar_impact: dollar_impact(total, 0.1),
          audit_risk_delta: -0.05,
        },
      ];
    }
    return [];
  },
};

// Rule 22 --------------------------------------------------------------
const ftc_country_by_country: Rule = {
  id: "ftc-country-by-country-003",
  name: "Form 1116 category-by-category allocation",
  category: "foreign_tax_credit",
  severity: 2,
  irc_citation: "IRC §904(d)",
  pub_citation: "IRS Pub 514",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const total = total_foreign_tax(return_data);
    if (total <= 0) return [];
    const threshold = is_mfj(return_data)
      ? TY2025.ftc_election_threshold_mfj
      : TY2025.ftc_election_threshold_single;
    if (total > threshold && return_data.form_1099_div.length > 1) {
      return [
        {
          finding_id: make_finding_id("ftc-country-by-country-003", "global"),
          rule_id: "ftc-country-by-country-003",
          category: "foreign_tax_credit",
          severity: 2,
          irc_citation: "IRC §904(d)",
          pub_citation: "IRS Pub 514",
          summary: "Multiple 1099-DIV with foreign tax — allocate per §904(d) category",
          detail:
            "When multiple brokers report foreign tax, Form 1116 requires " +
            "category-by-category allocation. Mutual fund foreign tax is normally " +
            "passive category.",
          affected_lines: ["1116.part1"],
          dollar_impact: dollar_impact(200, 0.5),
          audit_risk_delta: 0.1,
        },
      ];
    }
    return [];
  },
};

export const foreign_tax_credit_rules: Rule[] = [
  ftc_form_1116_required,
  ftc_small_election_available,
  ftc_country_by_country,
];
