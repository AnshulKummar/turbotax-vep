/**
 * AppCue — Sprint 4 T-J01.
 *
 * Dismissable hint banner displayed at the top of each workbench section.
 * Explains to demo viewers what the section demonstrates.
 */
"use client";

import { useState } from "react";

interface AppCueProps {
  title: string;
  body: string;
  accentColor?: string; // default "violet"
}

export function AppCue({ title, body, accentColor = "violet" }: AppCueProps) {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  const borderColorClass =
    accentColor === "violet"
      ? "border-l-violet-500"
      : accentColor === "emerald"
        ? "border-l-emerald-500"
        : accentColor === "cyan"
          ? "border-l-cyan-500"
          : accentColor === "amber"
            ? "border-l-amber-500"
            : "border-l-violet-500";

  return (
    <div
      className={`glass-card border-l-4 ${borderColorClass} px-4 py-3 mb-4`}
      data-testid="app-cue"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-violet-300">
            {title}
          </div>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            {body}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 text-[var(--muted-foreground)] hover:text-white transition text-sm"
          aria-label="Dismiss hint"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
