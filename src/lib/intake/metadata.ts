/**
 * CustomerMetadata Zod schema + validation — Sprint 3 T-E02.
 *
 * The JSONB column is intentionally schemaless at the DB level but
 * schema-validated in TypeScript — this allows schema evolution without
 * migrations.
 */

import { z } from "zod/v4";

export const customer_metadata_schema = z
  .object({
    display_name: z.string().max(40).optional(),
    filing_status: z
      .enum(["single", "mfj", "mfs", "hoh", "qw"])
      .optional(),
    agi_band: z
      .enum(["under_50k", "50_100k", "100_250k", "250_500k", "over_500k"])
      .optional(),
    document_ids: z.array(z.string()).max(20).optional(),
  })
  .optional();

export type CustomerMetadata = z.infer<typeof customer_metadata_schema>;

/**
 * Parse raw JSONB into a validated CustomerMetadata, or undefined if
 * the input is null/undefined. Throws ZodError on invalid data.
 */
export function validate_customer_metadata(
  raw: unknown,
): CustomerMetadata | undefined {
  if (raw == null) return undefined;
  return customer_metadata_schema.parse(raw);
}
