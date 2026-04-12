/**
 * Pure validation logic for the public /intake form — T-705.
 *
 * Split out of the React component so vitest can exercise it without
 * rendering JSX. The real "source of truth" schema is
 * src/lib/goals/taxonomy.ts → `GoalIntakeSchema`; this module layers the
 * tighter form-level rules the UI enforces on top of that:
 *
 *   - Exactly three goals are selected.
 *   - Each row has a rank of 1, 2, or 3; ranks must be unique.
 *   - Weight is 1-5.
 *   - The "other" goal requires a non-empty rationale.
 *
 * Returns `{ ok: true, goals }` on success (the `goals` are suitable for
 * POSTing to /api/intake verbatim) or `{ ok: false, errors }` on failure
 * with per-field error strings that the form renders inline.
 */

import { z } from "zod/v4";

import { GOAL_IDS, type GoalId } from "@/contracts";

export interface FormRow {
  id: GoalId | "";
  rank: 1 | 2 | 3;
  weight: number; // 1-5, stored as a plain number the <select> emits.
  rationale: string;
}

export interface FormState {
  rows: [FormRow, FormRow, FormRow];
}

export type FormErrorKey =
  | `row_${0 | 1 | 2}_id`
  | `row_${0 | 1 | 2}_weight`
  | `row_${0 | 1 | 2}_rationale`
  | "ranks"
  | "duplicates"
  | "form";

export type FormErrors = Partial<Record<FormErrorKey, string>>;

export interface ValidGoalPayload {
  id: GoalId;
  rank: 1 | 2 | 3;
  weight: 1 | 2 | 3 | 4 | 5;
  rationale?: string;
}

export type ValidationResult =
  | { ok: true; goals: ValidGoalPayload[] }
  | { ok: false; errors: FormErrors };

const GOAL_ID_SET: ReadonlySet<string> = new Set(GOAL_IDS);

/** Factory for a fresh empty form — row i pre-fills rank (i+1). */
export function make_empty_form(): FormState {
  return {
    rows: [
      { id: "", rank: 1, weight: 3, rationale: "" },
      { id: "", rank: 2, weight: 3, rationale: "" },
      { id: "", rank: 3, weight: 3, rationale: "" },
    ],
  };
}

/**
 * Validate the form. Pure function: no DOM, no fetch.
 *
 * The rules here intentionally mirror `GoalIntakeSchema` but produce
 * per-field error keys the UI can attach to inputs.
 */
export function validate_form(state: FormState): ValidationResult {
  const errors: FormErrors = {};
  const rows = state.rows;

  // Per-row checks.
  rows.forEach((row, i) => {
    const idx = i as 0 | 1 | 2;
    if (!row.id || !GOAL_ID_SET.has(row.id)) {
      errors[`row_${idx}_id`] = "Pick a goal.";
    }
    if (!Number.isInteger(row.weight) || row.weight < 1 || row.weight > 5) {
      errors[`row_${idx}_weight`] = "Weight must be between 1 and 5.";
    }
    if (row.id === "other") {
      const trimmed = row.rationale.trim();
      if (trimmed.length === 0) {
        errors[`row_${idx}_rationale`] =
          "Describe your 'other' goal in a few words.";
      } else if (trimmed.length > 500) {
        errors[`row_${idx}_rationale`] = "Keep it under 500 characters.";
      }
    }
  });

  // Rank uniqueness: ranks must be {1, 2, 3}.
  const ranks = rows.map((r) => r.rank).sort();
  if (ranks[0] !== 1 || ranks[1] !== 2 || ranks[2] !== 3) {
    errors.ranks = "Each of ranks 1, 2, and 3 must be used exactly once.";
  }

  // Duplicate canonical goal ids (ignoring "other" which can repeat).
  const non_other_ids = rows
    .map((r) => r.id)
    .filter((id): id is GoalId => id !== "" && id !== "other");
  if (new Set(non_other_ids).size !== non_other_ids.length) {
    errors.duplicates = "The same goal can't be chosen twice.";
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }

  // Final belt-and-suspenders check against the canonical taxonomy schema
  // so the client never POSTs anything the server would reject.
  const payload = rows.map((r) => ({
    id: r.id as GoalId,
    rank: r.rank,
    weight: r.weight as 1 | 2 | 3 | 4 | 5,
    ...(r.id === "other" || r.rationale.trim().length > 0
      ? { rationale: r.rationale.trim() }
      : {}),
  }));

  const parsed = z
    .array(
      z.object({
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
      }),
    )
    .safeParse(payload);

  if (!parsed.success) {
    return {
      ok: false,
      errors: { form: "The form has invalid values. Please review." },
    };
  }

  return { ok: true, goals: parsed.data };
}
