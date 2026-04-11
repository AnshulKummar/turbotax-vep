"use client";

import { useState } from "react";
import type {
  Recommendation,
  RiskRegisterEntry,
} from "../../src/contracts";
import { Panel } from "./Panel";
import { formatUsd, severityColor } from "./lib/format";

interface RiskRegisterProps {
  entries: RiskRegisterEntry[];
  /** Full recommendations keyed by rule_id so we can surface detail on expand. */
  recommendationsByRuleId: Record<string, Recommendation>;
}

/**
 * Risk Register Panel.
 * Ranked list of findings. Click a row to expand the long-form rule
 * explanation pulled from the matched recommendation.
 */
export function RiskRegister({
  entries,
  recommendationsByRuleId,
}: RiskRegisterProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Panel
      title="Risk register"
      subtitle={`${entries.length} findings ranked by impact`}
      contentClassName="p-0"
    >
      <ul
        className="panel-scroll max-h-[420px] divide-y divide-white/5 overflow-y-auto"
        data-testid="risk-register"
      >
        {entries.map((entry) => {
          const isOpen = expanded === entry.id;
          const rec = recommendationsByRuleId[entry.rule_id];
          return (
            <li
              key={entry.id}
              className="px-4 py-3 transition hover:bg-white/[0.02]"
              data-testid={`risk-entry-${entry.id}`}
            >
              <button
                type="button"
                className="w-full text-left"
                onClick={() => setExpanded(isOpen ? null : entry.id)}
                aria-expanded={isOpen}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                        #{entry.rank}
                      </span>
                      <span className={severityColor(entry.severity)}>
                        Sev {entry.severity}
                      </span>
                      <span className="pill pill-blue">
                        {entry.irc_citation}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12px] text-white">
                      {entry.one_line_summary}
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {entry.affected_lines.slice(0, 4).map((line) => (
                        <span
                          key={line}
                          className="font-mono text-[10px] text-[var(--muted-foreground)]"
                        >
                          {line}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                      Impact
                    </div>
                    <div className="text-sm font-semibold text-emerald-300">
                      {formatUsd(entry.dollar_impact_estimate)}
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)]">
                      Audit{" "}
                      <span
                        className={
                          entry.audit_risk_delta < 0
                            ? "text-emerald-300"
                            : entry.audit_risk_delta > 0
                              ? "text-red-300"
                              : "text-[var(--muted-foreground)]"
                        }
                      >
                        {entry.audit_risk_delta > 0 ? "+" : ""}
                        {entry.audit_risk_delta.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {isOpen && (
                <div className="mt-3 rounded-md border border-white/5 bg-white/[0.02] p-3 text-[11px] leading-relaxed text-[var(--muted-foreground)]">
                  {rec?.detail ??
                    "Full rule explanation not available. Consult the rules engine documentation."}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
