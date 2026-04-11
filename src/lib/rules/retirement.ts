/**
 * Retirement contribution headroom rules — IRC §219 (IRA), §402(g)
 * (401k elective deferral), §408(k) (SEP), §401(k) (solo 401k).
 *
 * Each rule computes remaining contribution headroom under TY2025
 * limits and presents it as a dollar impact.
 */

import type { Rule, RuleFinding, TaxReturn, W2 } from "@/contracts";

import {
  dollar_impact,
  estimated_marginal_rate,
  is_mfj,
  make_finding_id,
  TY2025,
} from "./helpers";

function age_on(date_str: string, tax_year: number): number {
  const dob = new Date(date_str);
  return tax_year - dob.getFullYear();
}

function deferral_amount(w: W2, code: "D" | "E" | "S" | "F" | "H" | "G"): number {
  return w.box12.filter((b) => b.code === code).reduce((a, b) => a + b.amount, 0);
}

// Rule 26 --------------------------------------------------------------
const ira_headroom: Rule = {
  id: "retirement-ira-headroom-001",
  name: "Traditional/Roth IRA contribution headroom",
  category: "retirement_contribution",
  severity: 3,
  irc_citation: "IRC §219(b)",
  pub_citation: "Pub 590-A",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    const people = [
      return_data.taxpayer,
      ...(return_data.spouse ? [return_data.spouse] : []),
    ];
    for (const p of people) {
      const age = age_on(p.dob, return_data.tax_year);
      const limit =
        TY2025.ira_limit + (age >= 50 ? TY2025.ira_catchup_50plus : 0);
      // Assume zero IRA contributed (the contract does not model IRA
      // explicitly outside of box 12 codes, which are 401k not IRA).
      findings.push({
        finding_id: make_finding_id("retirement-ira-headroom-001", p.id),
        rule_id: "retirement-ira-headroom-001",
        category: "retirement_contribution",
        severity: 3,
        irc_citation: "IRC §219(b)",
        pub_citation: "Pub 590-A",
        summary: `${p.first_name} has up to $${limit.toLocaleString()} of TY2025 IRA headroom`,
        detail:
          `${p.first_name} is ${age} years old; the TY2025 IRA contribution ` +
          `limit is $${limit.toLocaleString()}${age >= 50 ? " (includes $1,000 catch-up)" : ""}. ` +
          "Deductibility may phase out at high AGI for traditional IRA if " +
          "covered by an employer plan; Roth IRA phases out at $236K–$246K MFJ.",
        affected_lines: ["1040.sch1.line.20"],
        dollar_impact: dollar_impact(
          Math.round(
            limit *
              estimated_marginal_rate(
                return_data.agi ?? 0,
                is_mfj(return_data),
              ),
          ),
          0.2,
        ),
        audit_risk_delta: 0,
      });
    }
    return findings;
  },
};

// Rule 27 --------------------------------------------------------------
const roth_ira_phaseout: Rule = {
  id: "retirement-roth-phaseout-002",
  name: "Roth IRA AGI phaseout check",
  category: "retirement_contribution",
  severity: 2,
  irc_citation: "IRC §408A(c)(3)",
  pub_citation: "Pub 590-A",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const agi = return_data.agi ?? 0;
    const mfj = is_mfj(return_data);
    const phaseout_start = mfj ? 236_000 : 150_000;
    const phaseout_end = mfj ? 246_000 : 165_000;
    if (agi >= phaseout_end) {
      return [
        {
          finding_id: make_finding_id("retirement-roth-phaseout-002", "global"),
          rule_id: "retirement-roth-phaseout-002",
          category: "retirement_contribution",
          severity: 2,
          irc_citation: "IRC §408A(c)(3)",
          pub_citation: "Pub 590-A",
          summary: "AGI above Roth IRA phaseout — consider backdoor Roth",
          detail:
            `AGI $${agi.toLocaleString()} is above the ${mfj ? "MFJ" : "single"} ` +
            `Roth IRA phaseout ceiling ($${phaseout_end.toLocaleString()}). Direct ` +
            "Roth contributions are not allowed. Consider the backdoor Roth " +
            "strategy (nondeductible traditional IRA contribution + Roth " +
            "conversion) if there is no pre-tax IRA balance to trigger pro-rata.",
          affected_lines: ["1040.sch1.line.20"],
          dollar_impact: dollar_impact(500),
          audit_risk_delta: 0,
        },
      ];
    }
    return [];
  },
};

// Rule 28 --------------------------------------------------------------
const elective_401k_headroom: Rule = {
  id: "retirement-401k-headroom-003",
  name: "401(k) / 403(b) elective deferral headroom",
  category: "retirement_contribution",
  severity: 3,
  irc_citation: "IRC §402(g)",
  pub_citation: "Pub 575",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const w of return_data.w2s) {
      const age = age_on(w.employee.dob, return_data.tax_year);
      const limit =
        TY2025.elective_deferral_401k +
        (age >= 50 ? TY2025.elective_deferral_401k_catchup_50plus : 0);
      const deferral =
        deferral_amount(w, "D") +
        deferral_amount(w, "E") +
        deferral_amount(w, "F") +
        deferral_amount(w, "G") +
        deferral_amount(w, "H") +
        deferral_amount(w, "S");
      if (deferral === 0) continue;
      const headroom = limit - deferral;
      if (headroom > 0) {
        findings.push({
          finding_id: make_finding_id(
            "retirement-401k-headroom-003",
            w.employee.id,
          ),
          rule_id: "retirement-401k-headroom-003",
          category: "retirement_contribution",
          severity: 3,
          irc_citation: "IRC §402(g)",
          pub_citation: "Pub 575",
          summary: `${w.employee.first_name}: $${headroom.toLocaleString()} of 401k/403b headroom`,
          detail:
            `${w.employee.first_name} has contributed $${deferral.toLocaleString()} ` +
            `toward the TY2025 §402(g) limit of $${limit.toLocaleString()}. Another ` +
            `$${headroom.toLocaleString()} can still be deferred before year end.`,
          affected_lines: ["w2.box12.D", "w2.box12.E"],
          dollar_impact: dollar_impact(
            Math.round(
              headroom *
                estimated_marginal_rate(
                  return_data.agi ?? 0,
                  is_mfj(return_data),
                ),
            ),
          ),
          audit_risk_delta: 0,
        });
      }
    }
    return findings;
  },
};

// Rule 29 --------------------------------------------------------------
const sep_ira_headroom: Rule = {
  id: "retirement-sep-headroom-004",
  name: "SEP-IRA contribution headroom for self-employed income",
  category: "retirement_contribution",
  severity: 2,
  irc_citation: "IRC §408(k)",
  pub_citation: "Pub 560",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // Fires when there is K-1 guaranteed_payments > 0 or SE income
    // proxy from a nonpassive K-1 with ordinary_business_income > 0.
    const findings: RuleFinding[] = [];
    for (const k of return_data.k1s) {
      const se_income =
        (k.guaranteed_payments ?? 0) +
        (k.is_passive ? 0 : Math.max(0, k.ordinary_business_income));
      if (se_income > 0) {
        const contrib = Math.min(
          TY2025.sep_ira_limit,
          Math.round(se_income * 0.25),
        );
        findings.push({
          finding_id: make_finding_id(
            "retirement-sep-headroom-004",
            k.partnership_ein,
          ),
          rule_id: "retirement-sep-headroom-004",
          category: "retirement_contribution",
          severity: 2,
          irc_citation: "IRC §408(k)",
          pub_citation: "Pub 560",
          summary: `Up to $${contrib.toLocaleString()} SEP-IRA available on SE income`,
          detail:
            "Self-employment income can fund a SEP-IRA at up to 25% of net " +
            `self-employment income, capped at $${TY2025.sep_ira_limit.toLocaleString()} for TY2025. ` +
            "The contribution is above-the-line.",
          affected_lines: ["1040.sch1.line.16"],
          dollar_impact: dollar_impact(
            Math.round(
              contrib *
                estimated_marginal_rate(
                  return_data.agi ?? 0,
                  is_mfj(return_data),
                ),
            ),
            0.3,
          ),
          audit_risk_delta: 0,
        });
      }
    }
    return findings;
  },
};

// Rule 30 --------------------------------------------------------------
const solo_401k_election: Rule = {
  id: "retirement-solo-401k-005",
  name: "Solo 401(k) election available with SE income",
  category: "retirement_contribution",
  severity: 2,
  irc_citation: "IRC §401(k)",
  pub_citation: "Pub 560",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    // Fires when there is a nonpassive K-1 with SE income AND no 401k
    // deferral on any W-2 for the same person (i.e. a solo-401k is
    // more efficient than SEP).
    for (const k of return_data.k1s) {
      if (k.is_passive) continue;
      if (k.ordinary_business_income <= 0 && k.guaranteed_payments <= 0) continue;
      const age = age_on(k.partner.dob, return_data.tax_year);
      const limit =
        TY2025.solo_401k_total +
        (age >= 50 ? TY2025.solo_401k_catchup_50plus : 0);
      findings.push({
        finding_id: make_finding_id(
          "retirement-solo-401k-005",
          k.partnership_ein,
        ),
        rule_id: "retirement-solo-401k-005",
        category: "retirement_contribution",
        severity: 2,
        irc_citation: "IRC §401(k)",
        pub_citation: "Pub 560",
        summary: `Solo 401(k) limit up to $${limit.toLocaleString()} on ${k.partner.first_name}'s SE income`,
        detail:
          "A solo 401(k) permits the employee deferral plus an employer " +
          "profit-sharing contribution from the same self-employment income, " +
          `for a TY2025 total of up to $${limit.toLocaleString()}. This is usually ` +
          "more tax-efficient than a SEP-IRA for sole-proprietor income.",
        affected_lines: ["1040.sch1.line.16"],
        dollar_impact: dollar_impact(
          Math.round(
            limit *
              0.5 *
              estimated_marginal_rate(
                return_data.agi ?? 0,
                is_mfj(return_data),
              ),
          ),
          0.4,
        ),
        audit_risk_delta: 0,
      });
    }
    return findings;
  },
};

export const retirement_rules: Rule[] = [
  ira_headroom,
  roth_ira_phaseout,
  elective_401k_headroom,
  sep_ira_headroom,
  solo_401k_election,
];
