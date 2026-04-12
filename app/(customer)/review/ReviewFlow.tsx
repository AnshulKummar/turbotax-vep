"use client";

/**
 * ReviewFlow — Sprint 4 T-K02 + T-K03.
 *
 * Client component that renders the customer-facing recommendation
 * review/approval page. Loads the intake data from the API, filters
 * the fixture recommendations to the expert's selections, and lets
 * the customer approve or decline each one before submitting.
 */

import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { Goal, Recommendation } from "@/contracts";
import { classify_tier, type RecommendationTier } from "@/lib/recommendations/tiers";
import { mitchellRecommendationsFixture } from "../../../components/workbench/__fixtures__/mitchell-recommendations.fixture";
import { formatUsd } from "../../../components/workbench/lib/format";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface IntakeData {
  intake_id: number;
  goals: Goal[];
  customer_metadata?: { display_name?: string };
  selected_recommendations: string[];
  customer_approvals?: { approved: string[]; declined: string[] };
}

type Decision = "approved" | "declined";

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Create a fresh decisions map, optionally pre-populated from prior approvals.
 */
export function buildInitialDecisions(
  approvals?: { approved: string[]; declined: string[] },
): Map<string, Decision> {
  const map = new Map<string, Decision>();
  if (!approvals) return map;
  for (const id of approvals.approved) map.set(id, "approved");
  for (const id of approvals.declined) map.set(id, "declined");
  return map;
}

/**
 * Count approved / declined / remaining from a decisions map against a total.
 */
export function countDecisions(
  decisions: Map<string, Decision>,
  total: number,
): { approved: number; declined: number; remaining: number } {
  let approved = 0;
  let declined = 0;
  for (const d of decisions.values()) {
    if (d === "approved") approved++;
    else declined++;
  }
  return { approved, declined, remaining: total - approved - declined };
}

/**
 * Whether the submit button should be enabled: every recommendation has a decision.
 */
export function canSubmit(
  decisions: Map<string, Decision>,
  total: number,
): boolean {
  return total > 0 && decisions.size === total;
}

/**
 * Set a single decision, returning a new Map (immutable update).
 */
export function setDecision(
  prev: Map<string, Decision>,
  recId: string,
  decision: Decision,
): Map<string, Decision> {
  const next = new Map(prev);
  next.set(recId, decision);
  return next;
}

// ---------------------------------------------------------------------------
// Tier badge
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: RecommendationTier }) {
  const base = "rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider";
  switch (tier) {
    case "high":
      return <span className={`${base} bg-emerald-500/20 text-emerald-300`}>High</span>;
    case "medium":
      return <span className={`${base} bg-amber-500/20 text-amber-300`}>Medium</span>;
    case "low":
      return <span className={`${base} bg-white/10 text-[var(--muted-foreground)]`}>Low</span>;
  }
}

// ---------------------------------------------------------------------------
// Recommendation card
// ---------------------------------------------------------------------------

function RecommendationCard({
  rec,
  decision,
  onDecision,
  disabled,
}: {
  rec: Recommendation;
  decision: Decision | undefined;
  onDecision: (recId: string, d: Decision) => void;
  disabled: boolean;
}) {
  const { tier } = classify_tier(rec);

  return (
    <div className="glass-card px-4 py-4">
      {/* Top row: tier badge + IRC citation */}
      <div className="flex items-center gap-2 mb-2">
        <TierBadge tier={tier} />
        <span className="pill pill-blue">{rec.irc_citation}</span>
      </div>

      {/* Summary */}
      <h3 className="text-[13px] font-semibold text-white">{rec.one_line_summary}</h3>
      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">{rec.detail}</p>

      {/* Dollar impact + goal fit badges */}
      <div className="mt-2 flex items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {rec.goal_fits.map((gf) => (
            <span
              key={gf.goal_id}
              className="pill pill-violet"
              title={gf.rationale}
            >
              {gf.goal_id.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <div className="text-sm font-semibold text-emerald-300">
          {formatUsd(rec.dollar_impact.estimate)}
        </div>
      </div>

      {/* Confidence bar */}
      <div className="mt-2">
        <div className="flex items-center justify-between text-[10px] text-[var(--muted-foreground)]">
          <span>Confidence</span>
          <span>{Math.round(rec.confidence * 100)}%</span>
        </div>
        <div className="mt-0.5 h-1 w-full rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400/60"
            style={{ width: `${rec.confidence * 100}%` }}
          />
        </div>
      </div>

      {/* Approve / Decline buttons */}
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onDecision(rec.id, "approved")}
          disabled={disabled}
          className={
            decision === "approved"
              ? "flex-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 py-2 text-[12px] font-semibold text-emerald-300"
              : "flex-1 rounded-lg border border-white/10 py-2 text-[12px] text-[var(--muted-foreground)] hover:border-emerald-500/30 hover:text-emerald-300 transition"
          }
        >
          Approve
        </button>
        <button
          onClick={() => onDecision(rec.id, "declined")}
          disabled={disabled}
          className={
            decision === "declined"
              ? "flex-1 rounded-lg bg-red-500/20 border border-red-500/40 py-2 text-[12px] font-semibold text-red-300"
              : "flex-1 rounded-lg border border-white/10 py-2 text-[12px] text-[var(--muted-foreground)] hover:border-red-500/30 hover:text-red-300 transition"
          }
        >
          Decline
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main flow component
// ---------------------------------------------------------------------------

export function ReviewFlow() {
  const searchParams = useSearchParams();
  const intakeId = searchParams.get("intake");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [intakeData, setIntakeData] = useState<IntakeData | null>(null);
  const [decisions, setDecisions] = useState<Map<string, Decision>>(new Map());
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Fetch intake data on mount
  useEffect(() => {
    if (!intakeId) {
      setError("Missing intake ID. Please use the link provided by your expert.");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function fetchIntake() {
      try {
        const res = await fetch(`/api/intake/${intakeId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError("Intake not found. The link may have expired.");
          } else {
            setError("Failed to load your review. Please try again later.");
          }
          return;
        }
        const data = (await res.json()) as IntakeData;
        if (cancelled) return;

        setIntakeData(data);

        // If already submitted, show success state immediately
        if (data.customer_approvals) {
          setDecisions(buildInitialDecisions(data.customer_approvals));
          setSubmitted(true);
        }

        // If no selections yet, show that state
        if (!data.selected_recommendations || data.selected_recommendations.length === 0) {
          setError("Your expert hasn't shared any recommendations yet. Please check back later.");
        }
      } catch {
        if (!cancelled) {
          setError("Network error. Please check your connection and try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void fetchIntake();
    return () => { cancelled = true; };
  }, [intakeId]);

  // Filter fixture recommendations to only selected IDs
  const selectedRecs = useMemo(() => {
    if (!intakeData?.selected_recommendations) return [];
    const ids = new Set(intakeData.selected_recommendations);
    return mitchellRecommendationsFixture.filter((r) => ids.has(r.id));
  }, [intakeData]);

  const counts = useMemo(
    () => countDecisions(decisions, selectedRecs.length),
    [decisions, selectedRecs.length],
  );

  const submitEnabled = canSubmit(decisions, selectedRecs.length) && !submitting;

  const handleDecision = useCallback((recId: string, decision: Decision) => {
    setDecisions((prev) => setDecision(prev, recId, decision));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!intakeId || !submitEnabled) return;

    setSubmitting(true);
    try {
      const approved: string[] = [];
      const declined: string[] = [];
      for (const [id, d] of decisions) {
        if (d === "approved") approved.push(id);
        else declined.push(id);
      }

      const res = await fetch(`/api/intake/${intakeId}/approvals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approvals: { approved, declined } }),
      });

      if (!res.ok) {
        setError("Failed to submit your decisions. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setError("Network error while submitting. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [intakeId, submitEnabled, decisions]);

  // --- Render states ---

  // Loading
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
      </div>
    );
  }

  // Error
  if (error && !intakeData) {
    return (
      <div className="glass-card px-6 py-8 text-center">
        <p className="text-sm text-red-300">{error}</p>
      </div>
    );
  }

  // Success (submitted)
  if (submitted) {
    return (
      <div className="glass-card px-6 py-8 text-center">
        <h2 className="text-lg font-semibold text-white">Decisions submitted</h2>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Your decisions have been shared with your expert. They will review your
          preferences and finalize your return.
        </p>
        <a
          href="/start"
          className="mt-4 inline-block text-sm text-emerald-300 underline underline-offset-2 hover:text-emerald-200 transition"
        >
          Return to start
        </a>
      </div>
    );
  }

  // Main review form
  const displayName = intakeData?.customer_metadata?.display_name;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="glass-card px-4 py-4">
        {displayName && (
          <p className="text-[11px] text-[var(--muted-foreground)] mb-1">
            Hi {displayName},
          </p>
        )}
        <h2 className="text-sm font-semibold text-white">
          Your expert has shared {selectedRecs.length} recommendation{selectedRecs.length !== 1 ? "s" : ""} for your review
        </h2>
        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
          Review each recommendation below and approve or decline it. Once you have decided on all items, submit your decisions.
        </p>
      </div>

      {/* Decision counter */}
      <div className="flex items-center justify-center gap-4 text-[12px]">
        <span className="text-emerald-300 font-medium">
          Approved: {counts.approved}
        </span>
        <span className="text-white/20">|</span>
        <span className="text-red-300 font-medium">
          Declined: {counts.declined}
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[var(--muted-foreground)]">
          Remaining: {counts.remaining}
        </span>
      </div>

      {/* Inline error */}
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-[12px] text-red-300 text-center">
          {error}
        </div>
      )}

      {/* Recommendation cards */}
      {selectedRecs.map((rec) => (
        <RecommendationCard
          key={rec.id}
          rec={rec}
          decision={decisions.get(rec.id)}
          onDecision={handleDecision}
          disabled={submitting}
        />
      ))}

      {/* Submit CTA */}
      <div className="pt-2">
        <button
          onClick={handleSubmit}
          disabled={!submitEnabled}
          className={
            submitEnabled
              ? "w-full rounded-lg bg-emerald-500/20 border border-emerald-500/40 py-3 text-[13px] font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
              : "w-full rounded-lg border border-white/10 py-3 text-[13px] font-semibold text-[var(--muted-foreground)] cursor-not-allowed opacity-50"
          }
        >
          {submitting ? "Submitting..." : "Confirm my decisions"}
        </button>
      </div>
    </div>
  );
}
