import type { Metadata } from "next";
import Link from "next/link";

import { DisclaimerBanner } from "../components/public/DisclaimerBanner";
import { PublicFooter } from "../components/public/PublicFooter";

// T-704 — public landing page. Replaces the Sprint 1 stub that redirected
// straight to /workbench. Server-rendered on purpose: no client JS, no
// data fetching, no external fonts beyond the one already loaded by the
// root layout. Designed for a cold-load Lighthouse score of 90+.

export const metadata: Metadata = {
  title: "TurboTax Virtual Expert Platform — Goal-Aligned Recommendations",
  description:
    "A working prototype of Big Bet B1: a goal-aligned tax recommendation engine that re-ranks expert findings against what the customer actually cares about.",
};

const GITHUB_URL = "https://github.com/AnshulKummar/turbotax-vep";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px] bg-[radial-gradient(ellipse_70%_60%_at_50%_0%,rgba(124,58,237,0.25),transparent_70%)]" />
      <div className="pointer-events-none absolute right-0 top-0 -z-10 h-[520px] w-[520px] bg-[radial-gradient(circle_at_center,rgba(6,214,160,0.12),transparent_70%)]" />

      <main className="mx-auto flex min-h-screen max-w-5xl flex-col px-5 pb-16 pt-10 sm:pt-16">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-xs font-bold text-[#050508]">
              VEP
            </div>
            <span className="text-[12px] font-semibold tracking-tight text-white">
              Virtual Expert Platform
            </span>
          </div>
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] text-[var(--muted-foreground)] transition hover:text-white"
          >
            GitHub &rarr;
          </a>
        </nav>

        <div className="mt-6">
          <DisclaimerBanner />
        </div>

        <section className="mt-10 flex flex-col items-start gap-6 sm:mt-16">
          <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.15em] text-violet-200">
            Big Bet B1 · Live Prototype
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            A tax expert&apos;s workbench that{" "}
            <span className="bg-gradient-to-r from-violet-300 to-cyan-200 bg-clip-text text-transparent">
              ranks recommendations
            </span>{" "}
            by what the customer cares about.
          </h1>
          <p className="max-w-2xl text-base text-[var(--muted-foreground)] sm:text-lg">
            Experience the full journey &mdash; from customer intake through
            expert review &mdash; powered by goal-aligned AI recommendations.
            Set your goals, select your documents, and watch the
            recommendation engine re-score a synthetic return in under two
            seconds.
          </p>

          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/start"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-[#050508] shadow-lg transition hover:brightness-110"
            >
              Try the customer flow &rarr;
            </Link>
            <Link
              href="/workbench"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/[0.06]"
            >
              Skip to expert view
            </Link>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center justify-center gap-2 text-sm text-[var(--muted-foreground)] transition hover:text-white"
            >
              Read the PRD &rarr;
            </a>
          </div>
        </section>

        <section className="mt-16 grid grid-cols-1 gap-4 sm:mt-24 sm:grid-cols-3">
          <div className="glass-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-200">
              Step 1
            </div>
            <h2 className="mt-2 text-base font-semibold text-white">
              State your goals
            </h2>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              Pick three from a 10-goal taxonomy. Each gets a rank and a
              weight between 1 and 5.
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-200">
              Step 2
            </div>
            <h2 className="mt-2 text-base font-semibold text-white">
              Engine re-ranks
            </h2>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              A deterministic goal-fit scorer composes with a cached LLM
              cassette to rank expert findings on the Mitchell return.
            </p>
          </div>
          <div className="glass-card p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-violet-200">
              Step 3
            </div>
            <h2 className="mt-2 text-base font-semibold text-white">
              See the workbench
            </h2>
            <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
              Goal-aware ranking drives the expert workbench: risk
              register, return surface, suggested questions and the
              audit trail of what the LLM saw.
            </p>
          </div>
        </section>

        <section className="mt-16 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:mt-24">
          <h2 className="text-sm font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            What you&apos;re looking at
          </h2>
          <p className="text-[13px] text-[var(--muted-foreground)] sm:text-sm">
            This is the Layer 3 Expert Workbench from the TurboTax Virtual
            Expert Platform prototype. It exercises a deterministic tax
            rules engine against a synthetic return (Olivia &amp; Ryan
            Mitchell, tax year 2025), layers a goal-aligned recommendation
            engine on top, and logs a PII-redacted audit trail of every LLM
            call. The live LLM path is gated behind a record-cassette env
            flag; the public demo runs entirely off the committed cassette
            at $0 marginal cost.
          </p>
        </section>

        <div className="mt-16">
          <PublicFooter />
        </div>
      </main>
    </div>
  );
}
