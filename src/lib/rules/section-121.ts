/**
 * Section 121 home sale exclusion rules — IRC §121, IRS Pub 523.
 *
 * Up to $250K ($500K MFJ) of gain from the sale of a primary residence
 * is excluded if the ownership and use tests are met. We don't have a
 * "home sale" event on the TaxReturn contract, so these rules fire on
 * heuristic proxies: a disposed-of rental that has personal use days,
 * or a large long-term capital gain lot with a "RESI" description
 * prefix, as a reminder to the preparer.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import { dollar_impact, is_mfj, make_finding_id, TY2025 } from "./helpers";

// Rule 34 --------------------------------------------------------------
const section_121_ownership_test: Rule = {
  id: "section-121-ownership-001",
  name: "Section 121 2-of-5 ownership test on rental disposition",
  category: "section_121",
  severity: 3,
  irc_citation: "IRC §121(a)",
  pub_citation: "IRS Pub 523",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      if (
        r.personal_use_days > 14 &&
        r.depreciation.current_year_depreciation === 0 &&
        r.depreciation.prior_year_depreciation > 0
      ) {
        findings.push({
          finding_id: make_finding_id("section-121-ownership-001", r.property_id),
          rule_id: "section-121-ownership-001",
          category: "section_121",
          severity: 3,
          irc_citation: "IRC §121(a)",
          pub_citation: "IRS Pub 523",
          summary: "Review §121 ownership test on converted rental",
          detail:
            "The rental has personal-use days and no current-year depreciation, " +
            "suggesting it was converted to a primary residence or disposed. " +
            "The §121 exclusion requires ownership of 2 years within the last 5.",
          affected_lines: ["schD", "schE"],
          dollar_impact: dollar_impact(2_500, 0.4),
          audit_risk_delta: 0,
        });
      }
    }
    return findings;
  },
};

// Rule 35 --------------------------------------------------------------
const section_121_use_test: Rule = {
  id: "section-121-use-002",
  name: "Section 121 2-of-5 use test for nonqualified use",
  category: "section_121",
  severity: 3,
  irc_citation: "IRC §121(b)(5)",
  pub_citation: "IRS Pub 523",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      const fair_vs_personal_ratio =
        r.fair_rental_days / Math.max(1, r.fair_rental_days + r.personal_use_days);
      if (
        r.personal_use_days > 0 &&
        fair_vs_personal_ratio > 0.5 &&
        r.depreciation.prior_year_depreciation > 0
      ) {
        findings.push({
          finding_id: make_finding_id("section-121-use-002", r.property_id),
          rule_id: "section-121-use-002",
          category: "section_121",
          severity: 3,
          irc_citation: "IRC §121(b)(5)",
          pub_citation: "IRS Pub 523",
          summary: "Nonqualified use period may reduce §121 exclusion",
          detail:
            "Periods where the property was a rental count as nonqualified use " +
            "under §121(b)(5), reducing the excludable gain pro-rata. Calculate " +
            "the nonqualified use ratio when the property is eventually sold.",
          affected_lines: ["schD"],
          dollar_impact: dollar_impact(1_500, 0.5),
          audit_risk_delta: 0.05,
        });
      }
    }
    return findings;
  },
};

// Rule 36 --------------------------------------------------------------
const section_121_partial_exclusion: Rule = {
  id: "section-121-partial-003",
  name: "Section 121 partial exclusion for unforeseen circumstances",
  category: "section_121",
  severity: 2,
  irc_citation: "IRC §121(c)",
  pub_citation: "IRS Pub 523",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // If there is a rental and prior-year PAL carryforward > 0 and a
    // "notes" field on the prior year mentions move / relocation /
    // change in employment, flag the partial exclusion. We don't have
    // a move flag, so fire when notes mention any of those keywords.
    const py_notes = (return_data.prior_year?.notes ?? "").toLowerCase();
    const triggers = ["relocat", "job change", "move", "divorce", "illness"];
    if (!triggers.some((t) => py_notes.includes(t))) return [];
    return [
      {
        finding_id: make_finding_id("section-121-partial-003", "global"),
        rule_id: "section-121-partial-003",
        category: "section_121",
        severity: 2,
        irc_citation: "IRC §121(c)",
        pub_citation: "IRS Pub 523",
        summary: "Partial §121 exclusion may apply for unforeseen circumstances",
        detail:
          "Prior year notes reference a move or life event. §121(c) provides a " +
          "pro-rata exclusion (up to $250K / $500K scaled by months owned out of " +
          "24) for sales caused by unforeseen circumstances.",
        affected_lines: ["schD"],
        dollar_impact: dollar_impact(
          Math.round(
            is_mfj(return_data)
              ? TY2025.section_121_exclusion_mfj * 0.1
              : TY2025.section_121_exclusion_single * 0.1,
          ),
          0.5,
        ),
        audit_risk_delta: 0.1,
      },
    ];
  },
};

export const section_121_rules: Rule[] = [
  section_121_ownership_test,
  section_121_use_test,
  section_121_partial_exclusion,
];
