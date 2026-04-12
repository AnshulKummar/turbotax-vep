/**
 * Customer flow layout — Sprint 3 T-F01.
 *
 * Wraps all pages under `app/(customer)/` with the disclaimer banner,
 * a simple text header, and the public footer. The `data-flow="customer"`
 * attribute on the wrapper div enables future CSS targeting (AD-S3-04).
 *
 * Server component — no client JS.
 */

import { DisclaimerBanner } from "../../components/public/DisclaimerBanner";
import { PublicFooter } from "../../components/public/PublicFooter";

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div data-flow="customer" className="flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-3xl px-5 pt-6">
        <p className="text-[12px] font-semibold tracking-tight text-[var(--muted-foreground)]">
          TurboTax Live Expert Review
        </p>
      </header>

      <p className="lg:hidden text-center text-xs text-[var(--muted-foreground)] py-2">
        Best viewed on desktop
      </p>

      <div className="mx-auto w-full max-w-3xl px-5 pt-4">
        <DisclaimerBanner />
      </div>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-8">
        {children}
      </main>

      <div className="mx-auto w-full max-w-3xl px-5 pb-8">
        <PublicFooter />
      </div>
    </div>
  );
}
