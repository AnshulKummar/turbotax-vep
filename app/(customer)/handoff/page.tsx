"use client";

/**
 * /handoff — Transition screen between customer flow and expert workbench.
 * Sprint 3 T-F04.
 *
 * Reads `intake` from URL search params. Shows a branded loading animation
 * for 1800ms, then redirects to `/workbench?intake=<id>&section=brief`.
 *
 * No server work — pure client-side choreography per AD-S3-07.
 */

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function HandoffContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const intakeId = searchParams.get("intake");
  const [redirecting, setRedirecting] = useState(false);

  useEffect(() => {
    if (!intakeId) return;

    const timer = setTimeout(() => {
      setRedirecting(true);
      router.push(`/workbench?intake=${intakeId}&section=brief`);
    }, 1800);

    return () => clearTimeout(timer);
  }, [intakeId, router]);

  if (!intakeId) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-white">
          Something went wrong
        </h1>
        <p className="text-sm text-[var(--muted-foreground)]">
          We couldn&apos;t find your intake session.
        </p>
        <Link
          href="/start"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-[#050508] shadow-lg transition hover:brightness-110"
        >
          Start over &rarr;
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-6 py-20 text-center">
      <h1 className="text-xl font-semibold text-white sm:text-2xl">
        Connecting you to Alex, your tax expert...
      </h1>

      {/* CSS-only pulsing dots animation */}
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400"
          style={{ animation: "pulse-dot 1.4s ease-in-out infinite" }}
        />
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400"
          style={{
            animation: "pulse-dot 1.4s ease-in-out infinite",
            animationDelay: "0.2s",
          }}
        />
        <span
          className="inline-block h-2.5 w-2.5 rounded-full bg-violet-400"
          style={{
            animation: "pulse-dot 1.4s ease-in-out infinite",
            animationDelay: "0.4s",
          }}
        />
      </div>

      <p className="text-sm text-[var(--muted-foreground)]">
        Your goals and documents have been shared with your expert.
      </p>

      {redirecting && (
        <p className="text-[11px] text-[var(--muted-foreground)]">
          Redirecting...
        </p>
      )}

      {/* Inline keyframes for pulsing dots */}
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>
    </div>
  );
}

export default function HandoffPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center py-20">
          <p className="text-sm text-[var(--muted-foreground)]">Loading...</p>
        </div>
      }
    >
      <HandoffContent />
    </Suspense>
  );
}
