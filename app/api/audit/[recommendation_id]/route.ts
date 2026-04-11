/**
 * "What AI saw" data feed — Agent 5 (Trust Layer).
 *
 * Returns the redacted prompt (and token map) for the LLM call that
 * produced a given recommendation. Powers Agent 4's `WhatAISaw` panel,
 * which lets the expert verify that no raw PII was sent to the model.
 *
 * Contract:
 *   GET /api/audit/:recommendation_id
 *
 *   200: { redacted_prompt, token_map, session_salt, timestamp }
 *   404: { error: "no LLM call found for recommendation" }
 *
 * The token_map payload is always the redacted form — token → hash.
 * The original PII value is never stored and never returned.
 */

import { NextResponse } from "next/server";

import type { PIIType } from "@/contracts";
import { query_llm_call_for_recommendation } from "@/lib/audit/capture";

interface StoredAuditMetadata {
  token_map?: Record<string, { type: PIIType; original_hash: string }>;
  session_salt?: string;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ recommendation_id: string }> },
): Promise<NextResponse> {
  const { recommendation_id } = await context.params;

  if (!recommendation_id || typeof recommendation_id !== "string") {
    return NextResponse.json(
      { error: "missing recommendation_id" },
      { status: 400 },
    );
  }

  const llm_event = await query_llm_call_for_recommendation(recommendation_id);
  if (!llm_event) {
    return NextResponse.json(
      { error: "no LLM call found for recommendation" },
      { status: 404 },
    );
  }

  const metadata = (llm_event.metadata ?? {}) as StoredAuditMetadata;

  return NextResponse.json({
    recommendation_id,
    redacted_prompt: llm_event.redacted_prompt ?? "",
    token_map: metadata.token_map ?? {},
    session_salt: metadata.session_salt ?? "",
    timestamp: llm_event.ts,
    model: llm_event.model ?? null,
  });
}
