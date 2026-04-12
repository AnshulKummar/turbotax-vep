/**
 * Sprint 4 T-K05 — ReviewFlow logic tests.
 *
 * Tests the exported helper functions from ReviewFlow that manage
 * decision state, counting, and submit eligibility. Pure logic tests
 * with no DOM rendering required.
 */

import { describe, expect, it } from "vitest";

import {
  buildInitialDecisions,
  canSubmit,
  countDecisions,
  setDecision,
} from "../../app/(customer)/review/ReviewFlow";

// ---------------------------------------------------------------------------
// buildInitialDecisions
// ---------------------------------------------------------------------------

describe("buildInitialDecisions", () => {
  it("returns an empty map when no approvals are provided", () => {
    const map = buildInitialDecisions(undefined);
    expect(map.size).toBe(0);
  });

  it("populates approved and declined from prior approvals", () => {
    const map = buildInitialDecisions({
      approved: ["rec-001", "rec-002"],
      declined: ["rec-003"],
    });
    expect(map.size).toBe(3);
    expect(map.get("rec-001")).toBe("approved");
    expect(map.get("rec-002")).toBe("approved");
    expect(map.get("rec-003")).toBe("declined");
  });

  it("handles empty arrays", () => {
    const map = buildInitialDecisions({ approved: [], declined: [] });
    expect(map.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// setDecision
// ---------------------------------------------------------------------------

describe("setDecision", () => {
  it("adds a new decision to the map", () => {
    const prev = new Map<string, "approved" | "declined">();
    const next = setDecision(prev, "rec-001", "approved");
    expect(next.get("rec-001")).toBe("approved");
    // Original is unchanged (immutable)
    expect(prev.size).toBe(0);
  });

  it("switches a decision from approved to declined", () => {
    const prev = new Map<string, "approved" | "declined">([
      ["rec-001", "approved"],
    ]);
    const next = setDecision(prev, "rec-001", "declined");
    expect(next.get("rec-001")).toBe("declined");
    // Original unchanged
    expect(prev.get("rec-001")).toBe("approved");
  });

  it("switches a decision from declined to approved", () => {
    const prev = new Map<string, "approved" | "declined">([
      ["rec-001", "declined"],
    ]);
    const next = setDecision(prev, "rec-001", "approved");
    expect(next.get("rec-001")).toBe("approved");
  });

  it("preserves other decisions when updating one", () => {
    const prev = new Map<string, "approved" | "declined">([
      ["rec-001", "approved"],
      ["rec-002", "declined"],
    ]);
    const next = setDecision(prev, "rec-003", "approved");
    expect(next.size).toBe(3);
    expect(next.get("rec-001")).toBe("approved");
    expect(next.get("rec-002")).toBe("declined");
    expect(next.get("rec-003")).toBe("approved");
  });
});

// ---------------------------------------------------------------------------
// countDecisions
// ---------------------------------------------------------------------------

describe("countDecisions", () => {
  it("counts zero approved and declined on empty map", () => {
    const map = new Map<string, "approved" | "declined">();
    const c = countDecisions(map, 5);
    expect(c.approved).toBe(0);
    expect(c.declined).toBe(0);
    expect(c.remaining).toBe(5);
  });

  it("counts approved and declined correctly", () => {
    const map = new Map<string, "approved" | "declined">([
      ["rec-001", "approved"],
      ["rec-002", "approved"],
      ["rec-003", "declined"],
    ]);
    const c = countDecisions(map, 5);
    expect(c.approved).toBe(2);
    expect(c.declined).toBe(1);
    expect(c.remaining).toBe(2);
  });

  it("remaining is zero when all decisions made", () => {
    const map = new Map<string, "approved" | "declined">([
      ["rec-001", "approved"],
      ["rec-002", "declined"],
    ]);
    const c = countDecisions(map, 2);
    expect(c.remaining).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// canSubmit
// ---------------------------------------------------------------------------

describe("canSubmit", () => {
  it("returns false when no decisions have been made", () => {
    const map = new Map<string, "approved" | "declined">();
    expect(canSubmit(map, 3)).toBe(false);
  });

  it("returns false when only some decisions are made", () => {
    const map = new Map<string, "approved" | "declined">([
      ["rec-001", "approved"],
    ]);
    expect(canSubmit(map, 3)).toBe(false);
  });

  it("returns true when all decisions are made", () => {
    const map = new Map<string, "approved" | "declined">([
      ["rec-001", "approved"],
      ["rec-002", "declined"],
      ["rec-003", "approved"],
    ]);
    expect(canSubmit(map, 3)).toBe(true);
  });

  it("returns false when total is 0 (no recommendations)", () => {
    const map = new Map<string, "approved" | "declined">();
    expect(canSubmit(map, 0)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Already-submitted detection
// ---------------------------------------------------------------------------

describe("already-submitted detection", () => {
  it("buildInitialDecisions restores prior state, enabling canSubmit", () => {
    const priorApprovals = {
      approved: ["rec-001", "rec-003"],
      declined: ["rec-002"],
    };
    const map = buildInitialDecisions(priorApprovals);
    // All 3 decisions are restored
    expect(canSubmit(map, 3)).toBe(true);
    // Counts are correct
    const c = countDecisions(map, 3);
    expect(c.approved).toBe(2);
    expect(c.declined).toBe(1);
    expect(c.remaining).toBe(0);
  });
});
