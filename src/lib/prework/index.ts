/**
 * Public entry point for the Pre-Work Engine.
 *
 * The API route in `app/api/prework/route.ts` composes these modules to
 * produce a full `PreWorkOutput`. Keeping the composition here (instead
 * of inlined in the route handler) makes the engine unit-testable without
 * spinning up a Next.js request.
 */

import type {
  PreWorkOutput,
  PriorYearSnapshot,
  RuleFinding,
  TaxReturn,
} from "@/contracts";

import { mock_ocr } from "./ocr";
import { compute_yoy_delta } from "./yoy-delta";
import { compute_complexity } from "./complexity";
import { build_risk_register } from "./risk-register";

export { mock_ocr, LOW_CONFIDENCE_LINE_IDS } from "./ocr";
export { compute_yoy_delta } from "./yoy-delta";
export { compute_complexity, COMPLEXITY_FACTOR_LABELS } from "./complexity";
export { build_risk_register } from "./risk-register";

/**
 * Compose the entire pre-work engine output for a return.
 *
 * The caller is expected to supply the rule findings (typically from
 * `evaluate_all` in `@/lib/rules`) so the prework module does not need
 * to depend on the rules engine directly. This keeps the prework layer
 * testable with synthetic findings in isolation.
 */
export function run_prework(
  return_data: TaxReturn,
  rule_findings: RuleFinding[],
  prior_return?: PriorYearSnapshot,
): PreWorkOutput {
  const ocr = mock_ocr(return_data);
  const prior = prior_return ?? return_data.prior_year;
  const yoy_delta = prior ? compute_yoy_delta(return_data, prior) : [];
  const complexity = compute_complexity(return_data);
  const risk_register = build_risk_register(return_data, rule_findings);

  return {
    case_id: return_data.case_id,
    ocr,
    yoy_delta,
    complexity,
    risk_register,
  };
}
