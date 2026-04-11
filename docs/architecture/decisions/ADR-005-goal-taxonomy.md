# ADR-005 — Goal taxonomy

**Status:** Accepted

## Context

The anchor big bet (B1, Goal Aligned Recommendation System) depends on capturing what the customer actually wants in a structured way that downstream systems can rank against. Free text goals are too noisy for goal-fit scoring. A rigid drop-down is too narrow for real customer needs. The taxonomy must be small enough that customers can choose without analysis paralysis, and large enough that the recommendation engine can produce meaningfully different rankings for different goal mixes.

## Decision

Ten canonical goals plus one free-text "in your own words" field. Customers rank their top three. Each goal carries a weight (1 to 5) and a free-text rationale.

| ID | Goal | Plain language |
|---|---|---|
| G1 | maximize_refund | "Get me the biggest refund I'm legally entitled to" |
| G2 | minimize_audit_risk | "I never want to hear from the IRS" |
| G3 | plan_life_event | "I have a life change this year (baby, marriage, divorce, home purchase, retirement)" |
| G4 | optimize_next_year | "Set me up for a smaller tax bill in TY2026" |
| G5 | harvest_losses | "Use my investment losses without messing up my carryforward" |
| G6 | optimize_retirement | "Make sure my retirement contributions are doing the right thing" |
| G7 | simplify_filing | "I just want this done correctly with the minimum back-and-forth" |
| G8 | dispute_irs_notice | "I got a notice from the IRS and I need to respond" |
| G9 | plan_major_purchase | "I'm buying a house or starting a business soon and need to think about the tax angle" |
| G10 | other | Free text |

The taxonomy is stored in `src/lib/goals/taxonomy.ts` as a Zod schema. Each goal carries a vector of "tags" (e.g. G1 maps to [refund, deductions, credits]; G2 maps to [audit_risk, conservatism, documentation]) that the recommendation engine uses for goal fit scoring.

## Why

Ten + free text is the empirical sweet spot for choice architecture (small enough to scan, large enough to feel personal). The rank + weight + rationale structure gives the recommendation engine three independent dimensions to score against, and gives the expert a one-glance summary of "what does this customer actually want."

## Consequences

The taxonomy will need to be revisited as real customers state goals the engine cannot serve. Agent 1 (Domain & Data) owns the taxonomy file. New goals are added via PR with a test case demonstrating they produce a meaningfully different ranking than existing goals on at least one synthetic return.
