/**
 * Depreciation allocation rules — IRC §168, §1250, IRS Pub 527.
 *
 * Covers:
 *   - Land vs building split on residential rental depreciation (Pub 527)
 *   - Qualified Improvement Property (QIP) — 15-year recovery
 *   - Bonus depreciation phase-down
 *   - §1250 depreciation recapture at sale
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import {
  dollar_impact,
  estimated_marginal_rate,
  is_mfj,
  make_finding_id,
} from "./helpers";

// Rule 16 --------------------------------------------------------------
/**
 * The Pub 527 land/building split rule. If a residential rental's
 * depreciation record has no land_value / building_value split, the
 * preparer is almost certainly depreciating land.
 */
const land_split_missing: Rule = {
  id: "depreciation-land-split-001",
  name: "Residential rental depreciation missing land/building split",
  category: "depreciation",
  severity: 5,
  irc_citation: "IRC §168(b)",
  pub_citation: "IRS Pub 527",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      if (
        r.depreciation.purchase_price > 0 &&
        (r.depreciation.land_value === undefined ||
          r.depreciation.building_value === undefined)
      ) {
        // Assume land is ~25% of purchase price (typical county-assessor
        // ratio for single-family residential — the exact number would
        // come from county records and is NOT encoded on the synthetic
        // return, which is the point).
        const assumed_land = Math.round(r.depreciation.purchase_price * 0.25);
        const correct_basis = r.depreciation.purchase_price - assumed_land;
        const correct_depr = Math.round(correct_basis / 27.5);
        const current = r.depreciation.current_year_depreciation;
        const over_deduction = current - correct_depr;
        findings.push({
          finding_id: make_finding_id(
            "depreciation-land-split-001",
            r.property_id,
          ),
          rule_id: "depreciation-land-split-001",
          category: "depreciation",
          severity: 5,
          irc_citation: "IRC §168(b)",
          pub_citation: "IRS Pub 527",
          summary: `Land not excluded from depreciable basis on ${r.address.city} rental`,
          detail:
            "IRS Publication 527 requires residential rental depreciation to be " +
            "computed on the building value only; land is never depreciable. This " +
            "property's depreciation record has no land_value / building_value " +
            "split, so the full purchase price is being depreciated. Using a " +
            "conservative 25% land allocation, the current year over-deduction is " +
            `about $${Math.max(0, over_deduction).toLocaleString()}. Pull ${r.address.county} County ` +
            "assessor records for the actual split before filing.",
          affected_lines: ["schE.line.18", "4562"],
          dollar_impact: dollar_impact(
            Math.round(
              Math.abs(over_deduction) *
                estimated_marginal_rate(
                  return_data.agi ?? 0,
                  is_mfj(return_data),
                ),
            ),
            0.3,
          ),
          audit_risk_delta: -0.25,
        });
      }
    }
    return findings;
  },
};

// Rule 17 --------------------------------------------------------------
/**
 * Qualified Improvement Property (QIP) — 15-year recovery rather than
 * 39-year. Fires when a depreciation method is MACRS_39 but the
 * category is improvements that would qualify as QIP. For the synthetic
 * return this is a potential-opportunity flag.
 */
const qip_15_year: Rule = {
  id: "depreciation-qip-002",
  name: "Qualified Improvement Property eligible for 15-year recovery",
  category: "depreciation",
  severity: 2,
  irc_citation: "IRC §168(e)(6)",
  pub_citation: "IRS Pub 946",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      if (r.depreciation.depreciation_method === "MACRS_39") {
        // Residential rental should use 27.5, not 39 — this suggests a
        // commercial improvement that may be QIP and eligible for 15-yr.
        findings.push({
          finding_id: make_finding_id("depreciation-qip-002", r.property_id),
          rule_id: "depreciation-qip-002",
          category: "depreciation",
          severity: 2,
          irc_citation: "IRC §168(e)(6)",
          pub_citation: "IRS Pub 946",
          summary: "Review QIP eligibility — MACRS_39 may be wrong recovery period",
          detail:
            "The property is depreciated on a 39-year MACRS schedule. If the " +
            "improvement qualifies as Qualified Improvement Property, the " +
            "recovery period is 15 years under IRC §168(e)(6).",
          affected_lines: ["4562"],
          dollar_impact: dollar_impact(2_000, 0.5),
          audit_risk_delta: 0.05,
        });
      }
    }
    return findings;
  },
};

// Rule 18 --------------------------------------------------------------
/**
 * Bonus depreciation phase-down: TY2025 bonus rate is 40% (down from
 * 60% in 2024). If the return uses a bonus method, check the rate.
 * Synthetic data: this rule never fires on the Mitchell return because
 * the rental is MACRS_27.5 with no bonus — it is present to cover the
 * category surface area.
 */
const bonus_depreciation_phase_down: Rule = {
  id: "depreciation-bonus-phase-down-003",
  name: "Bonus depreciation TY2025 40% phase-down",
  category: "depreciation",
  severity: 2,
  irc_citation: "IRC §168(k)",
  pub_citation: "IRS Pub 946",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    // Heuristic: if a rental has a current_year_depreciation that is
    // an abnormally large fraction of the purchase_price, it may be
    // using a stale bonus rate.
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      const dep_ratio =
        r.depreciation.current_year_depreciation /
        Math.max(1, r.depreciation.purchase_price);
      if (dep_ratio > 0.15) {
        findings.push({
          finding_id: make_finding_id(
            "depreciation-bonus-phase-down-003",
            r.property_id,
          ),
          rule_id: "depreciation-bonus-phase-down-003",
          category: "depreciation",
          severity: 2,
          irc_citation: "IRC §168(k)",
          pub_citation: "IRS Pub 946",
          summary: "Bonus depreciation rate may not reflect TY2025 40% phase-down",
          detail:
            "Current-year depreciation looks high relative to purchase price. " +
            "Verify the bonus depreciation rate has been phased down to 40% for " +
            "property placed in service in TY2025.",
          affected_lines: ["4562"],
          dollar_impact: dollar_impact(1_500, 0.4),
          audit_risk_delta: 0.1,
        });
      }
    }
    return findings;
  },
};

// Rule 19 --------------------------------------------------------------
/**
 * Depreciation recapture at sale under §1250 / §1245. Fires when the
 * rental has a date_sold on any component and prior-year depreciation
 * has been taken — the preparer must calculate recapture. We do not
 * have a "sold" flag in the contract, so this rule uses prior_year
 * depreciation > 0 together with current_year_depreciation of 0 as a
 * heuristic proxy for "probably sold this year."
 */
const depreciation_recapture_1250: Rule = {
  id: "depreciation-recapture-1250-004",
  name: "Unrecaptured §1250 gain check on rental disposition",
  category: "depreciation",
  severity: 3,
  irc_citation: "IRC §1250",
  pub_citation: "IRS Pub 544",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const r of return_data.rental_properties) {
      if (
        r.depreciation.prior_year_depreciation > 0 &&
        r.depreciation.current_year_depreciation === 0
      ) {
        findings.push({
          finding_id: make_finding_id(
            "depreciation-recapture-1250-004",
            r.property_id,
          ),
          rule_id: "depreciation-recapture-1250-004",
          category: "depreciation",
          severity: 3,
          irc_citation: "IRC §1250",
          pub_citation: "IRS Pub 544",
          summary: "Potential unrecaptured §1250 gain from rental disposition",
          detail:
            "The rental has prior-year depreciation but zero current-year " +
            "depreciation, suggesting the property was disposed of this year. " +
            "Unrecaptured §1250 gain is taxed at a max rate of 25% on the amount " +
            "equal to prior depreciation taken. Verify Schedule D and Form 4797 " +
            "reflect the recapture.",
          affected_lines: ["4797", "schD.line.19"],
          dollar_impact: dollar_impact(
            Math.round(r.depreciation.prior_year_depreciation * 0.25),
            0.4,
          ),
          audit_risk_delta: 0.2,
        });
      }
    }
    return findings;
  },
};

export const depreciation_rules: Rule[] = [
  land_split_missing,
  qip_15_year,
  bonus_depreciation_phase_down,
  depreciation_recapture_1250,
];
