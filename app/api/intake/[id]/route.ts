/**
 * GET /api/intake/[id] — T-707.
 *
 * Look up a stored intake by numeric id. Returns the goal vector so the
 * workbench public-mode page can re-hydrate state after a refresh.
 *
 *   200 { intake_id, goals, expires_at }
 *   400 { error } — id is not a positive integer
 *   404 { error } — missing or expired row
 *
 * See `create_intake`/`get_intake` in src/lib/intake/store.ts for the
 * underlying TTL rules (7 days).
 */

import { NextResponse } from "next/server";

import { get_intake } from "@/lib/intake/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  const intake_id = Number(id);
  if (!Number.isFinite(intake_id) || intake_id <= 0 || !Number.isInteger(intake_id)) {
    return NextResponse.json({ error: "Invalid intake id" }, { status: 400 });
  }

  const row = await get_intake(intake_id);
  if (!row) {
    return NextResponse.json(
      { error: "Intake not found or expired" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    intake_id,
    goals: row.goals,
    expires_at: row.expires_at.toISOString(),
    ...(row.customer_metadata !== undefined
      ? { customer_metadata: row.customer_metadata }
      : {}),
    ...(row.selected_recommendations !== undefined
      ? { selected_recommendations: row.selected_recommendations }
      : {}),
    ...(row.customer_approvals !== undefined
      ? { customer_approvals: row.customer_approvals }
      : {}),
  });
}
