import { describe, expect, it } from "vitest";

import { GOAL_IDS, type GoalId } from "@/contracts";
import { GOAL_LABEL, GOAL_TAG_VECTOR } from "@/lib/goals/taxonomy";

describe("goal taxonomy (ADR-005)", () => {
  it("covers all 10 canonical goal ids plus 'other'", () => {
    // 9 canonical + 1 "other" = 10 total.
    expect(GOAL_IDS).toHaveLength(10);
    expect(GOAL_IDS).toContain("other");
  });

  it("assigns a tag vector for every goal id", () => {
    for (const id of GOAL_IDS) {
      expect(GOAL_TAG_VECTOR[id]).toBeDefined();
      if (id !== "other") {
        expect(GOAL_TAG_VECTOR[id].length).toBeGreaterThan(0);
      }
    }
  });

  it("assigns a plain-language label for every goal id", () => {
    for (const id of GOAL_IDS) {
      expect(GOAL_LABEL[id]).toBeDefined();
      expect(GOAL_LABEL[id].length).toBeGreaterThan(0);
    }
  });

  it("tag vectors match ADR-005 examples", () => {
    const maximize_refund_id: GoalId = "maximize_refund";
    expect(GOAL_TAG_VECTOR[maximize_refund_id]).toEqual(
      expect.arrayContaining(["refund", "deductions", "credits"]),
    );
    const minimize_audit_id: GoalId = "minimize_audit_risk";
    expect(GOAL_TAG_VECTOR[minimize_audit_id]).toEqual(
      expect.arrayContaining(["audit_risk", "conservatism", "documentation"]),
    );
  });
});
