"use client";

import { useState } from "react";
import type { LineId, MockedOCROutput } from "../../src/contracts";
import { Panel } from "./Panel";
import { confidenceColor, formatUsd } from "./lib/format";

interface ReturnSurfaceProps {
  ocr: MockedOCROutput;
  /** Called when the user edits a line value. The MVP only cares about the key. */
  onLineEdit?: (lineId: LineId, newValue: string) => void;
  /** Optional line labels for humans. */
  lineLabels?: Record<string, string>;
}

const DEFAULT_LINE_LABELS: Record<string, string> = {
  "1040.line.1a": "Form 1040 — Line 1a — Wages (W-2 box 1)",
  "1040.line.2b": "Form 1040 — Line 2b — Taxable interest",
  "1040.line.3a": "Form 1040 — Line 3a — Qualified dividends",
  "1040.line.3b": "Form 1040 — Line 3b — Ordinary dividends",
  "1040.line.7":
    "Form 1040 — Line 7 — Capital gain or (loss) (Schedule D)",
  "1040.line.11": "Form 1040 — Line 11 — Adjusted Gross Income",
  "1040.line.12": "Form 1040 — Line 12 — Itemized or standard deduction",
  "1040.line.24": "Form 1040 — Line 24 — Total tax",
  "schedule_e.line.26":
    "Schedule E — Line 26 — Total income or (loss) from rentals",
  "schedule_1.line.13":
    "Schedule 1 — Line 13 — HSA deduction (Form 8889)",
};

/**
 * Return Surface — the pre-populated 1040 and schedules.
 * Each field shows the value, a confidence bar, and a click-through
 * to a modal that shows the source document bbox.
 */
export function ReturnSurface({
  ocr,
  onLineEdit,
  lineLabels = DEFAULT_LINE_LABELS,
}: ReturnSurfaceProps) {
  const [openLine, setOpenLine] = useState<LineId | null>(null);
  const [editing, setEditing] = useState<LineId | null>(null);

  const fieldEntries = Object.entries(ocr.fields);
  const activeField = openLine ? ocr.fields[openLine] : null;

  return (
    <>
      <Panel
        title="Return surface"
        subtitle={`${fieldEntries.length} fields · click a line for provenance`}
        className="h-full"
        contentClassName="p-0"
      >
        <div className="panel-scroll max-h-[560px] overflow-y-auto">
          <table className="w-full text-[12px]">
            <thead className="sticky top-0 z-10 bg-[rgba(18,18,28,0.95)] backdrop-blur">
              <tr className="text-left text-[10px] uppercase tracking-wider text-[var(--muted-foreground)]">
                <th className="px-4 py-2 font-semibold">Line</th>
                <th className="px-4 py-2 font-semibold">Description</th>
                <th className="px-4 py-2 text-right font-semibold">Value</th>
                <th className="px-4 py-2 font-semibold">Confidence</th>
              </tr>
            </thead>
            <tbody>
              {fieldEntries.map(([lineId, field]) => {
                const color = confidenceColor(field.confidence);
                const label = lineLabels[lineId] ?? lineId;
                const isEditing = editing === lineId;
                const valueStr =
                  typeof field.value === "number"
                    ? formatUsd(field.value)
                    : String(field.value);
                return (
                  <tr
                    key={lineId}
                    className="border-t border-white/5 transition hover:bg-white/[0.02]"
                    data-testid={`return-line-${lineId}`}
                  >
                    <td className="px-4 py-2 font-mono text-[11px] text-[var(--muted-foreground)]">
                      {lineId}
                    </td>
                    <td className="px-4 py-2 text-white/80">
                      <button
                        type="button"
                        className="text-left hover:text-white"
                        onClick={() => setOpenLine(lineId)}
                      >
                        {label}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right font-mono">
                      {isEditing ? (
                        <input
                          autoFocus
                          defaultValue={valueStr}
                          onBlur={(e) => {
                            onLineEdit?.(lineId, e.currentTarget.value);
                            setEditing(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              onLineEdit?.(
                                lineId,
                                (e.target as HTMLInputElement).value,
                              );
                              setEditing(null);
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                          className="w-32 rounded border border-white/10 bg-white/[0.03] px-2 py-0.5 text-right font-mono text-white focus:border-violet-400 focus:outline-none"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditing(lineId)}
                          className="font-semibold text-white hover:text-violet-300"
                        >
                          {valueStr}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <div className="confidence-bar w-20">
                          <div
                            className="confidence-fill"
                            style={{
                              width: `${field.confidence * 100}%`,
                              background: color.bar,
                            }}
                          />
                        </div>
                        <span className={`text-[10px] ${color.text}`}>
                          {Math.round(field.confidence * 100)}%
                        </span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      {openLine && activeField && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-6 backdrop-blur"
          onClick={() => setOpenLine(null)}
          data-testid="source-modal"
        >
          <div
            className="glass-card max-w-xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-white">
                  {lineLabels[openLine] ?? openLine}
                </h3>
                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                  Source provenance from the OCR layer
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenLine(null)}
                className="text-[var(--muted-foreground)] hover:text-white"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4 text-[12px]">
              {activeField.source ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">
                      Document
                    </span>
                    <span className="font-mono text-white">
                      {activeField.source.source_document}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[var(--muted-foreground)]">Page</span>
                    <span className="font-mono text-white">
                      {activeField.source.page}
                    </span>
                  </div>
                  {activeField.source.bbox && (
                    <div className="flex justify-between">
                      <span className="text-[var(--muted-foreground)]">
                        BBox
                      </span>
                      <span className="font-mono text-white">
                        [{activeField.source.bbox.join(", ")}]
                      </span>
                    </div>
                  )}
                  <div className="mt-3 rounded-md border border-dashed border-white/10 bg-white/[0.02] p-6 text-center text-[11px] text-[var(--muted-foreground)]">
                    (PDF crop preview would render here in production)
                  </div>
                </div>
              ) : (
                <p className="text-[var(--muted-foreground)]">
                  No source document reference available for this line.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
