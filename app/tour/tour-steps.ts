/**
 * Tour step definitions — maps the demo script to iframe URLs and captions.
 *
 * Each step's `body` is written to be self-explanatory for a first-time
 * viewer who has no prior context. The narration connects what's on screen
 * to the "so what" — why this matters for the customer, the expert, and
 * the business.
 *
 * `duration` is a minimum floor (seconds) for cosmetic progress bar when
 * audio is off. When audio is on, the step waits for speech to finish
 * regardless of this value.
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
  // ══════════════════════════════════════════════════════════════════════
  // ACT 1 — INTRODUCTION
  // ══════════════════════════════════════════════════════════════════════
  {
    path: "/",
    act: "Act 1 — Introduction",
    actColor: "violet",
    title: "Welcome to the Virtual Expert Platform Prototype",
    body: "What you're about to see is a working prototype of what I believe is the highest-leverage investment for TurboTax Live: a goal-aligned recommendation system. Instead of the expert workbench being a return-processing tool, it becomes a customer-outcome engine — one that ranks every AI suggestion by how well it advances what the customer actually cares about. This prototype is fully functional, running on synthetic data, and costs zero dollars per visitor.",
    duration: 18,
  },
  {
    path: "/",
    act: "Act 1 — Introduction",
    actColor: "violet",
    title: "The Research Behind This",
    body: "Before building anything, I analyzed the current TurboTax Live experience using publicly available feedback: TrustPilot reviews, BBB complaints, Reddit threads, app store reviews, NerdWallet's structural critique, and the Washington Post's investigative testing of Intuit Assist. Eighty-eight verbatim customer quotes were sampled and mapped to expert capability gaps. That research produced three strategic big bets and a set of incremental improvements, all documented in the PRD on GitHub. Today's tour focuses on Big Bet B1 — the one I prototyped end-to-end.",
    duration: 20,
  },

  // ══════════════════════════════════════════════════════════════════════
  // ACT 2 — THE PROBLEM
  // ══════════════════════════════════════════════════════════════════════
  {
    path: "/",
    act: "Act 2 — The Problem",
    actColor: "amber",
    title: "Finding 1: Mechanical Errors Are Systematic",
    body: "The research uncovered a pattern of recurring, detectable tax errors across TurboTax Live returns. These include missed depreciation on rental properties, missing wash sale Code W on Form 8949, HSA contribution limit mismatches, and RSU double-counting between W-2 Box 1 and 1099-B. One documented case involved a twelve-thousand-dollar ISO AMT error that took three years and a congressional inquiry to resolve. The Washington Post tested Intuit Assist and found it gave incorrect answers on more than half of sixteen tax questions reviewed by credentialed professionals. These are not edge cases — they are systematic, and they are detectable before the return is filed.",
    duration: 22,
  },
  {
    path: "/",
    act: "Act 2 — The Problem",
    actColor: "amber",
    title: "Finding 2: Experts Lack Goal Alignment",
    body: "Here's the deeper structural issue. When a customer hires a tax expert, they have specific outcomes in mind: maximize my refund, don't get me audited, help me plan for a new baby, set me up for a smaller bill next year. But today's TurboTax Live captures none of that. There's no goal intake, no recommendation ranking by goal fit, and experts are evaluated on customer satisfaction scores and average handle time — not on whether the customer's stated goals were actually met. The workbench is optimized for processing returns quickly, not for delivering the outcomes customers are paying for. That misalignment is what Big Bet B1 fixes. Let me show you how.",
    duration: 22,
  },

  // ══════════════════════════════════════════════════════════════════════
  // ACT 3 — THE DEMO
  // ══════════════════════════════════════════════════════════════════════
  {
    path: "/start",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Customer Intake: Personal Information & Documents",
    body: "The experience starts from the customer's side. What you see here is the intake flow. The customer enters their name, selects a filing status — single, married filing jointly, head of household — and picks an AGI band. Then they choose which tax documents they're uploading from a visual card grid: W-2s, 1099-INT, 1099-DIV, 1099-B for brokerage activity, 1098 for mortgage interest, and HSA forms. This is the information that feeds the expert's workbench. In today's TurboTax Live, none of this context reaches the expert before the call.",
    duration: 18,
  },
  {
    path: "/start",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Customer Intake: Goal Selection",
    body: "This is the key screen that doesn't exist today. The customer picks three prioritized goals from a taxonomy of ten — for example, maximize refund as their top priority, minimize audit risk second, and optimize for next year third. Each goal gets a weight from one to five, indicating how strongly they feel about it. These goals become the scoring vector that the recommendation engine uses to rank every finding for the expert. The system now optimizes for what the customer actually wants, not just what's fastest to process.",
    duration: 18,
  },
  {
    path: "/workbench?section=brief",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Expert Workbench: The Brief",
    body: "After the customer submits their goals and documents, they're handed off to a matched expert. This is what the expert sees first — the Brief. It's designed to be the punchline screen: one view that tells the expert everything they need to know before touching the return. At the top, the customer's name, filing status, and AGI band. Below that, the three ranked goals with their weights. Then the uploaded documents. And at the bottom, key metrics: a complexity score of the return, the number of AI-generated recommendations, the estimated total savings, and the savings range. Notice the app cue banner at the top — these contextual hints appear on every section to explain what you're looking at.",
    duration: 22,
  },
  {
    path: "/workbench?section=goals",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Expert Workbench: Customer Goals",
    body: "This section shows the customer's three stated goals in detail. Each goal card displays the rank, the label, and the weight. This is the anchor of Big Bet B1: every recommendation the expert sees has been scored against these specific goals. If the customer's top priority is maximizing their refund, the system surfaces refund-impacting findings first. If they care most about audit risk, compliance-critical items rise to the top. The expert is no longer guessing what the customer wants — the goals are explicit, quantified, and wired into the ranking algorithm.",
    duration: 18,
  },
  {
    path: "/workbench?section=documents",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Expert Workbench: Uploaded Documents",
    body: "Here the expert sees exactly which documents the customer uploaded during intake. Each card shows the form type, the issuer, and a description. In this synthetic demo, the Mitchell family uploaded eight documents: two W-2s, a 1099-INT, 1099-DIV, 1099-B, a 1098 mortgage form, a 1099-R retirement distribution, and an HSA health coverage form. In a production system, these would be OCR-parsed and cross-referenced against the return surface for anomaly detection — that's Big Bet B3, the autonomous AI pre-work engine.",
    duration: 18,
  },
  {
    path: "/workbench?section=prework",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Expert Workbench: AI Pre-Work",
    body: "This section shows the work the AI has already done before the expert opens the return. The pre-work engine has populated every line with values from source documents. Notice the confidence percentage on each row — that's a weighted score combining OCR extraction certainty, cross-document corroboration like matching W-2 Box 1 against 1099-B totals, and year-over-year consistency with the prior return. Green bars at ninety percent or above mean high confidence from multiple sources. Amber flags single-source values. Red means a conflict the expert should verify. On the right side, you'll see the Quality Co-pilot — it watches every edit in real time. The moment the expert changes a line, it cross-checks against related fields and flashes a warning if the edit creates an inconsistency. Below that, the risk register ranks the most critical issues by severity and dollar impact. The expert opens the case already knowing where the problems are and how confident the system is about each value.",
    duration: 26,
  },
  {
    path: "/workbench?section=recommendations",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Recommendations: Tiered and Goal-Ranked",
    body: "This is the core of Big Bet B1. You're looking at twenty-seven recommendations spanning all thirteen rule categories in the tax corpus, and each one is segmented into a priority tier: High, Medium, or Low. The tier classification is a composite of three signals: the severity of the issue, how well it fits the customer's stated goals, and the estimated dollar impact. You can use the filter tabs at the top to view only High-priority items, only Medium, or only Low. Each recommendation card shows an IRC citation linking to the specific tax code section, a one-line summary, the per-goal fit scores, the dollar impact estimate, and a confidence bar. Notice the top recommendation on screen — that's the RSU double-count fix, the highest-impact finding at ten thousand eight hundred dollars. I'll walk through it in detail next.",
    duration: 26,
  },
  {
    path: "/workbench?section=recommendations",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Top Finding: RSU Double-Count",
    body: "Let me highlight the highest-impact finding. This is recommendation one: an RSU double-count worth an estimated ten thousand eight hundred dollars. Here's what happened: Olivia's RSU vest of forty-eight thousand dollars is included in her W-2 Box 1, and it's also reported on her 1099-B as same-day sell-to-cover lots with a cost basis of zero. If you enter both without adjusting the basis, the vest gets taxed twice. The recommendation engine detected this through the deterministic rules engine, the LLM ranked and explained it in plain language, and a hallucination filter verified that the rule ID exists in the fifty-rule corpus. That three-layer pipeline — rules first, LLM second, hallucination guard always — is what makes this trustworthy.",
    duration: 26,
  },
  {
    path: "/workbench?section=recommendations",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Sharing Recommendations with the Customer",
    body: "Now here's where the two-way loop comes in. The expert reviews the recommendations and selects the ones they want to share with the customer. Each card has a checkbox on the left. The expert picks the most relevant findings — typically the high-priority ones — and clicks the Share with Customer button in the footer. This sends the selected recommendations to the customer's review page, where they can approve or decline each one. This loop didn't exist before: the expert's AI-powered findings are now presented back to the customer in plain language for their input, before the expert finalizes anything.",
    duration: 22,
  },
  {
    path: "/workbench?section=audit",
    act: "Act 3 — The Demo",
    actColor: "cyan",
    title: "Audit Trail: The Trust Layer",
    body: "Every AI suggestion, every expert action, and every edit is captured in a chronological audit trail with timestamps, actor labels, and the redacted prompt hash that produced each recommendation. No raw personally identifiable information ever touches the wire — Social Security numbers, employer IDs, and addresses are all tokenized before the prompt leaves the process. But the real strategic value here is Big Bet B4: Expert as Trainer. Every time an expert accepts a recommendation, that becomes a positive training label. Every rejection becomes a negative label. After three tax seasons, Intuit would have millions of labeled expert decisions — a proprietary dataset that no competitor can replicate, and the foundation for a compounding AI moat.",
    duration: 26,
  },

  // ══════════════════════════════════════════════════════════════════════
  // ACT 4 — SUCCESS MEASUREMENT
  // ══════════════════════════════════════════════════════════════════════
  {
    path: "/metrics",
    act: "Act 4 — Success Measurement",
    actColor: "emerald",
    title: "KPI 1: Goal Fulfillment Rate",
    body: "Let's talk about how we'd measure whether this is working. You're looking at the success metrics dashboard. At the top are three business KPIs — these are the metrics that justify continued investment. The first and most important is goal fulfillment rate. This is a new metric that replaces CSAT and average handle time as the primary expert evaluation signal. It tracks what percentage of the customer's stated goals were addressed by the recommendations the expert acted on. If a customer said maximize my refund and the expert accepted all three refund-impacting recommendations, that goal shows one hundred percent fulfillment. The pilot target is seventy percent. The GA target for TY2026 is eighty-five percent. This metric directly aligns expert incentives with customer outcomes — fixing the structural misalignment the research identified.",
    duration: 24,
  },
  {
    path: "/metrics",
    act: "Act 4 — Success Measurement",
    actColor: "emerald",
    title: "KPI 2: First Touch Return Accuracy",
    body: "The second business KPI is first touch return accuracy. This measures the reduction in post-filing IRS notice rate — how often the IRS sends a correction notice after a return is filed. Today, mechanical errors like the RSU double-count or the missing wash sale code slip through because there's no systematic detection layer before the expert reviews the return. The fifty-rule deterministic engine in this prototype catches all of these before the expert even opens the case. The pilot target is a fifteen percent reduction in IRS notices. The GA target for TY2026 is twenty-five percent. Note that this metric has a six to twelve month lag because you need to wait for IRS notices to come back after filing — which is why the prototype validation metrics below it prove the engine works right now on the synthetic test set.",
    duration: 26,
  },
  {
    path: "/metrics",
    act: "Act 4 — Success Measurement",
    actColor: "emerald",
    title: "KPI 3: Expert Throughput",
    body: "The third business KPI is expert throughput — returns per expert per day, complexity-adjusted. The pilot target is two additional returns per day with pre-work. The GA target is a fifteen to twenty percent improvement across all experts. The pre-work engine, the risk register, and the goal-ranked recommendations eliminate the discovery phase entirely. The expert opens the case already knowing where the problems are, in what priority order, and why each one matters for this specific customer's goals. On the synthetic Mitchell return, the prototype demonstrates a path of under ten minutes versus the twenty-five to thirty-five minute legacy baseline. Below these three business KPIs you can see eight prototype validation metrics — things like goal dashboard coverage, recommendation completeness, PII leakage, and audit trail capture. Those prove the architecture works. The business KPIs above prove the investment is worth making.",
    duration: 26,
  },

  // ══════════════════════════════════════════════════════════════════════
  // ACT 5 — WHAT'S NEXT
  // ══════════════════════════════════════════════════════════════════════
  {
    path: "/",
    act: "Act 5 — What's Next",
    actColor: "violet",
    title: "Adjacent Bet: Embedded Tax Prep via Payroll",
    body: "B1 is the foundation. But there are two additional big bets worth considering, both of which are revenue-generating and meet customers where they already are. The first is embedded tax prep through payroll partnerships. Imagine partnering with ADP, Gusto, or Rippling to surface TurboTax expert review directly inside the payroll experience. An employee finishes their last paycheck of the year, the W-2 drops, and they see a prompt: Want an expert to review your return? This captures the customer at the moment of highest intent, before they even open a browser tab. Zero acquisition cost, net-new distribution channel, and the same goal-aligned architecture powers the expert workbench on the back end.",
    duration: 22,
  },
  {
    path: "/",
    act: "Act 5 — What's Next",
    actColor: "violet",
    title: "Adjacent Bet: TurboTax Plugin for AI Marketplaces",
    body: "The second bet is a TurboTax plugin for Claude and ChatGPT. Millions of people are already using large language models to draft, review, and even attempt to file their taxes. Today that's a trust risk — LLMs give confident-sounding but often incorrect tax advice. Tomorrow it's a monetization opportunity. A TurboTax plugin in the AI marketplace would surface expert review, accuracy guarantees, and Intuit's audit defense product at the exact moment someone asks an LLM a tax question. It converts an AI accuracy gap into an Intuit revenue stream and opens an entirely new AI-native channel for tax preparation — meeting the customer exactly where they already are.",
    duration: 22,
  },
  {
    path: "/",
    act: "Act 5 — What's Next",
    actColor: "violet",
    title: "Thank You",
    body: "That's the full picture. The architecture is the same across all three bets: goal-aligned recommendations, a deterministic safety net, expert matching, and a trust layer that captures every decision. What changes is the distribution surface. Everything you saw today is live, functional, and backed by four hundred forty-seven automated tests. The full PRD, architecture decisions, and voice-of-customer research are all on GitHub. Thank you for watching — happy to go deeper on the research, the architecture, or any of the bets.",
    duration: 0,
  },
];
