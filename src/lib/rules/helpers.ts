/**
 * Shared helpers for deterministic tax rules.
 *
 * These utilities are intentionally small. The goal is to make each rule
 * file read like the IRC section it implements, not like a framework.
 */

import type { DollarImpact, RuleFinding, TaxReturn } from "@/contracts";

/**
 * TY2025 constants. Sourced from the IRS inflation adjustment revenue
 * procedure for TY2025 and, for SALT, the TCJA permanent extension that
 * raised the MFJ cap to $40,000 starting in TY2025.
 */
export const TY2025 = {
  hsa_limit_self: 4_300,
  hsa_limit_family: 8_550,
  hsa_catchup_55plus: 1_000,
  ira_limit: 7_000,
  ira_catchup_50plus: 1_000,
  elective_deferral_401k: 23_500, // §402(g)
  elective_deferral_401k_catchup_50plus: 7_500,
  sep_ira_limit: 70_000,
  solo_401k_total: 70_000,
  solo_401k_catchup_50plus: 7_500,
  salt_cap_mfj: 40_000,
  salt_cap_single: 20_000,
  salt_cap_prior_law: 10_000,
  passive_loss_special_allowance: 25_000,
  passive_loss_phaseout_start: 100_000,
  passive_loss_phaseout_end: 150_000,
  ftc_election_threshold_single: 300,
  ftc_election_threshold_mfj: 600,
  section_121_exclusion_single: 250_000,
  section_121_exclusion_mfj: 500_000,
  ctc_amount_per_child_under17: 2_000,
  ctc_phaseout_start_mfj: 400_000,
  ctc_phaseout_start_other: 200_000,
  eitc_agi_limit_mfj_3plus_children: 68_675,
  aotc_phaseout_start_mfj: 160_000,
  aotc_phaseout_end_mfj: 180_000,
  llc_phaseout_start_mfj: 160_000,
  llc_phaseout_end_mfj: 180_000,
  safe_harbor_high_income_percent: 1.1, // 110% of prior year if AGI > 150K
  safe_harbor_current_year_percent: 0.9, // 90% of current year
  safe_harbor_high_income_agi_threshold: 150_000,
} as const;

/**
 * Build a DollarImpact with an estimate and a ±percent range.
 * We default to ±20% because most deterministic rules have enough
 * implicit uncertainty (marginal rate, phaseouts, etc.) that a tight
 * point estimate would be dishonest.
 */
export function dollar_impact(
  estimate: number,
  range_percent = 0.2,
): DollarImpact {
  const delta = Math.round(estimate * range_percent);
  return {
    estimate,
    low: estimate - delta,
    high: estimate + delta,
  };
}

/**
 * A quick marginal-rate estimator based on TY2025 MFJ brackets.
 * This is used to convert a deduction into a dollar impact; it is not
 * an exact calculator.
 */
export function estimated_marginal_rate(agi: number, mfj: boolean): number {
  if (mfj) {
    if (agi <= 23_850) return 0.1;
    if (agi <= 96_950) return 0.12;
    if (agi <= 206_700) return 0.22;
    if (agi <= 394_600) return 0.24;
    if (agi <= 501_050) return 0.32;
    if (agi <= 751_600) return 0.35;
    return 0.37;
  }
  if (agi <= 11_925) return 0.1;
  if (agi <= 48_475) return 0.12;
  if (agi <= 103_350) return 0.22;
  if (agi <= 197_300) return 0.24;
  if (agi <= 250_525) return 0.32;
  if (agi <= 626_350) return 0.35;
  return 0.37;
}

/**
 * Deterministic finding ID so that repeat evaluations produce the
 * same IDs (useful for snapshot tests and for letting Agent 2 compare
 * sets of findings across runs).
 */
export function make_finding_id(rule_id: string, key: string): string {
  return `finding-${rule_id}-${key}`;
}

/**
 * Shorthand for the "no findings" case. Most rules will return this
 * if the return does not trigger them.
 */
export const NO_FINDINGS: RuleFinding[] = [];

/**
 * True if the return is MFJ.
 */
export function is_mfj(return_data: TaxReturn): boolean {
  return return_data.filing_status === "mfj";
}

/**
 * Total W-2 Box 1 wages across all employees on the return.
 */
export function total_wages(return_data: TaxReturn): number {
  return return_data.w2s.reduce((acc, w) => acc + w.box1_wages, 0);
}

/**
 * Current-year AGI from the return object (precomputed in the hero
 * return, but we fall back to the income approximation if absent).
 */
export function agi_of(return_data: TaxReturn): number {
  if (typeof return_data.agi === "number") return return_data.agi;
  return total_wages(return_data);
}
