/**
 * Sprint 4 T-I09 — Zod validation tests for selections and approvals schemas.
 */

import { describe, expect, it } from "vitest";

import {
  validate_approvals,
  validate_selections,
} from "@/lib/intake/selections";

describe("validate_selections", () => {
  it("accepts a valid array of recommendation IDs", () => {
    const result = validate_selections(["rec-001", "rec-002", "rec-003"]);
    expect(result).toEqual(["rec-001", "rec-002", "rec-003"]);
  });

  it("accepts a single-element array", () => {
    const result = validate_selections(["rec-001"]);
    expect(result).toEqual(["rec-001"]);
  });

  it("rejects an empty array", () => {
    expect(() => validate_selections([])).toThrow();
  });

  it("rejects non-array input", () => {
    expect(() => validate_selections("rec-001")).toThrow();
    expect(() => validate_selections(42)).toThrow();
    expect(() => validate_selections(null)).toThrow();
    expect(() => validate_selections(undefined)).toThrow();
  });

  it("rejects array with empty strings", () => {
    expect(() => validate_selections(["rec-001", ""])).toThrow();
  });

  it("rejects array with strings longer than 100 chars", () => {
    expect(() => validate_selections(["a".repeat(101)])).toThrow();
  });

  it("accepts up to 50 items", () => {
    const ids = Array.from({ length: 50 }, (_, i) => `rec-${i + 1}`);
    const result = validate_selections(ids);
    expect(result.length).toBe(50);
  });

  it("rejects more than 50 items", () => {
    const ids = Array.from({ length: 51 }, (_, i) => `rec-${i + 1}`);
    expect(() => validate_selections(ids)).toThrow();
  });
});

describe("validate_approvals", () => {
  it("accepts valid approvals with both approved and declined", () => {
    const result = validate_approvals({
      approved: ["rec-001", "rec-002"],
      declined: ["rec-003"],
    });
    expect(result.approved).toEqual(["rec-001", "rec-002"]);
    expect(result.declined).toEqual(["rec-003"]);
  });

  it("accepts approvals with empty declined array", () => {
    const result = validate_approvals({
      approved: ["rec-001"],
      declined: [],
    });
    expect(result.approved).toEqual(["rec-001"]);
    expect(result.declined).toEqual([]);
  });

  it("accepts approvals with empty approved array", () => {
    const result = validate_approvals({
      approved: [],
      declined: ["rec-001"],
    });
    expect(result.approved).toEqual([]);
    expect(result.declined).toEqual(["rec-001"]);
  });

  it("rejects missing approved field", () => {
    expect(() => validate_approvals({ declined: ["rec-001"] })).toThrow();
  });

  it("rejects missing declined field", () => {
    expect(() => validate_approvals({ approved: ["rec-001"] })).toThrow();
  });

  it("rejects non-object input", () => {
    expect(() => validate_approvals("invalid")).toThrow();
    expect(() => validate_approvals(null)).toThrow();
    expect(() => validate_approvals(undefined)).toThrow();
  });

  it("rejects empty string IDs in approved", () => {
    expect(() =>
      validate_approvals({ approved: [""], declined: [] }),
    ).toThrow();
  });

  it("rejects empty string IDs in declined", () => {
    expect(() =>
      validate_approvals({ approved: [], declined: [""] }),
    ).toThrow();
  });
});
