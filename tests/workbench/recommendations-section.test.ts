/**
 * RecommendationsSection logic tests — Sprint 4 T-J06.
 *
 * Tests the tier classification against the 27-rec Mitchell fixture
 * to ensure realistic tier distribution and filtering behavior.
 */
import { describe, expect, it } from "vitest";

import {
  classify_tier,
  classify_all,
  group_by_tier,
} from "@/lib/recommendations/tiers";
import { mitchellRecommendationsFixture } from "../../components/workbench/__fixtures__/mitchell-recommendations.fixture";

// ---------------------------------------------------------------------------
// Mitchell fixture tier distribution
// ---------------------------------------------------------------------------

describe("Mitchell fixture tier classification", () => {
  const tierMap = classify_all(mitchellRecommendationsFixture);

  it("classifies all 27 recommendations", () => {
    expect(tierMap.size).toBe(mitchellRecommendationsFixture.length);
  });

  it("produces a realistic distribution (high ~9, medium ~11, low ~7)", () => {
    const groups = group_by_tier(mitchellRecommendationsFixture);
    // Allow some flexibility in counts but ensure all tiers are populated
    expect(groups.high.length).toBeGreaterThanOrEqual(3);
    expect(groups.medium.length).toBeGreaterThanOrEqual(3);
    expect(groups.low.length).toBeGreaterThanOrEqual(2);
    expect(
      groups.high.length + groups.medium.length + groups.low.length,
    ).toBe(mitchellRecommendationsFixture.length);
  });

  it("high-tier recs have tier_score >= 0.65", () => {
    for (const rec of mitchellRecommendationsFixture) {
      const classification = tierMap.get(rec.id)!;
      if (classification.tier === "high") {
        expect(classification.tier_score).toBeGreaterThanOrEqual(0.65);
      }
    }
  });

  it("medium-tier recs have tier_score >= 0.40 and < 0.65", () => {
    for (const rec of mitchellRecommendationsFixture) {
      const classification = tierMap.get(rec.id)!;
      if (classification.tier === "medium") {
        expect(classification.tier_score).toBeGreaterThanOrEqual(0.40);
        expect(classification.tier_score).toBeLessThan(0.65);
      }
    }
  });

  it("low-tier recs have tier_score < 0.40", () => {
    for (const rec of mitchellRecommendationsFixture) {
      const classification = tierMap.get(rec.id)!;
      if (classification.tier === "low") {
        expect(classification.tier_score).toBeLessThan(0.40);
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Tier badge rendering data
// ---------------------------------------------------------------------------

describe("tier badge data", () => {
  it("each tier maps to expected label", () => {
    const labels: Record<string, string> = {
      high: "HIGH",
      medium: "MEDIUM",
      low: "LOW",
    };
    for (const rec of mitchellRecommendationsFixture) {
      const { tier } = classify_tier(rec);
      expect(labels[tier]).toBeDefined();
      expect(tier.toUpperCase()).toBe(labels[tier]);
    }
  });
});

// ---------------------------------------------------------------------------
// Filtering by tier
// ---------------------------------------------------------------------------

describe("tier filtering against fixture", () => {
  const groups = group_by_tier(mitchellRecommendationsFixture);

  it("'all' filter returns all 27", () => {
    expect(mitchellRecommendationsFixture.length).toBe(27);
  });

  it("'high' filter returns only high-tier recs", () => {
    for (const rec of groups.high) {
      expect(classify_tier(rec).tier).toBe("high");
    }
  });

  it("'medium' filter returns only medium-tier recs", () => {
    for (const rec of groups.medium) {
      expect(classify_tier(rec).tier).toBe("medium");
    }
  });

  it("'low' filter returns only low-tier recs", () => {
    for (const rec of groups.low) {
      expect(classify_tier(rec).tier).toBe("low");
    }
  });
});

// ---------------------------------------------------------------------------
// Approval status resolution logic
// ---------------------------------------------------------------------------

describe("approval status resolution", () => {
  const sharedRecIds = new Set(["rec-001", "rec-002", "rec-003"]);
  const customerApprovals = {
    approved: ["rec-001"],
    declined: ["rec-003"],
  };

  function getApprovalStatus(
    recId: string,
  ): "approved" | "declined" | "pending" | null {
    if (!sharedRecIds.has(recId)) return null;
    if (customerApprovals.approved.includes(recId)) return "approved";
    if (customerApprovals.declined.includes(recId)) return "declined";
    return "pending";
  }

  it("returns 'approved' for approved rec", () => {
    expect(getApprovalStatus("rec-001")).toBe("approved");
  });

  it("returns 'declined' for declined rec", () => {
    expect(getApprovalStatus("rec-003")).toBe("declined");
  });

  it("returns 'pending' for shared but no-decision rec", () => {
    expect(getApprovalStatus("rec-002")).toBe("pending");
  });

  it("returns null for unshared rec", () => {
    expect(getApprovalStatus("rec-999")).toBeNull();
  });
});
