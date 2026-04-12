/**
 * Zod schemas for expert selections and customer approvals — Sprint 4 T-I04.
 *
 * Selections: the expert picks which recommendation IDs to present.
 * Approvals: the customer approves or declines each presented recommendation.
 */

import { z } from "zod/v4";

// ---------------------------------------------------------------------------
// Expert selections — array of recommendation IDs
// ---------------------------------------------------------------------------

export const SelectionsSchema = z
  .array(z.string().min(1).max(100))
  .min(1)
  .max(50);

export type Selections = z.infer<typeof SelectionsSchema>;

export function validate_selections(raw: unknown): Selections {
  return SelectionsSchema.parse(raw);
}

// ---------------------------------------------------------------------------
// Customer approvals — approved + declined ID arrays
// ---------------------------------------------------------------------------

export const ApprovalsSchema = z.object({
  approved: z.array(z.string().min(1).max(100)),
  declined: z.array(z.string().min(1).max(100)),
});

export type Approvals = z.infer<typeof ApprovalsSchema>;

export function validate_approvals(raw: unknown): Approvals {
  return ApprovalsSchema.parse(raw);
}
