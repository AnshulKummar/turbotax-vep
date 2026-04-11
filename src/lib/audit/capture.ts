/**
 * Audit trail capture — real SQLite-backed implementation (Agent 5).
 *
 * Signatures match the stub this file replaces, so Agent 2's recommendation
 * engine imports keep working:
 *
 *   capture_llm_call(case_id, model, redacted_prompt, response_summary): Promise<number>
 *   capture_expert_action(recommendation_id, action, reason?): Promise<void>
 *   capture_recommendation(case_id, rec): Promise<void>
 *   query_audit_trail(case_id): Promise<AuditEvent[]>
 *
 * Additionally, the recommendation row is written to the denormalized
 * `recommendations` table AND a matching `audit_events` row is emitted for
 * the chronological case timeline. Expert actions land in both
 * `expert_actions` (normalized) and `audit_events` (timeline) so the
 * "what AI saw" feed can trace the provenance of any decision in a single
 * query.
 */

import type {
  AuditEvent,
  AuditEventType,
  ExpertActionType,
  Recommendation,
  RedactedPrompt,
} from "@/contracts";

import { get_db } from "./db";

interface AuditEventRow {
  id: number;
  ts: string;
  case_id: string;
  event_type: string;
  model: string | null;
  redacted_prompt: string | null;
  response_summary: string | null;
  expert_action: string | null;
  expert_reason: string | null;
  metadata_json: string | null;
}

function row_to_event(r: AuditEventRow): AuditEvent {
  const ev: AuditEvent = {
    id: r.id,
    ts: r.ts,
    case_id: r.case_id,
    event_type: r.event_type as AuditEventType,
  };
  if (r.model !== null) ev.model = r.model;
  if (r.redacted_prompt !== null) ev.redacted_prompt = r.redacted_prompt;
  if (r.response_summary !== null) ev.response_summary = r.response_summary;
  if (r.expert_action !== null) ev.expert_action = r.expert_action as ExpertActionType;
  if (r.expert_reason !== null) ev.expert_reason = r.expert_reason;
  if (r.metadata_json !== null) {
    try {
      ev.metadata = JSON.parse(r.metadata_json) as Record<string, unknown>;
    } catch {
      // Malformed metadata shouldn't crash the timeline render.
      ev.metadata = { _raw: r.metadata_json };
    }
  }
  return ev;
}

// ---------------------------------------------------------------------------
// Writers
// ---------------------------------------------------------------------------

export async function capture_llm_call(
  case_id: string,
  model: string,
  redacted_prompt: RedactedPrompt,
  response_summary: string,
): Promise<number> {
  const db = get_db();
  const ts = new Date().toISOString();
  const metadata_json = JSON.stringify({
    token_map: redacted_prompt.token_map,
    session_salt: redacted_prompt.session_salt,
  });
  const stmt = db.prepare(
    `INSERT INTO audit_events
       (ts, case_id, event_type, model, redacted_prompt, response_summary, metadata_json)
     VALUES (?, ?, 'llm_call', ?, ?, ?, ?)`,
  );
  const info = stmt.run(
    ts,
    case_id,
    model,
    redacted_prompt.redacted_text,
    response_summary,
    metadata_json,
  );
  return Number(info.lastInsertRowid);
}

export async function capture_expert_action(
  recommendation_id: string,
  action: ExpertActionType,
  reason?: string,
): Promise<void> {
  const db = get_db();
  const ts = new Date().toISOString();

  // Look up the case_id for the recommendation so the timeline stays
  // sorted correctly. Fall back to the recommendation_id itself if we
  // don't have a row (e.g. test harness that skipped capture_recommendation).
  const rec = db
    .prepare(`SELECT case_id FROM recommendations WHERE id = ?`)
    .get(recommendation_id) as { case_id: string } | undefined;
  const case_id = rec?.case_id ?? recommendation_id;

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT INTO expert_actions (recommendation_id, action, reason, ts)
       VALUES (?, ?, ?, ?)`,
    ).run(recommendation_id, action, reason ?? null, ts);

    db.prepare(
      `INSERT INTO audit_events
         (ts, case_id, event_type, expert_action, expert_reason, metadata_json)
       VALUES (?, ?, 'expert_action', ?, ?, ?)`,
    ).run(
      ts,
      case_id,
      action,
      reason ?? null,
      JSON.stringify({ recommendation_id }),
    );
  });
  tx();
}

export async function capture_recommendation(
  case_id: string,
  rec: Recommendation,
): Promise<void> {
  const db = get_db();
  const ts = new Date().toISOString();

  const tx = db.transaction(() => {
    db.prepare(
      `INSERT OR REPLACE INTO recommendations
         (id, case_id, rule_id, dollar_impact, confidence, goal_fit_score, produced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      rec.id,
      case_id,
      rec.rule_id,
      rec.dollar_impact.estimate,
      rec.confidence,
      rec.composite_goal_fit,
      ts,
    );

    db.prepare(
      `INSERT INTO audit_events
         (ts, case_id, event_type, response_summary, metadata_json)
       VALUES (?, ?, 'recommendation_produced', ?, ?)`,
    ).run(
      ts,
      case_id,
      rec.one_line_summary,
      JSON.stringify({
        recommendation_id: rec.id,
        rule_id: rec.rule_id,
        confidence: rec.confidence,
        dollar_impact: rec.dollar_impact,
        llm_only: rec.llm_only,
        audit_id: rec.audit_id,
      }),
    );
  });
  tx();
}

// ---------------------------------------------------------------------------
// Calibration runs
// ---------------------------------------------------------------------------

export interface CalibrationRunRecord {
  ts: string;
  test_set_size: number;
  max_calibration_error: number;
  decile_curve_json: string;
  passed_gate: boolean;
}

export async function capture_calibration_run(
  rec: CalibrationRunRecord,
): Promise<number> {
  const db = get_db();
  const stmt = db.prepare(
    `INSERT INTO calibration_runs
       (ts, test_set_size, max_calibration_error, decile_curve_json, passed_gate)
     VALUES (?, ?, ?, ?, ?)`,
  );
  const info = stmt.run(
    rec.ts,
    rec.test_set_size,
    rec.max_calibration_error,
    rec.decile_curve_json,
    rec.passed_gate ? 1 : 0,
  );
  return Number(info.lastInsertRowid);
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

export async function query_audit_trail(case_id: string): Promise<AuditEvent[]> {
  const db = get_db();
  const rows = db
    .prepare(
      `SELECT id, ts, case_id, event_type, model, redacted_prompt, response_summary,
              expert_action, expert_reason, metadata_json
         FROM audit_events
        WHERE case_id = ?
        ORDER BY id ASC`,
    )
    .all(case_id) as AuditEventRow[];
  return rows.map(row_to_event);
}

/**
 * Returns the `llm_call` audit event that produced a given recommendation.
 * Backs the "what AI saw" API.
 */
export async function query_llm_call_for_recommendation(
  recommendation_id: string,
): Promise<AuditEvent | null> {
  const db = get_db();
  const rec_row = db
    .prepare(`SELECT case_id FROM recommendations WHERE id = ?`)
    .get(recommendation_id) as { case_id: string } | undefined;
  if (!rec_row) return null;

  // The llm_call that produced the rec is the most recent llm_call on the
  // same case_id at or before the `recommendation_produced` row for this rec.
  // For the MVP we take the closest llm_call <= the rec's produced_at.
  const rec_evt = db
    .prepare(
      `SELECT ts FROM audit_events
        WHERE case_id = ?
          AND event_type = 'recommendation_produced'
          AND json_extract(metadata_json, '$.recommendation_id') = ?
        ORDER BY id DESC LIMIT 1`,
    )
    .get(rec_row.case_id, recommendation_id) as { ts: string } | undefined;
  if (!rec_evt) return null;

  const llm_row = db
    .prepare(
      `SELECT id, ts, case_id, event_type, model, redacted_prompt, response_summary,
              expert_action, expert_reason, metadata_json
         FROM audit_events
        WHERE case_id = ?
          AND event_type = 'llm_call'
          AND ts <= ?
        ORDER BY id DESC LIMIT 1`,
    )
    .get(rec_row.case_id, rec_evt.ts) as AuditEventRow | undefined;
  if (!llm_row) return null;
  return row_to_event(llm_row);
}
