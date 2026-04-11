/**
 * Goal intake — validation + persistence entry points for Agent 4's UI.
 *
 * `validate_intake` turns a raw user-supplied payload into a normalised
 * `Goal[]` with ADR-005 tag vectors attached. `persist_intake` is a
 * stub that logs the captured intake; real persistence lands with Agent 5's
 * audit-trail work.
 */

import type { Goal, GoalTag } from "@/contracts";

import {
  GOAL_TAG_VECTOR,
  GoalIntakeSchema,
  type GoalInput,
} from "./taxonomy";

const VALID_TAGS: ReadonlySet<GoalTag> = new Set<GoalTag>([
  "refund",
  "deductions",
  "credits",
  "audit_risk",
  "conservatism",
  "documentation",
  "life_event",
  "dependent",
  "marriage",
  "home",
  "carryforward",
  "loss_harvesting",
  "investment",
  "retirement",
  "ira",
  "401k",
  "speed",
  "simplicity",
  "irs_notice",
  "amendment",
  "major_purchase",
  "business",
]);

/**
 * Turn a raw intake payload into a validated, tag-attached Goal[].
 *
 * Throws a `ZodError` on any validation failure — callers are expected to
 * translate that into a 400 response at the API boundary.
 */
export function validate_intake(raw: unknown): Goal[] {
  const parsed = GoalIntakeSchema.parse(raw);
  return parsed.map(attach_tags);
}

/**
 * Persist a captured intake. Sprint 1 stub — writes a line to console so it
 * shows up in dev logs. Agent 5 swaps this for a SQLite insert.
 */
export async function persist_intake(
  case_id: string,
  goals: Goal[],
): Promise<void> {
  // eslint-disable-next-line no-console
  console.info(
    `[goal-intake] case=${case_id} captured ${goals.length} goal(s): ${goals
      .map((g) => `${g.rank}:${g.id}(w=${g.weight})`)
      .join(", ")}`,
  );
}

function attach_tags(input: GoalInput): Goal {
  const canonical_tags = GOAL_TAG_VECTOR[input.id];
  // If the caller supplied explicit tags (e.g. for the "other" goal), merge
  // them with the canonical set after filtering out any non-taxonomy tags.
  const merged: GoalTag[] = [...canonical_tags];
  if (input.tags) {
    for (const t of input.tags) {
      if (VALID_TAGS.has(t as GoalTag) && !merged.includes(t as GoalTag)) {
        merged.push(t as GoalTag);
      }
    }
  }

  return {
    id: input.id,
    rank: input.rank,
    weight: input.weight,
    rationale: input.rationale,
    tags: merged,
  };
}
