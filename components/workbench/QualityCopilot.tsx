"use client";

import clsx from "clsx";
import { useEffect, useMemo, useState } from "react";
import type { LineId } from "../../src/contracts";
import { Panel } from "./Panel";

interface QualityCopilotProps {
  /** The most recent line-edit event on the return surface. */
  lastEdit: { lineId: LineId; value: string } | null;
}

interface CopilotWarning {
  id: string;
  severity: "info" | "warn" | "error";
  title: string;
  detail: string;
}

function compute_warnings(
  lastEdit: { lineId: LineId; value: string } | null,
): CopilotWarning[] {
  if (!lastEdit) return [];
  const { lineId, value } = lastEdit;
  const next: CopilotWarning[] = [];

  if (lineId.startsWith("1040.line.7") || lineId.startsWith("8949")) {
    next.push({
      id: `wash-${lineId}`,
      severity: "error",
      title: "Wash-sale lot mismatch",
      detail:
        "You edited a 1099-B line but three lots still have wash_sale_loss_disallowed > 0 and code = null. Apply Code W to rows WASH-001..003 before accepting.",
    });
  }

  const num = Number(value.replace(/[^0-9.-]/g, ""));
  if (!Number.isNaN(num) && num < 0 && lineId.startsWith("1040")) {
    next.push({
      id: `neg-${lineId}`,
      severity: "warn",
      title: "Negative income line",
      detail: `You set ${lineId} to a negative value. Confirm this is a loss and not a sign-flip typo.`,
    });
  }

  if (next.length === 0) {
    next.push({
      id: `ok-${lineId}`,
      severity: "info",
      title: "No issues detected",
      detail: `Edit on ${lineId} looks consistent with other lines.`,
    });
  }

  return next;
}

/**
 * Live Quality Co-pilot.
 *
 * Watches editable lines on the return surface. For the MVP demo we
 * deterministically simulate a wash-sale lot mismatch when the expert
 * edits a 1099-B / 1040.line.7 field — no real LLM call required.
 */
export function QualityCopilot({ lastEdit }: QualityCopilotProps) {
  const warnings = useMemo(() => compute_warnings(lastEdit), [lastEdit]);
  const hasError = warnings.some((w) => w.severity === "error");
  const [flashClearedAt, setFlashClearedAt] = useState<number | null>(null);
  // Flashing is derived: an error edit ID is flashing until the timer
  // marks it cleared. setState only happens inside the timer callback, not
  // synchronously in the effect, which keeps React 19's effect rule happy.
  const flashKey = hasError ? (lastEdit?.lineId ?? null) : null;
  const flashing = flashKey !== null && flashClearedAt !== flashKey?.length;

  useEffect(() => {
    if (!hasError) return;
    const t = window.setTimeout(() => {
      setFlashClearedAt(flashKey?.length ?? null);
    }, 3000);
    return () => window.clearTimeout(t);
  }, [hasError, flashKey]);

  return (
    <Panel
      title="Quality co-pilot"
      subtitle="Live consistency checks on edited lines"
      className={clsx(flashing && "flash-warning")}
    >
      <div data-testid="quality-copilot" className="space-y-2">
        {warnings.length === 0 ? (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Waiting for the first line edit. The co-pilot will flash a
            warning the moment it sees an inconsistency.
          </p>
        ) : (
          warnings.map((w) => {
            const cls =
              w.severity === "error"
                ? "border-red-500/40 bg-red-500/5 text-red-200"
                : w.severity === "warn"
                  ? "border-amber-500/40 bg-amber-500/5 text-amber-200"
                  : "border-emerald-500/30 bg-emerald-500/5 text-emerald-200";
            return (
              <div
                key={w.id}
                className={`rounded-md border px-3 py-2 text-[11px] ${cls}`}
                data-testid={`copilot-warning-${w.severity}`}
              >
                <div className="text-[12px] font-semibold">{w.title}</div>
                <div className="mt-0.5 leading-relaxed">{w.detail}</div>
              </div>
            );
          })
        )}
      </div>
    </Panel>
  );
}
