/**
 * Top-of-workbench routing rationale chip.
 *
 * Shows the four routing dimensions as separate badges:
 *   1. Specialty match (e.g. "RSU 5+ yrs")
 *   2. Jurisdiction match (e.g. "IL + CA")
 *   3. Continuity (e.g. "Prior-year preparer")
 *   4. Complexity (e.g. "8 of 10")
 */
export function RoutingRationaleChip() {
  return (
    <div className="glass-card flex flex-wrap items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
          Routed to you because
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className="pill pill-violet" data-testid="badge-specialty">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
          5+ yrs RSU specialty
        </span>
        <span className="pill pill-cyan" data-testid="badge-jurisdiction">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
          Multi-state IL + CA
        </span>
        <span className="pill pill-blue" data-testid="badge-continuity">
          <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
          Prior-year preparer
        </span>
        <span className="pill pill-amber" data-testid="badge-complexity">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
          Complexity 8 / 10
        </span>
      </div>
      <div className="ml-auto text-[11px] text-[var(--muted-foreground)]">
        ETA to handoff{" "}
        <span className="font-semibold text-white">4 min</span>
      </div>
    </div>
  );
}
