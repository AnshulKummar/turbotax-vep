"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AuditEvent,
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

/**
 * Top-level composed Expert Workbench.
 *
 * - Starts by hydrating from local fixtures so the UI always renders.
 * - In parallel, attempts live fetches from Agent 2, 3, 5 routes and
 *   replaces state when the responses come back.
 */
export function Workbench() {
  const [prework, setPrework] =
    useState<PreWorkResponse>(mitchellPreWorkFixture);
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    mitchellRecommendationsFixture,
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
  useEffect(() => {
    void (async () => {
      const [pre, recs, audit, what] = await Promise.all([
        fetchPreWork(mitchellPreWorkFixture),
        fetchRecommendations({
          recommendations: mitchellRecommendationsFixture,
          audit_id: 0,
        }),
        fetchAuditTrail("mitchell-2025-001", { events: auditTrailFixture }),
        fetchWhatAISaw("rec-001", whatAiSawFixture),
      ]);
      setPrework(pre);
      setRecommendations(recs.recommendations);
      setAuditEvents(audit.events);
      setRedactedPrompt(what);
    })();
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

  return (
    <div className="space-y-4" data-testid="workbench-root">
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
        goals={mitchellGoalsFixture}
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
