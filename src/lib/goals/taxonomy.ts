/**
 * Goal taxonomy — ADR-005.
 *
 * Ten canonical customer goals + one free-text "other" option. Each goal is
 * tagged with a fixed tag vector that the recommendation engine (T-203)
 * combines with the customer's weight to rank recommendations.
 *
 * Agent 2 owns this file; Agent 1 owns the contracts it imports from.
 */

import { z } from "zod/v4";

import { GOAL_IDS, type GoalId, type GoalTag } from "@/contracts";

/**
 * The canonical tag vector for each goal. "other" is empty because its tags
 * must be inferred from the free-text rationale (Sprint 1 leaves that empty
 * and lets the LLM pick up the slack).
 */
export const GOAL_TAG_VECTOR: Record<GoalId, GoalTag[]> = {
  maximize_refund: ["refund", "deductions", "credits"],
  minimize_audit_risk: ["audit_risk", "conservatism", "documentation"],
  plan_life_event: ["life_event", "dependent", "marriage", "home"],
  optimize_next_year: ["deductions", "carryforward", "retirement"],
  harvest_losses: ["loss_harvesting", "investment", "carryforward"],
  optimize_retirement: ["retirement", "ira", "401k"],
  simplify_filing: ["speed", "simplicity"],
  dispute_irs_notice: ["irs_notice", "amendment", "documentation"],
  plan_major_purchase: ["major_purchase", "home", "business"],
  other: [],
};

/**
 * Plain-language label for each goal. Used by the LLM prompt and by the UI.
 */
export const GOAL_LABEL: Record<GoalId, string> = {
  maximize_refund: "Get the biggest refund I'm legally entitled to",
  minimize_audit_risk: "Minimize my audit risk",
  plan_life_event: "Plan around a life event (baby, marriage, home, retirement)",
  optimize_next_year: "Set me up for a smaller tax bill next year",
  harvest_losses: "Use my investment losses without messing up carryforwards",
  optimize_retirement: "Make sure my retirement contributions are right",
  simplify_filing: "Get this filed correctly with minimum back-and-forth",
  dispute_irs_notice: "Respond to an IRS notice",
  plan_major_purchase: "Think about the tax angle of a house or business",
  other: "Something else (free text)",
};

/**
 * The Zod schema for a single inbound customer goal. This is the surface
 * Agent 4's intake UI validates against before calling the API route in
 * T-204. Tags are attached automatically by `validate_intake` so the intake
 * UI does not have to know the tag taxonomy.
 */
export const GoalInputSchema = z
  .object({
    id: z.enum(GOAL_IDS),
    rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    weight: z.union([
      z.literal(1),
      z.literal(2),
      z.literal(3),
      z.literal(4),
      z.literal(5),
    ]),
    rationale: z.string().max(500).optional(),
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (g) => g.id !== "other" || (g.rationale !== undefined && g.rationale.trim().length > 0),
    { message: "The 'other' goal requires a free-text rationale." },
  );

export type GoalInput = z.infer<typeof GoalInputSchema>;

/**
 * A full intake is an array of 1-3 goals with unique ranks. Rank 1 is the
 * customer's top priority.
 */
export const GoalIntakeSchema = z
  .array(GoalInputSchema)
  .min(1, "At least one goal is required.")
  .max(3, "The customer may rank at most three goals.")
  .refine(
    (goals) => {
      const ranks = goals.map((g) => g.rank);
      return new Set(ranks).size === ranks.length;
    },
    { message: "Goal ranks must be unique across the intake." },
  )
  .refine(
    (goals) => {
      const ids = goals.map((g) => g.id);
      // Two goals both set to "other" are allowed (distinct rationales), but
      // a non-"other" id may only appear once.
      const non_other = ids.filter((id) => id !== "other");
      return new Set(non_other).size === non_other.length;
    },
    { message: "The same canonical goal cannot appear twice." },
  );

export type GoalIntake = z.infer<typeof GoalIntakeSchema>;
