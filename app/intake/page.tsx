import type { Metadata } from "next";
import Link from "next/link";

import { IntakeForm } from "./IntakeForm";

export const metadata: Metadata = {
  title: "Set your tax goals — TurboTax Virtual Expert Platform",
  description:
    "Pick three tax goals and watch the Virtual Expert Platform re-rank recommendations on a synthetic return against your priorities.",
};

export default function IntakePage() {
  return (
    <div className="relative min-h-screen">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[480px] bg-[radial-gradient(ellipse_60%_60%_at_50%_0%,rgba(124,58,237,0.18),transparent_70%)]" />
      <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-6 px-5 py-10 sm:py-14">
        <header className="flex flex-col gap-3">
          <Link
            href="/"
            className="w-fit text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] transition hover:text-white"
          >
            &larr; back
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Tell us what you care about
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] sm:text-base">
            Pick three tax goals, rank them 1-3, and set how strongly you feel
            about each (1 = mild preference, 5 = non-negotiable). The
            recommendation engine re-ranks its output against this mix live.
          </p>
        </header>

        <div
          role="note"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[12px] text-amber-200 sm:text-[13px]"
        >
          <strong className="font-semibold">Portfolio prototype.</strong>{" "}
          Don&apos;t enter real personal information. The return you&apos;ll see is
          the synthetic Mitchell family return; your goals live in a 7-day
          session row and are never tied to your identity.
        </div>

        <IntakeForm />

        <footer className="mt-4 pt-6 text-center text-[11px] text-[var(--muted-foreground)]">
          Built by Anshul Kummar. Synthetic data only — not affiliated with
          Intuit.
        </footer>
      </main>
    </div>
  );
}
