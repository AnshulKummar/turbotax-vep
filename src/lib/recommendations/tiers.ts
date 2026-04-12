/**
 * Tier classification for recommendations — Sprint 4 T-I02.
 *
 * Computes a composite tier_score from severity, goal fit, and dollar
 * impact, then buckets each recommendation into high / medium / low.
 *
 * Formula:
 *   tier_score = (severity / 5) * 0.4
 *              + composite_goal_fit * 0.35
 *              + min(dollar_impact.estimate / 10000, 1) * 0.25
 *
 * Thresholds:
 *   high   >= 0.65
 *   medium >= 0.40
 *   low    <  0.40
 */

import type { Recommendation } from "@/contracts";

export type RecommendationTier = "high" | "medium" | "low";

export interface TierClassification {
  tier: RecommendationTier;
  tier_score: number;
}

const HIGH_THRESHOLD = 0.65;
const MEDIUM_THRESHOLD = 0.40;

/**
 * Compute the tier_score and classify a single recommendation.
 */
export function classify_tier(rec: Recommendation): TierClassification {
  const severity_component = (rec.severity / 5) * 0.4;
  const goal_fit_component = rec.composite_goal_fit * 0.35;
  const dollar_component =
    Math.min(rec.dollar_impact.estimate / 10_000, 1) * 0.25;

  const tier_score = severity_component + goal_fit_component + dollar_component;

  let tier: RecommendationTier;
  if (tier_score >= HIGH_THRESHOLD) {
    tier = "high";
  } else if (tier_score >= MEDIUM_THRESHOLD) {
    tier = "medium";
  } else {
    tier = "low";
  }

  return { tier, tier_score };
}

/**
 * Classify all recommendations. Returns a Map keyed by rec.id.
 */
export function classify_all(
  recs: Recommendation[],
): Map<string, TierClassification> {
  const result = new Map<string, TierClassification>();
  for (const rec of recs) {
    result.set(rec.id, classify_tier(rec));
  }
  return result;
}

/**
 * Group recommendations by tier. Each tier array preserves the input order.
 */
export function group_by_tier(
  recs: Recommendation[],
): Record<RecommendationTier, Recommendation[]> {
  const groups: Record<RecommendationTier, Recommendation[]> = {
    high: [],
    medium: [],
    low: [],
  };

  for (const rec of recs) {
    const { tier } = classify_tier(rec);
    groups[tier].push(rec);
  }

  return groups;
}
