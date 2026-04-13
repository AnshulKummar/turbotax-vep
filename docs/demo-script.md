# Demo Script — TurboTax Virtual Expert Platform

> **Audience:** Deepali (hiring manager), Intuit Principal PM interview panel
> **Format:** Screen-share walkthrough of https://turbotax-vep.vercel.app
> **Length:** ~12 minutes
> **Prototype:** Live at https://turbotax-vep.vercel.app | PRD at `docs/PRD.md` on GitHub

---

## Act 1 — Introduction (90 sec)

Deepali, thank you for the time. I'm going to show you a working prototype of the feature I believe is the highest-leverage investment for the Virtual Expert Platform: a goal-aligned recommendation system that turns the expert workbench from a return-processing tool into a customer-outcome engine.

Before building it, I ran the research. I pulled publicly available feedback from TrustPilot, BBB, Reddit, app store reviews, NerdWallet, and the Washington Post's testing of Intuit Assist — 88 verbatim customer quotes in total. The goal was to map customer friction directly to expert capability gaps.

The research surfaced three strategic bets and a set of incremental fixes. The full PRD with the analysis, architecture, and prioritization is on GitHub. Today I'll focus on Big Bet B1 — the one I prototyped end-to-end — and close with two additional bets that open new revenue channels.

---

## Act 2 — The Problem (2 min)

Two findings stood out from the research:

**First, mechanical errors are everywhere.** The data shows recurring, detectable mistakes: missed depreciation on rental properties, missing wash sale Code W on Form 8949, HSA limit mismatches, RSU double-counting between W-2 Box 1 and 1099-B. One documented case shows a $12K ISO AMT bug that took three years and a congressional inquiry to resolve. The Washington Post tested Intuit Assist and found it wrong on more than half of 16 tax questions reviewed by credentialed professionals. These aren't edge cases. They're systematic.

**Second, the expert layer is misaligned with what customers actually want.** Customers hire experts to deliver outcomes — maximize my refund, don't get me audited, plan for a life event. But today's TurboTax Live has no goal capture, no recommendation ranking by goal fit, and evaluates experts on CSAT and average handle time rather than goal outcomes. The expert workbench is optimized for return throughput, not customer outcomes. That's the gap.

This prototype demonstrates Big Bet B1 — a **Goal-Aligned Recommendation System** that closes that gap. The expert's workbench is no longer a data entry tool. It's a goal fulfillment engine.

---

## Act 3 — The Demo (6 min)

> **Live URL:** https://turbotax-vep.vercel.app
> Click "Try the customer flow" to start.

### 3a. Customer Intake (1 min)

> *Navigate to: `/start`*

The flow begins from the customer's perspective. They enter their name, filing status, and AGI band. Then they select which tax documents they're uploading from a visual card grid — W-2s, 1099s, 1098, HSA forms.

On the next screen, they pick three prioritized goals — maximize refund, minimize audit risk, optimize next year — each with a weight from 1 to 5.

**Why this matters:** This is the data that doesn't exist today. These goals become the scoring vector that ranks every recommendation the expert will see. The system optimizes for what the customer actually wants, not what's fastest to process.

> *Submit the form. The handoff screen appears.*

### 3b. Expert Handoff (30 sec)

> *The handoff screen shows: "Connecting you to Alex, your tax expert..."*

In production, this is where Smart Routing (Big Bet B5) matches the case to an expert by specialty, jurisdiction, complexity, and prior-year continuity. For this prototype, the routing is simulated, but the contract is real.

> *Auto-navigates to the expert workbench.*

### 3c. Expert Workbench — Brief (1 min)

> *Navigate to: Workbench > Brief section*

Notice the app cue at the top — these contextual hints appear on every section, explaining what it demonstrates and why it matters. Dismiss them if you want the clean view.

The Brief is the "punchline" screen. The expert sees the customer's name, filing status, AGI band, all uploaded documents, the three ranked goals, and key metrics: complexity score, 27 recommendations found, estimated total savings, and the savings range. This is the full customer context in one view — before the expert touches a single line on the return.

### 3d. Recommendations — Tiered and Goal-Ranked (2 min)

> *Navigate to: Workbench > Recommendations section*

This is the core of B1. Twenty-seven recommendations spanning all 13 rule categories, each segmented into **High**, **Medium**, and **Low** priority tiers.

> *Click the tier filter tabs: High, Medium, Low, All*

The tier classification is a composite of three signals: severity, goal-fit score, and dollar impact. Each recommendation card shows:
- An IRC citation linking to the specific tax code section
- A one-line summary and detail explaining the issue
- Per-goal fit scores showing how well it advances each of the customer's stated goals
- Dollar impact estimate with a range
- Confidence score with a visual bar
- The tier badge (High/Medium/Low)

> *Point to rec-001: RSU double-count, $10.8K impact, 96% confidence*

This one is the highest-impact finding. Olivia's RSU vest is being taxed twice — once on the W-2 and again on the 1099-B with zero cost basis. The recommendation engine detected it via the deterministic rules engine, the LLM ranked and explained it, and a hallucination filter verified the rule_id exists in the corpus. That three-layer pipeline — rules first, LLM second, hallucination guard always — is architectural decision ADR-003.

### 3e. Share with Customer (30 sec)

> *Check several high-priority recommendations, click "Share with customer"*

The expert selects which recommendations to surface to the customer. This creates a two-way loop that didn't exist before: the expert's AI-powered findings are now presented to the customer in their own language for approval.

### 3f. Customer Approval (1 min)

> *Navigate to: `/review?intake=<id>`*

Now we're back on the customer side. The customer sees only the recommendations the expert chose to share, presented with the same tier badges and dollar impacts. For each one, they can **Approve** or **Decline**.

> *Approve a few, decline one, click "Confirm my decisions"*

The customer's decisions are persisted and immediately visible to the expert. Back on the workbench, each recommendation now shows "Approved by customer" or "Declined by customer" badges. The expert knows what the customer cares about before they even pick up the phone.

### 3g. Supporting Sections (30 sec, quick scan)

> *Quick click through: Goals, Documents, Pre-work, Audit*

- **Goals** — the scoring vector driving every recommendation
- **Documents** — what the customer uploaded, cross-referenced in production with OCR (Big Bet B3)
- **Pre-work** — AI has already flagged year-over-year changes, complexity, and risk before the expert opens the return
- **Audit** — every AI suggestion and expert action captured. This is the data substrate for Big Bet B4 (Expert as Trainer). Expert decisions become labeled training data that makes the system smarter each tax season.

---

## Act 4 — Success Measurement (1 min)

> *Navigate to: `/metrics`*

The success metrics dashboard shows two tiers. At the top, three **business KPIs** — the metrics that justify continued investment. Below, eight **prototype validation metrics** that prove the architecture works.

**1. Goal fulfillment rate — the new north-star metric**
This replaces CSAT + AHT as the primary expert evaluation signal. It tracks what percentage of the customer's stated goals were addressed by the recommendations the expert acted on. Pilot target: 70%. GA target for TY2026: 85%. This metric directly aligns expert incentives with customer outcomes — fixing the structural misalignment the research identified.

**2. First touch return accuracy: +25% improvement**
Measured by post-filing IRS notice rate reduction. Today, mechanical errors like the RSU double-count slip through because there's no systematic detection layer. The 50-rule deterministic engine catches these before the expert opens the return. Pilot target: 15% reduction. GA target for TY2026: 25%. Note the 6-12 month lag — which is why the prototype validation metrics below prove the engine works right now.

**3. Expert throughput: +15-20% improvement**
Returns per expert per day, complexity-adjusted. The pre-work engine, risk register, and goal-ranked recommendations eliminate the discovery phase. Pilot target: 2 additional returns per day. GA target: 15-20% throughput improvement. On the synthetic Mitchell return (MFJ, $326K AGI, RSU + K-1 + rental + wash sales), the prototype demonstrates a <10 minute path versus the 25-35 minute legacy baseline.

---

## Act 5 — Adjacent Big Bets (1 min)

B1 is the foundation. Two additional bets extend it into new distribution channels — both revenue-generating, both meeting customers where they already are.

**Embedded tax prep via payroll.** Partner with ADP, Gusto, Rippling to surface TurboTax expert review inside the payroll experience. The employee finishes their last paycheck, the W-2 drops, and they get: "Want an expert to review your return?" Highest-intent moment, zero acquisition cost, net-new channel.

**TurboTax plugin for Claude and ChatGPT.** Millions of people are already using LLMs to draft and review taxes. That's a trust risk today — and a monetization opportunity tomorrow. A TurboTax plugin in the AI marketplace surfaces expert review, accuracy guarantees, and audit defense at the exact moment someone asks an LLM a tax question. It converts an AI accuracy gap into an Intuit revenue stream and opens an entirely new AI-native channel for tax prep.

The architecture is the same: goal-aligned recommendations, deterministic safety net, expert matching, trust layer. Different distribution surfaces.

That's the overview. Happy to go deeper on the research, the architecture decisions, or any of the bets.

---

## Appendix — Demo Recovery

| Symptom | Recovery |
|---|---|
| Blank section | Hard reload. Fixtures hydrate first; the page never depends on a live API call. |
| Recommendations show 8 instead of 27 | Clear browser cache. The fixture was expanded in Sprint 4. |
| `/review` shows "No selections" | Run the full flow: `/start` -> goals -> `/handoff` -> `/workbench` -> share recs -> then open `/review?intake=<id>` |
| Approval badges not showing on expert side | Wait 5 seconds (polling interval) or refresh the workbench page. |

## Appendix — Technical Reference

| Item | Detail |
|---|---|
| Live URL | https://turbotax-vep.vercel.app |
| GitHub | github.com/AnshulKummar/turbotax-vep (private) |
| PRD | `docs/PRD.md` |
| Architecture | 4-layer: Pre-Work, Smart Routing, Expert Workbench, Trust & Learning |
| Tests | 447 across 64 files (Vitest) |
| Routes | 15 (3 customer, 5 API, 7 app) |
| Cost per demo visitor | $0 (cassette replay, no live LLM calls) |
| Synthetic return | Olivia & Ryan Mitchell, MFJ, AGI ~$326K, RSU + K-1 + rental + HSA + wash sales + multi-state IL+CA |
| Recommendations | 27 across 13 rule categories, segmented High/Medium/Low |
| Rule corpus | 50 deterministic tax rules |
| Stack | Next.js 16, React 19, TypeScript, Tailwind 4, Drizzle + Neon Postgres, Claude Sonnet 4.6 |
