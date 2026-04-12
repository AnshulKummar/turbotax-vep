"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type {
  AuditEvent,
  Goal,
  LineId,
  PreWorkResponse,
  Recommendation,
  RedactedPrompt,
} from "../../src/contracts";
import { mitchell_return } from "../../src/data/mitchell-return";

import { AuditTrailTimeline } from "./AuditTrailTimeline";
import { CustomerContextHeader } from "./CustomerContextHeader";
import { ExpertMinutesCounter } from "./ExpertMinutesCounter";
import { GoalDashboard } from "./GoalDashboard";
import { QualityCopilot } from "./QualityCopilot";
import { ReturnSurface } from "./ReturnSurface";
import { RiskRegister } from "./RiskRegister";
import { RoutingRationaleChip } from "./RoutingRationaleChip";
import { SuggestedQuestions } from "./SuggestedQuestions";
import { WhatAISaw } from "./WhatAISaw";

import { mitchellGoalsFixture } from "./__fixtures__/mitchell-goals.fixture";
import { mitchellPreWorkFixture } from "./__fixtures__/mitchell-prework.fixture";
import { mitchellRecommendationsFixture } from "./__fixtures__/mitchell-recommendations.fixture";
import {
  auditTrailFixture,
  whatAiSawFixture,
} from "./__fixtures__/whatAiSaw.fixture";
import {
  fetchAuditTrail,
  fetchPreWork,
  fetchRecommendations,
  fetchWhatAISaw,
} from "./lib/api";

export interface WorkbenchProps {
  /**
   * Optional goal vector pre-loaded by a Sprint 2 public-mode server
   * component (see `/workbench?intake=<id>`). If omitted, the component
   * falls back to the baked-in Mitchell fixture.
   */
  initialGoals?: Goal[];
  /**
   * Optional recommendations pre-computed on the server. When present the
   * component uses them verbatim and skips the client-side fetch fallback
   * so the goal-mix re-ranking is visible on first paint.
   */
  initialRecommendations?: Recommendation[];
  /** If true, render a "Try different goals" CTA that links to /intake. */
  showIntakeCta?: boolean;
}

/**
 * Top-level composed Expert Workbench.
 *
 * - Starts by hydrating from props (public mode) or local fixtures
 *   (Sprint 1 default) so the UI always renders.
 * - In parallel, attempts live fetches from Agent 2, 3, 5 routes and
 *   replaces state when the responses come back — but only for the panels
 *   the server didn't already hydrate.
 */
export function Workbench({
  initialGoals,
  initialRecommendations,
  showIntakeCta = false,
}: WorkbenchProps = {}) {
  const seededFromServer = Boolean(initialRecommendations);

  const [prework, setPrework] =
    useState<PreWorkResponse>(mitchellPreWorkFixture);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    initialRecommendations ?? mitchellRecommendationsFixture,
  );
  const [auditEvents, setAuditEvents] =
    useState<AuditEvent[]>(auditTrailFixture);
  const [redactedPrompt, setRedactedPrompt] =
    useState<RedactedPrompt>(whatAiSawFixture);

  const [acceptedIds] = useState<Set<string>>(
    () => new Set(["rec-001", "rec-006"]),
  );
  const [lastEdit, setLastEdit] = useState<{
    lineId: LineId;
    value: string;
  } | null>(null);

  // Live fetches run in parallel; silent failure falls back to fixtures.
  // In public mode (server-seeded recommendations) we skip the rec fetch
  // so the goal-mix re-ranking the server computed stays visible.
  useEffect(() => {
    void (async () => {
      const [pre, recs, audit, what] = await Promise.all([
        fetchPreWork(mitchellPreWorkFixture),
        seededFromServer
          ? Promise.resolve({
              recommendations,
              audit_id: 0,
            })
          : fetchRecommendations({
              recommendations: mitchellRecommendationsFixture,
              audit_id: 0,
            }),
        fetchAuditTrail("mitchell-2025-001", { events: auditTrailFixture }),
        fetchWhatAISaw("rec-001", whatAiSawFixture),
      ]);
      setPrework(pre);
      if (!seededFromServer) {
        setRecommendations(recs.recommendations);
      }
      setAuditEvents(audit.events);
      setRedactedPrompt(what);
    })();
    // seededFromServer + initial state never change after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const recommendationsByRuleId = useMemo(() => {
    const map: Record<string, Recommendation> = {};
    for (const rec of recommendations) {
      map[rec.rule_id] = rec;
    }
    return map;
  }, [recommendations]);

  const topRecommendation = recommendations[0];

  const priorYear = mitchell_return.prior_year;

  const goalsForDashboard = initialGoals ?? mitchellGoalsFixture;

  return (
    <div className="space-y-4" data-testid="workbench-root">
      {showIntakeCta && (
        <div className="flex flex-col items-start justify-between gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-3 text-[12px] text-violet-100 sm:flex-row sm:items-center">
          <span>
            Ranking is driven by the goals you submitted. Change them any
            time to see how the ordering shifts.
          </span>
          <Link
            href="/intake"
            className="inline-flex shrink-0 items-center gap-1 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/10"
          >
            Try different goals &rarr;
          </Link>
        </div>
      )}
      {/* Row 1 — Routing rationale + Expert minutes counter */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1fr_auto]">
        <RoutingRationaleChip />
        <ExpertMinutesCounter />
      </div>

      {/* Row 2 — Customer context header */}
      <CustomerContextHeader
        customerName={`${mitchell_return.taxpayer.first_name} & ${mitchell_return.spouse?.first_name ?? ""} ${mitchell_return.taxpayer.last_name}`}
        priorExpertNotes={
          priorYear?.notes ??
          "No prior expert notes available."
        }
        priorPreparerName={
          priorYear?.prior_preparer_name
            ? `${priorYear.prior_preparer_name}`
            : "No prior preparer on file"
        }
        priorYearAgi={priorYear?.agi ?? 0}
        priorYearRefundOrOwed={priorYear?.refund_or_owed ?? 0}
        priorYearFiledDate={priorYear?.filed_date ?? "-"}
        taxYear={mitchell_return.tax_year}
      />

      {/* Row 3 — Goal dashboard (3 columns) */}
      <GoalDashboard
        goals={goalsForDashboard}
        recommendations={recommendations}
        acceptedIds={acceptedIds}
      />

      {/* Row 4 — Return surface (60%) + (Risk / Questions / Copilot) stack */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ReturnSurface
            ocr={prework.ocr}
            onLineEdit={(lineId, value) => setLastEdit({ lineId, value })}
          />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-2">
          <RiskRegister
            entries={prework.risk_register}
            recommendationsByRuleId={recommendationsByRuleId}
          />
          <SuggestedQuestions recommendations={recommendations} />
          <QualityCopilot lastEdit={lastEdit} />
        </div>
      </div>

      {/* Row 5 — What AI saw + Audit trail */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <WhatAISaw
          prompt={redactedPrompt}
          recommendationHeadline={topRecommendation?.one_line_summary}
        />
        <AuditTrailTimeline events={auditEvents} />
      </div>
    </div>
  );
}
