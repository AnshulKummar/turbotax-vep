/**
 * Passive activity loss rules — IRC §469, Form 8582, IRS Pub 925.
 *
 * Covers:
 *   - The $25,000 special allowance for active rental real estate
 *     participation, phased out between $100K and $150K AGI for MFJ.
 *   - Passive vs nonpassive K-1 classification.
 *   - Suspended loss carryforward tracking.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import {
  agi_of,
  dollar_impact,
  estimated_marginal_rate,
  is_mfj,
  make_finding_id,
  TY2025,
} from "./helpers";

// Compute the raw rental Schedule E result (rents - expenses - depreciation)
function rental_net(return_data: TaxReturn): number {
  let total = 0;
  for (const r of return_data.rental_properties) {
    const expenses = Object.values(r.expenses).reduce((a, b) => a + b, 0);
    total += r.rents_received - expenses - r.depreciation.current_year_depreciation;
  }
  return total;
}

// Rule 12 --------------------------------------------------------------
/**
 * AGI phaseout — if AGI > $150K the $25,000 special allowance is $0,
 * so any net rental loss should be fully suspended.
 */
const passive_agi_phaseout: Rule = {
  id: "passive-469-agi-phaseout-001",
  name: "Rental PAL suspended: AGI above $150K phaseout",
  category: "passive_activity_loss",
  severity: 5,
  irc_citation: "IRC §469(i)",
  pub_citation: "IRS Pub 925",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    const agi = agi_of(return_data);
    if (agi <= TY2025.passive_loss_phaseout_start) return findings;
    const rental = rental_net(return_data);
    if (rental >= 0) return findings;
    // Loss exists. Check if it's being claimed.
    const claimed_amount = Math.abs(rental);
    if (claimed_amount > 0) {
      const phaseout_range =
        TY2025.passive_loss_phaseout_end - TY2025.passive_loss_phaseout_start;
      const phaseout_pct = Math.min(
        1,
        Math.max(0, (agi - TY2025.passive_loss_phaseout_start) / phaseout_range),
      );
      const allowance = Math.max(
        0,
        TY2025.passive_loss_special_allowance * (1 - phaseout_pct),
      );
      const disallowed = Math.max(0, claimed_amount - allowance);
      findings.push({
        finding_id: make_finding_id("passive-469-agi-phaseout-001", "global"),
        rule_id: "passive-469-agi-phaseout-001",
        category: "passive_activity_loss",
        severity: 5,
        irc_citation: "IRC §469(i)",
        pub_citation: "IRS Pub 925",
        summary: `Rental loss $${claimed_amount.toLocaleString()} disallowed — AGI $${agi.toLocaleString()} exceeds phaseout`,
        detail:
          "IRC §469(i) allows up to $25,000 of rental real estate losses against " +
          "active income for taxpayers who actively participate. The allowance " +
          "phases out between $100,000 and $150,000 AGI, and is fully disallowed " +
          `at $150,000+. This return's AGI is $${agi.toLocaleString()}, so the ` +
          "rental loss is fully suspended and carried forward under §469(b).",
        affected_lines: ["1040.sch1.line.5", "8582.part1"],
        dollar_impact: dollar_impact(
          Math.round(
            disallowed *
              estimated_marginal_rate(agi, is_mfj(return_data)),
          ),
        ),
        audit_risk_delta: -0.3,
      });
    }
    return findings;
  },
};

// Rule 13 --------------------------------------------------------------
/**
 * Passive K-1 loss claimed against nonpassive income.
 */
const k1_passive_loss_nonpassive: Rule = {
  id: "passive-k1-nonpassive-002",
  name: "Passive K-1 loss claimed against nonpassive income",
  category: "passive_activity_loss",
  severity: 4,
  irc_citation: "IRC §469",
  pub_citation: "IRS Pub 925",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const k of return_data.k1s) {
      if (!k.is_passive) continue;
      const loss =
        Math.min(0, k.ordinary_business_income) +
        Math.min(0, k.rental_real_estate_income);
      if (loss < 0) {
        findings.push({
          finding_id: make_finding_id("passive-k1-nonpassive-002", k.partnership_ein),
          rule_id: "passive-k1-nonpassive-002",
          category: "passive_activity_loss",
          severity: 4,
          irc_citation: "IRC §469",
          pub_citation: "IRS Pub 925",
          summary: `Passive K-1 loss from ${k.partnership_name} must be suspended`,
          detail:
            "The K-1 is marked passive and has a loss. Per IRC §469 passive losses " +
            "can only offset passive income. If there is no passive income to " +
            "absorb the loss this year, it must be suspended on Form 8582 and " +
            "carried forward.",
          affected_lines: ["8582.part2"],
          dollar_impact: dollar_impact(
            Math.round(
              Math.abs(loss) *
                estimated_marginal_rate(
                  agi_of(return_data),
                  is_mfj(return_data),
                ),
            ),
          ),
          audit_risk_delta: -0.2,
        });
      }
    }
    return findings;
  },
};

// Rule 14 --------------------------------------------------------------
/**
 * Suspended loss carryforward tracking. If prior year on file shows a
 * PAL carryforward but this year's Schedule E does not use it against
 * passive income, flag it as a missed deduction opportunity.
 */
const suspended_loss_carryforward: Rule = {
  id: "passive-suspended-cf-003",
  name: "Prior year suspended PAL not applied against current passive income",
  category: "passive_activity_loss",
  severity: 3,
  irc_citation: "IRC §469(b)",
  pub_citation: "IRS Pub 925",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    const cf = return_data.prior_year?.carryforwards?.passive_activity_loss;
    if (!cf || cf <= 0) return findings;
    // Passive income this year (positive rental net or positive K-1 passive)
    const rental = rental_net(return_data);
    const passive_k1 = return_data.k1s
      .filter((k) => k.is_passive)
      .reduce(
        (acc, k) => acc + k.ordinary_business_income + k.rental_real_estate_income,
        0,
      );
    const passive_income = Math.max(0, rental) + Math.max(0, passive_k1);
    if (passive_income > 0) {
      const usable = Math.min(cf, passive_income);
      findings.push({
        finding_id: make_finding_id("passive-suspended-cf-003", "global"),
        rule_id: "passive-suspended-cf-003",
        category: "passive_activity_loss",
        severity: 3,
        irc_citation: "IRC §469(b)",
        pub_citation: "IRS Pub 925",
        summary: `$${usable.toLocaleString()} of suspended PAL can offset current passive income`,
        detail:
          "The prior year return shows a passive activity loss carryforward. " +
          "There is positive passive income this year that the carryforward can " +
          "be applied against.",
        affected_lines: ["8582.part1"],
        dollar_impact: dollar_impact(
          Math.round(
            usable *
              estimated_marginal_rate(
                agi_of(return_data),
                is_mfj(return_data),
              ),
          ),
        ),
        audit_risk_delta: -0.1,
      });
    }
    return findings;
  },
};

// Rule 15 --------------------------------------------------------------
/**
 * Real-estate-professional status: if the taxpayer spent more than 750
 * hours on real property trades or businesses and materially
 * participated, rental is nonpassive. This rule is a passive-placeholder
 * that fires when there is a rental with fair_rental_days > 200 AND a
 * related_party_rental flag that is NOT set — suggesting the taxpayer
 * may qualify as a REP. It is intentionally cautious and fires as a
 * "consider this" note rather than as an enforcement.
 */
const real_estate_professional_consider: Rule = {
  id: "passive-rep-consider-004",
  name: "Consider real-estate-professional status for rental",
  category: "passive_activity_loss",
  severity: 2,
  irc_citation: "IRC §469(c)(7)",
  pub_citation: "IRS Pub 925",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      if (r.fair_rental_days >= 200 && !r.related_party_rental) {
        findings.push({
          finding_id: make_finding_id("passive-rep-consider-004", r.property_id),
          rule_id: "passive-rep-consider-004",
          category: "passive_activity_loss",
          severity: 2,
          irc_citation: "IRC §469(c)(7)",
          pub_citation: "IRS Pub 925",
          summary: "Consider real-estate-professional status on this rental",
          detail:
            "The rental is in service for most of the year. If the taxpayer or " +
            "spouse spent more than 750 hours on real property trades or " +
            "businesses and materially participated, rental losses become " +
            "nonpassive and are not subject to §469 limits.",
          affected_lines: ["8582", "schE"],
          dollar_impact: dollar_impact(1_000, 0.5),
          audit_risk_delta: 0.1,
        });
      }
    }
    return findings;
  },
};

export const passive_activity_rules: Rule[] = [
  passive_agi_phaseout,
  k1_passive_loss_nonpassive,
  suspended_loss_carryforward,
  real_estate_professional_consider,
];
