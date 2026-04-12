/**
 * T-715 — Shared disclaimer banner.
 *
 * Rendered on every public page that accepts visitor input (`/`, `/intake`,
 * `/workbench`). Single source of truth for the "synthetic data only"
 * copy so a future edit touches one file. Server component — no client JS.
 */
export function DisclaimerBanner() {
  return (
    <div
      role="note"
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-[12px] text-amber-200"
    >
      <strong className="font-semibold">Synthetic data only</strong>
      {" — "}
      please don&apos;t enter real personal information. This is a portfolio
      prototype.
    </div>
  );
}
