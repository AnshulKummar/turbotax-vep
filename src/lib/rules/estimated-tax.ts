/**
 * Estimated tax safe harbor rules — IRC §6654, Form 2210.
 *
 * Covers:
 *   - 110% prior year safe harbor for high-income taxpayers
 *   - 90% current year safe harbor
 *   - Underpayment penalty calculation
 *   - Annualized income method (Schedule AI on Form 2210)
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import {
  agi_of,
  dollar_impact,
  make_finding_id,
  TY2025,
} from "./helpers";

function total_withholding(return_data: TaxReturn): number {
  return return_data.w2s.reduce((a, w) => a + w.box2_fed_withholding, 0);
}

// Rule 47 --------------------------------------------------------------
const safe_harbor_110_prior_year: Rule = {
  id: "estimated-tax-safe-harbor-110-001",
  name: "110% of prior year safe harbor for high-income taxpayers",
  category: "estimated_tax",
  severity: 4,
  irc_citation: "IRC §6654(d)(1)(C)",
  pub_citation: "Pub 505",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const prior = return_data.prior_year;
    if (!prior) return [];
    if (prior.agi <= TY2025.safe_harbor_high_income_agi_threshold) return [];
    const required = Math.round(
      prior.total_tax * TY2025.safe_harbor_high_income_percent,
    );
    const withheld = total_withholding(return_data);
    if (withheld >= required) return [];
    const shortfall = required - withheld;
    return [
      {
        finding_id: make_finding_id(
          "estimated-tax-safe-harbor-110-001",
          "global",
        ),
        rule_id: "estimated-tax-safe-harbor-110-001",
        category: "estimated_tax",
        severity: 4,
        irc_citation: "IRC §6654(d)(1)(C)",
        pub_citation: "Pub 505",
        summary: `Underpayment: need $${required.toLocaleString()} withheld for 110% safe harbor`,
        detail:
          "Prior year AGI exceeded $150,000, so the §6654 safe harbor requires " +
          `110% of prior year total tax ($${required.toLocaleString()}) to be paid via ` +
          `withholding or quarterly estimates. Currently $${withheld.toLocaleString()} ` +
          "is withheld; consider a Q4 estimated payment or increased withholding " +
          `of $${shortfall.toLocaleString()} to avoid the §6654 penalty.`,
        affected_lines: ["2210.part1"],
        dollar_impact: dollar_impact(Math.round(shortfall * 0.08), 0.4),
        audit_risk_delta: -0.1,
      },
    ];
  },
};

// Rule 48 --------------------------------------------------------------
const safe_harbor_90_current: Rule = {
  id: "estimated-tax-safe-harbor-90-002",
  name: "90% of current year safe harbor",
  category: "estimated_tax",
  severity: 3,
  irc_citation: "IRC §6654(d)(1)(B)",
  pub_citation: "Pub 505",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    if (!return_data.total_tax) return [];
    const required = Math.round(
      return_data.total_tax * TY2025.safe_harbor_current_year_percent,
    );
    const withheld = total_withholding(return_data);
    if (withheld >= required) return [];
    return [
      {
        finding_id: make_finding_id(
          "estimated-tax-safe-harbor-90-002",
          "global",
        ),
        rule_id: "estimated-tax-safe-harbor-90-002",
        category: "estimated_tax",
        severity: 3,
        irc_citation: "IRC §6654(d)(1)(B)",
        pub_citation: "Pub 505",
        summary: `Need $${required.toLocaleString()} withheld to hit 90% current year safe harbor`,
        detail:
          "The alternative safe harbor is 90% of current year tax. This is " +
          "usually only easier to hit than 110% prior year if income dropped.",
        affected_lines: ["2210.part1"],
        dollar_impact: dollar_impact(200, 0.5),
        audit_risk_delta: -0.05,
      },
    ];
  },
};

// Rule 49 --------------------------------------------------------------
const underpayment_penalty: Rule = {
  id: "estimated-tax-underpayment-003",
  name: "Underpayment penalty calculation under Form 2210",
  category: "estimated_tax",
  severity: 3,
  irc_citation: "IRC §6654",
  pub_citation: "Pub 505",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const prior = return_data.prior_year;
    if (!prior || !return_data.total_tax) return [];
    const withheld = total_withholding(return_data);
    const required = Math.min(
      return_data.total_tax * 0.9,
      prior.agi > 150_000 ? prior.total_tax * 1.1 : prior.total_tax,
    );
    if (withheld >= required) return [];
    const shortfall = Math.round(required - withheld);
    // Estimate: 8% annual underpayment rate on the average shortfall.
    const penalty = Math.round(shortfall * 0.08 * 0.5);
    return [
      {
        finding_id: make_finding_id(
          "estimated-tax-underpayment-003",
          "global",
        ),
        rule_id: "estimated-tax-underpayment-003",
        category: "estimated_tax",
        severity: 3,
        irc_citation: "IRC §6654",
        pub_citation: "Pub 505",
        summary: `Estimated §6654 penalty ~$${penalty.toLocaleString()}`,
        detail:
          `Based on a shortfall of $${shortfall.toLocaleString()} and the TY2025 ` +
          "applicable interest rate of ~8%, the underpayment penalty is " +
          `approximately $${penalty.toLocaleString()}. Consider the annualized income ` +
          "method (Schedule AI) if income was lumpy across quarters.",
        affected_lines: ["2210"],
        dollar_impact: dollar_impact(penalty, 0.4),
        audit_risk_delta: 0,
      },
    ];
  },
};

// Rule 50 --------------------------------------------------------------
const annualized_income_method: Rule = {
  id: "estimated-tax-annualized-004",
  name: "Annualized income method (Schedule AI) recommended",
  category: "estimated_tax",
  severity: 2,
  irc_citation: "IRC §6654(d)(2)",
  pub_citation: "Pub 505",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // Fires when there is RSU vest income (lumpy) OR a K-1 (often Q4)
    // AND an underpayment condition.
    const has_lumpy =
      return_data.w2s.some((w) =>
        w.box12.some((b) => b.code === "V"),
      ) || return_data.k1s.length > 0;
    if (!has_lumpy) return [];
    const prior = return_data.prior_year;
    if (!prior || !return_data.total_tax) return [];
    const withheld = total_withholding(return_data);
    const required =
      prior.agi > 150_000 ? prior.total_tax * 1.1 : prior.total_tax;
    if (withheld >= required) return [];
    return [
      {
        finding_id: make_finding_id(
          "estimated-tax-annualized-004",
          "global",
        ),
        rule_id: "estimated-tax-annualized-004",
        category: "estimated_tax",
        severity: 2,
        irc_citation: "IRC §6654(d)(2)",
        pub_citation: "Pub 505",
        summary: "Use Schedule AI to reduce §6654 penalty on lumpy income",
        detail:
          "Income arrived unevenly (RSU vest, K-1 distribution, or both). " +
          "Form 2210 Schedule AI lets you annualize quarterly income so early " +
          "quarters with little income do not generate a penalty.",
        affected_lines: ["2210.schAI"],
        dollar_impact: dollar_impact(400, 0.5),
        audit_risk_delta: 0,
      },
    ];
  },
};

export const estimated_tax_rules: Rule[] = [
  safe_harbor_110_prior_year,
  safe_harbor_90_current,
  underpayment_penalty,
  annualized_income_method,
];
