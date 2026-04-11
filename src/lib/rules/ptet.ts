/**
 * State Pass-Through Entity Tax (PTET) election rules.
 *
 * After IRS Notice 2020-75 blessed state PTET regimes, 30+ states now
 * allow a pass-through entity to elect to pay state tax at the entity
 * level and deduct it as an ordinary business expense, effectively
 * bypassing the SALT cap for the owners. The election is state-specific
 * with state-specific deadlines.
 */

import type { Rule, RuleFinding, StateCode, TaxReturn } from "@/contracts";

import {
  dollar_impact,
  estimated_marginal_rate,
  is_mfj,
  make_finding_id,
} from "./helpers";

function has_passthrough_income(return_data: TaxReturn): boolean {
  return return_data.k1s.some(
    (k) =>
      k.ordinary_business_income !== 0 ||
      k.rental_real_estate_income !== 0 ||
      (k.guaranteed_payments ?? 0) !== 0,
  );
}

function ptet_base_finding(
  rule_id: string,
  state: StateCode,
  return_data: TaxReturn,
  state_name: string,
): RuleFinding {
  const agi = return_data.agi ?? 0;
  // Rough benefit: state rate * federal marginal rate savings on the
  // moved deduction. IL is 4.95% flat, CA is progressive up to 13.3%.
  const state_rate = state === "CA" ? 0.093 : 0.0495;
  const estimated_savings = Math.round(
    return_data.k1s
      .map((k) => Math.abs(k.ordinary_business_income) + Math.abs(k.rental_real_estate_income))
      .reduce((a, b) => a + b, 0) *
      state_rate *
      estimated_marginal_rate(agi, is_mfj(return_data)),
  );
  return {
    finding_id: make_finding_id(rule_id, state),
    rule_id,
    category: "ptet_election",
    severity: 4,
    irc_citation: "IRC §164(b)(6)",
    pub_citation: "IRS Notice 2020-75",
    summary: `${state_name} PTET election available on pass-through income`,
    detail:
      `${state_name} allows a pass-through entity to elect to pay state tax at the ` +
      "entity level, producing a federal ordinary business deduction that " +
      "effectively uncaps the SALT cost on this K-1. The return has eligible " +
      "pass-through income but the state slice is not flagged as having made " +
      "the election.",
    affected_lines: ["k1.state", "1040.sch1.line.5"],
    dollar_impact: dollar_impact(Math.max(estimated_savings, 500), 0.4),
    audit_risk_delta: 0.05,
  };
}

// Rule 31 --------------------------------------------------------------
const ptet_il: Rule = {
  id: "ptet-election-il-001",
  name: "Illinois PTET election eligibility",
  category: "ptet_election",
  severity: 4,
  irc_citation: "IRC §164(b)(6)",
  pub_citation: "IRS Notice 2020-75",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    if (!has_passthrough_income(return_data)) return [];
    const il = return_data.state_returns.find((s) => s.state === "IL");
    if (!il?.ptet_election_eligible) return [];
    return [ptet_base_finding("ptet-election-il-001", "IL", return_data, "Illinois")];
  },
};

// Rule 32 --------------------------------------------------------------
const ptet_ca: Rule = {
  id: "ptet-election-ca-002",
  name: "California PTET election eligibility",
  category: "ptet_election",
  severity: 4,
  irc_citation: "IRC §164(b)(6)",
  pub_citation: "IRS Notice 2020-75",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    if (!has_passthrough_income(return_data)) return [];
    const ca = return_data.state_returns.find((s) => s.state === "CA");
    if (!ca?.ptet_election_eligible) return [];
    return [ptet_base_finding("ptet-election-ca-002", "CA", return_data, "California")];
  },
};

// Rule 33 --------------------------------------------------------------
const ptet_multi_state_apportionment: Rule = {
  id: "ptet-apportionment-003",
  name: "PTET multi-state apportionment check",
  category: "ptet_election",
  severity: 2,
  irc_citation: "IRC §164(b)(6)",
  pub_citation: "IRS Notice 2020-75",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const ptet_eligible_states = return_data.state_returns.filter(
      (s) => s.ptet_election_eligible,
    );
    if (ptet_eligible_states.length < 2 || !has_passthrough_income(return_data)) {
      return [];
    }
    return [
      {
        finding_id: make_finding_id("ptet-apportionment-003", "global"),
        rule_id: "ptet-apportionment-003",
        category: "ptet_election",
        severity: 2,
        irc_citation: "IRC §164(b)(6)",
        pub_citation: "IRS Notice 2020-75",
        summary: "Pass-through income allocated across 2+ PTET states",
        detail:
          "Multiple states allow a PTET election but apportion the deduction " +
          "differently. Consult the partnership's state apportionment schedule " +
          "before electing — the federal benefit stacks per state.",
        affected_lines: ["k1.state"],
        dollar_impact: dollar_impact(700, 0.4),
        audit_risk_delta: 0.05,
      },
    ];
  },
};

export const ptet_rules: Rule[] = [ptet_il, ptet_ca, ptet_multi_state_apportionment];
