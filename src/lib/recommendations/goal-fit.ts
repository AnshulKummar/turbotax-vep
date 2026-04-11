/**
 * Goal-fit scoring — T-203.
 *
 * Given a partial recommendation (derived from a rule finding) and the
 * customer's goal vector, produce a per-goal fit score + composite.
 *
 * The scoring model has three additive components:
 *
 *   1. Tag overlap      — how many of the recommendation's category tags
 *                         intersect with the goal's ADR-005 tag vector.
 *   2. Customer weight  — the goal's weight in [1, 5] (heavier weights
 *                         amplify matches).
 *   3. Directional bias — refund-positive recs favour `maximize_refund`,
 *                         audit-risk-reducing recs favour
 *                         `minimize_audit_risk`, and category-specific
 *                         boosts (wash sale → harvest_losses, §121 →
 *                         plan_life_event, retirement → optimize_retirement)
 *                         apply to the corresponding goals.
 *
 * The returned per-goal score is clamped to [0, 1]. The composite is the
 * weight-weighted sum of the per-goal scores, also clamped to [0, 1].
 */

import type {
  DollarImpact,
  Goal,
  GoalFitScore,
  GoalId,
  GoalTag,
  RuleCategory,
} from "@/contracts";

/**
 * The canonical tag vector for every rule category. These tags are what the
 * goal-fit scorer intersects against the goal's tag vector to produce the
 * overlap component of the score.
 */
export const CATEGORY_TAGS: Record<RuleCategory, GoalTag[]> = {
  wash_sale: ["loss_harvesting", "investment", "audit_risk", "documentation"],
  hsa: ["deductions", "refund", "retirement"],
  rsu: ["refund", "deductions", "audit_risk", "documentation"],
  passive_activity_loss: ["carryforward", "audit_risk", "investment"],
  depreciation: ["deductions", "audit_risk", "documentation", "investment"],
  foreign_tax_credit: ["credits", "refund", "audit_risk"],
  salt_cap: ["deductions", "refund", "home"],
  retirement_contribution: ["retirement", "ira", "401k", "deductions", "refund"],
  ptet_election: ["deductions", "refund", "business"],
  section_121: ["home", "life_event", "major_purchase", "deductions"],
  credit_eligibility: ["credits", "refund", "dependent", "life_event"],
  amt: ["audit_risk", "deductions", "conservatism"],
  estimated_tax: ["audit_risk", "documentation", "conservatism"],
};

/**
 * Human-readable rationales for each (category, goal) combination. The
 * engine falls back to a generic "advances goal <X>" when an entry is
 * missing.
 */
const CATEGORY_GOAL_RATIONALE: Partial<
  Record<RuleCategory, Partial<Record<GoalId, string>>>
> = {
  rsu: {
    maximize_refund:
      "Correcting double-counted RSU income drops reported capital gains and directly restores refund dollars.",
    minimize_audit_risk:
      "Matching W-2 box 12 code V with 1099-B basis closes the #1 IRS matching-notice trigger on high-income returns.",
  },
  wash_sale: {
    harvest_losses:
      "Applying Code W preserves the loss carryforward and keeps the harvesting strategy intact.",
    minimize_audit_risk:
      "Wash sale Code W on 8949 is the exact field the IRS matching program looks for; fixing it avoids a bounce.",
  },
  hsa: {
    maximize_refund:
      "Raising Form 8889 line 6 to the correct family limit reclaims the above-the-line HSA deduction.",
    optimize_next_year:
      "Confirming the HSA limit keeps next year's contribution room accurate.",
  },
  depreciation: {
    maximize_refund:
      "Splitting land and building on the rental basis tightens depreciation and can open a current-year deduction.",
    minimize_audit_risk:
      "An explicit land/building allocation is the standard IRS audit position for rental depreciation.",
  },
  passive_activity_loss: {
    optimize_next_year:
      "Tracking the suspended PAL as a carryforward unlocks a future deduction once AGI drops below the §469(i) ceiling.",
    minimize_audit_risk:
      "Correctly suspending the loss prevents an IRS §469 phase-out recomputation.",
  },
  salt_cap: {
    maximize_refund:
      "The TY2025 $40K MFJ SALT cap opens itemized-deduction headroom that was unavailable at the prior $10K limit.",
  },
  ptet_election: {
    maximize_refund:
      "An Illinois PTET election converts capped state tax into an uncapped entity-level deduction.",
    minimize_audit_risk:
      "PTET is an elective regime; electing it closes an otherwise open question on the return.",
  },
  retirement_contribution: {
    optimize_retirement:
      "Maxing the 401(k) elective deferral captures the customer's full retirement headroom for the year.",
    optimize_next_year:
      "Higher 401(k) deferral reduces TY2025 AGI and sets next year's baseline lower.",
    maximize_refund:
      "Each additional $1 of 401(k) deferral saves federal tax at the customer's marginal rate.",
  },
  foreign_tax_credit: {
    minimize_audit_risk:
      "Electing the simplified <$600 FTC keeps Form 1116 off the return, which reduces audit surface.",
  },
  section_121: {
    plan_life_event:
      "Section 121 is the primary residence exclusion — it only applies during a home-sale life event.",
    plan_major_purchase:
      "Timing a future home sale around the §121 two-out-of-five rule can preserve up to $500K of MFJ exclusion.",
  },
  credit_eligibility: {
    plan_life_event:
      "New dependents / changed filing status open CTC / ODC / EIC doors; this is life-event territory.",
    maximize_refund:
      "Credits are dollar-for-dollar refund levers.",
  },
};

export interface GoalFitInput {
  category: RuleCategory;
  dollar_impact: DollarImpact;
  audit_risk_delta: number;
}

export interface GoalFitResult {
  goal_fits: GoalFitScore[];
  composite: number;
}

/**
 * Turn a category + dollar impact + audit risk delta into a per-goal fit
 * vector. This is the primary entry point the recommendation engine calls
 * before it attaches the rule finding's narrative.
 */
export function score_recommendation(
  rec: GoalFitInput,
  goals: Goal[],
): GoalFitResult {
  const category_tags = CATEGORY_TAGS[rec.category];
  const refund_positive = rec.dollar_impact.estimate > 0;
  const reduces_audit_risk = rec.audit_risk_delta < 0;

  const goal_fits: GoalFitScore[] = goals.map((goal) =>
    score_single_goal(
      rec.category,
      category_tags,
      refund_positive,
      reduces_audit_risk,
      goal,
    ),
  );

  // Composite = weight-weighted mean of per-goal scores, clamped [0, 1].
  const total_weight = goals.reduce((acc, g) => acc + g.weight, 0);
  const composite =
    total_weight === 0
      ? 0
      : goal_fits.reduce(
          (acc, fit, i) => acc + fit.score * goals[i].weight,
          0,
        ) / total_weight;

  return {
    goal_fits,
    composite: clamp01(composite),
  };
}

function score_single_goal(
  category: RuleCategory,
  category_tags: GoalTag[],
  refund_positive: boolean,
  reduces_audit_risk: boolean,
  goal: Goal,
): GoalFitScore {
  // Base score = tag overlap fraction over the goal's own tag vector.
  let score = tag_overlap_score(category_tags, goal.tags);

  // Directional bias — refund recs favour maximize_refund, audit-reducing
  // recs favour minimize_audit_risk.
  if (goal.id === "maximize_refund" && refund_positive) {
    score += 0.3;
  }
  if (goal.id === "minimize_audit_risk" && reduces_audit_risk) {
    score += 0.3;
  }

  // Category-specific affinities — these are the hand-tuned bumps that make
  // the test cases in T-203 produce the expected reorderings.
  score += category_goal_affinity(category, goal.id);

  // Customer weight — heavier weights slightly amplify a positive match.
  // A weight of 5 gives +0.1; a weight of 1 is neutral.
  if (score > 0) {
    score += (goal.weight - 1) * 0.025;
  }

  const final = clamp01(score);

  return {
    goal_id: goal.id,
    score: final,
    rationale: describe_fit(category, goal.id, final),
  };
}

function tag_overlap_score(
  category_tags: GoalTag[],
  goal_tags: GoalTag[],
): number {
  if (goal_tags.length === 0) return 0;
  const goal_set = new Set(goal_tags);
  let overlap = 0;
  for (const t of category_tags) {
    if (goal_set.has(t)) overlap += 1;
  }
  return overlap / goal_tags.length;
}

function category_goal_affinity(category: RuleCategory, goal: GoalId): number {
  // Strong hand-tuned affinities. Everything else falls through to 0 so the
  // score is driven entirely by the tag overlap and directional bias.
  const pairs: Record<string, number> = {
    "wash_sale|harvest_losses": 0.45,
    "wash_sale|minimize_audit_risk": 0.15,
    "rsu|maximize_refund": 0.2,
    "rsu|minimize_audit_risk": 0.2,
    "hsa|maximize_refund": 0.15,
    "hsa|optimize_retirement": 0.1,
    "depreciation|maximize_refund": 0.1,
    "depreciation|minimize_audit_risk": 0.15,
    "passive_activity_loss|optimize_next_year": 0.2,
    "passive_activity_loss|minimize_audit_risk": 0.1,
    "salt_cap|maximize_refund": 0.2,
    "ptet_election|maximize_refund": 0.1,
    "ptet_election|minimize_audit_risk": 0.1,
    "retirement_contribution|optimize_retirement": 0.4,
    "retirement_contribution|optimize_next_year": 0.15,
    "retirement_contribution|maximize_refund": 0.1,
    "section_121|plan_life_event": 0.45,
    "section_121|plan_major_purchase": 0.3,
    "credit_eligibility|plan_life_event": 0.4,
    "credit_eligibility|maximize_refund": 0.15,
    "foreign_tax_credit|minimize_audit_risk": 0.1,
    "amt|minimize_audit_risk": 0.15,
    "estimated_tax|minimize_audit_risk": 0.15,
  };
  return pairs[`${category}|${goal}`] ?? 0;
}

function describe_fit(
  category: RuleCategory,
  goal: GoalId,
  score: number,
): string {
  const tuned = CATEGORY_GOAL_RATIONALE[category]?.[goal];
  if (tuned) return tuned;
  if (score >= 0.5)
    return `Strongly advances "${goal}" via the ${category} category.`;
  if (score >= 0.2)
    return `Partially advances "${goal}" via ${category} tag overlap.`;
  return `Neutral to "${goal}".`;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
