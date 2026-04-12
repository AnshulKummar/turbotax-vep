/**
 * Intake session persistence — T-703 + Sprint 3 T-E03.
 *
 * Backs the public Sprint 2 demo flow:
 *   POST /api/intake     → create_intake() → returns {intake_id}
 *   GET /workbench?intake=<id> → get_intake()
 *
 * The Drizzle table definition lives alongside the audit schema in
 * src/lib/audit/schema.ts so a single drizzle.config.ts picks it up.
 *
 * Callers MUST pass goals that have already been validated by
 * `validate_intake` from src/lib/goals/intake.ts. This module just
 * persists what it's given.
 *
 * TTL: 7 days. `expires_at` is set on insert and checked on read; an
 * expired row is treated as missing.
 *
 * Sprint 3 addition: optional `customer_metadata` (JSONB). The column is
 * intentionally schemaless at the DB level but schema-validated in
 * TypeScript via validate_customer_metadata — this allows schema evolution
 * without migrations.
 */

import { eq, sql } from "drizzle-orm";

import type { Goal } from "@/contracts";
import type { CustomerMetadata } from "@/lib/intake/metadata";
import type { Approvals, Selections } from "@/lib/intake/selections";

import { get_db } from "@/lib/audit/db";
import { intake_sessions } from "@/lib/audit/schema";
import { validate_customer_metadata } from "@/lib/intake/metadata";
import {
  validate_approvals,
  validate_selections,
} from "@/lib/intake/selections";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateIntakeInput {
  goals: Goal[];
  ip_hash: string;
  user_agent_hash: string;
  customer_metadata?: CustomerMetadata;
}

export interface CreateIntakeResult {
  intake_id: number;
  expires_at: Date;
}

export interface GetIntakeResult {
  goals: Goal[];
  expires_at: Date;
  customer_metadata?: CustomerMetadata;
  selected_recommendations?: Selections;
  customer_approvals?: Approvals;
}

/**
 * Persist a captured intake. Goals must already be validated. Returns the
 * generated intake_id (used in the /workbench?intake=<id> URL) and the
 * expires_at the row was tagged with.
 */
export async function create_intake(
  input: CreateIntakeInput,
): Promise<CreateIntakeResult> {
  if (!input.ip_hash || input.ip_hash.length === 0) {
    throw new Error("create_intake: ip_hash is required");
  }
  if (!input.user_agent_hash || input.user_agent_hash.length === 0) {
    throw new Error("create_intake: user_agent_hash is required");
  }
  if (!Array.isArray(input.goals) || input.goals.length === 0) {
    throw new Error("create_intake: goals must be a non-empty array");
  }

  const expires_at = new Date(Date.now() + SEVEN_DAYS_MS);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const inserted = await db
    .insert(intake_sessions)
    .values({
      goals: input.goals,
      ip_hash: input.ip_hash,
      user_agent_hash: input.user_agent_hash,
      expires_at,
      customer_metadata: input.customer_metadata ?? null,
    })
    .returning({
      intake_id: intake_sessions.intake_id,
      expires_at: intake_sessions.expires_at,
    });

  return {
    intake_id: Number(inserted[0].intake_id),
    expires_at: new Date(inserted[0].expires_at),
  };
}

/**
 * Look up a stored intake by id. Returns null if the row is missing or
 * expired. Callers should treat null as "404, redirect to intake form".
 *
 * The customer_metadata JSONB is parsed via validate_customer_metadata on
 * read. If parsing fails (corrupt data), we log and return
 * customer_metadata: undefined rather than crashing the lookup.
 */
export async function get_intake(
  intake_id: number,
): Promise<GetIntakeResult | null> {
  if (!Number.isFinite(intake_id) || intake_id <= 0) return null;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const rows = await db
    .select({
      goals: intake_sessions.goals,
      expires_at: intake_sessions.expires_at,
      customer_metadata: intake_sessions.customer_metadata,
      selected_recommendations: intake_sessions.selected_recommendations,
      customer_approvals: intake_sessions.customer_approvals,
    })
    .from(intake_sessions)
    .where(eq(intake_sessions.intake_id, intake_id))
    .limit(1);

  if (rows.length === 0) return null;

  const row = rows[0];
  const expires_at = new Date(row.expires_at);
  if (expires_at.getTime() <= Date.now()) {
    return null;
  }

  // Parse customer_metadata safely — corrupt JSONB must not crash the lookup.
  let customer_metadata: CustomerMetadata | undefined;
  try {
    customer_metadata = validate_customer_metadata(row.customer_metadata);
  } catch (err) {
    console.error(
      `get_intake(${intake_id}): corrupt customer_metadata, returning undefined`,
      err,
    );
    customer_metadata = undefined;
  }

  // Parse selected_recommendations safely.
  let selected_recommendations: Selections | undefined;
  try {
    if (row.selected_recommendations != null) {
      selected_recommendations = validate_selections(
        row.selected_recommendations,
      );
    }
  } catch (err) {
    console.error(
      `get_intake(${intake_id}): corrupt selected_recommendations, returning undefined`,
      err,
    );
    selected_recommendations = undefined;
  }

  // Parse customer_approvals safely.
  let customer_approvals: Approvals | undefined;
  try {
    if (row.customer_approvals != null) {
      customer_approvals = validate_approvals(row.customer_approvals);
    }
  } catch (err) {
    console.error(
      `get_intake(${intake_id}): corrupt customer_approvals, returning undefined`,
      err,
    );
    customer_approvals = undefined;
  }

  // The jsonb column round-trips as the same Goal[] shape we inserted.
  return {
    goals: row.goals as Goal[],
    expires_at,
    customer_metadata,
    selected_recommendations,
    customer_approvals,
  };
}

// ---------------------------------------------------------------------------
// Sprint 4 — selections + approvals persistence (T-I05)
// ---------------------------------------------------------------------------

/**
 * Persist the expert's selected recommendation IDs on a live intake session.
 * Rejects if the intake does not exist or has expired.
 */
export async function update_selections(
  intake_id: number,
  selections: string[],
): Promise<void> {
  if (!Number.isFinite(intake_id) || intake_id <= 0) {
    throw new Error("update_selections: intake_id must be a positive integer");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const result = await db
    .update(intake_sessions)
    .set({ selected_recommendations: selections })
    .where(
      sql`${intake_sessions.intake_id} = ${intake_id} AND ${intake_sessions.expires_at} > NOW()`,
    )
    .returning({ intake_id: intake_sessions.intake_id });

  if (result.length === 0) {
    throw new Error("update_selections: intake not found or expired");
  }
}

/**
 * Persist the customer's approval/decline decisions on a live intake session.
 * Rejects if the intake does not exist or has expired.
 */
export async function update_approvals(
  intake_id: number,
  approvals: { approved: string[]; declined: string[] },
): Promise<void> {
  if (!Number.isFinite(intake_id) || intake_id <= 0) {
    throw new Error("update_approvals: intake_id must be a positive integer");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const result = await db
    .update(intake_sessions)
    .set({ customer_approvals: approvals })
    .where(
      sql`${intake_sessions.intake_id} = ${intake_id} AND ${intake_sessions.expires_at} > NOW()`,
    )
    .returning({ intake_id: intake_sessions.intake_id });

  if (result.length === 0) {
    throw new Error("update_approvals: intake not found or expired");
  }
}

/**
 * Test helper — insert a row with an explicit `expires_at` so the
 * expiry-handling test can put a row in the past. NOT exported from the
 * package's public surface; only the unit test imports it directly.
 */
export async function _insert_intake_with_expiry(
  input: CreateIntakeInput & { expires_at: Date },
): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const inserted = await db
    .insert(intake_sessions)
    .values({
      goals: input.goals,
      ip_hash: input.ip_hash,
      user_agent_hash: input.user_agent_hash,
      // Override the captured_at default too so the row is internally
      // consistent (captured_at < expires_at = "old expired session").
      captured_at: new Date(input.expires_at.getTime() - SEVEN_DAYS_MS),
      expires_at: input.expires_at,
      customer_metadata: input.customer_metadata ?? null,
    })
    .returning({ intake_id: intake_sessions.intake_id });
  return Number(inserted[0].intake_id);
}

/**
 * Test helper — count rows. Used to assert that an inserted row exists
 * even when get_intake returns null due to expiry.
 */
export async function _count_intake_rows(): Promise<number> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = get_db() as any;
  const result = await db.execute(
    sql`SELECT COUNT(*)::int AS n FROM intake_sessions`,
  );
  const rows: { n: number }[] = Array.isArray(result)
    ? (result as { n: number }[])
    : ((result as { rows: { n: number }[] }).rows ?? []);
  return rows[0]?.n ?? 0;
}
