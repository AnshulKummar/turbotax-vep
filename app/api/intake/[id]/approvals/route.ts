/**
 * POST /api/intake/[id]/approvals — Sprint 4 T-I07.
 *
 * Customer submits approval/decline decisions for presented recommendations.
 * Requires that selections have already been made on this intake.
 *
 *   200 { ok: true }
 *   400 { error } — validation failure or no selections yet
 *   404 { error } — intake not found or expired
 *   429 — rate limited
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";

import type { Approvals } from "@/lib/intake/selections";

import { validate_approvals } from "@/lib/intake/selections";
import { get_intake, update_approvals } from "@/lib/intake/store";
import { apply_rate_limit } from "@/lib/rate-limit";
import { APPROVALS_RATE_LIMIT_MAX } from "@/lib/rate-limit-config";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const limited = apply_rate_limit(request, {
    bucket: "approvals",
    max: APPROVALS_RATE_LIMIT_MAX,
  });
  if (limited) return limited;

  const { id } = await context.params;
  const intake_id = Number(id);
  if (
    !Number.isFinite(intake_id) ||
    intake_id <= 0 ||
    !Number.isInteger(intake_id)
  ) {
    return NextResponse.json({ error: "Invalid intake id" }, { status: 400 });
  }

  // Verify intake exists and is not expired.
  const intake = await get_intake(intake_id);
  if (!intake) {
    return NextResponse.json(
      { error: "Intake not found or expired" },
      { status: 404 },
    );
  }

  // Require that selections have been made before approvals.
  if (
    !intake.selected_recommendations ||
    intake.selected_recommendations.length === 0
  ) {
    return NextResponse.json(
      { error: "Selections must be submitted before approvals" },
      { status: 400 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const approvals_raw = (body as { approvals?: unknown }).approvals;

  let approvals: Approvals;
  try {
    approvals = validate_approvals(approvals_raw);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid approvals payload", issues: e.issues },
        { status: 400 },
      );
    }
    throw e;
  }

  try {
    await update_approvals(intake_id, approvals);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update approvals", detail: message },
      { status: 500 },
    );
  }
}
