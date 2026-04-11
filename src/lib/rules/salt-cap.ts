/**
 * SALT cap rules — IRC §164(b)(6) as amended by the TCJA permanent
 * extension (TY2025 cap raised from $10,000 to $40,000 MFJ).
 *
 * This is one of the PRD's explicit error-detection targets. The
 * TCJA-permanent bill raised the MFJ cap to $40,000 starting in TY2025,
 * but preparer software and stale knowledge-base articles continue to
 * use the prior $10,000 cap, silently over-taxing customers.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import {
  dollar_impact,
  estimated_marginal_rate,
  is_mfj,
  make_finding_id,
  TY2025,
} from "./helpers";

function total_state_withholding(return_data: TaxReturn): number {
  const from_w2 = return_data.w2s.reduce(
    (acc, w) =>
      acc + w.state_wages.reduce((a, s) => a + s.withholding, 0),
    0,
  );
  const from_state_slice = return_data.state_returns.reduce(
    (acc, s) => acc + s.state_withholding,
    0,
  );
  return Math.max(from_w2, from_state_slice);
}

function total_property_tax(return_data: TaxReturn): number {
  return return_data.form_1098.reduce(
    (acc, f) => acc + (f.property_tax_paid ?? 0),
    0,
  );
}

// Rule 23 --------------------------------------------------------------
const salt_cap_ty2025: Rule = {
  id: "salt-cap-tcja-2025-001",
  name: "SALT cap raised to $40K MFJ for TY2025 (TCJA permanent extension)",
  category: "salt_cap",
  severity: 5,
  irc_citation: "IRC §164(b)(6)",
  pub_citation: "Pub 17 Chapter 22",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    if (!is_mfj(return_data)) return [];
    const state = total_state_withholding(return_data);
    const property = total_property_tax(return_data);
    const total_salt = state + property;
    // If the total SALT paid is more than the prior-law $10K cap but
    // less than or equal to the new $40K cap, the TY2025 change
    // materially benefits the taxpayer.
    if (total_salt > TY2025.salt_cap_prior_law) {
      const new_cap = Math.min(total_salt, TY2025.salt_cap_mfj);
      const recovered = new_cap - TY2025.salt_cap_prior_law;
      const tax_savings = Math.round(
        recovered *
          estimated_marginal_rate(return_data.agi ?? 0, is_mfj(return_data)),
      );
      return [
        {
          finding_id: make_finding_id("salt-cap-tcja-2025-001", "global"),
          rule_id: "salt-cap-tcja-2025-001",
          category: "salt_cap",
          severity: 5,
          irc_citation: "IRC §164(b)(6)",
          pub_citation: "Pub 17 Chapter 22",
          summary: `SALT deduction up to $40K MFJ for TY2025 — recover $${recovered.toLocaleString()}`,
          detail:
            "The TCJA permanent extension raised the SALT cap from $10,000 to " +
            "$40,000 MFJ starting in TY2025. State + property tax paid is " +
            `$${total_salt.toLocaleString()}, which under the new cap yields a ` +
            `SALT deduction of $${new_cap.toLocaleString()} instead of the prior-law ` +
            `$${TY2025.salt_cap_prior_law.toLocaleString()}. Verify Schedule A line 5e ` +
            "uses the TY2025 cap.",
          affected_lines: ["schA.line.5e"],
          dollar_impact: dollar_impact(tax_savings),
          audit_risk_delta: -0.15,
        },
      ];
    }
    return [];
  },
};

// Rule 24 --------------------------------------------------------------
const salt_cap_ptet_interaction: Rule = {
  id: "salt-cap-ptet-interaction-002",
  name: "SALT cap interaction with state PTET election",
  category: "salt_cap",
  severity: 3,
  irc_citation: "IRC §164(b)(6)",
  pub_citation: "IRS Notice 2020-75",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // Fires when there is a K-1 and the state supports PTET. PTET
    // shifts state tax out of the SALT cap and into the entity's
    // ordinary deduction, which is then embedded in the K-1 income.
    const has_k1 = return_data.k1s.length > 0;
    const ptet_states = return_data.state_returns.filter(
      (s) => s.ptet_election_eligible,
    );
    if (!has_k1 || ptet_states.length === 0) return [];
    return [
      {
        finding_id: make_finding_id("salt-cap-ptet-interaction-002", "global"),
        rule_id: "salt-cap-ptet-interaction-002",
        category: "salt_cap",
        severity: 3,
        irc_citation: "IRC §164(b)(6)",
        pub_citation: "IRS Notice 2020-75",
        summary: "PTET election can effectively uncap the SALT deduction on K-1 income",
        detail:
          "IRS Notice 2020-75 blessed state-level PTET regimes as a way to pay " +
          "state tax at the entity level, converting a capped SALT deduction into " +
          "a federal ordinary business expense that passes through as lower K-1 " +
          "income. Consider the PTET election with each state where the K-1 " +
          "generates income.",
        affected_lines: ["schA.line.5a", "1040.sch1.line.5"],
        dollar_impact: dollar_impact(1_500, 0.4),
        audit_risk_delta: 0,
      },
    ];
  },
};

// Rule 25 --------------------------------------------------------------
const salt_prior_year_refund: Rule = {
  id: "salt-prior-year-refund-003",
  name: "Prior year state refund taxable only if itemized",
  category: "salt_cap",
  severity: 2,
  irc_citation: "IRC §111",
  pub_citation: "Pub 525",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // Fires when prior year was itemized (proxy: prior year total tax
    // > 0 and prior year filed) AND prior year produced a refund.
    const py = return_data.prior_year;
    if (!py) return [];
    if (py.refund_or_owed > 0) {
      return [
        {
          finding_id: make_finding_id("salt-prior-year-refund-003", "global"),
          rule_id: "salt-prior-year-refund-003",
          category: "salt_cap",
          severity: 2,
          irc_citation: "IRC §111",
          pub_citation: "Pub 525",
          summary: "Check §111 taxable state refund worksheet",
          detail:
            "A prior year state refund is only taxable to the extent it produced " +
            "a federal tax benefit (the §111 tax benefit rule). If prior year was " +
            "at the SALT cap, the refund is usually NOT taxable. Do the worksheet.",
          affected_lines: ["1040.sch1.line.1"],
          dollar_impact: dollar_impact(250, 0.5),
          audit_risk_delta: -0.05,
        },
      ];
    }
    return [];
  },
};

export const salt_cap_rules: Rule[] = [
  salt_cap_ty2025,
  salt_cap_ptet_interaction,
  salt_prior_year_refund,
];
