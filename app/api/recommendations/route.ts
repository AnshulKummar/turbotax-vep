/**
 * POST /api/recommendations
 *
 * The HTTP face of Big Bet B1 — runs the goal-aligned recommendation
 * engine end-to-end on a single synthetic return.
 *
 *   request:  { return_data: TaxReturn,
 *               goals:       Goal[],            // raw intake shape
 *               customer_context: CustomerContext }
 *   response: { recommendations: Recommendation[],
 *               audit_id: number }
 *
 * Goals are run through `validate_intake` so the API gets the same Zod
 * validation + tag-attachment that the workbench intake uses. The return
 * payload is loose-validated via Zod `.passthrough()` because the
 * recommendation engine itself only reads the subset of `TaxReturn` that
 * the rules engine cares about; passthrough lets the contract grow
 * without breaking this route.
 *
 * Per ADR-002 the request body is synthetic data only. Per ADR-003 the
 * deterministic rules engine is the safety net — the LLM ranks and
 * explains, it does not detect.
 *
 * Cassette discipline: when `RECORD_CASSETTES=1` is set, the engine
 * makes a live Anthropic call and rewrites the cassette on disk. The
 * default path replays the committed cassette so a hot dev loop costs
 * $0.
 */

import { NextResponse } from "next/server";
import { ZodError, z } from "zod/v4";

import { validate_intake } from "@/lib/goals/intake";
import { produce_recommendations } from "@/lib/recommendations/engine";
import type { CustomerContext, TaxReturn } from "@/contracts";

// ---------------------------------------------------------------------------
// Zod schemas — deliberately loose. Engine + rules already encode the truth.
// ---------------------------------------------------------------------------

const tax_return_schema = z
  .object({
    tax_year: z.number(),
    case_id: z.string(),
  })
  .passthrough();

const customer_context_schema = z
  .object({
    case_id: z.string(),
    customer_display_name: z.string(),
    // Goals are validated separately via validate_intake; we accept any
    // shape here so the route doesn't double-validate.
    goals: z.array(z.unknown()).optional(),
    prior_year_summary: z.string().optional(),
    prior_expert_notes: z.string().optional(),
  })
  .passthrough();

const request_schema = z.object({
  return_data: tax_return_schema,
  goals: z.array(z.unknown()),
  customer_context: customer_context_schema,
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = request_schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  // Goals get the full intake validation (tag attachment + Zod) so the
  // engine sees normalised Goal[] just like the workbench does.
  let goals;
  try {
    goals = validate_intake(parsed.data.goals);
  } catch (e) {
    if (e instanceof ZodError) {
      return NextResponse.json(
        { error: "Invalid goals payload", issues: e.issues },
        { status: 400 },
      );
    }
    throw e;
  }

  const return_data = parsed.data.return_data as unknown as TaxReturn;
  // The intake-validated goals are the source of truth — overwrite any
  // goals the caller stuffed into customer_context.
  const customer_context = {
    ...parsed.data.customer_context,
    goals,
  } as unknown as CustomerContext;

  try {
    const result = await produce_recommendations(
      return_data,
      goals,
      customer_context,
    );
    return NextResponse.json(result, { status: 200 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json(
      { error: "Recommendation engine failed", detail: message },
      { status: 500 },
    );
  }
}
