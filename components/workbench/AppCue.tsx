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

  const colorMap: Record<string, { border: string; bg: string; ring: string; icon: string; title: string }> = {
    violet: { border: "border-l-violet-500", bg: "bg-violet-500/[0.07]", ring: "ring-violet-500/20", icon: "text-violet-400", title: "text-violet-300" },
    emerald: { border: "border-l-emerald-500", bg: "bg-emerald-500/[0.07]", ring: "ring-emerald-500/20", icon: "text-emerald-400", title: "text-emerald-300" },
    cyan: { border: "border-l-cyan-500", bg: "bg-cyan-500/[0.07]", ring: "ring-cyan-500/20", icon: "text-cyan-400", title: "text-cyan-300" },
    amber: { border: "border-l-amber-500", bg: "bg-amber-500/[0.07]", ring: "ring-amber-500/20", icon: "text-amber-400", title: "text-amber-300" },
  };
  const c = colorMap[accentColor] ?? colorMap.violet!;

  return (
    <div
      className={`relative overflow-hidden rounded-xl border-l-4 ${c.border} ${c.bg} ring-1 ${c.ring} px-4 py-3.5 mb-4`}
      data-testid="app-cue"
    >
      {/* Subtle gradient glow */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className={`mt-0.5 shrink-0 text-base ${c.icon}`} aria-hidden="true">&#9670;</span>
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-wider ${c.title}`}>
              {title}
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-slate-300/90">
              {body}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-md p-0.5 text-slate-500 hover:bg-white/[0.06] hover:text-white transition text-sm"
          aria-label="Dismiss hint"
        >
          &times;
        </button>
      </div>
    </div>
  );
}
