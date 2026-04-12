/**
 * POST /api/intake/[id]/selections — Sprint 4 T-I06.
 *
 * Expert submits selected recommendation IDs for a live intake session.
 *
 *   200 { ok: true }
 *   400 { error } — validation failure
 *   404 { error } — intake not found or expired
 *   429 — rate limited
 */

import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";

import { validate_selections } from "@/lib/intake/selections";
import { get_intake, update_selections } from "@/lib/intake/store";
import { apply_rate_limit } from "@/lib/rate-limit";
import { SELECTIONS_RATE_LIMIT_MAX } from "@/lib/rate-limit-config";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const limited = apply_rate_limit(request, {
    bucket: "selections",
    max: SELECTIONS_RATE_LIMIT_MAX,
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const selections_raw = (body as { selections?: unknown }).selections;

  let selections: string[];
  try {
    selections = validate_selections(selections_raw);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid selections payload", issues: e.issues },
        { status: 400 },
      );
    }
    throw e;
  }

  try {
    await update_selections(intake_id, selections);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update selections", detail: message },
      { status: 500 },
    );
  }
}
