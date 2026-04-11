import type { AuditEvent, RedactedPrompt } from "../../../src/contracts";

/**
 * Static fixture of the Agent 5 `/api/audit/[recommendation_id]` response
 * for the top recommendation. Demonstrates the [PII_TYPE_HASH8] token
 * form so the expert can verify no raw PII was sent to the LLM.
 */
export const whatAiSawFixture: RedactedPrompt = {
  redacted_text: `You are a senior US tax preparer. Review this case for Big Bet B1 findings.

Taxpayer: [PERSON_NAME_a3f8b1c2] (SSN [SSN_4c9e2d71])
Spouse:   [PERSON_NAME_17d9a0bb] (SSN [SSN_8b3f001c])
Address:  [ADDRESS_c9e2a411], [ZIP_001f9a2e]
Filing:   Married Filing Jointly — TY2025

W-2 #1 — [PERSON_NAME_a3f8b1c2]
  Employer: Contoso Cloud Systems LLC (EIN [EIN_55cc11ee])
  Box 1:    $245,000
  Box 12 V: $48,000  (RSU income, already in Box 1)
  Box 12 D: $14,000  (401(k) elective deferral)

1099-B — Faraday Brokerage Services (EIN [EIN_22bb00aa])
  RSU-VEST-001: proceeds $16,800 / basis $0 / same-day sale 2025-02-15
  RSU-VEST-002: proceeds $16,100 / basis $0 / same-day sale 2025-05-15
  RSU-VEST-003: proceeds $15,100 / basis $0 / same-day sale 2025-08-15
  WASH-001: wash_sale_loss_disallowed $1,600 / code null
  WASH-002: wash_sale_loss_disallowed $1,430 / code null
  WASH-003: wash_sale_loss_disallowed $1,150 / code null

Question: Identify the most impactful finding on this return and explain
how to remedy it in the TurboTax Expert Workbench.`,
  token_map: {
    "[PERSON_NAME_a3f8b1c2]": {
      type: "PERSON_NAME",
      original_hash: "a3f8b1c2e1d2f9b4",
    },
    "[PERSON_NAME_17d9a0bb]": {
      type: "PERSON_NAME",
      original_hash: "17d9a0bb889aff02",
    },
    "[SSN_4c9e2d71]": { type: "SSN", original_hash: "4c9e2d71ae118bf3" },
    "[SSN_8b3f001c]": { type: "SSN", original_hash: "8b3f001c7711eea9" },
    "[ADDRESS_c9e2a411]": {
      type: "ADDRESS",
      original_hash: "c9e2a411f1a2b0c4",
    },
    "[ZIP_001f9a2e]": { type: "ZIP", original_hash: "001f9a2e82fff330" },
    "[EIN_55cc11ee]": { type: "EIN", original_hash: "55cc11ee0090bb77" },
    "[EIN_22bb00aa]": { type: "EIN", original_hash: "22bb00aa7711008f" },
  },
  session_salt: "salt-7f91-a0bf-mitchell-2025",
};

export const auditTrailFixture: AuditEvent[] = [
  {
    id: 1,
    ts: "2026-04-11T09:02:15.000Z",
    case_id: "mitchell-2025-001",
    event_type: "prework_completed",
    response_summary:
      "Pre-work complete: 8 docs OCR'd, complexity 8/10, 10 risk register entries.",
    metadata: { documents: 8, complexity: 8 },
  },
  {
    id: 2,
    ts: "2026-04-11T09:02:41.000Z",
    case_id: "mitchell-2025-001",
    event_type: "case_routed",
    response_summary:
      "Routed to Expert #221 (RSU specialty, IL+CA, prior-year preparer). ETA 4 min.",
  },
  {
    id: 3,
    ts: "2026-04-11T09:02:52.000Z",
    case_id: "mitchell-2025-001",
    event_type: "goals_captured",
    response_summary:
      "Customer goals: maximize_refund (w5), minimize_audit_risk (w4), optimize_next_year (w3).",
  },
  {
    id: 4,
    ts: "2026-04-11T09:03:05.000Z",
    case_id: "mitchell-2025-001",
    event_type: "llm_call",
    model: "claude-sonnet-4-6",
    redacted_prompt: "[see what-ai-saw panel]",
    response_summary:
      "LLM identified RSU double-count as highest-impact finding; produced 8 recommendations.",
  },
  {
    id: 5,
    ts: "2026-04-11T09:03:09.000Z",
    case_id: "mitchell-2025-001",
    event_type: "recommendation_produced",
    response_summary: "8 recommendations produced, composite goal fit 0.85.",
  },
  {
    id: 6,
    ts: "2026-04-11T09:05:22.000Z",
    case_id: "mitchell-2025-001",
    event_type: "expert_action",
    expert_action: "accept",
    expert_reason: "RSU double-count — clear fix, applied inline.",
    metadata: { recommendation_id: "rec-001" },
  },
  {
    id: 7,
    ts: "2026-04-11T09:07:48.000Z",
    case_id: "mitchell-2025-001",
    event_type: "expert_action",
    expert_action: "edit",
    expert_reason: "Adjusted wash-sale basis step-up manually on row 8.",
    metadata: { recommendation_id: "rec-002" },
  },
  {
    id: 8,
    ts: "2026-04-11T09:10:03.000Z",
    case_id: "mitchell-2025-001",
    event_type: "expert_action",
    expert_action: "defer",
    expert_reason: "PTET election needs partnership sign-off, revisit tomorrow.",
    metadata: { recommendation_id: "rec-007" },
  },
];
