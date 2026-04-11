// Generates docs/PRD.docx from the PRD content.
// Run with: node scripts/generate-prd-docx.js

const fs = require("fs");
const path = require("path");
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageBreak, LevelFormat, PageOrientation
} = require("docx");

const NODE_MODULES = "C:/Users/anshu/AppData/Roaming/npm/node_modules";
process.env.NODE_PATH = NODE_MODULES;
require("module").Module._initPaths();

const border = { style: BorderStyle.SINGLE, size: 4, color: "BFBFBF" };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const headerShade = { fill: "D5E8F0", type: ShadingType.CLEAR };
const cellMargins = { top: 80, bottom: 80, left: 120, right: 120 };

function P(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    ...opts,
    children: Array.isArray(text)
      ? text
      : [new TextRun({ text, ...opts.run })],
  });
}

function H1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 360, after: 200 },
    children: [new TextRun({ text, bold: true, size: 32, color: "1F3864" })],
  });
}
function H2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 280, after: 160 },
    children: [new TextRun({ text, bold: true, size: 28, color: "2E75B6" })],
  });
}
function H3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 220, after: 120 },
    children: [new TextRun({ text, bold: true, size: 24, color: "2E75B6" })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { after: 80 },
    children: [new TextRun(text)],
  });
}

function sub(text) {
  return new Paragraph({
    spacing: { after: 200 },
    children: [new TextRun({ text, italics: true, size: 18, color: "595959" })],
  });
}

// columns: array of widths in DXA. Sum should equal table width (9360 for letter w/1in margin)
function buildTable(columns, headerRow, dataRows) {
  const tableWidth = columns.reduce((a, b) => a + b, 0);

  function makeCell(text, isHeader, widthDxa) {
    return new TableCell({
      borders: cellBorders,
      width: { size: widthDxa, type: WidthType.DXA },
      shading: isHeader ? headerShade : undefined,
      margins: cellMargins,
      children: [new Paragraph({
        children: [new TextRun({ text: String(text ?? ""), bold: !!isHeader, size: 20 })],
      })],
    });
  }

  const rows = [
    new TableRow({
      tableHeader: true,
      children: headerRow.map((h, i) => makeCell(h, true, columns[i])),
    }),
    ...dataRows.map(r => new TableRow({
      children: r.map((c, i) => makeCell(c, false, columns[i])),
    })),
  ];

  return new Table({
    width: { size: tableWidth, type: WidthType.DXA },
    columnWidths: columns,
    rows,
  });
}

// ============================================================================
// Build the document
// ============================================================================

const children = [];

// Title
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 240 },
  children: [new TextRun({
    text: "TurboTax Virtual Expert Platform",
    bold: true, size: 44, color: "1F3864",
  })],
}));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { after: 480 },
  children: [new TextRun({
    text: "Product Requirements Document",
    size: 28, color: "595959",
  })],
}));
children.push(P("Independent product review and proposed redesign of the TurboTax Virtual Expert Platform — the layer that powers TurboTax Live Assisted, TurboTax Live Full Service, and Expert Full Service."));
children.push(new Paragraph({ children: [new PageBreak()] }));

// Section 1
children.push(H1("1. Context"));
children.push(P("This is an independent product review of the TurboTax Virtual Expert Platform, built entirely on publicly available data: Intuit investor disclosures and earnings transcripts (FY2024 and FY2025), Intuit recruitment FAQs for tax experts, 88 verbatim customer quotes sampled across Trustpilot (1,166 reviews), BBB (3,720 complaints), the TurboTax community forum, ComplaintsBoard, the Apple App Store, Glassdoor, Indeed, NerdWallet's 2026 review, Washington Post and Futurism investigative reporting, FTC filings, and class action filings. Full methodology, source coverage, and the verbatim quote bank are in the appendices."));

// Section 2
children.push(H1("2. Strategic Stakes (Top 5 Metrics)"));
children.push(buildTable(
  [3000, 2200, 4160],
  ["Metric", "Value", "Why it matters"],
  [
    ["TurboTax Live revenue, FY2025", "$2.0B (+47% YoY)", "Live is Intuit's largest growth engine. The expert layer gates further acceleration."],
    ["Live as % of Consumer Group revenue, FY2025", "41%", "The franchise is now structurally dependent on the expert experience."],
    ["Expert headcount", "13,000 (Nov 2025), up from 12,000 (Oct 2024)", "The capacity layer the workbench touches. Routing efficiency compounds with network size."],
    ["AI driven expert time reduction per Full Service return, TY2025", "~20%", "Intuit's stated AI productivity baseline this PRD proposes to extend."],
    ["Customer trust gap on the expert experience", "Trustpilot 1.2/5 (1,166 reviews); BBB 1.07/5 (532 reviews); 3,720 BBB complaints in 3 years", "The single most important credibility input to any growth forecast."],
  ]
));
children.push(sub("Sources: Intuit Q4 FY2025 results (investors.intuit.com/news-events/press-releases/detail/1266); Intuit press releases 1229 (Oct 2024) and 1279 (Nov 2025); Intuit Q3 FY2025 earnings transcript via investing.com; Trustpilot turbotax.intuit.com page; BBB Intuit Inc. profile pages."));

// Section 3
children.push(H1("3. The Core Insight"));
children.push(P([
  new TextRun({ text: "Finding 1, mechanical errors are common everywhere. ", bold: true }),
  new TextRun("Audits of independently prepared returns and the public TurboTax record consistently surface the same mechanically detectable errors: missed depreciation allocation on rental property (IRS Pub 527), missing wash sale Code W on Form 8949, Form 8889 HSA contribution mismatches, RSU income double counting between W-2 Box 1 and 1099-B (a $3,200 refund delta is documented in the public record), a $12,000+ ISO Alternative Minimum Tax bug that took three years and a congressional inquiry to resolve, and a Washington Post test of Intuit Assist that found it wrong on more than half of 16 tax questions reviewed by credentialed pros, and still wrong on roughly 25% even after Intuit was given a chance to patch the issues. These errors are mechanically detectable from the source documents and the IRS code given the right tooling."),
]));
children.push(P([
  new TextRun({ text: "Finding 2, the expert layer is misaligned with what customers actually want. ", bold: true }),
  new TextRun("Customers do not hire an expert to \"fill out the return correctly.\" They hire an expert to deliver against a goal: maximize my refund, do not get me audited, plan my life event, simplify next year. The current TurboTax Live model has no place to capture those goals, no recommendation engine that ranks suggestions by goal fit, no multi-year continuity, and an evaluation system that grades experts on customer surveys and a 23 minute average handle time rather than goal outcomes. NerdWallet's structural critique makes this concrete: in Live Assisted, the person the customer reaches during preparation is a \"product expert\" trained only on the product, not a credentialed tax expert. The customer's goals never reach a credentialed brain until the optional final review."),
]));
children.push(P("These two findings unlock the big bets in Part I. The friction research drives the incremental fixes in Part II."));

// Section 4
children.push(H1("4. Customer Friction (Top Five)"));
children.push(buildTable(
  [600, 2700, 1100, 1400, 3560],
  ["#", "Friction theme", "Severity", "% of 88-quote sample", "Representative example"],
  [
    ["1", "Expert quality and accuracy errors", "5", "18%", "$12K ISO bug; doubled income causing $12K IRS clawback; RSU double count"],
    ["2", "Communication breakdowns and case auto closure", "5", "20%", "34-day Full Service case auto closed 7 days before deadline"],
    ["3", "Generalist routed to a complex return", "5", "6%", "Cross border 95K CAD case; seven year city tax error"],
    ["4", "Hand off and continuity loss", "4", "7%", "Customer told it is structurally impossible to reach last year's expert"],
    ["5", "Long wait times and queue pain", "4", "11%", "4.5 hours of waiting after six callback attempts"],
  ]
));
children.push(sub("Frequency from 88-quote sample. Vignettes and methodology in appendices."));

// Section 5
children.push(H1("5. Expert Pain Points (Top Three)"));
children.push(buildTable(
  [600, 4200, 2000, 2560],
  ["#", "Pain point", "Customer themes", "Public evidence"],
  [
    ["1", "No return surface, no anomaly flags, no prior year side-by-side, no risk register. The tooling is a knowledge base search box.", "1, 4", "Intuit recruitment FAQ describes tooling as the TurboTax knowledge base, IRS resources, and a popular tax library"],
    ["2", "Routing is a queue. No specialty, complexity, jurisdiction, language, or continuity matching.", "3, 4, 5", "Intuit recruitment FAQ: customer contacts are in a queue and routed to the next available Tax Expert"],
    ["3", "Performance is graded on customer surveys and a 23-minute AHT. Accuracy is not measured. AI assistance is unreliable.", "1, 2", "Intuit recruitment FAQ on metrics; Washington Post test on Intuit Assist accuracy"],
  ]
));

// PART I
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 200 },
  children: [new TextRun({ text: "Part I — Big Bets", bold: true, size: 40, color: "1F3864" })],
}));
children.push(P("The big bets share one thesis: the Virtual Expert Platform should optimize for customer outcomes against stated goals, not for return throughput. Each big bet below changes the operating model rather than improving the existing one. Together they convert TurboTax Live from an annual one-shot transaction into a continuous, goal-aligned, AI-native advisory relationship that gets smarter every season."));

const bigBets = [
  {
    title: "B1. Goal Aligned Recommendation System (anchor bet)",
    bet: "At intake, the customer states their goals in plain language: \"maximize my refund,\" \"do not get me audited,\" \"plan for my new baby,\" \"harvest my losses without messing up my carryforward,\" \"set me up for a smaller tax bill in 2026.\" A recommendation engine generates a ranked list of suggestions, each tagged with dollar impact, confidence, goal fit score, evidence (specific IRC section or IRS publication), audit risk delta, and multi-year impact. The expert workbench shows a goal dashboard that tracks progress against each stated goal in real time. Every expert action is logged against the goal it served.",
    why: "It reframes the expert's job from \"fill out the form correctly\" to \"deliver outcomes against the customer's stated goals.\" It addresses the NerdWallet structural critique directly: the AI captures goals, the expert delivers against them, and the goal fit score becomes the primary success metric instead of CSAT. It also creates the connective tissue for B2 and B4 because every recommendation is now labeled with a goal, an action, and an outcome.",
    what: "A goal taxonomy (10 canonical goals plus free text), a goal capture intake flow, a recommendation engine that retrieves from a deterministic tax rules corpus and ranks via an LLM scoring pass, a goal dashboard panel on the expert workbench, a goal-aligned audit trail, and a reporting layer that aggregates goal outcomes across customers and experts.",
    fixes: "Themes 1 (accuracy errors, because every recommendation is rule-cited), 3 (mismatch, because routing now considers goals), and 4 (continuity, because goals carry from year to year).",
  },
  {
    title: "B2. Multi Year Tax Co Pilot (always-on advisory)",
    bet: "Today, TurboTax Live is an annual transaction. The customer files in March, disappears, and shows up again next March with a new expert and zero context. The Multi Year Tax Co Pilot turns the relationship into a continuous subscription advised by a year-round AI co-pilot with periodic expert touch points. The co-pilot watches connected accounts, tracks tax law changes, runs forward-looking simulations, and triggers expert outreach proactively when an action is time-sensitive or high-dollar.",
    why: "It is the difference between a tax preparer and a wealth advisor. The TAM expands from \"people who file\" to \"people who optimize.\" It also creates the data flywheel that makes B1's goal alignment compound: a goal stated in 2026 becomes a tracked plan with quarterly check-ins through TY2027 and TY2028.",
    what: "A connected accounts data layer (Plaid for banking, brokerage data partnerships from existing 200+ Intuit partners, IRS transcript pull, secure document vault), a tax planning simulation engine, an event-based trigger system, an expert outreach queue tied to the routing engine, and a customer-facing dashboard that shows year-round tax health.",
    fixes: "Theme 4 (continuity, structurally), theme 1 (accuracy, because errors get caught months before filing), and the core complaint that experts are \"just data entry.\"",
  },
  {
    title: "B3. Autonomous AI Pre-Work and Living Risk Register",
    bet: "Before the expert ever opens the return, an autonomous AI pre-work step ingests every document (W-2, 1099 family, K-1, 1098, brokerage statements, prior year 1040, county property records), populates the current year return with line-level provenance, runs year-over-year deltas with explanations for every change above a threshold, runs a mechanically detectable error sweep against a deterministic rules corpus, and outputs a complexity score, a ranked risk register, and an AI suggested question list. The risk register is \"living\" in the sense that it updates continuously as the expert makes edits and as new documents arrive.",
    why: "Intuit has publicly stated a ~20% reduction in expert time per Full Service return in TY2025 from AI. This bet pushes that further by removing the most error-prone, lowest-judgment work from the expert's plate entirely. It also creates the structured input that B1's recommendation engine and B4's learning loop both depend on.",
    what: "A document ingestion pipeline (OCR plus structured form parsing), a deterministic tax rules corpus (initial scope ~200 rules covering the highest-frequency Form 1040 errors), an LLM orchestration layer that uses the rules engine as the safety net, a confidence calibration layer, a year-over-year delta engine, and the risk register UI on the workbench.",
    fixes: "Theme 1 directly. Themes 2 and 5 indirectly because returns get faster.",
  },
  {
    title: "B4. Expert as Trainer Learning Loop (compounding moat)",
    bet: "Every expert edit, accept, reject, and override on an AI suggestion becomes labeled training data. The system gets measurably smarter every season. Senior experts effectively become RLHF labelers without having to do anything other than their normal job. The labeled data is used to fine-tune the recommendation engine, the confidence calibration, the risk register prioritization, and the goal fit scoring from B1. Intuit's competitive moat shifts from \"we have 13,000 experts\" to \"we have 13,000 experts whose judgment is encoded in the system every season.\"",
    why: "It is the only big bet that compounds over time without proportional capital investment. After three seasons, the system has been trained on roughly 10 million labeled expert decisions, which no competitor can replicate without access to credentialed expert workflows. It also fixes the misaligned performance metric problem from Expert Pain Point 3 because accuracy and goal fit can finally be measured.",
    what: "A capture layer on every workbench interaction, a labeling pipeline that converts those interactions to training examples, a model evaluation harness with a golden test set of synthetic returns, a calibration monitoring dashboard, and a quarterly model release cadence.",
    fixes: "Theme 1 over time. Also addresses Expert Pain Point 3 by making accuracy measurable.",
  },
  {
    title: "B5. Specialty Match Routing Marketplace",
    bet: "Replace queue-based routing with a marketplace-style matchmaking engine that considers expert specialty (RSU, K-1, expat, retirement, small business), complexity score from B3, jurisdiction (state and local), language, capacity, customer goals from B1, and prior year continuity. Generalists are never assigned a return with a hard complexity flag without a competency-matched peer reviewer. Customers can see (and request) the same expert year over year. Experts can build a reputation and specialty profile that compounds.",
    why: "It turns 13,000 experts from a queue into a marketplace. It is the only way the platform can both grow expert headcount and improve quality at the same time. It also fixes the most viscerally complained-about pattern in the public record: a generalist getting a complex return and silently making a six-figure error.",
    what: "A competency profile per expert (initial bootstrap from self-assessment plus admin validation), a routing engine that takes the complexity score and goal vector as input, a continuity tracker, a customer-facing \"request your expert\" flow, and an expert-facing reputation dashboard.",
    fixes: "Themes 3, 4, and 5.",
  },
];

bigBets.forEach(b => {
  children.push(H2(b.title));
  children.push(P([new TextRun({ text: "The bet. ", bold: true }), new TextRun(b.bet)]));
  children.push(P([new TextRun({ text: "Why this is visionary. ", bold: true }), new TextRun(b.why)]));
  children.push(P([new TextRun({ text: "What is built. ", bold: true }), new TextRun(b.what)]));
  children.push(P([new TextRun({ text: "Customer frictions this addresses. ", bold: true }), new TextRun(b.fixes)]));
});

// PART II
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(new Paragraph({
  alignment: AlignmentType.CENTER,
  spacing: { before: 200, after: 200 },
  children: [new TextRun({ text: "Part II — Incremental Improvements", bold: true, size: 40, color: "1F3864" })],
}));
children.push(P("These are the prioritized friction fixes that do not require a change in operating model. They are smaller in scope, faster to ship, and they fit cleanly inside the four-layer architecture."));

children.push(H2("I1. Expert Workbench (Layer 3) Incremental Fixes"));
children.push(buildTable(
  [5500, 2400, 1460],
  ["Fix", "Friction addressed", "Effort"],
  [
    ["Customer context header showing prior expert notes, prior year return, prior year preparer name", "Theme 4", "S"],
    ["Anomaly risk register panel surfacing the top 10 mechanically detectable red flags", "Theme 1", "M"],
    ["Confidence score per pre-populated line with click-through to source document", "Theme 1", "M"],
    ["Live quality co-pilot that flags inconsistencies as the expert edits", "Theme 1", "M"],
    ["AI suggested question list ranked by dollar impact", "Theme 1", "S"],
    ["Escalation panel showing case state (auto-close countdown, customer responsiveness, document completeness)", "Theme 2", "M"],
    ["\"What AI saw\" panel showing the redacted PII version of every prompt sent to the model", "Theme 1 + trust", "S"],
    ["Expert minutes counter against legacy and TY2025 baselines", "Productivity", "S"],
  ]
));

children.push(H2("I2. Smart Routing (Layer 2) Incremental Fixes"));
children.push(buildTable(
  [5500, 2400, 1460],
  ["Fix", "Friction addressed", "Effort"],
  [
    ["Routing rationale chip telling the expert why the case was routed to them", "Theme 3", "S"],
    ["Hard complexity flag preventing queue routing of RSU, K-1, multi-state, NRA spouse, cross border returns to a generalist without peer reviewer", "Theme 3", "M"],
    ["\"Same expert as last year\" preference on the customer side", "Theme 4", "M"],
    ["Capacity dashboard for leads showing complexity-adjusted utilization", "Theme 5", "M"],
  ]
));

children.push(H2("I3. Trust and Learning (Layer 4) Incremental Fixes"));
children.push(buildTable(
  [5500, 2400, 1460],
  ["Fix", "Friction addressed", "Effort"],
  [
    ["PII redaction on every LLM call, verifiable via audit trail", "Trust", "M"],
    ["Audit trail capturing model, context, expert action, downstream IRS outcome", "Trust + accuracy", "M"],
    ["Composite expert performance metric weighting accuracy, AI edit signal quality, NPS, complexity-adjusted AHT", "Pain point 3", "L"],
    ["\"Told customer no\" tracking so experts who correctly decline a deduction are not penalized on CSAT", "Pain point 3", "M"],
  ]
));

children.push(H2("I4. Pre-Work (Layer 1) Incremental Fixes"));
children.push(buildTable(
  [5500, 2400, 1460],
  ["Fix", "Friction addressed", "Effort"],
  [
    ["Document ingestion via OCR plus partner structured feeds", "Theme 1", "M"],
    ["Year-over-year delta engine with plain language explanations", "Theme 1 + 4", "M"],
    ["Initial 50-rule deterministic safety net", "Theme 1", "M"],
  ]
));

// Section 6
children.push(new Paragraph({ children: [new PageBreak()] }));
children.push(H1("6. Solution Architecture"));
children.push(P("The solution is a four-layer Virtual Expert Platform that hosts both the big bets and the incremental fixes."));
children.push(bullet("Layer 1, AI Pre-Work. Document ingestion, year-over-year delta, deterministic rules sweep, complexity score, risk register. Hosts B3 and the I4 fixes."));
children.push(bullet("Layer 2, Smart Routing. Specialty, complexity, jurisdiction, language, capacity, continuity, and goal-aware matching. Hosts B5 and the I2 fixes."));
children.push(bullet("Layer 3, Expert Workbench. Goal dashboard, return surface with confidence scores, risk register, prior year side-by-side, customer context, AI suggested questions, live co-pilot, \"what AI saw\" panel, expert minutes counter. Hosts B1 (anchor), B2 (year-round dashboard surface), and the I1 fixes."));
children.push(bullet("Layer 4, Trust and Learning. PII redaction, audit trails, calibrated confidence, expert edits as labeled training data, composite performance metric. Hosts B4 and the I3 fixes."));
children.push(P([new TextRun({ text: "Non goals: ", bold: true }), new TextRun("fixing the checkout funnel auto-upgrade dark pattern (separate org), replacing the underlying tax calculation engine, building net-new tax content (the existing 100,000-page Intuit tax knowledge engine is reused), and IRS notice and audit defense workflow (Phase 2).")]));

// Section 7
children.push(H1("7. MVP Prototype Scope"));
children.push(P([
  new TextRun("The MVP demonstrates "),
  new TextRun({ text: "Big Bet B1 (Goal Aligned Recommendation System)", bold: true }),
  new TextRun(" end-to-end on the Layer 3 Workbench, against a single realistic synthetic Form 1040 (the \"Olivia and Ryan Mitchell\" return: married filing jointly, AGI ~$326K, residential rental, RSU vesting, K-1, HSA, mixed wash sale lots, 1098, multi-state IL+CA, prior year return on file). Layer 1 pre-work output is mocked as if a real OCR plus rules engine had produced it. Layer 2 routing is mocked as a single routing rationale chip. Layer 4 trust is partially live: PII redaction runs against the synthetic data, the audit trail is fully captured, the \"what AI saw\" panel renders."),
]));
children.push(H3("What the demo shows"));
[
  "Customer goal capture. A short intake flow where Olivia states three goals in priority order.",
  "Goal dashboard on the workbench. A panel that tracks each goal in real time, with a goal-fit score per recommendation.",
  "Ranked recommendation list tied to goals. Each recommendation has dollar impact, confidence, goal fit, evidence (IRC citation), audit risk delta, and a \"why this matters for the stated goal\" line. Recommendations include RSU double count, Section 469 passive loss, wash sale Code W, Form 8889 mismatch, SALT cap correction from $10K to $40K MFJ for TY2025, plus state PTET election eligibility and retirement contribution headroom.",
  "Routing rationale chip. \"Routed to you: 5+ years RSU specialty, multi-state IL+CA, prior year preparer for this customer. Complexity 8/10. ETA to handoff 4 min.\"",
  "Pre-populated return surface with confidence scores per line and click-through provenance.",
  "Live quality co-pilot flagging an inconsistency as the expert edits.",
  "AI suggested question list ranked by goal fit.",
  "\"What AI saw\" panel showing the redacted prompt that produced each recommendation.",
  "Audit trail timeline of every AI suggestion and expert action, queryable.",
  "Expert minutes counter ticking against the legacy and TY2025 baselines.",
].forEach((t, i) => children.push(new Paragraph({
  numbering: { reference: "numbers", level: 0 },
  spacing: { after: 80 },
  children: [new TextRun(t)],
})));

children.push(P([new TextRun({ text: "Tech stack: ", bold: true }), new TextRun("Next.js 16 + React 19 + TypeScript + Tailwind 4 dark theme + Anthropic Claude (claude-sonnet-4-6) + better-sqlite3 + Vitest. Synthetic data only, zero real PII.")]));

// Section 8
children.push(H1("8. Success Metrics (Aligned to MVP)"));
children.push(buildTable(
  [3000, 3200, 3160],
  ["MVP demo metric", "Target during walk-through", "Production outcome (full VEP)"],
  [
    ["Goal dashboard reflects stated goals end to end", "Every recommendation in the demo carries a goal-fit score and a goal label", "Goal-fit score becomes the primary expert performance metric, replacing CSAT only"],
    ["Recommendation list catches every mechanically detectable error", "5 of 5 errors caught with rule citation and goal mapping", "First-touch return accuracy improved 25% in TY2026 as measured by post-filing IRS notice rate"],
    ["Expert minutes per return on the synthetic 1040", "Under 10 minutes wall clock vs 25-35 minute legacy baseline", "30% additional reduction on top of Intuit's TY2025 ~20% baseline"],
    ["Confidence score calibration on pre-populated lines", "Calibration curve within 5 points across deciles on a 50-return synthetic test set", "Senior experts trust confidence scores enough to use them as a triage signal"],
    ["PII redaction against the synthetic 1040", "Zero PII leakage in prompts sent to the model", "Zero PII leakage in production GenOS prompts, verifiable via audit trail"],
    ["Routing rationale chip reflects four routing dimensions", "Demo chip shows specialty, jurisdiction, prior-year continuity, complexity", "80% of complex returns routed to specialty-matched expert in TY2026"],
    ["Audit trail captures every AI suggestion and expert action", "100% of demo interactions captured and queryable", "100% of AI suggestions auditable end to end in production"],
    ["Cases auto-closed without warning", "Escalation panel surfaces case state to expert in real time", "Zero auto-closures in production"],
  ]
));

// Section 9
children.push(H1("9. Build Orchestration"));
children.push(P("The prototype is built by six specialized agents running in parallel, coordinated through the per-agent task briefs in tasks/ and the Sprint 1 backlog in backlog/sprint-01.md. Each agent owns a vertical slice that can be developed and tested independently; integration points are explicit TypeScript interface contracts pinned in src/contracts/ before the build kicks off."));
children.push(buildTable(
  [1800, 3000, 4560],
  ["Agent", "Slice", "Primary outputs"],
  [
    ["Agent 1, Domain & Data", "Synthetic data + 50-rule deterministic tax corpus + golden recommendations", "src/data/, src/lib/rules/, Vitest unit tests"],
    ["Agent 2, Recommendation Engine (B1)", "Goal taxonomy, intake schema, rule-first / LLM-second recommendation engine, goal-fit scoring", "src/lib/goals/, src/lib/recommendations/, app/api/recommendations/route.ts"],
    ["Agent 3, Pre-Work Engine (B3 mock)", "Mocked OCR output, year-over-year delta, complexity scoring, risk register", "src/lib/prework/, app/api/prework/route.ts"],
    ["Agent 4, Workbench UI (Layer 3)", "Next.js app shell + dark theme + all workbench panels", "app/(workbench)/, components/workbench/"],
    ["Agent 5, Trust Layer (Layer 4)", "PII redaction, audit trail, \"what AI saw\" data feed, calibration eval", "src/lib/pii/, src/lib/audit/, SQLite schema"],
    ["Agent 6, Quality, Tests, & Demo", "Cross-slice integration tests, demo walk-through, calibration test set, success-metric dashboard", "tests/integration/, docs/demo-script.md"],
  ]
));
children.push(P("After Agent 1 finishes the foundation slice, Agents 2 through 5 build in parallel and Agent 6 integrates as soon as any two slices stabilize."));

// Section 10
children.push(H1("10. Architecture Decision Records"));
children.push(P("The eight ADRs that pin the build live in docs/architecture/decisions/:"));
children.push(buildTable(
  [1500, 7860],
  ["ID", "Title"],
  [
    ["ADR-001", "Tech stack"],
    ["ADR-002", "Synthetic-only data"],
    ["ADR-003", "Deterministic rules as safety net"],
    ["ADR-004", "SQLite for audit trail"],
    ["ADR-005", "Goal taxonomy"],
    ["ADR-006", "PII redaction strategy"],
    ["ADR-007", "Confidence calibration"],
    ["ADR-008", "Multi-agent build orchestration"],
  ]
));

// Section 11
children.push(H1("11. Risks and Open Questions"));
children.push(P("Headline risks: AI quality bar (mitigated by deterministic rules safety net), expert resistance to monitoring (mitigated by co-designed metrics), senior expert friction (mitigated by collapsible UI density), competency profile bootstrap (mitigated by self-assessment + admin validation), PII redaction at scale (mitigated by phased entity resolution), CSAT vs accuracy tradeoff (mitigated by composite metric with \"told customer no\" tracking), and goal capture quality (mitigated by guided taxonomy + AI-suggested goals)."));
children.push(P("Full risk register is in docs/appendices/risks.md."));

// Build doc
const doc = new Document({
  styles: {
    default: { document: { run: { font: "Calibri", size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, font: "Calibri", color: "1F3864" },
        paragraph: { spacing: { before: 360, after: 200 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 28, bold: true, font: "Calibri", color: "2E75B6" },
        paragraph: { spacing: { before: 280, after: 160 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 24, bold: true, font: "Calibri", color: "2E75B6" },
        paragraph: { spacing: { before: 220, after: 120 }, outlineLevel: 2 } },
    ]
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ]
  },
  sections: [{
    properties: {
      page: {
        size: { width: 12240, height: 15840 },
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      }
    },
    children,
  }]
});

const outPath = path.join(__dirname, "..", "docs", "PRD.docx");
Packer.toBuffer(doc).then(buf => {
  fs.writeFileSync(outPath, buf);
  console.log("Wrote " + outPath + " (" + buf.length + " bytes)");
});
