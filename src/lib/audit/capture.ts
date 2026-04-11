/**
 * STUB — owned by Agent 5 (Trust Layer). Replaced with the real SQLite-backed
 * implementation per ADR-004.
 *
 * This stub exists so that Agent 2's recommendation engine can compile and
 * type-check in parallel with Agent 5's build. Agent 5's branch overwrites
 * this file with the real implementation that writes to ./data/audit.db.
 *
 * DO NOT use this stub for any test that asserts audit-trail content — it
 * keeps everything in-memory and resets per process.
 */

import type {
  AuditEvent,
  ExpertActionType,
  Recommendation,
  RedactedPrompt,
} from "@/contracts";

let _next_id = 1;
const _events: AuditEvent[] = [];

export async function capture_llm_call(
  case_id: string,
  model: string,
  redacted_prompt: RedactedPrompt,
  response_summary: string,
): Promise<number> {
  const id = _next_id++;
  _events.push({
    id,
    ts: new Date().toISOString(),
    case_id,
    event_type: "llm_call",
    model,
    redacted_prompt: redacted_prompt.redacted_text,
    response_summary,
  });
  return id;
}

export async function capture_expert_action(
  recommendation_id: string,
  action: ExpertActionType,
  reason?: string,
): Promise<void> {
  _events.push({
    id: _next_id++,
    ts: new Date().toISOString(),
    case_id: recommendation_id,
    event_type: "expert_action",
    expert_action: action,
    expert_reason: reason,
  });
}

export async function capture_recommendation(
  case_id: string,
  rec: Recommendation,
): Promise<void> {
  _events.push({
    id: _next_id++,
    ts: new Date().toISOString(),
    case_id,
    event_type: "recommendation_produced",
    response_summary: rec.id,
  });
}

export async function query_audit_trail(case_id: string): Promise<AuditEvent[]> {
  return _events.filter((e) => e.case_id === case_id);
}
