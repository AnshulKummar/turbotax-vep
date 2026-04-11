/**
 * T-601 (cont.) — Changing the goal mix changes the recommendation ranking.
 *
 * Proof that Big Bet B1's goal-aligned engine actually re-ranks based on
 * the customer's stated preferences. Skips gracefully until Agent 2's
 * engine is merged.
 */

import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import type { CustomerContext, Goal, Recommendation } from "@/contracts";

import {
  load_cross_slice_modules,
  type LoadedModules,
} from "./_load-modules";

// Top-level await: load modules at file-collection time so the it.skipIf
// flag is correct when describe() runs. (beforeAll fires too late.)
const mods: LoadedModules = await load_cross_slice_modules();
if (!mods.all_loaded) {
  // eslint-disable-next-line no-console
  console.log(
    `[goal-mix-reorder.test.ts] skipping: ${mods.skip_reason}. Tests will run post-merge.`,
  );
}

function base_context(goals: Goal[]): CustomerContext {
  return {
    case_id: mitchell_return.case_id,
    customer_display_name: "Olivia & Ryan Mitchell",
    goals,
    prior_year_summary: "TY2024 MFJ, $289.4K AGI",
  };
}

const REFUND_HEAVY: Goal[] = [
  {
    id: "maximize_refund",
    rank: 1,
    weight: 5,
    rationale: "Maximize refund this year",
    tags: ["refund", "deductions", "credits"],
  },
  {
    id: "optimize_retirement",
    rank: 2,
    weight: 2,
    rationale: "",
    tags: ["retirement"],
  },
  {
    id: "optimize_next_year",
    rank: 3,
    weight: 1,
    rationale: "",
    tags: [],
  },
];

const AUDIT_HEAVY: Goal[] = [
  {
    id: "minimize_audit_risk",
    rank: 1,
    weight: 5,
    rationale: "Avoid IRS notices at all costs",
    tags: ["audit_risk", "documentation", "conservatism"],
  },
  {
    id: "optimize_next_year",
    rank: 2,
    weight: 2,
    rationale: "",
    tags: [],
  },
  {
    id: "simplify_filing",
    rank: 3,
    weight: 1,
    rationale: "",
    tags: ["simplicity"],
  },
];

function rank_signature(recs: Recommendation[]): string {
  return recs
    .slice(0, 5)
    .map((r) => r.rule_id)
    .join("|");
}

describe("T-601 goal mix changes recommendation ranking", () => {
  it.skipIf(!mods.all_loaded)(
    "refund-heavy goals produce a different top-5 than audit-heavy goals",
    async () => {
      const engine = mods.engine!;
      const { recommendations: refund_recs } =
        await engine.produce_recommendations(
          mitchell_return,
          REFUND_HEAVY,
          base_context(REFUND_HEAVY),
        );
      const { recommendations: audit_recs } =
        await engine.produce_recommendations(
          mitchell_return,
          AUDIT_HEAVY,
          base_context(AUDIT_HEAVY),
        );

      expect(refund_recs.length).toBeGreaterThan(0);
      expect(audit_recs.length).toBeGreaterThan(0);
      expect(rank_signature(refund_recs)).not.toBe(rank_signature(audit_recs));
    },
  );

  it.skipIf(!mods.all_loaded)(
    "every recommendation carries per-goal fit scores in [0,1]",
    async () => {
      const engine = mods.engine!;
      const { recommendations: recs } = await engine.produce_recommendations(
        mitchell_return,
        REFUND_HEAVY,
        base_context(REFUND_HEAVY),
      );
      for (const rec of recs) {
        for (const fit of rec.goal_fits) {
          expect(fit.score).toBeGreaterThanOrEqual(0);
          expect(fit.score).toBeLessThanOrEqual(1);
        }
      }
    },
  );
});
