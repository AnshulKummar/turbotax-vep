"use client";

import { useMemo, useState } from "react";
import type { AuditEvent, AuditEventType } from "../../src/contracts";
import { Panel } from "./Panel";
import { formatTime } from "./lib/format";

interface AuditTrailTimelineProps {
  events: AuditEvent[];
}

const EVENT_FILTERS: { value: AuditEventType | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "llm_call", label: "LLM" },
  { value: "recommendation_produced", label: "Rec" },
  { value: "expert_action", label: "Expert" },
  { value: "case_routed", label: "Routing" },
  { value: "goals_captured", label: "Goals" },
  { value: "prework_completed", label: "Pre-work" },
];

const EVENT_COLOR: Record<AuditEventType, string> = {
  llm_call: "pill pill-violet",
  recommendation_produced: "pill pill-cyan",
  expert_action: "pill pill-amber",
  case_routed: "pill pill-blue",
  goals_captured: "pill pill-blue",
  prework_completed: "pill pill-blue",
};

export function AuditTrailTimeline({ events }: AuditTrailTimelineProps) {
  const [filter, setFilter] = useState<AuditEventType | "all">("all");
  const [sortDesc, setSortDesc] = useState(true);

  const filtered = useMemo(() => {
    const list =
      filter === "all"
        ? events
        : events.filter((e) => e.event_type === filter);
    return [...list].sort((a, b) => {
      const at = new Date(a.ts).getTime();
      const bt = new Date(b.ts).getTime();
      return sortDesc ? bt - at : at - bt;
    });
  }, [events, filter, sortDesc]);

  return (
    <Panel
      title="Audit trail"
      subtitle={`${events.length} events captured on this case`}
      right={
        <button
          type="button"
          onClick={() => setSortDesc((s) => !s)}
          className="rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-[10px] text-white/70 hover:text-white"
        >
          Sort {sortDesc ? "↓ newest" : "↑ oldest"}
        </button>
      }
      contentClassName="p-0"
    >
      <div className="flex flex-wrap gap-1 px-4 pt-3">
        {EVENT_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFilter(f.value)}
            className={`rounded-md border px-2 py-1 text-[10px] transition ${
              filter === f.value
                ? "border-violet-400/50 bg-violet-500/15 text-violet-200"
                : "border-white/10 bg-white/[0.02] text-[var(--muted-foreground)] hover:text-white"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul
        className="panel-scroll mt-3 max-h-[300px] divide-y divide-white/5 overflow-y-auto"
        data-testid="audit-trail"
      >
        {filtered.length === 0 ? (
          <li className="px-4 py-6 text-center text-[11px] text-[var(--muted-foreground)]">
            No events match that filter.
          </li>
        ) : (
          filtered.map((event) => (
            <li
              key={event.id}
              className="px-4 py-2.5"
              data-testid={`audit-event-${event.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={EVENT_COLOR[event.event_type]}>
                      {event.event_type.replace(/_/g, " ")}
                    </span>
                    {event.model && (
                      <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
                        {event.model}
                      </span>
                    )}
                    {event.expert_action && (
                      <span className="pill pill-blue">
                        {event.expert_action}
                      </span>
                    )}
                  </div>
                  {event.response_summary && (
                    <p className="mt-1 text-[11px] leading-relaxed text-white/80">
                      {event.response_summary}
                    </p>
                  )}
                  {event.expert_reason && (
                    <p className="mt-1 text-[11px] italic text-[var(--muted-foreground)]">
                      &ldquo;{event.expert_reason}&rdquo;
                    </p>
                  )}
                </div>
                <div className="shrink-0 text-right font-mono text-[10px] text-[var(--muted-foreground)]">
                  {formatTime(event.ts)}
                </div>
              </div>
            </li>
          ))
        )}
      </ul>
    </Panel>
  );
}
