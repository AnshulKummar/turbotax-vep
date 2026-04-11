import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import { compute_yoy_delta } from "@/lib/prework/yoy-delta";
import type { PriorYearSnapshot } from "@/contracts";

const mitchell_prior = mitchell_return.prior_year as PriorYearSnapshot;

describe("compute_yoy_delta — Mitchell return", () => {
  const deltas = compute_yoy_delta(mitchell_return, mitchell_prior);

  it("emits at least 5 deltas on the Mitchell return vs TY2024", () => {
    expect(deltas.length).toBeGreaterThanOrEqual(5);
  });

  it("every delta exceeds the $500 OR 10% threshold", () => {
    for (const d of deltas) {
      const abs = Math.abs(d.delta);
      const rel_bar = Math.abs(d.prior_value) * 0.1;
      const bar = Math.max(500, rel_bar);
      expect(abs, `delta for ${d.line_id}`).toBeGreaterThan(bar);
    }
  });

  it("every delta has a non-empty plain-language explanation", () => {
    for (const d of deltas) {
      expect(d.explanation.length).toBeGreaterThan(10);
      expect(typeof d.explanation).toBe("string");
    }
  });

  it("includes AGI, total_tax, and refund_or_owed", () => {
    const line_ids = deltas.map((d) => d.line_id);
    expect(line_ids).toContain("1040.agi");
    expect(line_ids).toContain("1040.total_tax");
    expect(line_ids).toContain("1040.refund_or_owed");
  });

  it("AGI delta is consistent with the prior snapshot", () => {
    const agi = deltas.find((d) => d.line_id === "1040.agi");
    expect(agi).toBeDefined();
    expect(agi!.current_value).toBe(325_850);
    expect(agi!.prior_value).toBe(289_400);
    expect(agi!.delta).toBe(325_850 - 289_400);
  });

  it("delta_percent is a finite number for non-zero priors", () => {
    for (const d of deltas) {
      if (d.prior_value !== 0) {
        expect(Number.isFinite(d.delta_percent)).toBe(true);
      }
    }
  });
});

describe("compute_yoy_delta — edge cases", () => {
  it("returns fewer deltas when the prior year matches the current year", () => {
    const flat_prior: PriorYearSnapshot = {
      ...mitchell_prior,
      agi: mitchell_return.agi ?? 0,
      total_tax: mitchell_return.total_tax ?? 0,
    };
    const deltas = compute_yoy_delta(mitchell_return, flat_prior);
    // AGI + total_tax should drop out; refund / carryforwards may stay.
    const line_ids = deltas.map((d) => d.line_id);
    expect(line_ids).not.toContain("1040.agi");
    expect(line_ids).not.toContain("1040.total_tax");
  });
});
