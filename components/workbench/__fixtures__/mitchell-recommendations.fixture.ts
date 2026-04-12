import type { Recommendation } from "../../../src/contracts";

/**
 * Static fixture of the Agent 2 `/api/recommendations` response for
 * the Mitchell hero return. Hand-built from
 * src/data/golden-recommendations.json so the workbench can render
 * and be tested without Agent 2 being live.
 *
 * Sprint 4 expansion: 27 total recommendations covering all 13 rule
 * categories with realistic tier distribution:
 *   - High (tier_score >= 0.65): ~9 recs
 *   - Medium (>= 0.40 and < 0.65): ~11 recs
 *   - Low (< 0.40): ~7 recs
 */
export const mitchellRecommendationsFixture: Recommendation[] = [
  // =========================================================================
  // EXISTING rec-001 through rec-008
  // =========================================================================
  {
    id: "rec-001",
    rule_id: "rsu-double-count-001",
    finding_id: "finding-rsu-001",
    category: "rsu",
    severity: 5,
    irc_citation: "IRC §83(a); Rev. Rul. 2002-13",
    pub_citation: "Pub 525",
    one_line_summary:
      "Fix RSU double-count on Contoso vest lots — basis is zero on 1099-B.",
    detail:
      "Olivia's 2025 RSU vest of $48,000 is included in W-2 Box 1 ($245,000 total) and also reported on the 1099-B as same-day sell-to-cover lots with cost_basis = 0. Naive entry taxes the vest twice. Adjust the 1099-B lot cost_basis upward to equal the Box 1 inclusion amount and preserve Code E on 8949 column (f).",
    affected_lines: ["1040.line.7", "8949.row.1", "8949.row.2", "8949.row.3"],
    dollar_impact: { estimate: 10_800, low: 5_000, high: 15_000 },
    audit_risk_delta: -0.4,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.95,
        rationale:
          "Eliminates $48K phantom short-term capital gain, recovers $10K+ federal.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.7,
        rationale: "Correctly matches IRS W-2/1099-B reconciliation.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.4,
        rationale: "Establishes basis tracking for next year's vest tranche.",
      },
    ],
    composite_goal_fit: 0.85,
    confidence: 0.96,
    llm_only: false,
    audit_id: "audit-001",
  },
  {
    id: "rec-002",
    rule_id: "wash-sale-code-w-001",
    finding_id: "finding-wash-001",
    category: "wash_sale",
    severity: 5,
    irc_citation: "IRC §1091",
    pub_citation: "Pub 550",
    one_line_summary:
      "Apply Code W on three wash-sale lots totaling $4,180 disallowed loss.",
    detail:
      "Three 1099-B lots (WASH-001/002/003) report wash_sale_loss_disallowed totalling $4,180 but the code field is null. Set Code W on Form 8949 column (f) so the disallowed loss is added back.",
    affected_lines: ["8949.row.7", "8949.row.8", "8949.row.9"],
    dollar_impact: { estimate: 1_254, low: 800, high: 2_500 },
    audit_risk_delta: -0.45,
    goal_fits: [
      {
        goal_id: "minimize_audit_risk",
        score: 0.9,
        rationale: "Prevents IRS mismatch notice on Schedule D totals.",
      },
      {
        goal_id: "harvest_losses",
        score: 0.5,
        rationale:
          "Correct basis step-up on replacement shares preserves future loss harvest.",
      },
    ],
    composite_goal_fit: 0.78,
    confidence: 0.98,
    llm_only: false,
    audit_id: "audit-002",
  },
  {
    id: "rec-003",
    rule_id: "hsa-8889-reconcile-001",
    finding_id: "finding-hsa-001",
    category: "hsa",
    severity: 3,
    irc_citation: "IRC §223; Rev. Proc. 2024-25",
    pub_citation: "Pub 969",
    one_line_summary:
      "Raise Form 8889 line 6 to TY2025 family HSA limit ($8,550).",
    detail:
      "Form 8889 line 6 currently shows $8,300, the TY2024 family limit. TY2025 raises it to $8,550. Also add Ryan's separate HSA contribution (currently missing).",
    affected_lines: ["form_8889.line.6", "schedule_1.line.13"],
    dollar_impact: { estimate: 120, low: 50, high: 400 },
    audit_risk_delta: -0.15,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.5,
        rationale: "Recovers $250 of above-the-line deduction.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.55,
        rationale: "Sets correct line 6 baseline for TY2026 projection.",
      },
    ],
    composite_goal_fit: 0.54,
    confidence: 0.92,
    llm_only: false,
    audit_id: "audit-003",
  },
  {
    id: "rec-004",
    rule_id: "depreciation-land-split-001",
    finding_id: "finding-dep-001",
    category: "depreciation",
    severity: 5,
    irc_citation: "IRC §168; Pub 527",
    one_line_summary:
      "Split Will County rental purchase price — depreciate building only.",
    detail:
      "The rental is depreciated on the full $310,000 purchase price without a land carve-out. County records show land ≈ $78K / building ≈ $232K. Reduce current-year depreciation from $11,273 to ~$8,436.",
    affected_lines: ["schedule_e.line.18"],
    dollar_impact: { estimate: 2_837, low: 1_500, high: 5_000 },
    audit_risk_delta: -0.35,
    goal_fits: [
      {
        goal_id: "minimize_audit_risk",
        score: 0.88,
        rationale: "Removes over-deduction that an exam desk would flag.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.1,
        rationale: "Net negative on refund but required correction.",
      },
    ],
    composite_goal_fit: 0.64,
    confidence: 0.91,
    llm_only: false,
    audit_id: "audit-004",
  },
  {
    id: "rec-005",
    rule_id: "passive-469-agi-phaseout-001",
    finding_id: "finding-pal-001",
    category: "passive_activity_loss",
    severity: 3,
    irc_citation: "IRC §469(i)",
    pub_citation: "Pub 925",
    one_line_summary:
      "Suspend rental + K-1 losses — AGI phases out §469 special allowance.",
    detail:
      "AGI of $325,850 exceeds the $150K phaseout ceiling for the §469(i) $25,000 special allowance. The rental $(1,500) and K-1 $(2,800) passive losses must be suspended and carried forward.",
    affected_lines: ["schedule_e.line.26", "form_8582.line.3"],
    dollar_impact: { estimate: 430, low: 200, high: 800 },
    audit_risk_delta: -0.3,
    goal_fits: [
      {
        goal_id: "minimize_audit_risk",
        score: 0.82,
        rationale: "Correct PAL treatment removes a common audit trigger.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.6,
        rationale: "Adds $4,300 to carryforward stack for TY2026.",
      },
    ],
    composite_goal_fit: 0.62,
    confidence: 0.88,
    llm_only: false,
    audit_id: "audit-005",
  },
  {
    id: "rec-006",
    rule_id: "salt-cap-tcja-2025-001",
    finding_id: "finding-salt-001",
    category: "salt_cap",
    severity: 4,
    irc_citation: "IRC §164(b)(6); TCJA 2025 extension",
    one_line_summary:
      "Uncap SALT to TY2025 $40K MFJ — preparer used prior $10K cap.",
    detail:
      "TY2025 raises the SALT cap to $40,000 MFJ. Mitchell paid $19,200 state income tax + $7,400 property tax = $26,600, all now deductible.",
    affected_lines: ["schedule_a.line.5a", "schedule_a.line.5b"],
    dollar_impact: { estimate: 4_150, low: 300, high: 1_500 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.85,
        rationale: "$16.6K of recovered itemized deduction at marginal rate.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.6,
        rationale: "Locks in the new SALT baseline for tax planning.",
      },
    ],
    composite_goal_fit: 0.78,
    confidence: 0.95,
    llm_only: false,
    audit_id: "audit-006",
  },
  {
    id: "rec-007",
    rule_id: "ptet-election-il-001",
    finding_id: "finding-ptet-001",
    category: "ptet_election",
    severity: 4,
    irc_citation: "35 ILCS 5/232",
    one_line_summary:
      "Elect Illinois PTET on Blackwood Trading K-1 before state deadline.",
    detail:
      "IL offers a Pass-Through Entity Tax election that converts the owner's IL tax into an entity-level deduction, effectively uncapping that portion of SALT for federal purposes.",
    affected_lines: ["il_1040.line.7"],
    dollar_impact: { estimate: 680, low: 150, high: 1_200 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.7,
        rationale: "Federal deduction boost from entity-level tax.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.5,
        rationale: "Locks in PTET treatment for recurring K-1 income.",
      },
    ],
    composite_goal_fit: 0.63,
    confidence: 0.84,
    llm_only: false,
    audit_id: "audit-007",
  },
  {
    id: "rec-008",
    rule_id: "retirement-401k-headroom-003",
    finding_id: "finding-401k-001",
    category: "retirement_contribution",
    severity: 3,
    irc_citation: "IRC §402(g)",
    one_line_summary:
      "Olivia has $9,500 of 401(k) headroom — max before year-end.",
    detail:
      "Olivia's W-2 box 12 code D shows $14,000 against the §402(g) limit of $23,500. Increasing the last two paychecks' deferral saves federal tax at the marginal rate.",
    affected_lines: ["w2.olivia.box12d"],
    dollar_impact: { estimate: 2_375, low: 1_500, high: 4_500 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "optimize_retirement",
        score: 0.95,
        rationale: "Directly increases retirement savings by $9.5K.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.55,
        rationale: "Cuts AGI and federal tax for TY2025.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.45,
        rationale: "Establishes max-deferral baseline for TY2026 payroll.",
      },
    ],
    composite_goal_fit: 0.71,
    confidence: 0.97,
    llm_only: false,
    audit_id: "audit-008",
  },

  // =========================================================================
  // NEW rec-009 through rec-027 — Sprint 4 T-I01
  // =========================================================================

  // --- HIGH TIER ---

  {
    id: "rec-009",
    rule_id: "foreign-tax-credit-reclass-001",
    finding_id: "finding-ftc-001",
    category: "foreign_tax_credit",
    severity: 4,
    irc_citation: "IRC §901; IRC §904",
    pub_citation: "Pub 514",
    one_line_summary:
      "Claim foreign tax credit on $2,340 withheld by Vanguard intl fund.",
    detail:
      "The 1099-DIV from Vanguard International Growth reports $2,340 of foreign tax paid. The return currently deducts it on Schedule A instead of claiming Form 1116 credit. At the 24% bracket, the credit is dollar-for-dollar vs. the deduction at marginal rate.",
    affected_lines: ["form_1116.line.21", "schedule_a.line.6"],
    dollar_impact: { estimate: 1_170, low: 800, high: 1_600 },
    audit_risk_delta: -0.1,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.88,
        rationale: "Credit vs. deduction yields $1K+ additional tax savings.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.6,
        rationale: "FTC with proper Form 1116 is well-documented position.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.45,
        rationale: "Establishes FTC carryforward baseline for TY2026.",
      },
    ],
    composite_goal_fit: 0.72,
    confidence: 0.93,
    llm_only: false,
    audit_id: "audit-009",
  },
  {
    id: "rec-010",
    rule_id: "amt-iso-spread-001",
    finding_id: "finding-amt-001",
    category: "amt",
    severity: 4,
    irc_citation: "IRC §55; IRC §56",
    pub_citation: "Pub 909",
    one_line_summary:
      "Run AMT calc — RSU income + high SALT may trigger tentative minimum tax.",
    detail:
      "With $326K AGI, $48K RSU vest, and $26.6K SALT deduction, the AMT exemption phaseout begins at $133,300 (MFJ). Run Form 6251 to confirm no AMT exposure. If exposure exists, consider timing strategies for next year's vest.",
    affected_lines: ["form_6251.line.7", "form_6251.line.11"],
    dollar_impact: { estimate: 3_200, low: 0, high: 6_500 },
    audit_risk_delta: -0.2,
    goal_fits: [
      {
        goal_id: "minimize_audit_risk",
        score: 0.85,
        rationale: "AMT omission is a common IRS correction target.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.6,
        rationale: "Prevents unexpected AMT bill; may generate AMT credit carryforward.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.55,
        rationale: "Informs timing strategy for TY2026 RSU vesting.",
      },
    ],
    composite_goal_fit: 0.73,
    confidence: 0.87,
    llm_only: false,
    audit_id: "audit-010",
  },
  {
    id: "rec-011",
    rule_id: "estimated-tax-safe-harbor-001",
    finding_id: "finding-est-001",
    category: "estimated_tax",
    severity: 4,
    irc_citation: "IRC §6654",
    pub_citation: "Pub 505",
    one_line_summary:
      "Set up Q4 estimated payment to avoid underpayment penalty on K-1/RSU income.",
    detail:
      "K-1 income of $18,200 and RSU gains have no withholding. Total withholding from W-2s is $52,400 against an estimated $68,000 liability. Safe harbor requires 110% of prior-year tax ($59,800). A Q4 estimated payment of $7,400 avoids the §6654 penalty.",
    affected_lines: ["1040.line.37", "form_2210.line.1"],
    dollar_impact: { estimate: 890, low: 400, high: 1_400 },
    audit_risk_delta: -0.25,
    goal_fits: [
      {
        goal_id: "minimize_audit_risk",
        score: 0.78,
        rationale: "Avoids automatic underpayment penalty assessment.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.65,
        rationale: "Prevents $890 penalty that directly reduces net refund.",
      },
    ],
    composite_goal_fit: 0.74,
    confidence: 0.91,
    llm_only: false,
    audit_id: "audit-011",
  },

  // --- MEDIUM TIER ---

  {
    id: "rec-012",
    rule_id: "wash-sale-replacement-basis-001",
    finding_id: "finding-wash-002",
    category: "wash_sale",
    severity: 3,
    irc_citation: "IRC §1091(d)",
    pub_citation: "Pub 550",
    one_line_summary:
      "Adjust replacement-lot basis upward by $4,180 disallowed wash-sale loss.",
    detail:
      "The three wash-sale lots have $4,180 disallowed. Per §1091(d), the disallowed loss must be added to the cost basis of the replacement shares. The current 1099-B does not reflect this adjustment on the replacement lots.",
    affected_lines: ["8949.row.10", "8949.row.11"],
    dollar_impact: { estimate: 1_045, low: 600, high: 1_500 },
    audit_risk_delta: -0.15,
    goal_fits: [
      {
        goal_id: "harvest_losses",
        score: 0.75,
        rationale: "Correct basis ensures future sale recognizes deferred loss.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.6,
        rationale: "Prevents IRS basis mismatch on future disposition.",
      },
    ],
    composite_goal_fit: 0.55,
    confidence: 0.9,
    llm_only: false,
    audit_id: "audit-012",
  },
  {
    id: "rec-013",
    rule_id: "hsa-catch-up-spouse-001",
    finding_id: "finding-hsa-002",
    category: "hsa",
    severity: 2,
    irc_citation: "IRC §223(b)(3)",
    pub_citation: "Pub 969",
    one_line_summary:
      "Ryan (age 56) qualifies for $1,000 HSA catch-up — not claimed.",
    detail:
      "Ryan is 56 and covered under a family HDHP. He is eligible for the $1,000 catch-up contribution under §223(b)(3). This was not reflected on Form 8889. Adding it provides an additional above-the-line deduction.",
    affected_lines: ["form_8889.line.3", "schedule_1.line.13"],
    dollar_impact: { estimate: 240, low: 150, high: 350 },
    audit_risk_delta: -0.05,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.55,
        rationale: "Additional $1K deduction at 24% marginal rate.",
      },
      {
        goal_id: "optimize_retirement",
        score: 0.65,
        rationale: "HSA serves as supplemental retirement savings vehicle.",
      },
    ],
    composite_goal_fit: 0.48,
    confidence: 0.89,
    llm_only: false,
    audit_id: "audit-013",
  },
  {
    id: "rec-014",
    rule_id: "depreciation-method-check-001",
    finding_id: "finding-dep-002",
    category: "depreciation",
    severity: 3,
    irc_citation: "IRC §168(b); Rev. Proc. 87-57",
    one_line_summary:
      "Verify MACRS 27.5-year straight-line rate on Will County rental.",
    detail:
      "After the land/building split, confirm the depreciation method is mid-month convention MACRS 27.5-year for the residential rental. The current schedule uses $11,273 which implies full-price basis. Recalculate with $232K building value.",
    affected_lines: ["schedule_e.line.18", "form_4562.line.19h"],
    dollar_impact: { estimate: 680, low: 300, high: 1_200 },
    audit_risk_delta: -0.15,
    goal_fits: [
      {
        goal_id: "minimize_audit_risk",
        score: 0.72,
        rationale: "Correct depreciation method prevents IRS adjustment.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.5,
        rationale: "Sets correct annual depreciation for remaining recovery period.",
      },
    ],
    composite_goal_fit: 0.52,
    confidence: 0.86,
    llm_only: false,
    audit_id: "audit-014",
  },
  {
    id: "rec-015",
    rule_id: "passive-k1-material-participation-001",
    finding_id: "finding-pal-002",
    category: "passive_activity_loss",
    severity: 3,
    irc_citation: "IRC §469(c)(1); Temp. Reg. §1.469-5T",
    pub_citation: "Pub 925",
    one_line_summary:
      "Document Ryan's material participation in Blackwood Trading K-1.",
    detail:
      "The K-1 marks Ryan as a passive partner (is_passive = true). If Ryan can document 500+ hours via the 7-test framework under Temp. Reg. §1.469-5T, the $18,200 ordinary income reclassifies as non-passive, unlocking the suspended rental losses.",
    affected_lines: ["schedule_e.line.28", "form_8582.line.1"],
    dollar_impact: { estimate: 1_075, low: 400, high: 2_000 },
    audit_risk_delta: 0.15,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.6,
        rationale: "Unlocks suspended passive losses for current-year deduction.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.35,
        rationale: "Material participation claims require strong documentation.",
      },
    ],
    composite_goal_fit: 0.45,
    confidence: 0.72,
    llm_only: false,
    audit_id: "audit-015",
  },
  {
    id: "rec-016",
    rule_id: "salt-property-tax-escrow-001",
    finding_id: "finding-salt-002",
    category: "salt_cap",
    severity: 2,
    irc_citation: "IRC §164(a)(1)",
    one_line_summary:
      "Verify property tax paid vs. assessed — escrow timing may differ.",
    detail:
      "The 1098 shows $7,400 property tax paid, but Will County IL bills on a one-year arrear cycle. Confirm the deductible amount matches taxes actually paid in TY2025, not the assessed amount. Difference could be $200-$500.",
    affected_lines: ["schedule_a.line.5b"],
    dollar_impact: { estimate: 350, low: 100, high: 600 },
    audit_risk_delta: -0.1,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.45,
        rationale: "Small refund impact from timing adjustment.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.55,
        rationale: "Accurate property tax figure prevents IRS notice.",
      },
    ],
    composite_goal_fit: 0.42,
    confidence: 0.78,
    llm_only: false,
    audit_id: "audit-016",
  },
  {
    id: "rec-017",
    rule_id: "retirement-ira-spousal-001",
    finding_id: "finding-ira-001",
    category: "retirement_contribution",
    severity: 2,
    irc_citation: "IRC §219(c)",
    one_line_summary:
      "Ryan may qualify for spousal traditional IRA deduction ($7,000).",
    detail:
      "Ryan has no W-2 wages but files MFJ with AGI $326K. Under §219(c), a non-working spouse can contribute to a traditional IRA. However, the MAGI phaseout for MFJ with an active-plan spouse is $230K-$240K — Ryan's deduction phases out entirely. Consider Roth IRA backdoor instead.",
    affected_lines: ["schedule_1.line.20"],
    dollar_impact: { estimate: 0, low: 0, high: 200 },
    audit_risk_delta: 0.05,
    goal_fits: [
      {
        goal_id: "optimize_retirement",
        score: 0.7,
        rationale: "Backdoor Roth IRA provides tax-free growth for retirement.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.55,
        rationale: "Sets up annual backdoor Roth contribution strategy.",
      },
    ],
    composite_goal_fit: 0.48,
    confidence: 0.82,
    llm_only: false,
    audit_id: "audit-017",
  },
  {
    id: "rec-018",
    rule_id: "credit-child-phaseout-001",
    finding_id: "finding-credit-001",
    category: "credit_eligibility",
    severity: 3,
    irc_citation: "IRC §24(b)",
    pub_citation: "Pub 972",
    one_line_summary:
      "Verify child tax credit — two dependents, but AGI phaseout applies.",
    detail:
      "Mitchell has two dependent children qualifying for the $2,000 CTC. However, the phaseout begins at $400K MFJ ($50 reduction per $1K over). At $326K AGI, full credit of $4,000 should be claimed. Confirm the return does not under-claim.",
    affected_lines: ["1040.line.19", "schedule_8812.line.14"],
    dollar_impact: { estimate: 800, low: 0, high: 2_000 },
    audit_risk_delta: -0.1,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.75,
        rationale: "Ensures full $4,000 CTC claimed at current AGI level.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.5,
        rationale: "Proper CTC calculation prevents IRS adjustment letter.",
      },
    ],
    composite_goal_fit: 0.55,
    confidence: 0.94,
    llm_only: false,
    audit_id: "audit-018",
  },
  {
    id: "rec-019",
    rule_id: "ptet-ca-election-001",
    finding_id: "finding-ptet-002",
    category: "ptet_election",
    severity: 2,
    irc_citation: "Cal. Rev. & Tax. Code §19902",
    one_line_summary:
      "Evaluate California PTET election on Blackwood CA-source income.",
    detail:
      "California also offers a PTET election for qualified entities. If Blackwood Trading has CA-source income, the entity-level election could provide additional SALT workaround. Requires coordination with the IL PTET election to avoid double-counting.",
    affected_lines: ["ca_540.line.15"],
    dollar_impact: { estimate: 420, low: 100, high: 800 },
    audit_risk_delta: 0.05,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.55,
        rationale: "Additional federal SALT deduction from CA entity-level tax.",
      },
      {
        goal_id: "optimize_next_year",
        score: 0.45,
        rationale: "Multi-state PTET strategy for recurring K-1 income.",
      },
    ],
    composite_goal_fit: 0.44,
    confidence: 0.71,
    llm_only: false,
    audit_id: "audit-019",
  },
  {
    id: "rec-020",
    rule_id: "rsu-83b-election-future-001",
    finding_id: "finding-rsu-002",
    category: "rsu",
    severity: 2,
    irc_citation: "IRC §83(b)",
    one_line_summary:
      "Discuss §83(b) election for any unvested Contoso equity grants.",
    detail:
      "If Olivia has unvested RSU or restricted stock grants for TY2026, a §83(b) election filed within 30 days of grant locks in ordinary income at grant-date FMV. This is forward-looking advice for next vest cycle — no current-year impact.",
    affected_lines: ["w2.olivia.box12v"],
    dollar_impact: { estimate: 0, low: 0, high: 5_000 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "optimize_next_year",
        score: 0.8,
        rationale: "Could save thousands on next vest if stock appreciates.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.1,
        rationale: "No current-year impact; purely forward-looking.",
      },
    ],
    composite_goal_fit: 0.42,
    confidence: 0.65,
    llm_only: false,
    audit_id: "audit-020",
  },
  {
    id: "rec-021",
    rule_id: "estimated-tax-annualization-001",
    finding_id: "finding-est-002",
    category: "estimated_tax",
    severity: 2,
    irc_citation: "IRC §6654(d)(2)",
    pub_citation: "Pub 505",
    one_line_summary:
      "Use annualized income method on Form 2210 to reduce Q1-Q3 penalty.",
    detail:
      "The RSU vest and K-1 distribution were concentrated in Q3-Q4. The annualized income installment method on Schedule AI of Form 2210 allocates the tax liability to the quarters when income was received, potentially eliminating the Q1-Q3 underpayment penalty.",
    affected_lines: ["form_2210.schedule_ai.line.1"],
    dollar_impact: { estimate: 340, low: 100, high: 600 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.55,
        rationale: "Eliminates or reduces estimated tax penalty.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.4,
        rationale: "Annualization is a standard IRS-accepted method.",
      },
    ],
    composite_goal_fit: 0.44,
    confidence: 0.83,
    llm_only: false,
    audit_id: "audit-021",
  },

  // --- LOW TIER ---

  {
    id: "rec-022",
    rule_id: "section-121-primary-residence-001",
    finding_id: "finding-121-001",
    category: "section_121",
    severity: 1,
    irc_citation: "IRC §121",
    pub_citation: "Pub 523",
    one_line_summary:
      "Document §121 eligibility on Naperville home for future sale planning.",
    detail:
      "The Mitchells' primary residence in Naperville IL qualifies for the $500K MFJ exclusion under §121 (owned and used 2+ years). No sale is planned, but documenting basis and eligibility now simplifies future disposition.",
    affected_lines: ["schedule_d.line.7"],
    dollar_impact: { estimate: 0, low: 0, high: 0 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "optimize_next_year",
        score: 0.4,
        rationale: "Basis documentation useful if future sale within 5 years.",
      },
      {
        goal_id: "simplify_filing",
        score: 0.3,
        rationale: "Pre-documents exclusion eligibility for future returns.",
      },
    ],
    composite_goal_fit: 0.2,
    confidence: 0.95,
    llm_only: false,
    audit_id: "audit-022",
  },
  {
    id: "rec-023",
    rule_id: "credit-education-529-001",
    finding_id: "finding-credit-002",
    category: "credit_eligibility",
    severity: 1,
    irc_citation: "IRC §25A; IRC §529",
    pub_citation: "Pub 970",
    one_line_summary:
      "Review 529 plan contributions for IL state deduction benefit.",
    detail:
      "Illinois allows a $10K/individual ($20K MFJ) deduction for 529 contributions on the IL-1040. If the Mitchells contribute to a 529 for their two children, the state tax savings at IL's 4.95% rate is up to $990. No federal impact.",
    affected_lines: ["il_1040.line.12"],
    dollar_impact: { estimate: 495, low: 0, high: 990 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "optimize_next_year",
        score: 0.5,
        rationale: "Annual 529 contributions reduce state tax each year.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.2,
        rationale: "State-only benefit; moderate impact at IL rate.",
      },
    ],
    composite_goal_fit: 0.28,
    confidence: 0.8,
    llm_only: false,
    audit_id: "audit-023",
  },
  {
    id: "rec-024",
    rule_id: "foreign-tax-credit-carryover-001",
    finding_id: "finding-ftc-002",
    category: "foreign_tax_credit",
    severity: 1,
    irc_citation: "IRC §904(c)",
    one_line_summary:
      "Check prior-year FTC carryforward — unused credit may offset TY2025 tax.",
    detail:
      "If the Mitchells had foreign tax paid in TY2024 that exceeded the §904 limitation, up to 10 years of carryforward is available. The prior-year return shows $0 FTC carryforward, confirming no unused credit to apply.",
    affected_lines: ["form_1116.line.10"],
    dollar_impact: { estimate: 0, low: 0, high: 300 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.15,
        rationale: "No carryforward available; confirms clean FTC position.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.2,
        rationale: "Documents FTC carryover analysis for completeness.",
      },
    ],
    composite_goal_fit: 0.12,
    confidence: 0.95,
    llm_only: false,
    audit_id: "audit-024",
  },
  {
    id: "rec-025",
    rule_id: "amt-credit-carryforward-001",
    finding_id: "finding-amt-002",
    category: "amt",
    severity: 1,
    irc_citation: "IRC §53",
    one_line_summary:
      "Verify no AMT credit carryforward from prior years.",
    detail:
      "If the Mitchells paid AMT in any prior year, an AMT credit (Form 8801) may offset regular tax in TY2025. Prior-year snapshot shows $0 AMT credit carryforward. Confirm and document for completeness.",
    affected_lines: ["form_8801.line.1"],
    dollar_impact: { estimate: 0, low: 0, high: 500 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.1,
        rationale: "No credit available; purely a verification step.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.15,
        rationale: "Documents AMT credit analysis for file completeness.",
      },
    ],
    composite_goal_fit: 0.08,
    confidence: 0.97,
    llm_only: false,
    audit_id: "audit-025",
  },
  {
    id: "rec-026",
    rule_id: "passive-rental-grouping-001",
    finding_id: "finding-pal-003",
    category: "passive_activity_loss",
    severity: 1,
    irc_citation: "IRC §469; Reg. §1.469-4(d)",
    one_line_summary:
      "Consider grouping rental with K-1 activity under Reg. §1.469-4.",
    detail:
      "If Blackwood Trading has operational ties to the Will County rental (e.g., the partnership uses the property), grouping them as a single activity under Reg. §1.469-4(d) could allow netting passive income against rental losses. Requires written election attached to the return.",
    affected_lines: ["form_8582.line.1", "form_8582.line.3"],
    dollar_impact: { estimate: 300, low: 0, high: 800 },
    audit_risk_delta: 0.1,
    goal_fits: [
      {
        goal_id: "maximize_refund",
        score: 0.35,
        rationale: "May unlock suspended losses, but requires factual support.",
      },
      {
        goal_id: "minimize_audit_risk",
        score: 0.15,
        rationale: "Grouping elections are scrutinized; requires documentation.",
      },
    ],
    composite_goal_fit: 0.2,
    confidence: 0.55,
    llm_only: false,
    audit_id: "audit-026",
  },
  {
    id: "rec-027",
    rule_id: "section-121-rental-conversion-001",
    finding_id: null,
    category: "section_121",
    severity: 1,
    irc_citation: "IRC §121(d)(6); IRC §1250",
    one_line_summary:
      "LLM flag: if rental was prior residence, partial §121 exclusion may apply.",
    detail:
      "If the Will County rental was the Mitchells' prior primary residence, §121(d)(6) provides a partial exclusion on future sale (excluding depreciation recapture). This is an LLM-surfaced observation — the return data does not confirm prior residence status.",
    affected_lines: ["schedule_e.line.1"],
    dollar_impact: { estimate: 0, low: 0, high: 15_000 },
    audit_risk_delta: 0,
    goal_fits: [
      {
        goal_id: "optimize_next_year",
        score: 0.3,
        rationale: "Future planning value if property is eventually sold.",
      },
      {
        goal_id: "maximize_refund",
        score: 0.05,
        rationale: "No current-year impact; speculative future benefit.",
      },
    ],
    composite_goal_fit: 0.15,
    confidence: 0.4,
    llm_only: true,
    audit_id: "audit-027",
  },
];
