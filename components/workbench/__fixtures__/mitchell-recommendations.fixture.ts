import type { Recommendation } from "../../../src/contracts";

/**
 * Static fixture of the Agent 2 `/api/recommendations` response for
 * the Mitchell hero return. Hand-built from
 * src/data/golden-recommendations.json so the workbench can render
 * and be tested without Agent 2 being live.
 */
export const mitchellRecommendationsFixture: Recommendation[] = [
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
];
