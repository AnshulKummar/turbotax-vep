/**
 * GoalsSection — Sprint 3 T-G03.
 *
 * Displays the 3 captured goals in a readable card layout. Not editable.
 */
import Link from "next/link";
import type { Goal } from "../../../src/contracts";
import { AppCue } from "../AppCue";

interface GoalsSectionProps {
  goals: Goal[];
}

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

export function GoalsSection({ goals }: GoalsSectionProps) {
  return (
    <div className="space-y-4" data-testid="goals-section">
      <AppCue
        title="Goal-Aligned System"
        body="These are the customer's stated goals, captured at intake. Every recommendation is scored against these goals. This is the B1 anchor: the system optimizes for customer outcomes, not return throughput."
      />

      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">
          Customer Goals
        </h2>
        <Link
          href="/start"
          className="inline-flex items-center gap-1 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/10"
        >
          Try different goals &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {goals.map((goal) => {
          const accentColor =
            goal.rank === 1
              ? "#7c3aed"
              : goal.rank === 2
                ? "#06d6a0"
                : "#3b82f6";
          return (
            <div key={goal.id} className="glass-card px-5 py-5">
              <div className="flex items-center gap-2">
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold text-white"
                  style={{ backgroundColor: accentColor }}
                >
                  #{goal.rank}
                </span>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                  Weight {goal.weight}/5
                </span>
              </div>

              <h3 className="mt-3 text-[16px] font-semibold text-white">
                {GOAL_LABEL[goal.id] ?? goal.id}
              </h3>

              {/* Weight bar */}
              <div className="mt-3">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 flex-1 rounded-full"
                      style={{
                        backgroundColor:
                          i <= goal.weight ? accentColor : "rgba(255,255,255,0.05)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {goal.rationale && (
                <p className="mt-3 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                  {goal.rationale}
                </p>
              )}

              <div className="mt-3 flex flex-wrap gap-1.5">
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
      </div>
    </div>
  );
}
