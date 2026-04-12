"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { GOAL_IDS, type GoalId } from "@/contracts";
import { GOAL_LABEL } from "@/lib/goals/taxonomy";
import {
  make_empty_form,
  validate_form,
  type FormErrors,
  type FormRow,
  type FormState,
} from "@/lib/intake/form";

const WEIGHT_LABELS: Record<number, string> = {
  1: "1 · nice to have",
  2: "2 · mild",
  3: "3 · medium",
  4: "4 · strong",
  5: "5 · non-negotiable",
};

type RowIndex = 0 | 1 | 2;

export function IntakeForm() {
  const router = useRouter();
  const [state, setState] = useState<FormState>(() => make_empty_form());
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  function patch_row(i: RowIndex, patch: Partial<FormRow>) {
    setState((prev) => {
      const rows = [...prev.rows] as [FormRow, FormRow, FormRow];
      rows[i] = { ...rows[i], ...patch };
      return { rows };
    });
  }

  async function on_submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitError(null);
    const result = validate_form(state);
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
        body: JSON.stringify({ goals: result.goals }),
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
      router.push(`/workbench?intake=${body.intake_id}`);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Network error. Try again.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={on_submit} className="flex flex-col gap-4">
      {state.rows.map((row, i) => {
        const idx = i as RowIndex;
        const id_err = errors[`row_${idx}_id`];
        const weight_err = errors[`row_${idx}_weight`];
        const rationale_err = errors[`row_${idx}_rationale`];
        const showOther = row.id === "other";
        return (
          <div
            key={i}
            className="glass-card flex flex-col gap-3 p-4 sm:p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[var(--muted-foreground)]">
                Goal #{i + 1}
              </span>
              <label className="flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                Rank
                <select
                  value={row.rank}
                  onChange={(e) =>
                    patch_row(idx, {
                      rank: Number(e.target.value) as 1 | 2 | 3,
                    })
                  }
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white focus:border-violet-400 focus:outline-none"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                  <option value={3}>3</option>
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
                  patch_row(idx, { id: e.target.value as GoalId | "" })
                }
                aria-invalid={Boolean(id_err)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
              >
                <option value="">Select a goal…</option>
                {GOAL_IDS.map((id) => (
                  <option key={id} value={id}>
                    {GOAL_LABEL[id]}
                  </option>
                ))}
              </select>
              {id_err && (
                <span className="text-[11px] text-red-300">{id_err}</span>
              )}
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-[11px] text-[var(--muted-foreground)]">
                How strongly do you feel about this?
              </span>
              <select
                value={row.weight}
                onChange={(e) =>
                  patch_row(idx, { weight: Number(e.target.value) })
                }
                aria-invalid={Boolean(weight_err)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none"
              >
                {[1, 2, 3, 4, 5].map((w) => (
                  <option key={w} value={w}>
                    {WEIGHT_LABELS[w]}
                  </option>
                ))}
              </select>
              {weight_err && (
                <span className="text-[11px] text-red-300">{weight_err}</span>
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
                    patch_row(idx, { rationale: e.target.value })
                  }
                  maxLength={500}
                  rows={2}
                  aria-invalid={Boolean(rationale_err)}
                  placeholder="e.g. I want to plan for a move to another state next year."
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-violet-400 focus:outline-none"
                />
                {rationale_err && (
                  <span className="text-[11px] text-red-300">
                    {rationale_err}
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

      {submit_error && (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-[12px] text-red-200"
        >
          {submit_error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-5 py-3 text-sm font-semibold text-[#050508] shadow-lg transition hover:brightness-110 disabled:opacity-60"
      >
        {submitting ? "Sending…" : "See my re-ranked recommendations"}
      </button>
    </form>
  );
}
