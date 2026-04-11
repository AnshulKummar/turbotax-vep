import type { Goal, Recommendation } from "../../src/contracts";
import { clamp } from "./lib/format";

interface GoalDashboardProps {
  goals: Goal[];
  recommendations: Recommendation[];
  /** IDs of recommendations the expert has accepted so far. */
  acceptedIds: Set<string>;
}

/** Human label for each GoalId that the workbench might surface. */
const GOAL_LABEL: Record<string, string> = {
  maximize_refund: "Maximize refund",
  minimize_audit_risk: "Minimize audit risk",
  optimize_next_year: "Optimize next year",
  harvest_losses: "Harvest losses",
  optimize_retirement: "Optimize retirement",
  simplify_filing: "Simplify filing",
  dispute_irs_notice: "Dispute IRS notice",
  plan_life_event: "Plan life event",
  plan_major_purchase: "Plan major purchase",
  other: "Other",
};

/**
 * Goal Dashboard Panel.
 *
 * Renders the customer's three ranked goals as three columns. Each
 * column shows the goal name, rank, weight, rationale, and a progress
 * bar driven by the sum of goal_fit_score across accepted recommendations
 * (normalized to [0, 1] by dividing by the best achievable sum).
 */
export function GoalDashboard({
  goals,
  recommendations,
  acceptedIds,
}: GoalDashboardProps) {
  // Compute per-goal progress: accepted fit sum / achievable fit sum.
  const progressByGoal = new Map<string, { accepted: number; total: number }>();
  for (const goal of goals) {
    progressByGoal.set(goal.id, { accepted: 0, total: 0 });
  }
  for (const rec of recommendations) {
    for (const fit of rec.goal_fits) {
      const slot = progressByGoal.get(fit.goal_id);
      if (!slot) continue;
      slot.total += fit.score;
      if (acceptedIds.has(rec.id)) {
        slot.accepted += fit.score;
      }
    }
  }

  return (
    <section
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
      data-testid="goal-dashboard"
    >
      {goals.map((goal) => {
        const slot = progressByGoal.get(goal.id) ?? {
          accepted: 0,
          total: 0,
        };
        const pct =
          slot.total > 0 ? clamp(slot.accepted / slot.total, 0, 1) : 0;
        const accentColor = goal.rank === 1 ? "#7c3aed" : goal.rank === 2 ? "#06d6a0" : "#3b82f6";

        return (
          <div
            key={goal.id}
            className="glass-card flex flex-col gap-3 px-4 py-4"
            data-testid={`goal-column-${goal.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="pill pill-violet text-[10px]">
                    #{goal.rank}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Weight {goal.weight}/5
                  </span>
                </div>
                <h3 className="mt-1.5 text-[14px] font-semibold text-white">
                  {GOAL_LABEL[goal.id] ?? goal.id}
                </h3>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  Progress
                </div>
                <div className="text-sm font-semibold text-white">
                  {Math.round(pct * 100)}%
                </div>
              </div>
            </div>

            <div className="confidence-bar">
              <div
                className="confidence-fill"
                style={{
                  width: `${pct * 100}%`,
                  background: accentColor,
                }}
              />
            </div>

            {goal.rationale && (
              <p className="text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                {goal.rationale}
              </p>
            )}

            <div className="flex flex-wrap gap-1.5">
              {goal.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="rounded-md border border-white/5 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        );
      })}
    </section>
  );
}
