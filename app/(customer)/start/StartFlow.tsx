"use client";

/**
 * StartFlow — Sprint 3 T-F02 / T-F03.
 *
 * Multi-step client component for the customer intake flow:
 *   Step 1 ("info+docs"): Name, filing status, AGI band, document picker
 *   Step 2 ("goals"): 3-goal selection reusing form.ts validation
 *
 * On final submit, POSTs goals + customer_metadata to /api/intake,
 * then redirects to /handoff?intake=<intake_id>.
 */

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GOAL_IDS, type GoalId } from "@/contracts";
import { DEMO_DOCUMENTS, type DemoDocument } from "@/lib/customer/documents";
import { GOAL_LABEL } from "@/lib/goals/taxonomy";
import {
  make_empty_form,
  validate_form,
  type FormErrors,
  type FormRow,
  type FormState,
} from "@/lib/intake/form";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

type Step = "info+docs" | "goals";

const FILING_STATUS_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "mfj", label: "Married Filing Jointly" },
  { value: "mfs", label: "Married Filing Separately" },
  { value: "hoh", label: "Head of Household" },
  { value: "qw", label: "Qualifying Widow(er)" },
] as const;

const AGI_BAND_OPTIONS = [
  { value: "under_50k", label: "Under $50K" },
  { value: "50_100k", label: "$50K-$100K" },
  { value: "100_250k", label: "$100K-$250K" },
  { value: "250_500k", label: "$250K-$500K" },
  { value: "over_500k", label: "Over $500K" },
] as const;

const DEFAULT_SELECTED_DOCS = new Set(["w2-acme", "1099-div", "1099-b", "1098"]);

const WEIGHT_LABELS: Record<number, string> = {
  1: "1 -- nice to have",
  2: "2 -- mild",
  3: "3 -- medium",
  4: "4 -- strong",
  5: "5 -- non-negotiable",
};

type RowIndex = 0 | 1 | 2;

// ---------------------------------------------------------------------------
// Shared select class strings
// ---------------------------------------------------------------------------

const SELECT_CLASS =
  "rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none [color-scheme:dark]";
const OPTION_CLASS = "bg-[#0f0f17] text-white";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StartFlow() {
  const router = useRouter();

  // Step state
  const [step, setStep] = useState<Step>("info+docs");

  // Step 1 state
  const [displayName, setDisplayName] = useState("");
  const [filingStatus, setFilingStatus] = useState("mfj");
  const [agiBand, setAgiBand] = useState("250_500k");
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(
    () => new Set(DEFAULT_SELECTED_DOCS),
  );

  // Step 2 state (goals)
  const [formState, setFormState] = useState<FormState>(() => make_empty_form());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Step 1 helpers
  const canContinue = displayName.trim().length >= 1 && selectedDocs.size >= 1;

  function toggleDoc(id: string) {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Step 2 helpers
  function patchRow(i: RowIndex, patch: Partial<FormRow>) {
    setFormState((prev) => {
      const rows = [...prev.rows] as [FormRow, FormRow, FormRow];
      rows[i] = { ...rows[i], ...patch };
      return { rows };
    });
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);

    const result = validate_form(formState);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    setSubmitting(true);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          goals: result.goals,
          customer_metadata: {
            display_name: displayName.trim(),
            filing_status: filingStatus,
            agi_band: agiBand,
            document_ids: Array.from(selectedDocs),
          },
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;
        setSubmitError(
          body?.error ?? `Submission failed with status ${res.status}.`,
        );
        setSubmitting(false);
        return;
      }

      const body = (await res.json()) as { intake_id: number };
      router.push(`/handoff?intake=${body.intake_id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Network error. Try again.",
      );
      setSubmitting(false);
    }
  }

  // -----------------------------------------------------------------------
  // Step 1: Info + Document Picker
  // -----------------------------------------------------------------------
  if (step === "info+docs") {
    return (
      <div className="flex flex-col gap-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Let&apos;s get you ready for your expert
          </h1>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            This is a synthetic demo &mdash; please don&apos;t enter real
            personal information.
          </p>
        </div>

        {/* Name */}
        <div className="glass-card flex flex-col gap-4 p-5">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Your name
            </span>
            <input
              type="text"
              maxLength={40}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Olivia Mitchell"
              className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
            />
            <span className="text-[11px] text-[var(--muted-foreground)]">
              Synthetic name only &mdash; no real PII.
            </span>
          </label>

          {/* Filing status */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Filing status
            </span>
            <select
              value={filingStatus}
              onChange={(e) => setFilingStatus(e.target.value)}
              className={SELECT_CLASS}
            >
              {FILING_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className={OPTION_CLASS}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          {/* AGI band */}
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
              Adjusted Gross Income band
            </span>
            <select
              value={agiBand}
              onChange={(e) => setAgiBand(e.target.value)}
              className={SELECT_CLASS}
            >
              {AGI_BAND_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className={OPTION_CLASS}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Document card grid */}
        <div>
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
            Your tax documents
          </h2>
          <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            Select the documents you&apos;d like to share with your expert.
          </p>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {DEMO_DOCUMENTS.map((doc: DemoDocument) => {
              const selected = selectedDocs.has(doc.id);
              return (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => toggleDoc(doc.id)}
                  className={`glass-card flex items-start gap-3 p-4 text-left transition ${
                    selected
                      ? "border-violet-500/50 ring-1 ring-violet-500/30"
                      : "hover:border-white/15"
                  }`}
                >
                  <div
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      selected
                        ? "border-violet-400 bg-violet-500/30 text-white"
                        : "border-white/20 bg-white/5"
                    }`}
                  >
                    {selected && (
                      <svg
                        viewBox="0 0 16 16"
                        fill="none"
                        className="h-3 w-3"
                        stroke="currentColor"
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M3.5 8.5L6.5 11.5L12.5 4.5" />
                      </svg>
                    )}
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-white">
                      {doc.form_type}
                    </span>
                    <span className="text-[11px] text-[var(--muted-foreground)]">
                      {doc.issuer}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {doc.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Sticky bottom CTA */}
        <div className="sticky bottom-0 -mx-5 border-t border-white/10 bg-[var(--background)]/90 px-5 py-4 backdrop-blur">
          <button
            type="button"
            disabled={!canContinue}
            onClick={() => setStep("goals")}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-[#050508] shadow-lg transition hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 sm:w-auto"
          >
            Continue to goals &rarr;
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Step 2: Goal Selection
  // -----------------------------------------------------------------------
  return (
    <div className="flex flex-col gap-6">
      <div>
        <button
          type="button"
          onClick={() => setStep("info+docs")}
          className="mb-4 text-[12px] text-[var(--muted-foreground)] transition hover:text-white"
        >
          &larr; Back to info &amp; documents
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
          What matters most to you this year?
        </h1>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Pick three goals, rank them, and tell us how strongly you feel.
        </p>
      </div>

      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {formState.rows.map((row, i) => {
          const idx = i as RowIndex;
          const idErr = errors[`row_${idx}_id`];
          const weightErr = errors[`row_${idx}_weight`];
          const rationaleErr = errors[`row_${idx}_rationale`];
          const showOther = row.id === "other";

          return (
            <div key={i} className="glass-card flex flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                  Goal #{i + 1}
                </span>
                <label className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                  Rank
                  <select
                    value={row.rank}
                    onChange={(e) =>
                      patchRow(idx, {
                        rank: Number(e.target.value) as 1 | 2 | 3,
                      })
                    }
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-violet-400 focus:outline-none [color-scheme:dark]"
                  >
                    <option value={1} className={OPTION_CLASS}>1</option>
                    <option value={2} className={OPTION_CLASS}>2</option>
                    <option value={3} className={OPTION_CLASS}>3</option>
                  </select>
                </label>
              </div>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  What do you want out of this return?
                </span>
                <select
                  value={row.id}
                  onChange={(e) =>
                    patchRow(idx, { id: e.target.value as GoalId | "" })
                  }
                  aria-invalid={Boolean(idErr)}
                  className={SELECT_CLASS}
                >
                  <option value="" className={OPTION_CLASS}>
                    Select a goal...
                  </option>
                  {GOAL_IDS.map((id) => (
                    <option key={id} value={id} className={OPTION_CLASS}>
                      {GOAL_LABEL[id]}
                    </option>
                  ))}
                </select>
                {idErr && (
                  <span className="text-[11px] text-red-300">{idErr}</span>
                )}
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-[11px] text-[var(--muted-foreground)]">
                  How strongly do you feel about this?
                </span>
                <select
                  value={row.weight}
                  onChange={(e) =>
                    patchRow(idx, { weight: Number(e.target.value) })
                  }
                  aria-invalid={Boolean(weightErr)}
                  className={SELECT_CLASS}
                >
                  {[1, 2, 3, 4, 5].map((w) => (
                    <option key={w} value={w} className={OPTION_CLASS}>
                      {WEIGHT_LABELS[w]}
                    </option>
                  ))}
                </select>
                {weightErr && (
                  <span className="text-[11px] text-red-300">{weightErr}</span>
                )}
              </label>

              {showOther && (
                <label className="flex flex-col gap-1">
                  <span className="text-[11px] text-[var(--muted-foreground)]">
                    What is the &quot;other&quot; goal? (required, no PII)
                  </span>
                  <textarea
                    value={row.rationale}
                    onChange={(e) =>
                      patchRow(idx, { rationale: e.target.value })
                    }
                    maxLength={500}
                    rows={2}
                    aria-invalid={Boolean(rationaleErr)}
                    placeholder="e.g. I want to plan for a move to another state next year."
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                  />
                  {rationaleErr && (
                    <span className="text-[11px] text-red-300">
                      {rationaleErr}
                    </span>
                  )}
                </label>
              )}
            </div>
          );
        })}

        {(errors.ranks || errors.duplicates || errors.form) && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200"
          >
            {errors.ranks && <div>{errors.ranks}</div>}
            {errors.duplicates && <div>{errors.duplicates}</div>}
            {errors.form && <div>{errors.form}</div>}
          </div>
        )}

        {submitError && (
          <div
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200"
          >
            {submitError}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-[#050508] shadow-lg transition hover:brightness-110 disabled:opacity-60"
        >
          {submitting ? "Connecting..." : "Connect me with my expert"}
        </button>
      </form>
    </div>
  );
}
