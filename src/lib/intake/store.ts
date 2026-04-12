/**
 * Intake session persistence — T-703.
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
 */

import { eq, sql } from "drizzle-orm";

import type { Goal } from "@/contracts";

import { get_db } from "@/lib/audit/db";
import { intake_sessions } from "@/lib/audit/schema";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export interface CreateIntakeInput {
  goals: Goal[];
  ip_hash: string;
  user_agent_hash: string;
}

export interface CreateIntakeResult {
  intake_id: number;
  expires_at: Date;
}

export interface GetIntakeResult {
  goals: Goal[];
  expires_at: Date;
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

  // The jsonb column round-trips as the same Goal[] shape we inserted.
  return {
    goals: row.goals as Goal[],
    expires_at,
  };
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
