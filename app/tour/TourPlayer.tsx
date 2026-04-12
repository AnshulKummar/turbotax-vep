/**
 * TourPlayer — Sprint 4 guided product tour.
 *
 * Renders the live app in a same-origin iframe with an overlay that
 * auto-advances through the demo script steps. The iframe navigates
 * to pre-set URLs for each step; the overlay shows narration captions
 * with act labels, progress bar, and playback controls.
 *
 * Audio narration via the Web Speech API (SpeechSynthesis). Each step's
 * caption text is read aloud automatically. The step timer is driven by
 * the speech duration rather than a fixed clock — whichever finishes
 * last (speech or minimum duration) triggers the advance.
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

// ── TTS helpers ────────────────────────────────────────────────────────
function getTTSVoice(): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  // Prefer a natural-sounding English voice
  const preferred = [
    "Google UK English Male",
    "Google UK English Female",
    "Google US English",
    "Microsoft David",
    "Microsoft Zira",
    "Samantha",
    "Daniel",
    "Alex",
  ];
  for (const name of preferred) {
    const match = voices.find((v) => v.name.includes(name));
    if (match) return match;
  }
  // Fallback: first English voice
  return voices.find((v) => v.lang.startsWith("en")) ?? voices[0] ?? null;
}

function speakText(
  text: string,
  onEnd: () => void,
  rate = 1.05,
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;

  // Cancel any in-progress speech
  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;
  const voice = getTTSVoice();
  if (voice) utterance.voice = voice;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;

  window.speechSynthesis.speak(utterance);
  return utterance;
}

function cancelSpeech() {
  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

// ── Component ──────────────────────────────────────────────────────────

export function TourPlayer() {
  const [currentStep, setCurrentStep] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [speechDone, setSpeechDone] = useState(false);
  const [voicesReady, setVoicesReady] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const step = TOUR_STEPS[currentStep];
  const totalSteps = TOUR_STEPS.length;
  const isLastStep = currentStep === totalSteps - 1;

  // ── Load voices (async on some browsers) ───────────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    const check = () => {
      if (window.speechSynthesis.getVoices().length > 0) {
        setVoicesReady(true);
      }
    };
    check();
    window.speechSynthesis.addEventListener("voiceschanged", check);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", check);
  }, []);

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
        if (currentFull !== target) {
          iframeRef.current.contentWindow?.location.replace(target);
        }
      } catch {
        iframeRef.current.src = target;
      }
    }
    setElapsed(0);
    setSpeechDone(false);
  }, [currentStep, step.path]);

  // ── Speak current step caption ─────────────────────────────────────
  useEffect(() => {
    if (!playing || !audioEnabled || !voicesReady) {
      cancelSpeech();
      return;
    }

    // Combine title + body for narration
    const text = `${step.title}. ${step.body}`;
    utteranceRef.current = speakText(text, () => {
      setSpeechDone(true);
    });

    return () => {
      cancelSpeech();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, playing, audioEnabled, voicesReady]);

  // ── Pause/resume speech when play state changes ────────────────────
  useEffect(() => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    if (!audioEnabled) return;

    if (playing) {
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.pause();
      }
    }
  }, [playing, audioEnabled]);

  // ── Auto-advance logic ──────────────────────────────────────────────
  //
  // When audio is ON:  speech completion is the SOLE advance trigger.
  //                    The timer is cosmetic progress only — it never
  //                    triggers a step change.
  // When audio is OFF: the fixed duration timer drives advancement.
  //
  // This guarantees the narrator always finishes before the screen moves.

  // Timer — cosmetic elapsed counter (and fallback driver when audio off)
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (!playing || step.duration === 0) return;

    timerRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 0.1;

        // When audio is OFF, timer drives advancement
        if (!audioEnabled && next >= step.duration) {
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
  }, [playing, step.duration, isLastStep, currentStep, audioEnabled]);

  // Speech-driven advance — the ONLY way to move forward when audio is on
  useEffect(() => {
    if (!speechDone || !playing || !audioEnabled) return;

    // Add a brief 0.8s pause after speech ends for breathing room
    const pauseTimer = setTimeout(() => {
      if (!isLastStep) {
        setCurrentStep((s) => s + 1);
      } else {
        setPlaying(false);
      }
    }, 800);

    return () => clearTimeout(pauseTimer);
  }, [speechDone, playing, audioEnabled, isLastStep]);

  // ── Controls ───────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    cancelSpeech();
    if (!isLastStep) {
      setCurrentStep((s) => s + 1);
      setElapsed(0);
    }
  }, [isLastStep]);

  const goPrev = useCallback(() => {
    cancelSpeech();
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
      setElapsed(0);
    }
  }, [currentStep]);

  const togglePlay = useCallback(() => {
    setPlaying((p) => !p);
  }, []);

  const toggleAudio = useCallback(() => {
    setAudioEnabled((prev) => {
      if (prev) cancelSpeech();
      return !prev;
    });
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
      } else if (e.key === "m") {
        e.preventDefault();
        toggleAudio();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, togglePlay, toggleAudio]);

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

            {/* Audio toggle */}
            <div className="mx-1 h-5 w-px bg-white/10" />
            <button
              type="button"
              onClick={toggleAudio}
              className={`rounded-md border p-1.5 transition hover:bg-white/[0.06] ${
                audioEnabled
                  ? "border-violet-500/40 text-violet-200"
                  : "border-white/10 text-[var(--muted-foreground)]"
              }`}
              aria-label={audioEnabled ? "Mute narration" : "Enable narration"}
              title={audioEnabled ? "Mute narration" : "Enable narration"}
            >
              {audioEnabled ? (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5h2l3-3v10L4 9H2a1 1 0 01-1-1V6a1 1 0 011-1z" />
                  <path d="M10 4a4 4 0 010 6" />
                  <path d="M12 2a7 7 0 010 10" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 5h2l3-3v10L4 9H2a1 1 0 01-1-1V6a1 1 0 011-1z" />
                  <path d="M10 4l4 6M14 4l-4 6" />
                </svg>
              )}
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
            play/pause &middot;{" "}
            <span className="rounded bg-white/[0.06] px-1 py-0.5 font-mono">M</span>{" "}
            mute/unmute
          </p>
        </div>
      </div>
    </div>
  );
}
