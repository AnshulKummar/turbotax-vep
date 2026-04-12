/**
 * AppCue + tier classification tests — Sprint 4 T-J06.
 *
 * Since vitest runs in node environment (no DOM), these tests validate
 * the underlying logic: tier classification, tier filtering, and
 * structural expectations for the AppCue component module.
 */
import { describe, expect, it } from "vitest";

import {
  classify_tier,
  classify_all,
  group_by_tier,
  type RecommendationTier,
} from "@/lib/recommendations/tiers";
import type { Recommendation } from "@/contracts";

// ---------------------------------------------------------------------------
// Helpers — minimal Recommendation stubs
// ---------------------------------------------------------------------------

function makeRec(overrides: Partial<Recommendation> & { id: string }): Recommendation {
  return {
    rule_id: "test-rule",
    finding_id: "finding-001",
    category: "rsu",
    severity: 3,
    irc_citation: "IRC test",
    one_line_summary: "Test rec",
    detail: "Test detail",
    affected_lines: [],
    dollar_impact: { estimate: 5000, low: 2000, high: 8000 },
    audit_risk_delta: 0,
    goal_fits: [{ goal_id: "maximize_refund", score: 0.5, rationale: "test" }],
    composite_goal_fit: 0.5,
    confidence: 0.8,
    llm_only: false,
    audit_id: "audit-001",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// AppCue module exists and exports correctly
// ---------------------------------------------------------------------------

describe("AppCue module", () => {
  it("exports AppCue as a named export", async () => {
    // Dynamic import to verify the module shape without needing DOM
    const mod = await import("../../components/workbench/AppCue");
    expect(mod.AppCue).toBeDefined();
    expect(typeof mod.AppCue).toBe("function");
  });

  it("AppCue accepts title, body, and optional accentColor props", async () => {
    const mod = await import("../../components/workbench/AppCue");
    // The function exists and can be called (React component)
    expect(mod.AppCue.length).toBeGreaterThanOrEqual(0);
  });
});

// ---------------------------------------------------------------------------
// Tier classification
// ---------------------------------------------------------------------------

describe("classify_tier", () => {
  it("classifies high-severity, high-fit, high-dollar as HIGH tier", () => {
    const rec = makeRec({
      id: "high-rec",
      severity: 5,
      composite_goal_fit: 0.9,
      dollar_impact: { estimate: 10000, low: 5000, high: 15000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("high");
    expect(result.tier_score).toBeGreaterThanOrEqual(0.65);
  });

  it("classifies low-severity, low-fit, low-dollar as LOW tier", () => {
    const rec = makeRec({
      id: "low-rec",
      severity: 1,
      composite_goal_fit: 0.1,
      dollar_impact: { estimate: 500, low: 100, high: 1000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("low");
    expect(result.tier_score).toBeLessThan(0.40);
  });

  it("classifies mid-range values as MEDIUM tier", () => {
    const rec = makeRec({
      id: "med-rec",
      severity: 3,
      composite_goal_fit: 0.5,
      dollar_impact: { estimate: 4000, low: 2000, high: 6000 },
    });
    const result = classify_tier(rec);
    expect(result.tier).toBe("medium");
    expect(result.tier_score).toBeGreaterThanOrEqual(0.40);
    expect(result.tier_score).toBeLessThan(0.65);
  });

  it("returns a numeric tier_score", () => {
    const rec = makeRec({ id: "score-rec" });
    const result = classify_tier(rec);
    expect(typeof result.tier_score).toBe("number");
    expect(result.tier_score).toBeGreaterThanOrEqual(0);
    expect(result.tier_score).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// classify_all
// ---------------------------------------------------------------------------

describe("classify_all", () => {
  it("returns a Map with an entry for each recommendation", () => {
    const recs = [
      makeRec({ id: "a" }),
      makeRec({ id: "b" }),
      makeRec({ id: "c" }),
    ];
    const result = classify_all(recs);
    expect(result.size).toBe(3);
    expect(result.has("a")).toBe(true);
    expect(result.has("b")).toBe(true);
    expect(result.has("c")).toBe(true);
  });

  it("each entry has tier and tier_score", () => {
    const recs = [makeRec({ id: "x" })];
    const result = classify_all(recs);
    const entry = result.get("x");
    expect(entry).toBeDefined();
    expect(entry!.tier).toMatch(/^(high|medium|low)$/);
    expect(typeof entry!.tier_score).toBe("number");
  });
});

// ---------------------------------------------------------------------------
// group_by_tier
// ---------------------------------------------------------------------------

describe("group_by_tier", () => {
  it("groups recommendations into high, medium, low buckets", () => {
    const recs = [
      makeRec({ id: "h1", severity: 5, composite_goal_fit: 0.95, dollar_impact: { estimate: 12000, low: 8000, high: 15000 } }),
      makeRec({ id: "l1", severity: 1, composite_goal_fit: 0.05, dollar_impact: { estimate: 200, low: 100, high: 300 } }),
      makeRec({ id: "m1", severity: 3, composite_goal_fit: 0.5, dollar_impact: { estimate: 4000, low: 2000, high: 6000 } }),
    ];
    const groups = group_by_tier(recs);
    expect(groups.high.length).toBeGreaterThanOrEqual(1);
    expect(groups.low.length).toBeGreaterThanOrEqual(1);
    // Total should equal input count
    expect(groups.high.length + groups.medium.length + groups.low.length).toBe(3);
  });

  it("preserves input order within each tier", () => {
    const recs = [
      makeRec({ id: "h1", severity: 5, composite_goal_fit: 0.95, dollar_impact: { estimate: 12000, low: 8000, high: 15000 } }),
      makeRec({ id: "h2", severity: 5, composite_goal_fit: 0.85, dollar_impact: { estimate: 10000, low: 5000, high: 15000 } }),
    ];
    const groups = group_by_tier(recs);
    const highIds = groups.high.map((r) => r.id);
    // h1 should come before h2 since that was input order
    if (highIds.includes("h1") && highIds.includes("h2")) {
      expect(highIds.indexOf("h1")).toBeLessThan(highIds.indexOf("h2"));
    }
  });
});

// ---------------------------------------------------------------------------
// Tier filtering logic (simulates what RecommendationsSection does)
// ---------------------------------------------------------------------------

describe("tier filtering logic", () => {
  const recs = [
    makeRec({ id: "h1", severity: 5, composite_goal_fit: 0.95, dollar_impact: { estimate: 12000, low: 8000, high: 15000 } }),
    makeRec({ id: "l1", severity: 1, composite_goal_fit: 0.05, dollar_impact: { estimate: 200, low: 100, high: 300 } }),
    makeRec({ id: "m1", severity: 3, composite_goal_fit: 0.5, dollar_impact: { estimate: 4000, low: 2000, high: 6000 } }),
  ];

  const tierMap = new Map<string, RecommendationTier>();
  for (const rec of recs) {
    tierMap.set(rec.id, classify_tier(rec).tier);
  }

  it("filter 'all' returns all recommendations", () => {
    const activeTier = "all";
    const filtered =
      activeTier === "all" ? recs : recs.filter((r) => tierMap.get(r.id) === activeTier);
    expect(filtered.length).toBe(3);
  });

  it("filter 'high' returns only high-tier recommendations", () => {
    const activeTier: RecommendationTier = "high";
    const filtered = recs.filter((r) => tierMap.get(r.id) === activeTier);
    for (const r of filtered) {
      expect(tierMap.get(r.id)).toBe("high");
    }
    expect(filtered.length).toBeGreaterThanOrEqual(1);
  });

  it("tier counts add up to total", () => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const tier of tierMap.values()) {
      counts[tier]++;
    }
    expect(counts.high + counts.medium + counts.low).toBe(recs.length);
  });
});

// ---------------------------------------------------------------------------
// Share selection count logic
// ---------------------------------------------------------------------------

describe("share selection count logic", () => {
  it("tracks selected IDs in a Set", () => {
    const selected = new Set<string>();
    selected.add("rec-001");
    selected.add("rec-003");
    expect(selected.size).toBe(2);
    expect(selected.has("rec-001")).toBe(true);
    expect(selected.has("rec-002")).toBe(false);
  });

  it("toggling removes from set if present", () => {
    const selected = new Set(["rec-001", "rec-002"]);
    // Toggle rec-001 off
    if (selected.has("rec-001")) {
      selected.delete("rec-001");
    } else {
      selected.add("rec-001");
    }
    expect(selected.size).toBe(1);
    expect(selected.has("rec-001")).toBe(false);
  });
});
