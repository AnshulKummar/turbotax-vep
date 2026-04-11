import { formatUsdSigned } from "./lib/format";

interface CustomerContextHeaderProps {
  customerName: string;
  priorExpertNotes: string;
  priorPreparerName: string;
  priorYearAgi: number;
  priorYearRefundOrOwed: number;
  priorYearFiledDate: string;
  taxYear: number;
}

/**
 * Customer context header. Shows the customer's display name, the
 * prior expert notes, the prior-year preparer credential, and a
 * one-line summary of the prior year return (AGI / refund or owed / filed date).
 */
export function CustomerContextHeader({
  customerName,
  priorExpertNotes,
  priorPreparerName,
  priorYearAgi,
  priorYearRefundOrOwed,
  priorYearFiledDate,
  taxYear,
}: CustomerContextHeaderProps) {
  const refundLabel =
    priorYearRefundOrOwed >= 0
      ? `Refund ${formatUsdSigned(priorYearRefundOrOwed)}`
      : `Owed ${formatUsdSigned(Math.abs(priorYearRefundOrOwed))}`;

  return (
    <section className="glass-card px-4 py-4" data-testid="customer-context-header">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            <span>Customer</span>
            <span className="h-1 w-1 rounded-full bg-white/25" />
            <span>TY{taxYear}</span>
          </div>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-white">
            {customerName}
          </h1>
          <p className="mt-1 max-w-xl text-[12px] leading-relaxed text-[var(--muted-foreground)]">
            <span className="text-white/70">Prior expert notes — </span>
            {priorExpertNotes}
          </p>
        </div>

        <div className="min-w-[240px] rounded-lg border border-white/5 bg-white/[0.02] p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Prior year on file
          </div>
          <div className="mt-1 text-[13px] text-white">
            <span className="font-medium">{priorPreparerName}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
            <span className="text-[var(--muted-foreground)]">AGI</span>
            <span className="font-semibold text-white">
              {formatUsdSigned(priorYearAgi).replace("+", "")}
            </span>
            <span className="text-[var(--muted-foreground)]">·</span>
            <span
              className={
                priorYearRefundOrOwed >= 0
                  ? "font-semibold text-emerald-300"
                  : "font-semibold text-red-300"
              }
            >
              {refundLabel}
            </span>
            <span className="text-[var(--muted-foreground)]">·</span>
            <span className="text-[var(--muted-foreground)]">
              Filed {priorYearFiledDate}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
