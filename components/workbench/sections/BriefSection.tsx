/**
 * BriefSection — Sprint 3 T-G02.
 *
 * The "punchline" screen: sells the B1 story in a single view.
 * Shows customer metadata, goal summary, documents, key metrics,
 * and a CTA to jump to Recommendations.
 */
import type { Goal, Recommendation, RuleFinding } from "../../../src/contracts";
import { get_documents_by_ids } from "../../../src/lib/customer/documents";
import { formatUsd } from "../lib/format";
import type { SectionId } from "../WorkbenchShell";

interface BriefSectionProps {
  customer_name: string;
  filing_status?: string;
  agi_band?: string;
  document_ids?: string[];
  goals: Goal[];
  recommendations: Recommendation[];
  findings: RuleFinding[];
  onNavigate: (section: SectionId) => void;
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

const FILING_STATUS_LABEL: Record<string, string> = {
  single: "Single",
  mfj: "Married Filing Jointly",
  mfs: "Married Filing Separately",
  hoh: "Head of Household",
  qw: "Qualifying Widow(er)",
};

const AGI_BAND_LABEL: Record<string, string> = {
  under_50k: "Under $50K",
  "50_100k": "$50K - $100K",
  "100_250k": "$100K - $250K",
  "250_500k": "$250K - $500K",
  over_500k: "Over $500K",
};

export function BriefSection({
  customer_name,
  filing_status,
  agi_band,
  document_ids,
  goals,
  recommendations,
  findings,
  onNavigate,
}: BriefSectionProps) {
  const documents = document_ids ? get_documents_by_ids(document_ids) : [];

  // Key metrics
  const complexityScore = Math.min(10, Math.max(1, Math.round(findings.length * 1.2)));
  const totalEstimatedSavings = recommendations.reduce(
    (sum, r) => sum + r.dollar_impact.estimate,
    0,
  );
  const savingsLow = recommendations.reduce(
    (sum, r) => sum + r.dollar_impact.low,
    0,
  );
  const savingsHigh = recommendations.reduce(
    (sum, r) => sum + r.dollar_impact.high,
    0,
  );

  return (
    <div className="space-y-4" data-testid="brief-section">
      {/* Customer overview card */}
      <section className="glass-card px-5 py-5">
        <h2 className="text-[18px] font-semibold text-white">{customer_name}</h2>
        <div className="mt-2 flex flex-wrap gap-2">
          {filing_status && (
            <span className="pill pill-violet">
              {FILING_STATUS_LABEL[filing_status] ?? filing_status}
            </span>
          )}
          {agi_band && (
            <span className="pill pill-cyan">
              AGI: {AGI_BAND_LABEL[agi_band] ?? agi_band}
            </span>
          )}
        </div>
      </section>

      {/* Goal summary */}
      <section className="glass-card px-5 py-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Goals
        </h3>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
          {goals.map((goal) => {
            const accentColor =
              goal.rank === 1
                ? "border-violet-500/40 bg-violet-500/10"
                : goal.rank === 2
                  ? "border-emerald-500/40 bg-emerald-500/10"
                  : "border-blue-500/40 bg-blue-500/10";
            return (
              <div
                key={goal.id}
                className={`rounded-xl border px-4 py-3 ${accentColor}`}
              >
                <div className="flex items-center gap-2">
                  <span className="pill pill-violet text-[10px]">
                    #{goal.rank}
                  </span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
                    Weight {goal.weight}/5
                  </span>
                </div>
                <div className="mt-1.5 text-[14px] font-semibold text-white">
                  {GOAL_LABEL[goal.id] ?? goal.id}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Documents */}
      {documents.length > 0 && (
        <section className="glass-card px-5 py-5">
          <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Documents ({documents.length})
          </h3>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="rounded-lg border border-white/5 bg-white/[0.02] px-3 py-2.5"
              >
                <div className="text-[12px] font-semibold text-white">
                  {doc.form_type}
                </div>
                <div className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                  {doc.issuer}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Key metrics */}
      <section className="glass-card px-5 py-5">
        <h3 className="text-[13px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Key Metrics
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Complexity
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {complexityScore} / 10
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Recommendations
            </div>
            <div className="mt-1 text-xl font-semibold text-white">
              {recommendations.length}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Est. Savings
            </div>
            <div className="mt-1 text-xl font-semibold text-emerald-300">
              {formatUsd(totalEstimatedSavings)}
            </div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
              Savings Range
            </div>
            <div className="mt-1 text-[14px] font-semibold text-white">
              {formatUsd(savingsLow)} &ndash; {formatUsd(savingsHigh)}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => onNavigate("recommendations")}
          className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 py-3 text-sm font-semibold text-[#050508] transition hover:brightness-110"
          data-testid="brief-view-recommendations-cta"
        >
          View Recommendations &rarr;
        </button>
      </div>
    </div>
  );
}
