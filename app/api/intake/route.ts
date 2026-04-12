/**
 * POST /api/intake — T-707.
 *
 * Public Sprint 2 demo entry point. Visitors pick 3 goals on the /intake
 * form, this route validates them via `validate_intake`, persists them via
 * `create_intake`, and returns `{ intake_id }`. The intake form then
 * redirects the browser to `/workbench?intake=<intake_id>`.
 *
 * Rate limiting is intentionally NOT added in this branch — Agent C owns
 * the `src/lib/rate-limit.ts` helper and Agent D wires it into every
 * mutating route during polish. See backlog/sprint-02.md T-708.
 *
 * Per ADR-002 every body we receive here is synthetic demo data. There is
 * no PII in the intake payload (goals are ids + weights + optional free
 * text rationale).
 */

import { createHash } from "node:crypto";

import { NextResponse } from "next/server";
import { ZodError } from "zod/v4";

import { validate_intake } from "@/lib/goals/intake";
import { create_intake } from "@/lib/intake/store";

/**
 * Hash the raw ip / user-agent into a stable non-reversible token. The
 * intake_sessions table only stores these hashes so we never retain the
 * caller's IP in plain text.
 */
function hash_token(value: string | null | undefined, salt: string): string {
  return createHash("sha256")
    .update(`${salt}::${value ?? ""}`)
    .digest("hex")
    .slice(0, 32);
}

function client_ip(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded && forwarded.length > 0) {
    // x-forwarded-for is comma-separated; the left-most entry is the client.
    return forwarded.split(",")[0]!.trim();
  }
  const real = request.headers.get("x-real-ip");
  if (real && real.length > 0) return real.trim();
  return "unknown";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const goals_raw = (body as { goals?: unknown }).goals;

  let goals;
  try {
    goals = validate_intake(goals_raw);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid goals payload", issues: e.issues },
        { status: 400 },
      );
    }
    throw e;
  }

  // Per-process salt so ip/ua hashes can't be correlated across restarts.
  const salt = process.env.INTAKE_HASH_SALT ?? "sprint-02-demo-salt";
  const ip_hash = hash_token(client_ip(request), salt);
  const user_agent_hash = hash_token(request.headers.get("user-agent"), salt);

  try {
    const created = await create_intake({
      goals,
      ip_hash,
      user_agent_hash,
    });
    return NextResponse.json(
      {
        intake_id: created.intake_id,
        expires_at: created.expires_at.toISOString(),
      },
      { status: 201 },
    );
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to persist intake", detail: message },
      { status: 500 },
    );
  }
}
