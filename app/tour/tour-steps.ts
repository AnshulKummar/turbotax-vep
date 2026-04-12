/**
 * Tour step definitions — maps the demo script to iframe URLs and captions.
 *
 * Each step has:
 * - path: the URL the iframe navigates to
 * - act: grouping label (shown as a pill)
 * - title: headline caption
 * - body: narration text
 * - duration: seconds before auto-advancing (0 = manual only)
 */

export interface TourStep {
  path: string;
  act: string;
  actColor: string;
  title: string;
  body: string;
  duration: number;
}

export const TOUR_STEPS: TourStep[] = [
  // ── Act 1: Introduction ──────────────────────────────────────────────
  {
    path: "/",
    act: "Act 1",
    actColor: "violet",
    title: "Introduction",
    body: "This is a working prototype of the highest-leverage investment for the Virtual Expert Platform: a goal-aligned recommendation system. The research behind it drew from 88 verbatim customer quotes across TrustPilot, BBB, Reddit, app store reviews, and the Washington Post's testing of Intuit Assist.",
    duration: 12,
  },
  {
    path: "/",
    act: "Act 1",
    actColor: "violet",
    title: "Three Strategic Bets",
    body: "The research surfaced three big bets and a set of incremental fixes across the four-layer architecture. Today's tour focuses on Big Bet B1 — the Goal-Aligned Recommendation System — prototyped end-to-end. The full PRD is on GitHub.",
    duration: 10,
  },

  // ── Act 2: The Problem ───────────────────────────────────────────────
  {
    path: "/",
    act: "Act 2",
    actColor: "amber",
    title: "Problem: Mechanical Errors Are Systematic",
    body: "The data shows recurring, detectable mistakes: missed depreciation on rentals, missing wash sale Code W, HSA limit mismatches, RSU double-counting. The Washington Post found Intuit Assist wrong on over half of 16 tax questions. These aren't edge cases — they're systematic.",
    duration: 12,
  },
  {
    path: "/",
    act: "Act 2",
    actColor: "amber",
    title: "Problem: Expert Layer Misaligned with Customer Goals",
    body: "Customers hire experts to deliver outcomes — maximize refund, minimize audit risk, plan for life events. But today's workbench has no goal capture, no goal-fit ranking, and evaluates experts on CSAT and handle time instead of goal outcomes. The workbench is optimized for throughput, not customer outcomes. That's the gap B1 closes.",
    duration: 12,
  },

  // ── Act 3: The Demo ──────────────────────────────────────────────────
  {
    path: "/start",
    act: "Act 3",
    actColor: "cyan",
    title: "Customer Intake — Step 1 of 2",
    body: "The flow begins from the customer's perspective. They enter their name, filing status, and AGI band, then select tax documents from a visual card grid. This data doesn't exist in today's TurboTax Live experience.",
    duration: 12,
  },
  {
    path: "/start",
    act: "Act 3",
    actColor: "cyan",
    title: "Customer Intake — Goal Selection",
    body: "On the next screen, the customer picks three prioritized goals — maximize refund, minimize audit risk, optimize next year — each weighted 1 to 5. These goals become the scoring vector that ranks every recommendation the expert will see.",
    duration: 10,
  },
  {
    path: "/workbench?section=brief",
    act: "Act 3",
    actColor: "cyan",
    title: "Expert Workbench — Brief",
    body: "After handoff, the expert lands on the Brief — the \"punchline\" screen. Customer name, filing status, AGI band, uploaded documents, three ranked goals, and key metrics: complexity score, 27 recommendations, estimated savings, and savings range. Full context in one view before touching the return.",
    duration: 12,
  },
  {
    path: "/workbench?section=goals",
    act: "Act 3",
    actColor: "cyan",
    title: "Expert Workbench — Goals",
    body: "The customer's three stated goals with rank and weight. This is the B1 anchor: every recommendation is scored against these goals. The system optimizes for customer outcomes, not return throughput.",
    duration: 8,
  },
  {
    path: "/workbench?section=documents",
    act: "Act 3",
    actColor: "cyan",
    title: "Expert Workbench — Documents",
    body: "The expert sees exactly which documents the customer uploaded — W-2s, 1099s, 1098, HSA forms. In production, these feed the OCR pipeline and cross-reference against the return for anomaly detection (Big Bet B3).",
    duration: 8,
  },
  {
    path: "/workbench?section=prework",
    act: "Act 3",
    actColor: "cyan",
    title: "Expert Workbench — AI Pre-Work",
    body: "Before the expert opens the return, the AI has flagged year-over-year changes, scored complexity, and built a risk register. The pre-work engine, return surface with confidence scores, and suggested questions eliminate the discovery phase entirely.",
    duration: 10,
  },
  {
    path: "/workbench?section=recommendations",
    act: "Act 3",
    actColor: "cyan",
    title: "Recommendations — Tiered and Goal-Ranked",
    body: "The core of B1. Twenty-seven recommendations spanning all 13 rule categories, segmented into High, Medium, and Low priority tiers. Each card shows IRC citation, goal-fit scores, dollar impact, confidence, and tier badge. Use the filter tabs at the top to view by tier.",
    duration: 14,
  },
  {
    path: "/workbench?section=recommendations",
    act: "Act 3",
    actColor: "cyan",
    title: "Top Finding: RSU Double-Count",
    body: "The highest-impact finding: Olivia's RSU vest is taxed twice — on the W-2 and the 1099-B with zero cost basis. $10.8K impact, 96% confidence. Detected by the deterministic rules engine, ranked by the LLM, verified by the hallucination filter. Three layers: rules first, LLM second, hallucination guard always.",
    duration: 12,
  },
  {
    path: "/workbench?section=recommendations",
    act: "Act 3",
    actColor: "cyan",
    title: "Share with Customer",
    body: "The expert selects recommendations to surface to the customer using the checkboxes, then clicks \"Share with customer.\" This creates a two-way loop: the expert's AI-powered findings are presented to the customer for approval.",
    duration: 10,
  },
  {
    path: "/workbench?section=audit",
    act: "Act 3",
    actColor: "cyan",
    title: "Audit Trail — Trust Layer",
    body: "Every AI suggestion and expert action is captured in an auditable trail. This is the data substrate for Big Bet B4 (Expert as Trainer): expert decisions become labeled training data. After three tax seasons, that's millions of labeled decisions — a moat no competitor can replicate.",
    duration: 10,
  },

  // ── Act 4: Success Measurement ───────────────────────────────────────
  {
    path: "/workbench?section=brief",
    act: "Act 4",
    actColor: "emerald",
    title: "KPI 1: First-Touch Accuracy +25%",
    body: "Measured by post-filing IRS notice rate. The 50-rule deterministic engine catches mechanical errors like the RSU double-count before the expert opens the return. Target: 25% reduction in IRS notices for returns processed through this system in TY2026.",
    duration: 10,
  },
  {
    path: "/workbench?section=brief",
    act: "Act 4",
    actColor: "emerald",
    title: "KPI 2: Expert Time -30% (Additional)",
    body: "On top of Intuit's stated ~20% AI reduction in TY2025. Pre-work, risk register, and goal-ranked recommendations eliminate discovery. The synthetic Mitchell return demonstrates a <10 minute path versus the 25-35 minute legacy baseline.",
    duration: 10,
  },
  {
    path: "/workbench?section=brief",
    act: "Act 4",
    actColor: "emerald",
    title: "KPI 3: Goal-Fulfillment as Primary Metric",
    body: "Replace CSAT + AHT as the expert evaluation signal. The goal dashboard tracks what percentage of customer-stated goals were addressed. This directly aligns expert incentives with customer outcomes — fixing the structural misalignment the research identified.",
    duration: 10,
  },

  // ── Act 5: What's Next ───────────────────────────────────────────────
  {
    path: "/",
    act: "Act 5",
    actColor: "violet",
    title: "Adjacent Bet: Embedded Tax Prep via Payroll",
    body: "Partner with ADP, Gusto, Rippling to surface TurboTax expert review inside the payroll experience. Employee finishes their last paycheck, W-2 drops, prompt appears: \"Want an expert to review your return?\" Highest-intent moment, zero acquisition cost, net-new channel.",
    duration: 10,
  },
  {
    path: "/",
    act: "Act 5",
    actColor: "violet",
    title: "Adjacent Bet: TurboTax Plugin for AI Marketplaces",
    body: "Millions use LLMs to draft and review taxes — a trust risk today, a monetization opportunity tomorrow. A TurboTax plugin in Claude and ChatGPT marketplaces surfaces expert review and audit defense when someone asks a tax question. Converts an AI accuracy gap into an Intuit revenue stream.",
    duration: 10,
  },
  {
    path: "/",
    act: "Act 5",
    actColor: "violet",
    title: "Thank You",
    body: "The architecture is the same across all bets: goal-aligned recommendations, deterministic safety net, expert matching, trust layer. Different distribution surfaces. Happy to go deeper on the research, architecture decisions, or any of the bets.",
    duration: 0,
  },
];
