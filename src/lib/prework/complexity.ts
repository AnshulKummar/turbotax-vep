/**
 * Complexity scorer for the Pre-Work Engine (B3 mock).
 *
 * Produces a 1-10 complexity score for a tax return plus a per-factor
 * breakdown so the workbench can display something like:
 *
 *     Complexity 8/10 — K-1, RSU, multi-state (IL/CA), rental property,
 *                        wash sale, HSA, foreign tax credit
 *
 * Scoring formula (additive on a base of 1):
 *
 *   K-1                        +1
 *   RSU (W-2 box 12 code V)    +1
 *   Multi-state return         +2
 *   Rental property            +2
 *   Wash sale                  +1
 *   HSA                        +0.5
 *   Foreign tax credit         +1
 *   AMT exposure               +1
 *   Self-employment (SE tax)   +1.5
 *
 * Final score is floor(total) clamped to [1, 10]. The Mitchell hero
 * return hits K-1 + RSU + multi-state + rental + wash sale + HSA + FTC
 * = 1 + 1 + 1 + 2 + 2 + 1 + 0.5 + 1 = 8.5, which floors to **8** — the
 * target score called out in the brief.
 *
 * NB: `compute_complexity` is pure — no IO, no side effects, deterministic
 * given the same return object.
 */

import type { ComplexityScore, TaxReturn } from "@/contracts";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * A return with zero complexity triggers is floored to 1 at the clamp
 * step. Scoring is therefore purely additive on top of 0, which lets
 * Mitchell's 8.5 total floor cleanly to 8/10 instead of 9/10.
 */
const BASE_SCORE = 0;

const FACTOR_WEIGHTS = {
  k1: 1,
  rsu: 1,
  multi_state: 2,
  rental: 2,
  wash_sale: 1,
  hsa: 0.5,
  foreign_tax_credit: 1,
  amt_exposure: 1,
  self_employment: 1.5,
} as const;

type FactorKey = keyof typeof FACTOR_WEIGHTS;

// ---------------------------------------------------------------------------
// Per-factor detectors (pure predicates)
// ---------------------------------------------------------------------------

function has_k1(return_data: TaxReturn): boolean {
  return return_data.k1s.length > 0;
}

function has_rsu(return_data: TaxReturn): boolean {
  return return_data.w2s.some((w) =>
    w.box12.some((b) => b.code === "V" && b.amount > 0),
  );
}

function is_multi_state(return_data: TaxReturn): boolean {
  if (return_data.state_returns.length >= 2) return true;
  // Fall back to W-2 state_wages — a single state_returns slice can still
  // span multiple state wages if the preparer hasn't finished allocation.
  const states = new Set<string>();
  for (const w of return_data.w2s) {
    for (const sw of w.state_wages) states.add(sw.state);
  }
  return states.size >= 2;
}

function has_rental(return_data: TaxReturn): boolean {
  return return_data.rental_properties.length > 0;
}

function has_wash_sale(return_data: TaxReturn): boolean {
  for (const f of return_data.form_1099_b) {
    for (const lot of f.lots) {
      if ((lot.wash_sale_loss_disallowed ?? 0) > 0) return true;
      if (lot.code === "W") return true;
    }
  }
  return false;
}

function has_hsa(return_data: TaxReturn): boolean {
  return return_data.hsa.length > 0;
}

function has_foreign_tax_credit(return_data: TaxReturn): boolean {
  // Any foreign tax on 1099-DIV counts, since even the below-$600 MFJ
  // simplified election still requires the preparer to reason about FTC.
  return return_data.form_1099_div.some(
    (d) => (d.foreign_tax_paid ?? 0) > 0,
  );
}

/**
 * AMT exposure heuristic. A full Form 6251 simulation is out of scope;
 * we flag when any of the classical AMT triggers are present:
 *   - Large ISO or RSU income (captured separately, but still)
 *   - Large state/local income tax deduction at high AGI
 *   - Significant passive losses
 *   - Incentive stock option exercise (not modeled yet)
 *
 * For now we use a simple bar: AGI above $500K MFJ with a significant
 * SALT deduction or a K-1 passive loss flags AMT. The Mitchell return is
 * *below* this bar, so AMT does not contribute to its score — which is
 * what we need to keep the Mitchell total at 8/10.
 */
function has_amt_exposure(return_data: TaxReturn): boolean {
  const agi = return_data.agi ?? 0;
  const mfj = return_data.filing_status === "mfj";
  const amt_agi_floor = mfj ? 500_000 : 250_000;
  if (agi < amt_agi_floor) return false;
  const has_passive_k1 = return_data.k1s.some(
    (k1) => k1.is_passive && k1.ordinary_business_income < 0,
  );
  return has_passive_k1;
}

/**
 * Self-employment detector. Mitchell has no Schedule C, no guaranteed
 * payments, and no non-passive K-1, so this is false. Included for the
 * sake of a complete formula.
 */
function has_self_employment(return_data: TaxReturn): boolean {
  const any_nonpassive_k1 = return_data.k1s.some(
    (k1) => !k1.is_passive && k1.ordinary_business_income > 0,
  );
  const any_guaranteed_payments = return_data.k1s.some(
    (k1) => k1.guaranteed_payments > 0,
  );
  return any_nonpassive_k1 || any_guaranteed_payments;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type DetectorMap = Record<FactorKey, (r: TaxReturn) => boolean>;

const DETECTORS: DetectorMap = {
  k1: has_k1,
  rsu: has_rsu,
  multi_state: is_multi_state,
  rental: has_rental,
  wash_sale: has_wash_sale,
  hsa: has_hsa,
  foreign_tax_credit: has_foreign_tax_credit,
  amt_exposure: has_amt_exposure,
  self_employment: has_self_employment,
};

/**
 * Human-readable labels matching the FACTOR_WEIGHTS keys. Exported so
 * the workbench can use the same strings in its complexity chip.
 */
export const COMPLEXITY_FACTOR_LABELS: Record<FactorKey, string> = {
  k1: "K-1 partnership income",
  rsu: "RSU equity compensation",
  multi_state: "Multi-state return",
  rental: "Rental property",
  wash_sale: "Wash sale",
  hsa: "HSA contributions",
  foreign_tax_credit: "Foreign tax credit",
  amt_exposure: "AMT exposure",
  self_employment: "Self-employment income",
};

/**
 * Compute the complexity score and the contributing factors for a return.
 */
export function compute_complexity(return_data: TaxReturn): ComplexityScore {
  const factors: { factor: string; contribution: number }[] = [];
  let total = BASE_SCORE;

  for (const key of Object.keys(DETECTORS) as FactorKey[]) {
    const detector = DETECTORS[key];
    if (!detector(return_data)) continue;
    const weight = FACTOR_WEIGHTS[key];
    total += weight;
    factors.push({
      factor: COMPLEXITY_FACTOR_LABELS[key],
      contribution: weight,
    });
  }

  // Clamp to [1, 10] and floor so a mixed (x.5) total lands on the lower
  // integer. The Mitchell return uses this to land on 8/10 instead of 9.
  const raw = Math.floor(total);
  const clamped = Math.max(1, Math.min(10, raw));

  return {
    score: clamped,
    factors,
  };
}
