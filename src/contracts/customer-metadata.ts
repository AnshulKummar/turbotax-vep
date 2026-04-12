/**
 * CustomerMetadata contract — Sprint 3 T-E02.
 *
 * Lightweight metadata attached to an intake session for the customer-side
 * flow. This data is synthetic-only (per AD-S2-04 / AD-S2-05) and NEVER
 * enters the LLM prompt (AD-S2-01: cassette stays goal-agnostic).
 */

export interface CustomerMetadata {
  display_name?: string; // max 40 chars, synthetic only
  filing_status?: "single" | "mfj" | "mfs" | "hoh" | "qw";
  agi_band?: "under_50k" | "50_100k" | "100_250k" | "250_500k" | "over_500k";
  document_ids?: string[]; // IDs from the document catalogue
}
