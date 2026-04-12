/**
 * TourPlayer — Sprint 4 guided product tour.
 *
 * Renders the live app in a same-origin iframe with an overlay that
 * auto-advances through the demo script steps. The iframe navigates
 * to pre-set URLs for each step; the overlay shows narration captions
 * with act labels, progress bar, and playback controls.
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TOUR_STEPS } from "./tour-steps";

const ACT_COLORS: Record<string, string> = {
  violet: "bg-violet-500/20 border-violet-500/40 text-violet-200",
  amber: "bg-amber-500/20 border-amber-500/40 text-amber-200",
  cyan: "bg-cyan-500/20 border-cyan-500/40 text-cyan-200",
  emerald: "bg-emerald-500/20 border-emerald-500/40 text-emerald-200",
};

export function TourPlayer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step = TOUR_STEPS[currentStep];
  const totalSteps = TOUR_STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Navigate iframe when step changes ──────────────────────────────
  useEffect(() => {
    if (iframeRef.current) {
      const target = step.path;
      try {
        const currentPath =
          iframeRef.current.contentWindow?.location?.pathname ?? "";
        const currentSearch =
          iframeRef.current.contentWindow?.location?.search ?? "";
        const currentFull = currentPath + currentSearch;
        // Only navigate if the URL actually changed
        if (currentFull !== target) {
          iframeRef.current.contentWindow?.location.replace(target);
        }
      } catch {
        // Cross-origin fallback: set src attribute
        iframeRef.current.src = target;
      }
    }
    setElapsed(0);
  }, [currentStep, step.path]);

  // ── Auto-advance timer ─────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!playing || step.duration === 0) return;

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;
        if (next >= step.duration) {
          if (!isLastStep) {
            setCurrentStep((s) => s + 1);
          } else {
            setPlaying(false);
          }
          return 0;
        }
        return next;
      });
    }, 100);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [playing, step.duration, isLastStep, currentStep]);

  // ── Controls ───────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!isLastStep) {
      setCurrentStep((s) => s + 1);
      setElapsed(0);
    }
  }, [isLastStep]);

  const goPrev = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setElapsed(0);
    }
  }, [currentStep]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  // ── Keyboard shortcuts ─────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "p" || e.key === "k") {
        e.preventDefault();
        togglePlay();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, togglePlay]);

  // ── Progress percentage for current step ───────────────────────────
  const stepProgress =
    step.duration > 0 ? Math.min((elapsed / step.duration) * 100, 100) : 100;

  // ── Overall progress ───────────────────────────────────────────────
  const overallProgress = ((currentStep + stepProgress / 100) / totalSteps) * 100;

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col bg-[#050508]">
      {/* ── Top bar: progress + step counter ─────────────────────────── */}
      <div className="relative z-50 flex items-center gap-3 border-b border-white/5 bg-[#0a0a12]/95 px-4 py-2 backdrop-blur">
        {/* VEP logo */}
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-cyan-400 text-[10px] font-bold text-[#050508]">
          VEP
        </div>
        <span className="text-[11px] font-semibold text-white">
          Guided Tour
        </span>

        {/* Overall progress bar */}
        <div className="mx-3 flex-1">
          <div className="h-1 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400 transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Step counter */}
        <span className="text-[11px] tabular-nums text-[var(--muted-foreground)]">
          {currentStep + 1} / {totalSteps}
        </span>
      </div>

      {/* ── Main area: iframe + overlay ──────────────────────────────── */}
      <div className="relative flex-1 overflow-hidden">
        {/* Iframe */}
        <iframe
          ref={iframeRef}
          src={step.path}
          className="h-full w-full border-0"
          title="TurboTax VEP Demo"
          onLoad={() => setIframeLoaded(true)}
        />

        {/* Loading overlay */}
        {!iframeLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-[#050508]">
            <div className="text-[var(--muted-foreground)]">Loading...</div>
          </div>
        )}
      </div>

      {/* ── Bottom panel: captions + controls ────────────────────────── */}
      <div className="relative z-50 border-t border-white/5 bg-[#0a0a12]/95 backdrop-blur">
        {/* Step progress bar */}
        <div className="h-0.5 bg-white/[0.03]">
          <div
            className="h-full bg-violet-500/50 transition-all duration-100"
            style={{ width: `${stepProgress}%` }}
          />
        </div>

        <div className="flex items-start gap-4 px-5 py-4">
          {/* Controls */}
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <button
              type="button"
              onClick={goPrev}
              disabled={currentStep === 0}
              className="rounded-md border border-white/10 p-1.5 text-white transition hover:bg-white/[0.06] disabled:opacity-30"
              aria-label="Previous step"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 2L4 7l5 5" />
              </svg>
            </button>

            <button
              type="button"
              onClick={togglePlay}
              className="rounded-md border border-white/10 p-1.5 text-white transition hover:bg-white/[0.06]"
              aria-label={playing ? "Pause" : "Play"}
            >
              {playing ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <rect x="3" y="2" width="3" height="10" rx="0.5" />
                  <rect x="8" y="2" width="3" height="10" rx="0.5" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
                  <path d="M3 1.5v11l9-5.5z" />
                </svg>
              )}
            </button>

            <button
              type="button"
              onClick={goNext}
              disabled={isLastStep}
              className="rounded-md border border-white/10 p-1.5 text-white transition hover:bg-white/[0.06] disabled:opacity-30"
              aria-label="Next step"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 2l5 5-5 5" />
              </svg>
            </button>
          </div>

          {/* Caption */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span
                className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${ACT_COLORS[step.actColor] ?? ACT_COLORS.violet}`}
              >
                {step.act}
              </span>
              <h2 className="truncate text-[14px] font-semibold text-white">
                {step.title}
              </h2>
            </div>
            <p className="mt-1.5 text-[12px] leading-relaxed text-[var(--muted-foreground)]">
              {step.body}
            </p>
          </div>

          {/* Exit */}
          <a
            href="/"
            className="shrink-0 rounded-md border border-white/10 px-3 py-1.5 text-[11px] text-[var(--muted-foreground)] transition hover:bg-white/[0.06] hover:text-white"
          >
            Exit tour
          </a>
        </div>

        {/* Keyboard hint */}
        <div className="border-t border-white/5 px-5 py-1.5">
          <p className="text-[10px] text-[var(--muted-foreground)]">
            <span className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">Space</span>{" "}
            or{" "}
            <span className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">&rarr;</span>{" "}
            next &middot;{" "}
            <span className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">&larr;</span>{" "}
            prev &middot;{" "}
            <span className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">P</span>{" "}
            play/pause
          </p>
        </div>
      </div>
    </div>
  );
}
