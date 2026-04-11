/**
 * HSA rules — IRC §223, Form 8889, IRS Pub 969.
 *
 * Covers:
 *   1. Contribution exceeds the TY2025 statutory limit
 *   2. Line 2 / line 6 / line 13 reconciliation on Form 8889
 *   3. Schedule 1 deduction (line 13) propagation
 *   4. Employer contributions (code W on W-2) not excluded from line 2
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import { dollar_impact, estimated_marginal_rate, is_mfj, make_finding_id, NO_FINDINGS, TY2025 } from "./helpers";

// Rule 4 ---------------------------------------------------------------
const hsa_over_limit: Rule = {
  id: "hsa-over-limit-001",
  name: "HSA contribution exceeds TY2025 statutory limit",
  category: "hsa",
  severity: 4,
  irc_citation: "IRC §223(b)",
  pub_citation: "IRS Pub 969",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const hsa of return_data.hsa) {
      const limit =
        hsa.coverage === "family"
          ? TY2025.hsa_limit_family
          : TY2025.hsa_limit_self;
      const total =
        hsa.line2_contributions + (hsa.employer_contributions ?? 0);
      if (total > limit) {
        findings.push({
          finding_id: make_finding_id(
            "hsa-over-limit-001",
            hsa.account_holder.id,
          ),
          rule_id: "hsa-over-limit-001",
          category: "hsa",
          severity: 4,
          irc_citation: "IRC §223(b)",
          pub_citation: "IRS Pub 969",
          summary: `HSA contribution ${total} exceeds ${hsa.coverage} limit ${limit}`,
          detail:
            "The HSA total contribution (Form 8889 line 2 plus employer W-2 code W) " +
            `is $${total.toLocaleString()}, which is over the TY2025 ${hsa.coverage} ` +
            `coverage statutory limit of $${limit.toLocaleString()}. The excess is a 6% ` +
            "excise tax per year unless withdrawn before the filing deadline.",
          affected_lines: ["8889.line.2", "8889.line.6"],
          dollar_impact: dollar_impact(Math.round((total - limit) * 0.06 * 3), 0.3),
          audit_risk_delta: 0.1,
        });
      }
    }
    return findings;
  },
};

// Rule 5 ---------------------------------------------------------------
const hsa_line_reconcile: Rule = {
  id: "hsa-8889-reconcile-001",
  name: "Form 8889 line 2 / line 6 / line 13 mismatch",
  category: "hsa",
  severity: 4,
  irc_citation: "IRC §223",
  pub_citation: "IRS Pub 969 Form 8889 instructions",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const hsa of return_data.hsa) {
      const expected_limit =
        hsa.coverage === "family"
          ? TY2025.hsa_limit_family
          : TY2025.hsa_limit_self;
      const problems: string[] = [];
      if (hsa.line6_allowable !== expected_limit) {
        problems.push(
          `line 6 is $${hsa.line6_allowable.toLocaleString()} but TY2025 ${hsa.coverage} limit is $${expected_limit.toLocaleString()}`,
        );
      }
      // Line 13 (deduction) should equal the smaller of line 2 and line 6.
      const expected_line13 = Math.min(hsa.line2_contributions, hsa.line6_allowable);
      if (hsa.line13_deduction !== expected_line13) {
        problems.push(
          `line 13 is $${hsa.line13_deduction.toLocaleString()} but should equal min(line 2, line 6) = $${expected_line13.toLocaleString()}`,
        );
      }
      if (problems.length > 0) {
        findings.push({
          finding_id: make_finding_id(
            "hsa-8889-reconcile-001",
            hsa.account_holder.id,
          ),
          rule_id: "hsa-8889-reconcile-001",
          category: "hsa",
          severity: 4,
          irc_citation: "IRC §223",
          pub_citation: "IRS Pub 969",
          summary: "Form 8889 line 2/6/13 do not reconcile",
          detail:
            "Form 8889 requires line 2 (contributions), line 6 (allowable), and " +
            "line 13 (deduction) to reconcile with the TY2025 statutory limit. " +
            problems.join("; ") +
            ".",
          affected_lines: [
            "8889.line.2",
            "8889.line.6",
            "8889.line.13",
          ],
          dollar_impact: dollar_impact(
            Math.round(
              (expected_limit - hsa.line13_deduction) *
                estimated_marginal_rate(
                  return_data.agi ?? 0,
                  is_mfj(return_data),
                ),
            ),
            0.3,
          ),
          audit_risk_delta: 0.15,
        });
      }
    }
    return findings;
  },
};

// Rule 6 ---------------------------------------------------------------
const hsa_schedule_1_deduction: Rule = {
  id: "hsa-schedule-1-003",
  name: "HSA deduction not flowing to Schedule 1",
  category: "hsa",
  severity: 3,
  irc_citation: "IRC §62(a)(19)",
  pub_citation: "IRS Pub 969",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // If the taxpayer contributed outside of payroll (line 2 > 0) but
    // line 13 deduction is $0, the Schedule 1 adjustment is missing.
    const findings: RuleFinding[] = [];
    for (const hsa of return_data.hsa) {
      if (hsa.line2_contributions > 0 && hsa.line13_deduction === 0) {
        findings.push({
          finding_id: make_finding_id(
            "hsa-schedule-1-003",
            hsa.account_holder.id,
          ),
          rule_id: "hsa-schedule-1-003",
          category: "hsa",
          severity: 3,
          irc_citation: "IRC §62(a)(19)",
          pub_citation: "IRS Pub 969",
          summary: "Form 8889 line 13 deduction missing on Schedule 1",
          detail:
            "Taxpayer contributed directly to an HSA (Form 8889 line 2 > 0) but " +
            "Schedule 1 HSA deduction is zero. The deduction should flow from " +
            "Form 8889 line 13 to Schedule 1.",
          affected_lines: ["8889.line.13", "1040.sch1.line.13"],
          dollar_impact: dollar_impact(
            Math.round(
              hsa.line2_contributions *
                estimated_marginal_rate(
                  return_data.agi ?? 0,
                  is_mfj(return_data),
                ),
            ),
          ),
          audit_risk_delta: 0.05,
        });
      }
    }
    return findings;
  },
};

// Rule 7 ---------------------------------------------------------------
const hsa_employer_contribution_exclusion: Rule = {
  id: "hsa-employer-contribution-004",
  name: "Employer HSA contribution (W-2 code W) double-counted on line 2",
  category: "hsa",
  severity: 3,
  irc_citation: "IRC §106(d)",
  pub_citation: "IRS Pub 969",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const hsa of return_data.hsa) {
      if (
        hsa.employer_contributions > 0 &&
        hsa.line2_contributions >= hsa.employer_contributions
      ) {
        // Heuristic: employer contributions should not appear on Form
        // 8889 line 2. If line 2 happens to be exactly the employer
        // contribution amount, flag it.
        if (hsa.line2_contributions === hsa.employer_contributions) {
          findings.push({
            finding_id: make_finding_id(
              "hsa-employer-contribution-004",
              hsa.account_holder.id,
            ),
            rule_id: "hsa-employer-contribution-004",
            category: "hsa",
            severity: 3,
            irc_citation: "IRC §106(d)",
            pub_citation: "IRS Pub 969",
            summary: "Employer HSA contribution may be double-counted",
            detail:
              "Employer contributions (W-2 code W) are already pre-tax and must " +
              "not appear on Form 8889 line 2. Line 2 is exactly equal to the " +
              "employer contribution, which is suspicious.",
            affected_lines: ["8889.line.2", "8889.line.9"],
            dollar_impact: dollar_impact(
              Math.round(
                hsa.employer_contributions *
                  estimated_marginal_rate(
                    return_data.agi ?? 0,
                    is_mfj(return_data),
                  ),
              ),
            ),
            audit_risk_delta: 0.1,
          });
        }
      }
    }
    return NO_FINDINGS.concat(findings);
  },
};

export const hsa_rules: Rule[] = [
  hsa_over_limit,
  hsa_line_reconcile,
  hsa_schedule_1_deduction,
  hsa_employer_contribution_exclusion,
];
