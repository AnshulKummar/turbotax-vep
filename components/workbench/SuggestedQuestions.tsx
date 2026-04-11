import type { GoalId, Recommendation } from "../../src/contracts";
import { Panel } from "./Panel";
import { formatUsd } from "./lib/format";

interface SuggestedQuestionsProps {
  recommendations: Recommendation[];
}

const GOAL_SHORT: Record<string, string> = {
  maximize_refund: "Refund",
  minimize_audit_risk: "Audit",
  optimize_next_year: "Next yr",
  harvest_losses: "Losses",
  optimize_retirement: "Retirement",
  simplify_filing: "Simplify",
};

/**
 * Map a recommendation to a question we'd like to ask the customer,
 * plus the primary goal that question serves and its dollar impact.
 */
interface Question {
  id: string;
  text: string;
  goal_id: GoalId;
  goal_label: string;
  dollar_impact: number;
  composite: number;
}

function buildQuestion(rec: Recommendation): Question {
  // Pick the strongest goal fit as the primary goal for the question.
  const topFit =
    [...rec.goal_fits].sort((a, b) => b.score - a.score)[0] ??
    rec.goal_fits[0];
  const goalId = (topFit?.goal_id ?? "maximize_refund") as GoalId;
  return {
    id: rec.id,
    text: questionFor(rec),
    goal_id: goalId,
    goal_label: GOAL_SHORT[goalId] ?? goalId,
    dollar_impact: rec.dollar_impact.estimate,
    composite: rec.composite_goal_fit,
  };
}

function questionFor(rec: Recommendation): string {
  switch (rec.category) {
    case "rsu":
      return "Can you confirm the cost basis your broker reported on the RSU sell-to-cover lots? We need to step it up to the vest-date FMV.";
    case "wash_sale":
      return "Did your broker flag any wash-sale disallowed losses this year on replacement shares you bought back inside 30 days?";
    case "hsa":
      return "Did Ryan contribute to a separate HSA outside of payroll? We want to make sure we capture both contributions up to the TY2025 family limit.";
    case "depreciation":
      return "Do you have the county assessor's land-to-building ratio for the Will County rental? We need it to split the depreciable basis.";
    case "passive_activity_loss":
      return "Are you planning to materially participate in the rental next year? That would change whether the loss is suspended or currently deductible.";
    case "salt_cap":
      return "Have you already filed state estimates for TY2025? We want to reconcile your total SALT paid against the new $40K MFJ cap.";
    case "ptet_election":
      return "Is Blackwood Trading Partners willing to elect Illinois PTET for TY2025? The federal deduction is significant.";
    case "retirement_contribution":
      return "Do you have room in your last two paychecks to bump Olivia's 401(k) deferral to max? There's $9,500 of headroom.";
    default:
      return rec.one_line_summary;
  }
}

export function SuggestedQuestions({
  recommendations,
}: SuggestedQuestionsProps) {
  const questions = recommendations
    .map(buildQuestion)
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 6);

  return (
    <Panel
      title="Suggested questions"
      subtitle={`${questions.length} ranked by goal fit`}
      contentClassName="p-0"
    >
      <ul
        className="panel-scroll max-h-[320px] divide-y divide-white/5 overflow-y-auto"
        data-testid="suggested-questions"
      >
        {questions.map((q, idx) => (
          <li
            key={q.id}
            className="px-4 py-3"
            data-testid={`suggested-question-${q.id}`}
          >
            <div className="flex items-start gap-3">
              <span className="mt-0.5 font-mono text-[10px] text-[var(--muted-foreground)]">
                {String(idx + 1).padStart(2, "0")}
              </span>
              <div className="flex-1">
                <p className="text-[12px] leading-relaxed text-white">
                  {q.text}
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="pill pill-violet">{q.goal_label}</span>
                  <span className="pill pill-cyan">
                    Est. impact {formatUsd(q.dollar_impact)}
                  </span>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
