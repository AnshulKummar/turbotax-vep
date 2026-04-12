/**
 * Per-route rate-limit budgets for the three public mutating endpoints.
 *
 * The library default in `src/lib/rate-limit.ts` is deliberately strict
 * (20/hour). Real demo traffic needs more headroom — visitors click
 * around, hit validation errors, retry, and sometimes refresh — so each
 * route opts into a higher ceiling here. Keeping the numbers in one
 * module means the routes and the T-WIRE routes.test.ts stay in sync
 * automatically when we tune the budget.
 *
 * Budgets are per-IP, per-hour, in-memory (not shared across serverless
 * instances). Loud-neighbour guarantees are intentional — see AD-S2-04.
 */

/** /api/intake — the main visitor interaction. Higher ceiling. */
export const INTAKE_RATE_LIMIT_MAX = 60;

/** /api/recommendations — engine endpoint, slightly lower. */
export const RECOMMENDATIONS_RATE_LIMIT_MAX = 40;

/** /api/prework — same profile as recommendations. */
export const PREWORK_RATE_LIMIT_MAX = 40;

/** /api/intake/[id]/selections — Sprint 4 expert selections. */
export const SELECTIONS_RATE_LIMIT_MAX = 40;

/** /api/intake/[id]/approvals — Sprint 4 customer approvals. */
export const APPROVALS_RATE_LIMIT_MAX = 40;
