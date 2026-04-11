import { describe, expect, it } from "vitest";

import { GOAL_IDS } from "@/contracts";
import { persist_intake, validate_intake } from "@/lib/goals/intake";

describe("validate_intake (T-201)", () => {
  it("validates every canonical goal id individually", () => {
    for (const id of GOAL_IDS) {
      // 'other' requires a rationale; supply one for every id.
      const goals = validate_intake([
        { id, rank: 1, weight: 3, rationale: "Test rationale." },
      ]);
      expect(goals).toHaveLength(1);
      expect(goals[0].id).toBe(id);
      if (id !== "other") {
        expect(goals[0].tags.length).toBeGreaterThan(0);
      }
    }
  });

  it("validates a free-text 'other' goal with rationale", () => {
    const goals = validate_intake([
      {
        id: "other",
        rank: 1,
        weight: 4,
        rationale: "I want to qualify for a mortgage next quarter.",
      },
    ]);
    expect(goals).toHaveLength(1);
    expect(goals[0].id).toBe("other");
    expect(goals[0].rationale).toMatch(/mortgage/);
  });

  it("rejects an 'other' goal with no rationale", () => {
    expect(() =>
      validate_intake([{ id: "other", rank: 1, weight: 3 }]),
    ).toThrow();
  });

  it("enforces rank in 1..3", () => {
    expect(() =>
      validate_intake([{ id: "maximize_refund", rank: 4, weight: 3 }]),
    ).toThrow();
    expect(() =>
      validate_intake([{ id: "maximize_refund", rank: 0, weight: 3 }]),
    ).toThrow();
  });

  it("enforces weight in 1..5", () => {
    expect(() =>
      validate_intake([{ id: "maximize_refund", rank: 1, weight: 6 }]),
    ).toThrow();
    expect(() =>
      validate_intake([{ id: "maximize_refund", rank: 1, weight: 0 }]),
    ).toThrow();
  });

  it("rejects an empty intake", () => {
    expect(() => validate_intake([])).toThrow();
  });

  it("rejects a 4-goal intake (top-three only)", () => {
    expect(() =>
      validate_intake([
        { id: "maximize_refund", rank: 1, weight: 5 },
        { id: "minimize_audit_risk", rank: 2, weight: 4 },
        { id: "harvest_losses", rank: 3, weight: 3 },
        { id: "optimize_retirement", rank: 3, weight: 2 },
      ]),
    ).toThrow();
  });

  it("rejects duplicate ranks", () => {
    expect(() =>
      validate_intake([
        { id: "maximize_refund", rank: 1, weight: 5 },
        { id: "minimize_audit_risk", rank: 1, weight: 3 },
      ]),
    ).toThrow();
  });

  it("rejects a duplicate canonical goal", () => {
    expect(() =>
      validate_intake([
        { id: "maximize_refund", rank: 1, weight: 5 },
        { id: "maximize_refund", rank: 2, weight: 3 },
      ]),
    ).toThrow();
  });

  it("attaches ADR-005 tag vectors automatically", () => {
    const goals = validate_intake([
      { id: "maximize_refund", rank: 1, weight: 5 },
      { id: "minimize_audit_risk", rank: 2, weight: 3 },
    ]);
    expect(goals[0].tags).toEqual(
      expect.arrayContaining(["refund", "deductions", "credits"]),
    );
    expect(goals[1].tags).toEqual(
      expect.arrayContaining(["audit_risk", "conservatism", "documentation"]),
    );
  });

  it("persist_intake is a non-throwing stub", async () => {
    const goals = validate_intake([
      { id: "maximize_refund", rank: 1, weight: 5 },
    ]);
    await expect(persist_intake("case-123", goals)).resolves.toBeUndefined();
  });
});
