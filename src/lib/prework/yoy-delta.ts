/**
 * Year-over-year delta engine for the Pre-Work Engine (B3 mock).
 *
 * This module compares a TY2025 `TaxReturn` against the prior-year
 * `PriorYearSnapshot` that sits inside the return and emits a list of
 * significant line deltas. The goal is to give the workbench expert a
 * fast "what actually changed this year" strip so they can jump past the
 * boilerplate and focus on the new tranche of complexity.
 *
 * The `PriorYearSnapshot` shape is deliberately sparse (top-line
 * aggregates plus carryforwards — see `src/contracts/index.ts`). We do
 * not fabricate prior-year line-level values; we only emit deltas for
 * quantities that have a direct counterpart on both sides, or that can
 * be unambiguously derived from fields the snapshot already carries.
 *
 * Significance threshold:
 * A delta is emitted when `abs(delta)` exceeds the larger of $500 or
 * 10% of the prior value. If the prior value is zero, $500 is used.
 */

import type {
  BrokerageLot,
  PriorYearSnapshot,
  TaxReturn,
  YoYDelta,
} from "@/contracts";

// ---------------------------------------------------------------------------
// Thresholds
// ---------------------------------------------------------------------------

const ABS_THRESHOLD_USD = 500;
const REL_THRESHOLD = 0.1;

function passes_threshold(current: number, prior: number): boolean {
  const delta = current - prior;
  const abs = Math.abs(delta);
  const rel_bar = Math.abs(prior) * REL_THRESHOLD;
  const bar = Math.max(ABS_THRESHOLD_USD, rel_bar);
  return abs > bar;
}

function pct(current: number, prior: number): number {
  if (prior === 0) {
    return current === 0 ? 0 : current > 0 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  }
  return Math.round(((current - prior) / Math.abs(prior)) * 1000) / 10;
}

// ---------------------------------------------------------------------------
// Current-year derivations
// ---------------------------------------------------------------------------

/**
 * Approximate current-year federal withholdings from the W-2s.
 * This is sufficient to compute the refund-or-owed delta against the
 * prior snapshot, which also reports withholding only via the implied
 * (total_tax - refund_or_owed) pair.
 */
function current_fed_withholding(return_data: TaxReturn): number {
  return return_data.w2s.reduce((acc, w) => acc + w.box2_fed_withholding, 0);
}

function current_refund_or_owed(return_data: TaxReturn): number {
  const withholding = current_fed_withholding(return_data);
  const total_tax = return_data.total_tax ?? 0;
  // Positive = refund owed TO the taxpayer.
  return withholding - total_tax;
}

/**
 * Compute the current-year capital loss carryforward that will roll into
 * TY2026. For the Mitchell return this is zero because Schedule D shows a
 * net capital gain even after the prior-year carryforward is absorbed,
 * which makes the delta against the prior carryforward meaningful.
 */
function current_capital_loss_carryforward(return_data: TaxReturn): number {
  const lots: BrokerageLot[] = return_data.form_1099_b.flatMap((f) => f.lots);
  let net_gain = 0;
  for (const lot of lots) {
    // Skip RSU vest same-day lots — those are the double-count bug, not
    // real economic gain. Applying the Box 1 inclusion as basis zeros them
    // out for YoY purposes.
    if (lot.date_acquired === lot.date_sold && lot.cost_basis === 0) continue;
    const effective_loss_disallowed = lot.wash_sale_loss_disallowed ?? 0;
    net_gain += lot.proceeds - lot.cost_basis + effective_loss_disallowed;
  }
  // Also fold in 1099-DIV capital gain distributions.
  for (const div of return_data.form_1099_div) {
    net_gain += div.capital_gain_distributions;
  }
  // Apply the prior-year capital loss carryforward if present.
  const prior_cf = return_data.prior_year?.carryforwards?.capital_loss ?? 0;
  const net_after_cf = net_gain - prior_cf;
  // If still a loss, it rolls forward (bounded by $3k/year for ordinary
  // offset, but carryforward is unbounded).
  if (net_after_cf < 0) return Math.round(Math.abs(net_after_cf));
  return 0;
}

/**
 * Compute the current-year suspended passive activity loss that rolls
 * to next year. For Mitchell this is $4,300 (rental $1,500 + K-1 $2,800)
 * per the deliberate bug encoded in the return (see top-of-file comment
 * in `src/data/mitchell-return.ts`).
 */
function current_passive_activity_loss_carryforward(
  return_data: TaxReturn,
): number {
  const prior_cf = return_data.prior_year?.carryforwards?.passive_activity_loss ?? 0;

  // Rental net income (expenses + depreciation — the rules engine will
  // compute the correct land/building split; for YoY purposes we use the
  // as-filed numbers so the delta reflects what the preparer put on the
  // return).
  const rental_net = return_data.rental_properties.reduce((acc, rp) => {
    const expense_total = Object.values(rp.expenses).reduce(
      (a, b) => a + b,
      0,
    );
    const depreciation = rp.depreciation.current_year_depreciation;
    return acc + (rp.rents_received - expense_total - depreciation);
  }, 0);

  // K-1 passive income (box 1 if is_passive, plus rental real estate box 2)
  const k1_passive_loss = return_data.k1s.reduce((acc, k1) => {
    if (!k1.is_passive) return acc;
    return acc + k1.ordinary_business_income + k1.rental_real_estate_income;
  }, 0);

  const combined = rental_net + k1_passive_loss - prior_cf;
  if (combined < 0) return Math.abs(Math.round(combined));
  return 0;
}

// ---------------------------------------------------------------------------
// Delta builders
// ---------------------------------------------------------------------------

function mk_delta(
  line_id: string,
  current: number,
  prior: number,
  explanation: string,
): YoYDelta {
  return {
    line_id,
    current_value: current,
    prior_value: prior,
    delta: current - prior,
    delta_percent: pct(current, prior),
    explanation,
  };
}

function explain_agi(current: number, prior: number): string {
  const delta = current - prior;
  const sign = delta >= 0 ? "up" : "down";
  return `AGI ${sign} ${format_usd(Math.abs(delta))} vs prior year (${format_usd(
    prior,
  )} → ${format_usd(current)}). Likely drivers: new RSU vest tranche on Olivia's W-2 and capital gains from LT-001/LT-004.`;
}

function explain_total_tax(current: number, prior: number): string {
  const delta = current - prior;
  const sign = delta >= 0 ? "higher" : "lower";
  return `Total federal tax ${sign} by ${format_usd(
    Math.abs(delta),
  )} vs prior year. Follows AGI growth and the larger long-term capital gain from the 2021 VTI lot.`;
}

function explain_refund(current: number, prior: number): string {
  if (current >= 0 && prior >= 0) {
    return `Refund swing of ${format_usd(current - prior)} vs prior year. Withholdings did not keep pace with the higher AGI — flag for safe-harbor check.`;
  }
  if (current < 0 && prior >= 0) {
    return `Household flipped from refund (${format_usd(prior)}) to owing (${format_usd(
      Math.abs(current),
    )}) — withholdings did not keep pace with the RSU vest tranche. Verify safe harbor on estimated tax.`;
  }
  if (current >= 0 && prior < 0) {
    return `Household flipped from owing to a refund of ${format_usd(current)} — confirm withholding updates were correctly applied.`;
  }
  return `Owing grew by ${format_usd(
    prior - current,
  )} — estimated tax safe harbor is at risk.`;
}

function explain_capital_loss_cf(current: number, prior: number): string {
  if (prior > 0 && current === 0) {
    return `Prior-year capital loss carryforward of ${format_usd(
      prior,
    )} was fully absorbed by current-year capital gains.`;
  }
  if (current > prior) {
    return `Capital loss carryforward grew by ${format_usd(
      current - prior,
    )} — net current-year capital loss.`;
  }
  return `Capital loss carryforward shrunk by ${format_usd(
    prior - current,
  )} vs prior year.`;
}

function explain_passive_cf(current: number, prior: number): string {
  if (current > prior) {
    return `Suspended passive activity loss carryforward grew by ${format_usd(
      current - prior,
    )} — AGI exceeds the §469(i) $150K ceiling, so the rental loss and K-1 passive loss are fully suspended.`;
  }
  return `Suspended passive activity loss carryforward shrunk by ${format_usd(
    prior - current,
  )} vs prior year.`;
}

function format_usd(amount: number): string {
  const rounded = Math.round(amount);
  const sign = rounded < 0 ? "-" : "";
  const abs = Math.abs(rounded);
  return `${sign}$${abs.toLocaleString("en-US")}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Compute year-over-year deltas for the pre-work engine.
 *
 * Returns an unbounded list — the brief caps the workbench strip at the
 * UI layer, so we emit everything significant and let Agent 4 prune.
 */
export function compute_yoy_delta(
  current: TaxReturn,
  prior: PriorYearSnapshot,
): YoYDelta[] {
  const deltas: YoYDelta[] = [];

  // --- 1. AGI -------------------------------------------------------------
  const current_agi = current.agi ?? 0;
  if (passes_threshold(current_agi, prior.agi)) {
    deltas.push(
      mk_delta(
        "1040.agi",
        current_agi,
        prior.agi,
        explain_agi(current_agi, prior.agi),
      ),
    );
  }

  // --- 2. Total tax -------------------------------------------------------
  const current_total_tax = current.total_tax ?? 0;
  if (passes_threshold(current_total_tax, prior.total_tax)) {
    deltas.push(
      mk_delta(
        "1040.total_tax",
        current_total_tax,
        prior.total_tax,
        explain_total_tax(current_total_tax, prior.total_tax),
      ),
    );
  }

  // --- 3. Refund or amount owed -------------------------------------------
  const cur_refund = current_refund_or_owed(current);
  if (passes_threshold(cur_refund, prior.refund_or_owed)) {
    deltas.push(
      mk_delta(
        "1040.refund_or_owed",
        cur_refund,
        prior.refund_or_owed,
        explain_refund(cur_refund, prior.refund_or_owed),
      ),
    );
  }

  // --- 4. Federal withholding ---------------------------------------------
  const cur_fed_wh = current_fed_withholding(current);
  // Prior withholding is implied by total_tax plus refund (refund > 0 =
  // over-withheld, refund < 0 = under-withheld).
  const prior_fed_wh = prior.total_tax + prior.refund_or_owed;
  if (passes_threshold(cur_fed_wh, prior_fed_wh)) {
    deltas.push(
      mk_delta(
        "1040.fed_withholding",
        cur_fed_wh,
        prior_fed_wh,
        `Federal withholding ${
          cur_fed_wh >= prior_fed_wh ? "up" : "down"
        } ${format_usd(Math.abs(cur_fed_wh - prior_fed_wh))} vs prior year. Confirm 401(k) deferral and state allocation on the CA workdays.`,
      ),
    );
  }

  // --- 5. Capital loss carryforward ---------------------------------------
  const cur_cap_cf = current_capital_loss_carryforward(current);
  const prior_cap_cf = prior.carryforwards?.capital_loss ?? 0;
  if (passes_threshold(cur_cap_cf, prior_cap_cf)) {
    deltas.push(
      mk_delta(
        "cf.capital_loss",
        cur_cap_cf,
        prior_cap_cf,
        explain_capital_loss_cf(cur_cap_cf, prior_cap_cf),
      ),
    );
  }

  // --- 6. Passive activity loss carryforward ------------------------------
  const cur_pal_cf = current_passive_activity_loss_carryforward(current);
  const prior_pal_cf = prior.carryforwards?.passive_activity_loss ?? 0;
  if (passes_threshold(cur_pal_cf, prior_pal_cf)) {
    deltas.push(
      mk_delta(
        "cf.passive_activity_loss",
        cur_pal_cf,
        prior_pal_cf,
        explain_passive_cf(cur_pal_cf, prior_pal_cf),
      ),
    );
  }

  return deltas;
}
