/**
 * PreworkSection — Sprint 3 T-G05.
 *
 * Re-parents existing pre-work panels (ReturnSurface, RiskRegister,
 * SuggestedQuestions, QualityCopilot) into the new section layout.
 * Does NOT rewrite the panel logic — import and render only.
 */
"use client";

import type {
  LineId,
  PreWorkResponse,
  Recommendation,
} from "../../../src/contracts";

import { ReturnSurface } from "../ReturnSurface";
import { RiskRegister } from "../RiskRegister";
import { SuggestedQuestions } from "../SuggestedQuestions";
import { QualityCopilot } from "../QualityCopilot";

interface PreworkSectionProps {
  prework: PreWorkResponse;
  recommendations: Recommendation[];
  recommendationsByRuleId: Record<string, Recommendation>;
  lastEdit: { lineId: LineId; value: string } | null;
  onLineEdit: (lineId: LineId, value: string) => void;
}

export function PreworkSection({
  prework,
  recommendations,
  recommendationsByRuleId,
  lastEdit,
  onLineEdit,
}: PreworkSectionProps) {
  return (
    <div className="space-y-4" data-testid="prework-section">
      <h2 className="text-[15px] font-semibold text-white">
        Pre-work Analysis
      </h2>

      {/* Return surface + side panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <ReturnSurface ocr={prework.ocr} onLineEdit={onLineEdit} />
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
    </div>
  );
}
