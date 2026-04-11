import type { Goal } from "../../../src/contracts";

/**
 * Default fixture of the customer's ranked goals for the Mitchell return.
 * Used by GoalDashboard to drive per-goal progress bars.
 */
export const mitchellGoalsFixture: Goal[] = [
  {
    id: "maximize_refund",
    rank: 1,
    weight: 5,
    rationale:
      "Big RSU vest year — we want every dollar of double-count and SALT cap headroom recovered.",
    tags: ["refund", "deductions", "credits"],
  },
  {
    id: "minimize_audit_risk",
    rank: 2,
    weight: 4,
    rationale:
      "Rental depreciation and wash-sale matching are the two lines an IRS exam desk would pull first.",
    tags: ["audit_risk", "documentation", "conservatism"],
  },
  {
    id: "optimize_next_year",
    rank: 3,
    weight: 3,
    rationale:
      "Olivia wants a clean carryforward stack and a PTET election in place for TY2026.",
    tags: ["carryforward", "retirement", "investment"],
  },
];
