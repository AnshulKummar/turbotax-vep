/**
 * RecommendationsSection — Sprint 3 T-G06.
 *
 * Re-parents existing recommendation panels (GoalDashboard, WhatAISaw)
 * and adds a primary "Accept recommendations" CTA with synthetic toast.
 * Does NOT rewrite the panel logic.
 */
"use client";

import { useMemo, useState } from "react";
import type { Goal, Recommendation, RedactedPrompt } from "../../../src/contracts";

import { GoalDashboard } from "../GoalDashboard";
import { WhatAISaw } from "../WhatAISaw";
import { formatUsd } from "../lib/format";

interface RecommendationsSectionProps {
  goals: Goal[];
  recommendations: Recommendation[];
  redactedPrompt: RedactedPrompt;
}

export function RecommendationsSection({
  goals,
  recommendations,
  redactedPrompt,
}: RecommendationsSectionProps) {
  const [accepted, setAccepted] = useState(false);
  const acceptedIds = useMemo(
    () => new Set(["rec-001", "rec-006"]),
    [],
  );

  const topRecommendation = recommendations[0];

  return (
    <div className="space-y-4" data-testid="recommendations-section">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-white">
          Recommendations
          <span className="ml-2 rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] font-normal text-[var(--muted-foreground)]">
            {recommendations.length}
          </span>
        </h2>
      </div>

      {/* Goal dashboard (existing panel) */}
      <GoalDashboard
        goals={goals}
        recommendations={recommendations}
        acceptedIds={acceptedIds}
      />

      {/* Recommendation list */}
      <div className="space-y-2">
        {recommendations.map((rec, idx) => (
          <div
            key={rec.id}
            className="glass-card px-4 py-3"
            data-testid={`recommendation-${rec.id}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                    #{idx + 1}
                  </span>
                  <span className="pill pill-blue">{rec.irc_citation}</span>
                  {rec.llm_only && (
                    <span className="pill pill-amber">AI-only</span>
                  )}
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
        ))}
      </div>

      {/* What AI saw (existing panel) */}
      <WhatAISaw
        prompt={redactedPrompt}
        recommendationHeadline={topRecommendation?.one_line_summary}
      />

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
