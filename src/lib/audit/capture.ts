/**
 * Audit trail capture — Drizzle + Neon Postgres implementation (T-702).
 *
 * Same exported function signatures as the legacy SQLite version so
 * everything that imports from this module keeps compiling:
 *
 *   capture_llm_call(case_id, model, redacted_prompt, response_summary): Promise<number>
 *   capture_expert_action(recommendation_id, action, reason?): Promise<void>
 *   capture_recommendation(case_id, rec): Promise<void>
 *   capture_calibration_run(rec): Promise<number>
 *   query_audit_trail(case_id): Promise<AuditEvent[]>
 *   query_llm_call_for_recommendation(rec_id): Promise<AuditEvent | null>
 *
 * The recommendation row is written to the denormalised `recommendations`
 * table AND a matching `audit_events` row is emitted for the chronological
 * case timeline. Expert actions land in both `expert_actions` and
 * `audit_events` so the "what AI saw" feed can trace any decision in a
 * single query.
 */

import { and, asc, desc, eq, lte, sql } from "drizzle-orm";

import type {
  AuditEvent,
  AuditEventType,
  ExpertActionType,
  Recommendation,
  RedactedPrompt,
} from "@/contracts";

import { get_db } from "./db";
import {
  audit_events,
  calibration_runs,
  expert_actions,
  recommendations as recommendations_table,
} from "./schema";

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
  if (r.expert_action !== null)
    ev.expert_action = r.expert_action as ExpertActionType;
  if (r.expert_reason !== null) ev.expert_reason = r.expert_reason;
  if (r.metadata_json !== null) {
    try {
      ev.metadata = JSON.parse(r.metadata_json) as Record<string, unknown>;
    } catch {
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const ts = new Date().toISOString();
  const metadata_json = JSON.stringify({
    token_map: redacted_prompt.token_map,
    session_salt: redacted_prompt.session_salt,
  });

  const inserted = await db
    .insert(audit_events)
    .values({
      ts,
      case_id,
      event_type: "llm_call" as AuditEventType,
      model,
      redacted_prompt: redacted_prompt.redacted_text,
      response_summary,
      metadata_json,
    })
    .returning({ id: audit_events.id });
  return Number(inserted[0].id);
}

export async function capture_expert_action(
  recommendation_id: string,
  action: ExpertActionType,
  reason?: string,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const ts = new Date().toISOString();

  // Look up the case_id for the recommendation so the timeline stays sorted
  // correctly. Fall back to the recommendation_id itself if we don't have a
  // row (e.g. test harness that skipped capture_recommendation).
  const rec_rows = await db
    .select({ case_id: recommendations_table.case_id })
    .from(recommendations_table)
    .where(eq(recommendations_table.id, recommendation_id))
    .limit(1);
  const case_id: string =
    rec_rows.length > 0 && rec_rows[0].case_id !== null
      ? (rec_rows[0].case_id as string)
      : recommendation_id;

  await db.insert(expert_actions).values({
    recommendation_id,
    action,
    reason: reason ?? null,
    ts,
  });

  await db.insert(audit_events).values({
    ts,
    case_id,
    event_type: "expert_action" as AuditEventType,
    expert_action: action,
    expert_reason: reason ?? null,
    metadata_json: JSON.stringify({ recommendation_id }),
  });
}

export async function capture_recommendation(
  case_id: string,
  rec: Recommendation,
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const ts = new Date().toISOString();

  // INSERT OR REPLACE → upsert in Postgres.
  await db
    .insert(recommendations_table)
    .values({
      id: rec.id,
      case_id,
      rule_id: rec.rule_id,
      dollar_impact: rec.dollar_impact.estimate,
      confidence: rec.confidence,
      goal_fit_score: rec.composite_goal_fit,
      produced_at: ts,
    })
    .onConflictDoUpdate({
      target: recommendations_table.id,
      set: {
        case_id,
        rule_id: rec.rule_id,
        dollar_impact: rec.dollar_impact.estimate,
        confidence: rec.confidence,
        goal_fit_score: rec.composite_goal_fit,
        produced_at: ts,
      },
    });

  await db.insert(audit_events).values({
    ts,
    case_id,
    event_type: "recommendation_produced" as AuditEventType,
    response_summary: rec.one_line_summary,
    metadata_json: JSON.stringify({
      recommendation_id: rec.id,
      rule_id: rec.rule_id,
      confidence: rec.confidence,
      dollar_impact: rec.dollar_impact,
      llm_only: rec.llm_only,
      audit_id: rec.audit_id,
    }),
  });
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const inserted = await db
    .insert(calibration_runs)
    .values({
      ts: rec.ts,
      test_set_size: rec.test_set_size,
      max_calibration_error: rec.max_calibration_error,
      decile_curve_json: rec.decile_curve_json,
      passed_gate: rec.passed_gate ? 1 : 0,
    })
    .returning({ id: calibration_runs.id });
  return Number(inserted[0].id);
}

// ---------------------------------------------------------------------------
// Readers
// ---------------------------------------------------------------------------

export async function query_audit_trail(
  case_id: string,
): Promise<AuditEvent[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const rows: AuditEventRow[] = await db
    .select()
    .from(audit_events)
    .where(eq(audit_events.case_id, case_id))
    .orderBy(asc(audit_events.id));
  return rows.map(row_to_event);
}

/**
 * Returns the `llm_call` audit event that produced a given recommendation.
 * Backs the "what AI saw" API.
 */
export async function query_llm_call_for_recommendation(
  recommendation_id: string,
): Promise<AuditEvent | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;

  const rec_rows = await db
    .select({ case_id: recommendations_table.case_id })
    .from(recommendations_table)
    .where(eq(recommendations_table.id, recommendation_id))
    .limit(1);
  if (rec_rows.length === 0 || rec_rows[0].case_id === null) return null;
  const case_id = rec_rows[0].case_id as string;

  // The llm_call that produced the rec is the most recent llm_call <= the
  // matching `recommendation_produced` timestamp on the same case_id.
  // We pull the rec_evt row first via raw SQL because metadata_json is text
  // and Postgres' json operator on a text column is not portable across
  // pglite + neon.
  const rec_evt_rows: { ts: string }[] = await db
    .select({ ts: audit_events.ts })
    .from(audit_events)
    .where(
      and(
        eq(audit_events.case_id, case_id),
        eq(audit_events.event_type, "recommendation_produced"),
        sql`${audit_events.metadata_json} LIKE ${`%"recommendation_id":"${recommendation_id}"%`}`,
      ),
    )
    .orderBy(desc(audit_events.id))
    .limit(1);
  if (rec_evt_rows.length === 0) return null;
  const rec_evt_ts = rec_evt_rows[0].ts;

  const llm_rows: AuditEventRow[] = await db
    .select()
    .from(audit_events)
    .where(
      and(
        eq(audit_events.case_id, case_id),
        eq(audit_events.event_type, "llm_call"),
        lte(audit_events.ts, rec_evt_ts),
      ),
    )
    .orderBy(desc(audit_events.id))
    .limit(1);
  if (llm_rows.length === 0) return null;
  return row_to_event(llm_rows[0]);
}
