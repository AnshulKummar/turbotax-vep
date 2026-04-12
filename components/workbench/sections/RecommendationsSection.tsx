/**
 * RecommendationsSection — Sprint 3 T-G06, Sprint 4 T-J02..T-J05.
 *
 * Re-parents existing recommendation panels (GoalDashboard, WhatAISaw)
 * and adds tier badges, tier filtering, share-with-customer selection,
 * and customer approval status display.
 */
"use client";

import { useCallback, useMemo, useState } from "react";
import type { Goal, Recommendation, RedactedPrompt } from "../../../src/contracts";

import { classify_tier, type RecommendationTier } from "../../../src/lib/recommendations/tiers";
import { GoalDashboard } from "../GoalDashboard";
import { WhatAISaw } from "../WhatAISaw";
import { formatUsd } from "../lib/format";
import { AppCue } from "../AppCue";

// ---------------------------------------------------------------------------
// Tier badge component
// ---------------------------------------------------------------------------

function TierBadge({ tier }: { tier: RecommendationTier }) {
  const styles: Record<RecommendationTier, string> = {
    high: "rounded-md bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-red-300",
    medium: "rounded-md bg-amber-500/20 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300",
    low: "rounded-md bg-gray-500/20 border border-gray-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400",
  };
  return (
    <span className={styles[tier]} data-testid={`tier-badge-${tier}`}>
      {tier.toUpperCase()}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Approval badge component
// ---------------------------------------------------------------------------

function ApprovalBadge({ status }: { status: "approved" | "declined" | "pending" }) {
  if (status === "approved") {
    return (
      <span className="rounded-md bg-emerald-500/20 border border-emerald-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300" data-testid="approval-badge-approved">
        Approved by customer
      </span>
    );
  }
  if (status === "declined") {
    return (
      <span className="rounded-md bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-red-300" data-testid="approval-badge-declined">
        Declined by customer
      </span>
    );
  }
  return (
    <span className="rounded-md bg-gray-500/20 border border-gray-500/30 px-1.5 py-0.5 text-[10px] font-semibold text-gray-400" data-testid="approval-badge-pending">
      Awaiting customer
    </span>
  );
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface RecommendationsSectionProps {
  goals: Goal[];
  recommendations: Recommendation[];
  redactedPrompt: RedactedPrompt;
  intakeId?: number;
  onShareRecommendations?: (recIds: string[]) => Promise<void>;
  sharedRecIds?: Set<string>;
  customerApprovals?: { approved: string[]; declined: string[] } | null;
}

// ---------------------------------------------------------------------------
// Filter types
// ---------------------------------------------------------------------------

type TierFilter = "all" | RecommendationTier;

export function RecommendationsSection({
  goals,
  recommendations,
  redactedPrompt,
  intakeId,
  onShareRecommendations,
  sharedRecIds,
  customerApprovals,
}: RecommendationsSectionProps) {
  const [accepted, setAccepted] = useState(false);
  const [activeTier, setActiveTier] = useState<TierFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState(false);

  const acceptedIds = useMemo(
    () => new Set(["rec-001", "rec-006"]),
    [],
  );

  // Classify all recs
  const tierMap = useMemo(() => {
    const map = new Map<string, RecommendationTier>();
    for (const rec of recommendations) {
      map.set(rec.id, classify_tier(rec).tier);
    }
    return map;
  }, [recommendations]);

  // Tier counts
  const tierCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const tier of tierMap.values()) {
      counts[tier]++;
    }
    return counts;
  }, [tierMap]);

  // Filtered recs
  const filteredRecs = useMemo(() => {
    if (activeTier === "all") return recommendations;
    return recommendations.filter((rec) => tierMap.get(rec.id) === activeTier);
  }, [recommendations, activeTier, tierMap]);

  const topRecommendation = recommendations[0];

  // Selection handlers
  const toggleSelection = useCallback((recId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(recId)) {
        next.delete(recId);
      } else {
        next.add(recId);
      }
      return next;
    });
  }, []);

  const handleShare = useCallback(async () => {
    if (!onShareRecommendations || selectedIds.size === 0) return;
    setSharing(true);
    try {
      await onShareRecommendations(Array.from(selectedIds));
      setShareSuccess(true);
      setTimeout(() => setShareSuccess(false), 5000);
    } finally {
      setSharing(false);
    }
  }, [onShareRecommendations, selectedIds]);

  // Determine approval status for a rec
  const getApprovalStatus = useCallback(
    (recId: string): "approved" | "declined" | "pending" | null => {
      if (!sharedRecIds?.has(recId)) return null;
      if (customerApprovals?.approved.includes(recId)) return "approved";
      if (customerApprovals?.declined.includes(recId)) return "declined";
      return "pending";
    },
    [sharedRecIds, customerApprovals],
  );

  // Filter tab config
  const filterTabs: { key: TierFilter; label: string; count?: number }[] = [
    { key: "all", label: "All" },
    { key: "high", label: "High", count: tierCounts.high },
    { key: "medium", label: "Medium", count: tierCounts.medium },
    { key: "low", label: "Low", count: tierCounts.low },
  ];

  return (
    <div className="space-y-4" data-testid="recommendations-section">
      <AppCue
        title="B1: Goal-Aligned Recommendations"
        body="Each recommendation is scored against the customer's stated goals, segmented by priority tier, and backed by IRC citations. The expert can select recommendations to share with the customer for approval — closing the two-way loop."
        accentColor="emerald"
      />

      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">
          Recommendations
          <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-[var(--muted-foreground)]">
            {recommendations.length}
          </span>
        </h2>
      </div>

      {/* Tier filter tabs */}
      <div className="flex items-center gap-1" data-testid="tier-filter">
        {filterTabs.map((tab) => {
          const isActive = activeTier === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTier(tab.key)}
              className={`
                rounded-lg px-3 py-1.5 text-[12px] font-semibold transition
                ${
                  isActive
                    ? "bg-violet-500/20 text-violet-200"
                    : "bg-white/[0.04] text-[var(--muted-foreground)] hover:bg-white/[0.08] hover:text-white"
                }
              `}
              data-testid={`tier-tab-${tab.key}`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 rounded-full bg-white/[0.06] px-1.5 py-0.5 text-[10px]">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Goal dashboard (existing panel) */}
      <GoalDashboard
        goals={goals}
        recommendations={recommendations}
        acceptedIds={acceptedIds}
      />

      {/* Recommendation list */}
      <div className="space-y-2">
        {filteredRecs.map((rec, idx) => {
          const tier = tierMap.get(rec.id) ?? "low";
          const isSelected = selectedIds.has(rec.id);
          const isShared = sharedRecIds?.has(rec.id) ?? false;
          const approvalStatus = getApprovalStatus(rec.id);

          return (
            <div
              key={rec.id}
              className={`glass-card px-4 py-3 ${isSelected ? "ring-1 ring-violet-500/40" : ""}`}
              data-testid={`recommendation-${rec.id}`}
            >
              <div className="flex items-start gap-3">
                {/* Checkbox for share selection */}
                {onShareRecommendations && !isShared && (
                  <label className="mt-1 flex shrink-0 items-center">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelection(rec.id)}
                      className="h-4 w-4 rounded border-white/20 bg-white/5 text-violet-500 accent-violet-500"
                      data-testid={`share-checkbox-${rec.id}`}
                    />
                  </label>
                )}
                {isShared && (
                  <span className="mt-1 shrink-0 text-emerald-400 text-sm" title="Shared with customer">
                    &#10003;
                  </span>
                )}

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                      #{idx + 1}
                    </span>
                    <TierBadge tier={tier} />
                    <span className="pill pill-blue">{rec.irc_citation}</span>
                    {rec.llm_only && (
                      <span className="pill pill-amber">AI-only</span>
                    )}
                    {approvalStatus && <ApprovalBadge status={approvalStatus} />}
                  </div>
                  <p className="mt-1.5 text-[12px] font-semibold text-white">
                    {rec.one_line_summary}
                  </p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                    {rec.detail}
                  </p>
                  {/* Goal fit badges */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {rec.goal_fits.map((fit) => (
                      <span
                        key={fit.goal_id}
                        className="rounded-md border border-white/5 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[var(--muted-foreground)]"
                      >
                        {fit.goal_id}: {Math.round(fit.score * 100)}%
                      </span>
                    ))}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                    Impact
                  </div>
                  <div className="text-sm font-semibold text-emerald-300">
                    {formatUsd(rec.dollar_impact.estimate)}
                  </div>
                  <div className="mt-1">
                    <div className="confidence-bar w-16">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${rec.confidence * 100}%`,
                          background:
                            rec.confidence >= 0.8
                              ? "#06d6a0"
                              : rec.confidence >= 0.5
                                ? "#f59e0b"
                                : "#ef4444",
                        }}
                      />
                    </div>
                    <div className="mt-0.5 text-[10px] text-[var(--muted-foreground)]">
                      {Math.round(rec.confidence * 100)}% conf.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* What AI saw (existing panel) */}
      <WhatAISaw
        prompt={redactedPrompt}
        recommendationHeadline={topRecommendation?.one_line_summary}
      />

      {/* Share success toast */}
      {shareSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
          Recommendations shared with customer. They will receive a review link to approve or decline each item.
        </div>
      )}

      {/* Share selection sticky footer */}
      {onShareRecommendations && selectedIds.size > 0 && (
        <div
          className="sticky bottom-0 z-20 flex items-center justify-between rounded-xl border border-violet-500/30 bg-[#0a0a12]/95 px-4 py-3 backdrop-blur"
          data-testid="share-footer"
        >
          <span className="text-[13px] text-[var(--muted-foreground)]">
            <span className="font-semibold text-white">{selectedIds.size}</span> selected
          </span>
          <button
            type="button"
            onClick={handleShare}
            disabled={sharing}
            className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-2.5 text-[13px] font-semibold text-[#050508] transition hover:brightness-110 disabled:opacity-50"
            data-testid="share-recommendations-cta"
          >
            {sharing
              ? "Sharing..."
              : `Share ${selectedIds.size} recommendation${selectedIds.size === 1 ? "" : "s"}`}
          </button>
        </div>
      )}

      {/* Accept CTA + synthetic toast */}
      {accepted && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-[12px] text-emerald-200">
          Draft saved to customer&apos;s inbox (synthetic)
        </div>
      )}
      <div className="flex justify-center">
        <button
          type="button"
          onClick={() => setAccepted(true)}
          disabled={accepted}
          className={`
            inline-flex items-center justify-center rounded-xl px-6 py-3
            text-sm font-semibold transition
            ${
              accepted
                ? "bg-emerald-500/20 text-emerald-300 cursor-default"
                : "bg-gradient-to-r from-violet-500 to-cyan-400 text-[#050508] hover:brightness-110"
            }
          `}
          data-testid="accept-recommendations-cta"
        >
          {accepted
            ? "Recommendations accepted"
            : "Accept recommendations & draft reply"}
        </button>
      </div>
    </div>
  );
}
