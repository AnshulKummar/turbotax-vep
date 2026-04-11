"use client";

import clsx from "clsx";
import { useEffect, useState } from "react";

const LEGACY_BASELINE_MIN = 30;
const INTUIT_TY2025_BASELINE_MIN = 24;

interface ExpertMinutesCounterProps {
  /** Override the start time for tests. Defaults to the moment the component mounts. */
  startAt?: number;
  /** Override the tick interval for tests. Defaults to 1000ms. */
  tickMs?: number;
}

/**
 * Expert Minutes Counter.
 *
 * Ticks in real time since the case was picked up. Shows the current
 * return time next to the legacy 30-min baseline and Intuit's stated
 * TY2025 24-min baseline. Color-codes green if under the 24-min
 * target, amber if between targets, red if over legacy.
 */
export function ExpertMinutesCounter({
  startAt,
  tickMs = 1000,
}: ExpertMinutesCounterProps) {
  const [now, setNow] = useState<number>(() => Date.now());
  const [start] = useState<number>(() => startAt ?? Date.now());

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), tickMs);
    return () => window.clearInterval(id);
  }, [tickMs]);

  const elapsedMs = Math.max(0, now - start);
  const elapsedMin = elapsedMs / 60_000;

  const state =
    elapsedMin <= INTUIT_TY2025_BASELINE_MIN
      ? "green"
      : elapsedMin <= LEGACY_BASELINE_MIN
        ? "amber"
        : "red";

  const stateClasses = {
    green: "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/40 bg-amber-500/10 text-amber-200",
    red: "border-red-500/40 bg-red-500/10 text-red-200",
  }[state];

  const mins = Math.floor(elapsedMin);
  const secs = Math.floor((elapsedMs - mins * 60_000) / 1000);
  const label = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  return (
    <div
      className={clsx("glass-card flex items-center gap-4 px-4 py-3", stateClasses)}
      data-testid="expert-minutes-counter"
    >
      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
          Return time
        </div>
        <div className="font-mono text-2xl font-semibold">{label}</div>
      </div>
      <div className="border-l border-white/10 pl-4 text-[11px] leading-tight">
        <div>
          <span className="opacity-70">Intuit TY2025 target</span>{" "}
          <span className="font-mono font-semibold">
            {INTUIT_TY2025_BASELINE_MIN}:00
          </span>
        </div>
        <div>
          <span className="opacity-70">Legacy baseline</span>{" "}
          <span className="font-mono font-semibold">
            {LEGACY_BASELINE_MIN}:00
          </span>
        </div>
      </div>
    </div>
  );
}
