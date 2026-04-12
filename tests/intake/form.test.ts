/**
 * T-705 — pure validation logic for the /intake form.
 *
 * The form component is a thin React wrapper around validate_form. These
 * tests pin the rules that drive the inline UI errors:
 *
 *   - exactly three rows with ranks {1, 2, 3}
 *   - each row picks a goal from GOAL_IDS
 *   - weight in [1, 5]
 *   - "other" requires a non-empty rationale
 *   - duplicate canonical goals rejected; duplicate "other" allowed
 */

import { describe, expect, it } from "vitest";

import { GOAL_IDS, type GoalId } from "@/contracts";
import {
  make_empty_form,
  validate_form,
  type FormRow,
  type FormState,
} from "@/lib/intake/form";

function row(
  id: GoalId | "",
  rank: 1 | 2 | 3,
  weight: number,
  rationale = "",
): FormRow {
  return { id, rank, weight, rationale };
}

function state(r1: FormRow, r2: FormRow, r3: FormRow): FormState {
  return { rows: [r1, r2, r3] };
}

describe("make_empty_form", () => {
  it("returns three rows with ranks 1, 2, 3 and no goal chosen", () => {
    const s = make_empty_form();
    expect(s.rows).toHaveLength(3);
    expect(s.rows.map((r) => r.rank)).toEqual([1, 2, 3]);
    expect(s.rows.every((r) => r.id === "")).toBe(true);
  });
});

describe("validate_form — happy paths", () => {
  it("accepts three distinct canonical goals with unique ranks", () => {
    const result = validate_form(
      state(
        row("maximize_refund", 1, 5),
        row("minimize_audit_risk", 2, 4),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.goals).toHaveLength(3);
      expect(result.goals.map((g) => g.id)).toEqual([
        "maximize_refund",
        "minimize_audit_risk",
        "optimize_next_year",
      ]);
      expect(result.goals.map((g) => g.weight)).toEqual([5, 4, 3]);
    }
  });

  it("accepts 'other' with a rationale", () => {
    const result = validate_form(
      state(
        row("other", 1, 4, "move to another state next year"),
        row("simplify_filing", 2, 3),
        row("minimize_audit_risk", 3, 2),
      ),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.goals[0].id).toBe("other");
      expect(result.goals[0].rationale).toBe("move to another state next year");
    }
  });

  it("allows two 'other' rows with distinct rationales", () => {
    const result = validate_form(
      state(
        row("other", 1, 4, "move states"),
        row("other", 2, 3, "starting a side business"),
        row("maximize_refund", 3, 5),
      ),
    );
    expect(result.ok).toBe(true);
  });

  it("covers every canonical goal id via the taxonomy", () => {
    // Smoke test — every id produces a valid single-goal payload when
    // dropped into row 0 (with a rationale for 'other'). This locks the
    // form to the same taxonomy the recommendation engine consumes.
    for (const id of GOAL_IDS) {
      const result = validate_form(
        state(
          row(id, 1, 3, id === "other" ? "free text rationale" : ""),
          row(
            id === "maximize_refund" ? "minimize_audit_risk" : "maximize_refund",
            2,
            3,
          ),
          row(
            id === "optimize_next_year"
              ? "harvest_losses"
              : "optimize_next_year",
            3,
            3,
          ),
        ),
      );
      expect(result.ok, `goal ${id} should be accepted`).toBe(true);
    }
  });
});

describe("validate_form — failures", () => {
  it("rejects an unpicked goal with a per-row error", () => {
    const result = validate_form(
      state(
        row("", 1, 3),
        row("minimize_audit_risk", 2, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.row_0_id).toBeDefined();
    }
  });

  it("rejects duplicate ranks", () => {
    const result = validate_form(
      state(
        row("maximize_refund", 1, 3),
        row("minimize_audit_risk", 1, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.ranks).toBeDefined();
    }
  });

  it("rejects duplicate canonical goals", () => {
    const result = validate_form(
      state(
        row("maximize_refund", 1, 3),
        row("maximize_refund", 2, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.duplicates).toBeDefined();
    }
  });

  it("rejects weight outside 1-5", () => {
    const result = validate_form(
      state(
        row("maximize_refund", 1, 0),
        row("minimize_audit_risk", 2, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.row_0_weight).toBeDefined();
    }

    const result_high = validate_form(
      state(
        row("maximize_refund", 1, 3),
        row("minimize_audit_risk", 2, 6),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result_high.ok).toBe(false);
    if (!result_high.ok) {
      expect(result_high.errors.row_1_weight).toBeDefined();
    }
  });

  it("rejects 'other' goal with empty rationale", () => {
    const result = validate_form(
      state(
        row("other", 1, 3, ""),
        row("minimize_audit_risk", 2, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.row_0_rationale).toBeDefined();
    }
  });

  it("rejects 'other' goal with whitespace-only rationale", () => {
    const result = validate_form(
      state(
        row("other", 1, 3, "    "),
        row("minimize_audit_risk", 2, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.row_0_rationale).toBeDefined();
    }
  });

  it("rejects 'other' goal with a rationale longer than 500 chars", () => {
    const result = validate_form(
      state(
        row("other", 1, 3, "x".repeat(501)),
        row("minimize_audit_risk", 2, 3),
        row("optimize_next_year", 3, 3),
      ),
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.row_0_rationale).toBeDefined();
    }
  });
});
