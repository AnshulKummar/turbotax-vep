/**
 * T-601 (cont.) — Expert minutes counter ticks against the right baselines.
 *
 * PRD Section 7 demo point 10 and Section 8 row "Expert minutes per return"
 * pin two baselines:
 *
 *   - legacy_minutes  = 30   (pre-AI baseline per PRD narrative)
 *   - ty2025_minutes  = 24   (Intuit's stated ~20% AI reduction)
 *
 * The counter should:
 *   1. Produce a delta against both baselines for any elapsed time
 *   2. Report "under target" when elapsed < ty2025_minutes
 *   3. Report "over target" when elapsed > ty2025_minutes
 *   4. Produce a savings-vs-legacy number, positive if the expert is
 *      tracking ahead of the pre-AI baseline
 *
 * Agent 4 owns the React component; this test owns the math contract.
 * Inlining the helper here keeps the test independent of the component
 * path while the component is being written in parallel.
 */

import { describe, expect, it } from "vitest";

const LEGACY_MINUTES = 30;
const TY2025_MINUTES = 24;

interface MinutesState {
  elapsed: number;
  under_ty2025_target: boolean;
  under_legacy_target: boolean;
  savings_vs_legacy: number;
  savings_vs_ty2025: number;
}

/**
 * Pure function the Agent 4 component ports. Duplicated here so the
 * contract ships with the integration tests independent of the UI.
 */
function expert_minutes_state(elapsed_minutes: number): MinutesState {
  return {
    elapsed: elapsed_minutes,
    under_ty2025_target: elapsed_minutes < TY2025_MINUTES,
    under_legacy_target: elapsed_minutes < LEGACY_MINUTES,
    savings_vs_legacy: LEGACY_MINUTES - elapsed_minutes,
    savings_vs_ty2025: TY2025_MINUTES - elapsed_minutes,
  };
}

describe("T-601 expert minutes counter", () => {
  it("reports savings vs both baselines at 10 minutes elapsed", () => {
    const s = expert_minutes_state(10);
    expect(s.savings_vs_legacy).toBe(20);
    expect(s.savings_vs_ty2025).toBe(14);
    expect(s.under_ty2025_target).toBe(true);
    expect(s.under_legacy_target).toBe(true);
  });

  it("flips to over-target after the TY2025 baseline passes", () => {
    const s = expert_minutes_state(25);
    expect(s.under_ty2025_target).toBe(false);
    expect(s.under_legacy_target).toBe(true);
    expect(s.savings_vs_ty2025).toBeLessThan(0);
  });

  it("reports deficit vs legacy once the legacy baseline passes", () => {
    const s = expert_minutes_state(35);
    expect(s.under_legacy_target).toBe(false);
    expect(s.savings_vs_legacy).toBeLessThan(0);
  });

  it("target baselines come from PRD Section 7 demo point 10", () => {
    // Locked in so changing them is an explicit review event.
    expect(LEGACY_MINUTES).toBe(30);
    expect(TY2025_MINUTES).toBe(24);
  });
});
