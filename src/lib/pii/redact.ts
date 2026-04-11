/**
 * STUB — owned by Agent 5 (Trust Layer). Replaced with the real two-pass
 * (regex + structured field) implementation per ADR-006.
 *
 * This stub exists so that Agent 2's recommendation engine can compile and
 * type-check in parallel with Agent 5's build. Agent 5's branch overwrites
 * this file with the real implementation.
 *
 * DO NOT call this stub from production code paths — it throws at runtime.
 */

import type { RedactedPrompt, TaxReturn } from "@/contracts";

export function redact_prompt(
  raw_prompt: string,
  _structured_data?: TaxReturn,
): RedactedPrompt {
  // Trivial pass-through stub. Real impl per ADR-006 will:
  //   1. Run regex pass for SSN/EIN/ROUTING/ACCOUNT/EMAIL/PHONE/ZIP
  //   2. Run structured-field pass against TaxReturn
  //   3. Hash matches with keccak256(value + session_salt)[:8]
  //   4. Return token map keyed by [PII_TYPE_HASH8]
  return {
    redacted_text: raw_prompt,
    token_map: {},
    session_salt: "STUB_SALT",
  };
}
