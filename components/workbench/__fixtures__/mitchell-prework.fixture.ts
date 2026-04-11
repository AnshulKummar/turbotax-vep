import type { PreWorkOutput } from "../../../src/contracts";

/**
 * Static fixture of the Agent 3 `/api/prework` response for the
 * Mitchell hero return. Hand-built from src/data/mitchell-return.ts so
 * the workbench can render and be tested without Agent 3 being live.
 */
export const mitchellPreWorkFixture: PreWorkOutput = {
  case_id: "mitchell-2025-001",
  ocr: {
    documents: [
      { name: "W2_Olivia_Contoso.pdf", pages: 1 },
      { name: "W2_Ryan_LincolnHeights.pdf", pages: 1 },
      { name: "1099B_Faraday.pdf", pages: 4 },
      { name: "1099DIV_Faraday.pdf", pages: 1 },
      { name: "K1_Blackwood.pdf", pages: 3 },
      { name: "1098_Midwest.pdf", pages: 1 },
      { name: "8889_HSA.pdf", pages: 2 },
      { name: "ScheduleE_Joliet.pdf", pages: 2 },
    ],
    fields: {
      "1040.line.1a": {
        value: 317_000,
        confidence: 0.98,
        source: {
          source_document: "W2_Olivia_Contoso.pdf",
          page: 1,
          bbox: [72, 120, 220, 36],
        },
      },
      "1040.line.2b": {
        value: 280,
        confidence: 0.96,
        source: {
          source_document: "1099DIV_Faraday.pdf",
          page: 1,
          bbox: [80, 210, 160, 28],
        },
      },
      "1040.line.3a": {
        value: 3_900,
        confidence: 0.97,
        source: {
          source_document: "1099DIV_Faraday.pdf",
          page: 1,
          bbox: [80, 250, 160, 28],
        },
      },
      "1040.line.3b": {
        value: 4_600,
        confidence: 0.97,
        source: {
          source_document: "1099DIV_Faraday.pdf",
          page: 1,
          bbox: [80, 280, 160, 28],
        },
      },
      "1040.line.7": {
        value: 58_300,
        confidence: 0.72,
        source: {
          source_document: "1099B_Faraday.pdf",
          page: 2,
          bbox: [55, 340, 240, 36],
        },
      },
      "schedule_e.line.26": {
        value: -1_500,
        confidence: 0.64,
        source: {
          source_document: "ScheduleE_Joliet.pdf",
          page: 2,
          bbox: [70, 420, 180, 32],
        },
      },
      "schedule_1.line.13": {
        value: 4_150,
        confidence: 0.55,
        source: {
          source_document: "8889_HSA.pdf",
          page: 1,
          bbox: [60, 300, 150, 30],
        },
      },
      "1040.line.11": {
        value: 325_850,
        confidence: 0.88,
      },
      "1040.line.12": {
        value: 40_600,
        confidence: 0.69,
      },
      "1040.line.24": {
        value: 63_400,
        confidence: 0.81,
      },
    },
  },
  yoy_delta: [
    {
      line_id: "1040.line.1a",
      current_value: 317_000,
      prior_value: 275_000,
      delta: 42_000,
      delta_percent: 15.3,
      explanation:
        "RSU vesting up $42K from a new vest tranche at Contoso Cloud Systems.",
    },
    {
      line_id: "1040.line.7",
      current_value: 58_300,
      prior_value: 12_400,
      delta: 45_900,
      delta_percent: 370.2,
      explanation:
        "Large capital gains swing driven by RSU sell-to-cover lots; likely double-counted.",
    },
    {
      line_id: "1040.line.11",
      current_value: 325_850,
      prior_value: 289_400,
      delta: 36_450,
      delta_percent: 12.6,
      explanation: "AGI up ~12.6% YoY, pushing above §469 phaseout ceiling.",
    },
  ],
  complexity: {
    score: 8,
    factors: [
      { factor: "RSU vesting across tax years", contribution: 2.0 },
      { factor: "Multi-state residency (IL + CA)", contribution: 1.5 },
      { factor: "Rental property with passive losses", contribution: 1.5 },
      { factor: "Wash sale disallowed losses", contribution: 1.0 },
      { factor: "Schedule K-1 pass-through", contribution: 1.0 },
      { factor: "HSA 8889 reconciliation", contribution: 0.5 },
      { factor: "Foreign tax credit", contribution: 0.5 },
    ],
  },
  risk_register: [
    {
      id: "risk-001",
      rule_id: "rsu-double-count-001",
      severity: 5,
      dollar_impact_estimate: 10_800,
      audit_risk_delta: -0.4,
      irc_citation: "IRC §83(a); Rev. Rul. 2002-13",
      one_line_summary:
        "RSU vest already in W-2 Box 1 but 1099-B reports basis of $0 on same-day sale — double taxation.",
      affected_lines: ["1040.line.7", "8949.row.1", "8949.row.2", "8949.row.3"],
      rank: 1,
    },
    {
      id: "risk-002",
      rule_id: "depreciation-land-split-001",
      severity: 5,
      dollar_impact_estimate: 2_837,
      audit_risk_delta: 0.35,
      irc_citation: "IRC §168; Pub 527",
      one_line_summary:
        "Will County rental depreciated on full $310K purchase price — no land carve-out.",
      affected_lines: ["schedule_e.line.18"],
      rank: 2,
    },
    {
      id: "risk-003",
      rule_id: "wash-sale-code-w-001",
      severity: 5,
      dollar_impact_estimate: 1_254,
      audit_risk_delta: 0.45,
      irc_citation: "IRC §1091",
      one_line_summary:
        "Three lots report wash_sale_loss_disallowed but Code W missing on Form 8949.",
      affected_lines: ["8949.row.7", "8949.row.8", "8949.row.9"],
      rank: 3,
    },
    {
      id: "risk-004",
      rule_id: "salt-cap-tcja-2025-001",
      severity: 4,
      dollar_impact_estimate: 4_150,
      audit_risk_delta: -0.1,
      irc_citation: "IRC §164(b)(6); TCJA 2025 extension",
      one_line_summary:
        "Preparer capped SALT at $10K (prior law) — TY2025 MFJ cap is $40K.",
      affected_lines: ["schedule_a.line.5a", "schedule_a.line.5b"],
      rank: 4,
    },
    {
      id: "risk-005",
      rule_id: "ptet-election-il-001",
      severity: 4,
      dollar_impact_estimate: 680,
      audit_risk_delta: -0.05,
      irc_citation: "35 ILCS 5/232",
      one_line_summary:
        "Illinois PTET election available on Blackwood K-1 — not taken.",
      affected_lines: ["il_1040.line.7"],
      rank: 5,
    },
    {
      id: "risk-006",
      rule_id: "passive-469-agi-phaseout-001",
      severity: 3,
      dollar_impact_estimate: 430,
      audit_risk_delta: 0.3,
      irc_citation: "IRC §469(i)",
      one_line_summary:
        "AGI above $150K phaseout — rental loss should be suspended, not deducted.",
      affected_lines: ["schedule_e.line.26", "form_8582.line.3"],
      rank: 6,
    },
    {
      id: "risk-007",
      rule_id: "hsa-8889-reconcile-001",
      severity: 3,
      dollar_impact_estimate: 120,
      audit_risk_delta: 0.15,
      irc_citation: "IRC §223; Rev. Proc. 2024-25",
      one_line_summary:
        "Form 8889 line 6 uses stale TY2024 family limit ($8,300 vs $8,550).",
      affected_lines: ["form_8889.line.6"],
      rank: 7,
    },
    {
      id: "risk-008",
      rule_id: "retirement-401k-headroom-003",
      severity: 3,
      dollar_impact_estimate: 2_375,
      audit_risk_delta: 0,
      irc_citation: "IRC §402(g)",
      one_line_summary:
        "Olivia has $9,500 of remaining 401(k) headroom before year-end.",
      affected_lines: ["w2.olivia.box12d"],
      rank: 8,
    },
    {
      id: "risk-009",
      rule_id: "ftc-form-1116-required-001",
      severity: 3,
      dollar_impact_estimate: 80,
      audit_risk_delta: 0.1,
      irc_citation: "IRC §904(k)",
      one_line_summary:
        "Foreign tax $260 — below $600 MFJ simplified FTC election threshold.",
      affected_lines: ["schedule_3.line.1"],
      rank: 9,
    },
    {
      id: "risk-010",
      rule_id: "estimated-tax-safe-harbor-001",
      severity: 2,
      dollar_impact_estimate: 0,
      audit_risk_delta: -0.05,
      irc_citation: "IRC §6654",
      one_line_summary:
        "Withholding meets prior-year safe harbor — no underpayment penalty expected.",
      affected_lines: ["1040.line.25"],
      rank: 10,
    },
  ],
};
