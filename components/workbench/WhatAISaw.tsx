import type { RedactedPrompt } from "../../src/contracts";
import { Panel } from "./Panel";

interface WhatAISawProps {
  prompt: RedactedPrompt;
  /** The recommendation this redacted prompt belongs to, for header context. */
  recommendationHeadline?: string;
}

/**
 * "What AI saw" panel.
 * Shows the fully redacted prompt that was sent to the LLM so the
 * expert can verify no real PII leaked. Tokens of the form
 * [TYPE_HASH8] are highlighted so they are visually obvious.
 */
export function WhatAISaw({
  prompt,
  recommendationHeadline,
}: WhatAISawProps) {
  const tokenRegex = /\[(SSN|EIN|ACCOUNT|ROUTING|EMAIL|PHONE|ADDRESS|ZIP|DOB|PERSON_NAME)_[0-9a-f]{8,}\]/g;

  // Split the redacted text into an array of plain strings + token matches
  const parts: Array<{ kind: "text" | "token"; value: string }> = [];
  let lastIdx = 0;
  let match: RegExpExecArray | null;
  while ((match = tokenRegex.exec(prompt.redacted_text)) !== null) {
    if (match.index > lastIdx) {
      parts.push({
        kind: "text",
        value: prompt.redacted_text.slice(lastIdx, match.index),
      });
    }
    parts.push({ kind: "token", value: match[0] });
    lastIdx = match.index + match[0].length;
  }
  if (lastIdx < prompt.redacted_text.length) {
    parts.push({ kind: "text", value: prompt.redacted_text.slice(lastIdx) });
  }

  const tokenCount = Object.keys(prompt.token_map).length;

  return (
    <Panel
      title="What AI saw"
      subtitle={
        recommendationHeadline
          ? `Redacted prompt for: ${recommendationHeadline}`
          : "Redacted prompt for the most recent recommendation"
      }
      right={
        <span className="pill pill-cyan">
          {tokenCount} token{tokenCount === 1 ? "" : "s"} redacted
        </span>
      }
    >
      <div data-testid="what-ai-saw">
        <pre className="panel-scroll max-h-[300px] overflow-auto rounded-md border border-white/5 bg-black/30 p-3 font-mono text-[11px] leading-relaxed text-white/85 whitespace-pre-wrap">
          {parts.map((part, idx) =>
            part.kind === "token" ? (
              <span
                key={idx}
                className="rounded bg-violet-500/20 px-1 text-violet-200"
              >
                {part.value}
              </span>
            ) : (
              <span key={idx}>{part.value}</span>
            ),
          )}
        </pre>
        <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] text-[var(--muted-foreground)]">
          <div>
            <div className="uppercase tracking-wider">Session salt</div>
            <div className="mt-0.5 font-mono text-[11px] text-white/80">
              {prompt.session_salt}
            </div>
          </div>
          <div>
            <div className="uppercase tracking-wider">Redaction types</div>
            <div className="mt-0.5 flex flex-wrap gap-1">
              {Array.from(
                new Set(Object.values(prompt.token_map).map((v) => v.type)),
              ).map((t) => (
                <span
                  key={t}
                  className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </Panel>
  );
}
