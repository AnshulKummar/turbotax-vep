/**
 * Recommendation engine — T-202 (Big Bet B1 anchor).
 *
 * Flow per ADR-003 "deterministic rules as the safety net":
 *
 *   1. Run the deterministic rules engine against the return.
 *   2. Build a single compact prompt containing the customer goals, the
 *      customer context, and the rule findings as JSON.
 *   3. Redact the prompt via @/lib/pii/redact (Agent 5 stub).
 *   4. Call Claude `claude-sonnet-4-6` exactly once with a system prompt
 *      that forbids inventing findings outside the rules engine output.
 *   5. Audit-capture the call and each recommendation via
 *      @/lib/audit/capture (Agent 5 stub).
 *   6. Parse the response JSON; drop any recommendation whose rule_id is
 *      not in the finding corpus (hallucination guard), OR mark it llm_only
 *      with finding_id: null and confidence capped at 0.5 per ADR-003.
 *   7. Score each recommendation via T-203 goal-fit, return.
 *
 * LLM cost discipline
 * -------------------
 * A single round trip against the Mitchell return sends ~4K input tokens
 * and receives ~2K output tokens (measured: ~3950 / ~1880 during cassette
 * record). At Sonnet 4.6 list pricing that is roughly $0.043 per call.
 * Tests replay from `tests/recommendations/cassettes/mitchell-rec-cassette.json`
 * unless RECORD_CASSETTES=1 is set — so the live cost is one-shot.
 */

import fs from "node:fs";
import path from "node:path";

import Anthropic from "@anthropic-ai/sdk";

import type {
  CustomerContext,
  Goal,
  Recommendation,
  RuleFinding,
  TaxReturn,
} from "@/contracts";
import {
  capture_llm_call,
  capture_recommendation,
} from "@/lib/audit/capture";
import { redact_prompt } from "@/lib/pii/redact";
import { evaluate_all, tax_rules } from "@/lib/rules";

import { score_recommendation } from "./goal-fit";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Model pinned per cost-discipline section of the agent brief. */
export const RECOMMENDATIONS_MODEL = "claude-sonnet-4-6" as const;

/** Maximum number of recommendations the LLM may return. */
const MAX_RECOMMENDATIONS = 12;

/** Default cap on llm_only recommendation confidence per ADR-003. */
const LLM_ONLY_CONFIDENCE_CAP = 0.5;

/** Default cassette path (committed under tests/recommendations/cassettes/). */
const DEFAULT_CASSETTE_PATH = path.resolve(
  process.cwd(),
  "tests/recommendations/cassettes/mitchell-rec-cassette.json",
);

/**
 * The canonical system prompt. It is deliberately short and blunt because
 * the real guardrail is the post-parse hallucination filter, not the
 * system prompt itself.
 */
const SYSTEM_PROMPT = [
  "You are the recommendation-ranking layer of a CPA-facing tax review",
  "workbench. A deterministic rules engine has already produced every",
  "mechanically detectable finding on this return.",
  "",
  "Your job is to RANK and EXPLAIN those findings against the customer's",
  "stated goals. You are not a tax detector. You are not allowed to invent",
  "findings the rules engine did not produce. You are not allowed to cite",
  "rule_ids that are not in the provided list. If you believe a finding is",
  "missing, you may add at most one item flagged llm_only=true and the",
  "reviewing expert will decide.",
  "",
  "Return STRICT JSON matching the schema in the user message. No prose, no",
  "code fences, no markdown. Use the exact rule_id strings provided.",
].join(" ");

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ProduceRecommendationsOptions {
  /** Override the Anthropic client — used by tests to inject a fake. */
  anthropic?: Anthropic;
  /** Override the cassette path — used by tests to use a fixture file. */
  cassette_path?: string;
  /**
   * If true, always call the live API and write a fresh cassette.
   * Defaults to `process.env.RECORD_CASSETTES === "1"`.
   */
  record?: boolean;
  /** Extra system-prompt adversarial text — used by the jailbreak test. */
  adversarial_system_prompt?: string;
}

export interface ProduceRecommendationsResult {
  recommendations: Recommendation[];
  audit_id: number;
}

/**
 * Run the full rule-first / LLM-second recommendation pipeline against a
 * return and return a ranked, goal-scored Recommendation[].
 */
export async function produce_recommendations(
  return_data: TaxReturn,
  goals: Goal[],
  customer_context: CustomerContext,
  options: ProduceRecommendationsOptions = {},
): Promise<ProduceRecommendationsResult> {
  // 1. Deterministic layer — produces the floor the LLM must rank.
  const findings = evaluate_all(return_data);
  const finding_by_id = new Map<string, RuleFinding>();
  for (const f of findings) finding_by_id.set(f.finding_id, f);
  const rule_id_set = new Set(tax_rules.map((r) => r.id));

  // 2. Build the prompt. The prompt is intentionally goal-AGNOSTIC per
  //    AD-S2-01: the LLM explains and ranks the findings on intrinsic
  //    severity / dollar impact only. All goal-aware re-ranking happens
  //    locally in `score_recommendation()` so a single cassette serves any
  //    visitor goal mix at $0 marginal cost.
  const user_prompt = build_user_prompt(findings, customer_context);

  // 3. Redact before it leaves the process.
  const redacted = redact_prompt(user_prompt, return_data);

  // 4. Either replay the cassette or call the live API.
  const record =
    options.record ?? process.env.RECORD_CASSETTES === "1";
  const cassette_path =
    options.cassette_path ?? DEFAULT_CASSETTE_PATH;

  let llm_text: string;
  if (!record && cassette_exists(cassette_path)) {
    llm_text = read_cassette(cassette_path);
  } else {
    llm_text = await call_anthropic(
      redacted.redacted_text,
      options.anthropic,
      options.adversarial_system_prompt,
    );
    // Write the cassette BEFORE parsing — that way a parsing failure still
    // leaves the raw response on disk for inspection, and re-running the
    // test in replay mode gives you the same response to debug against.
    write_cassette(cassette_path, llm_text);
  }

  // 5. Audit the call — every LLM round trip lands in the trail.
  const audit_id = await capture_llm_call(
    customer_context.case_id,
    RECOMMENDATIONS_MODEL,
    redacted,
    summarize_for_audit(llm_text),
  );

  // 6. Parse + hallucination filter + goal-fit scoring.
  const parsed = parse_llm_response(llm_text);
  const recommendations = build_recommendations(
    parsed,
    findings,
    finding_by_id,
    rule_id_set,
    goals,
    audit_id,
  );

  // 7. Capture each produced recommendation in the audit trail.
  for (const rec of recommendations) {
    await capture_recommendation(customer_context.case_id, rec);
  }

  return { recommendations, audit_id };
}

// ---------------------------------------------------------------------------
// Prompt construction
// ---------------------------------------------------------------------------

function build_user_prompt(
  findings: RuleFinding[],
  ctx: CustomerContext,
): string {
  const finding_blobs = findings.map((f) => ({
    finding_id: f.finding_id,
    rule_id: f.rule_id,
    category: f.category,
    severity: f.severity,
    irc_citation: f.irc_citation,
    pub_citation: f.pub_citation,
    summary: f.summary,
    detail: f.detail,
    affected_lines: f.affected_lines,
    dollar_impact: f.dollar_impact,
    audit_risk_delta: f.audit_risk_delta,
  }));

  return `CASE ${ctx.case_id} — ${ctx.customer_display_name}

CUSTOMER CONTEXT:
  prior year summary : ${ctx.prior_year_summary ?? "(none)"}
  prior expert notes : ${ctx.prior_expert_notes ?? "(none)"}

RULE ENGINE FINDINGS (the ONLY findings you may reference by rule_id/finding_id):
${JSON.stringify(finding_blobs, null, 2)}

TASK
Explain each rule-engine finding in plain language for the reviewing CPA.
Order the items by intrinsic severity, dollar impact, and audit-risk delta —
do NOT attempt to order by any customer goal vector. A downstream
deterministic scorer re-ranks the list against the visitor's goal mix.

Return a strict-JSON object with this shape:

{
  "recommendations": [
    {
      "rule_id": "string, must be one of the rule_ids above OR null for llm_only",
      "finding_id": "string, must be one of the finding_ids above OR null for llm_only",
      "one_line_summary": "string, max 140 chars",
      "detail": "string, plain language, max 350 chars",
      "confidence": "number in [0, 1], calibrated",
      "llm_only": "boolean — set true only if rule_id is null"
    }
  ]
}

Requirements:
- Return up to ${MAX_RECOMMENDATIONS} items.
- Every non-llm_only item MUST reference a real rule_id and finding_id from
  the list above.
- If you want to surface something not in the list, set rule_id=null,
  finding_id=null, llm_only=true, and confidence<=0.5.
- Do NOT emit goal_fits, composite_goal_fit, goal_alignment_note, or any
  other goal-related field. Goal-aware ranking happens after this call.
- Do not emit any fields other than the ones listed. No markdown. No code fences.`;
}

// ---------------------------------------------------------------------------
// LLM call
// ---------------------------------------------------------------------------

async function call_anthropic(
  redacted_text: string,
  injected_client: Anthropic | undefined,
  adversarial_system_prompt: string | undefined,
): Promise<string> {
  const client = injected_client ?? new Anthropic({
    apiKey: read_api_key(),
  });

  const system_prompt =
    adversarial_system_prompt !== undefined
      ? `${SYSTEM_PROMPT}\n\n${adversarial_system_prompt}`
      : SYSTEM_PROMPT;

  const response = await client.messages.create({
    model: RECOMMENDATIONS_MODEL,
    // 8192 is the sweet spot — large enough to fit 12+ ranked recs with
    // 600-char details, small enough to keep a single round trip under
    // ~$0.08 at Sonnet 4.6 list pricing.
    max_tokens: 8192,
    system: system_prompt,
    messages: [{ role: "user", content: redacted_text }],
  });

  // Claude returns an array of content blocks; concatenate the text ones.
  const text_blocks: string[] = [];
  for (const block of response.content) {
    if (block.type === "text") text_blocks.push(block.text);
  }
  return text_blocks.join("\n").trim();
}

function read_api_key(): string {
  const env_key = process.env.ANTHROPIC_API_KEY;
  if (env_key && env_key.length > 0) return env_key;
  // Fall back to reading .env.local directly — Next.js App Router runtime
  // does not auto-load .env.local for route handlers in dev.
  try {
    const raw = fs.readFileSync(
      path.resolve(process.cwd(), ".env.local"),
      "utf8",
    );
    for (const line of raw.split(/\r?\n/)) {
      const m = line.match(/^ANTHROPIC_API_KEY=(.+)$/);
      if (m) return m[1].trim().replace(/^['"]|['"]$/g, "");
    }
  } catch {
    // fall through
  }
  throw new Error(
    "ANTHROPIC_API_KEY is not set. Populate .env.local or the environment.",
  );
}

// ---------------------------------------------------------------------------
// Cassette helpers
// ---------------------------------------------------------------------------

function cassette_exists(p: string): boolean {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function read_cassette(p: string): string {
  const raw = fs.readFileSync(p, "utf8");
  const parsed = JSON.parse(raw) as { llm_text: string };
  return parsed.llm_text;
}

function write_cassette(p: string, llm_text: string): void {
  try {
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(
      p,
      JSON.stringify(
        {
          recorded_at: new Date().toISOString(),
          model: RECOMMENDATIONS_MODEL,
          llm_text,
        },
        null,
        2,
      ),
      "utf8",
    );
  } catch (err) {
    // Writing the cassette is a best-effort optimisation; if it fails we
    // still want the engine to return the recommendations it already built.
    // eslint-disable-next-line no-console
    console.warn(`[engine] cassette write failed at ${p}:`, err);
  }
}

// ---------------------------------------------------------------------------
// Response parsing + hallucination filtering
// ---------------------------------------------------------------------------

interface ParsedLLMRecommendation {
  rule_id: string | null;
  finding_id: string | null;
  one_line_summary: string;
  detail: string;
  confidence: number;
  llm_only: boolean;
}

function parse_llm_response(llm_text: string): ParsedLLMRecommendation[] {
  // Strip any accidental ```json``` fencing and whitespace.
  const stripped = llm_text
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let payload: unknown;
  try {
    payload = JSON.parse(stripped);
  } catch {
    // Fall back to extracting the first JSON object in the text.
    const first = stripped.indexOf("{");
    const last = stripped.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        payload = JSON.parse(stripped.slice(first, last + 1));
      } catch (inner) {
        throw new Error(
          `LLM response is not valid JSON: ${(inner as Error).message}`,
        );
      }
    } else {
      throw new Error("LLM response is not valid JSON and contains no object.");
    }
  }

  if (typeof payload !== "object" || payload === null) {
    throw new Error("LLM response is not a JSON object.");
  }
  const obj = payload as { recommendations?: unknown };
  if (!Array.isArray(obj.recommendations)) {
    throw new Error("LLM response is missing a 'recommendations' array.");
  }

  const recs: ParsedLLMRecommendation[] = [];
  for (const raw of obj.recommendations) {
    if (typeof raw !== "object" || raw === null) continue;
    const item = raw as Record<string, unknown>;
    // NOTE: any `goal_fits`, `composite_goal_fit`, or `goal_alignment_note`
    // fields the LLM may emit are deliberately ignored here. Per AD-S2-01
    // the local goal-fit scorer is the sole source of goal-aware ranking.
    recs.push({
      rule_id: typeof item.rule_id === "string" ? item.rule_id : null,
      finding_id:
        typeof item.finding_id === "string" ? item.finding_id : null,
      one_line_summary:
        typeof item.one_line_summary === "string"
          ? item.one_line_summary
          : "",
      detail: typeof item.detail === "string" ? item.detail : "",
      confidence:
        typeof item.confidence === "number" ? item.confidence : 0.5,
      llm_only: item.llm_only === true,
    });
  }
  return recs;
}

function build_recommendations(
  parsed: ParsedLLMRecommendation[],
  findings: RuleFinding[],
  finding_by_id: Map<string, RuleFinding>,
  rule_id_set: Set<string>,
  goals: Goal[],
  audit_id: number,
): Recommendation[] {
  const out: Recommendation[] = [];
  const seen_finding_ids = new Set<string>();

  for (let i = 0; i < parsed.length; i++) {
    const p = parsed[i];
    // Resolve the finding — match on finding_id first, then fall back to
    // rule_id (the LLM sometimes omits the finding_id when there is only
    // one finding per rule).
    let finding: RuleFinding | undefined;
    if (p.finding_id) finding = finding_by_id.get(p.finding_id);
    if (!finding && p.rule_id) {
      finding = findings.find((f) => f.rule_id === p.rule_id);
    }

    if (finding) {
      // Real finding path — clamp confidence into [0, 1] and attach it.
      if (seen_finding_ids.has(finding.finding_id)) continue; // dedupe
      seen_finding_ids.add(finding.finding_id);
      const scoring = score_recommendation(
        {
          category: finding.category,
          dollar_impact: finding.dollar_impact,
          audit_risk_delta: finding.audit_risk_delta,
        },
        goals,
      );
      out.push({
        id: `rec-${String(i + 1).padStart(3, "0")}-${finding.finding_id}`,
        rule_id: finding.rule_id,
        finding_id: finding.finding_id,
        category: finding.category,
        severity: finding.severity,
        irc_citation: finding.irc_citation,
        pub_citation: finding.pub_citation,
        one_line_summary: p.one_line_summary || finding.summary,
        detail: p.detail || finding.detail,
        affected_lines: finding.affected_lines,
        dollar_impact: finding.dollar_impact,
        audit_risk_delta: finding.audit_risk_delta,
        goal_fits: scoring.goal_fits,
        composite_goal_fit: scoring.composite,
        confidence: clamp01(p.confidence),
        llm_only: false,
        audit_id: String(audit_id),
      });
    } else {
      // llm_only path — allowed but confidence capped at 0.5 per ADR-003.
      // Reject if the LLM cited a rule_id that doesn't exist (hard
      // hallucination). If the LLM flagged llm_only=true and provided no
      // rule_id, pass it through.
      if (p.rule_id && !rule_id_set.has(p.rule_id)) {
        // Hard hallucinated rule citation — drop entirely.
        continue;
      }
      if (!p.llm_only) {
        // LLM tried to create a rule-backed rec that didn't resolve; drop.
        continue;
      }
      const scoring = score_recommendation(
        {
          // No finding → default to an audit_risk-neutral category bundle.
          // We pick credit_eligibility because its tags are broad enough to
          // still produce a non-zero fit for maximize_refund and plan_life_event.
          category: "credit_eligibility",
          dollar_impact: { estimate: 0, low: 0, high: 0 },
          audit_risk_delta: 0,
        },
        goals,
      );
      out.push({
        id: `rec-${String(i + 1).padStart(3, "0")}-llm-only`,
        rule_id: p.rule_id ?? "llm-only",
        finding_id: null,
        category: "credit_eligibility",
        severity: 2,
        irc_citation: "(no IRC citation — LLM advisory)",
        one_line_summary: p.one_line_summary || "LLM advisory (no rule backing)",
        detail: p.detail,
        affected_lines: [],
        dollar_impact: { estimate: 0, low: 0, high: 0 },
        audit_risk_delta: 0,
        goal_fits: scoring.goal_fits,
        composite_goal_fit: scoring.composite,
        confidence: Math.min(clamp01(p.confidence), LLM_ONLY_CONFIDENCE_CAP),
        llm_only: true,
        audit_id: String(audit_id),
      });
    }
  }

  // Backstop — if the LLM dropped real findings, synthesize fallbacks so
  // every rule finding is still represented with a defaulted narrative.
  // This is the "safety net" half of ADR-003 in action.
  for (const finding of findings) {
    if (seen_finding_ids.has(finding.finding_id)) continue;
    const scoring = score_recommendation(
      {
        category: finding.category,
        dollar_impact: finding.dollar_impact,
        audit_risk_delta: finding.audit_risk_delta,
      },
      goals,
    );
    out.push({
      id: `rec-fallback-${finding.finding_id}`,
      rule_id: finding.rule_id,
      finding_id: finding.finding_id,
      category: finding.category,
      severity: finding.severity,
      irc_citation: finding.irc_citation,
      pub_citation: finding.pub_citation,
      one_line_summary: finding.summary,
      detail: finding.detail,
      affected_lines: finding.affected_lines,
      dollar_impact: finding.dollar_impact,
      audit_risk_delta: finding.audit_risk_delta,
      goal_fits: scoring.goal_fits,
      composite_goal_fit: scoring.composite,
      // Fallback confidence is 0.7 — below LLM-ranked (0.8+) but above
      // llm_only (<=0.5). The rule fired, so we know the finding is real.
      confidence: 0.7,
      llm_only: false,
      audit_id: String(audit_id),
    });
    seen_finding_ids.add(finding.finding_id);
  }

  // Final ranking: composite goal fit * severity weighting.
  out.sort((a, b) => {
    const a_key = a.composite_goal_fit * a.severity + a.confidence;
    const b_key = b.composite_goal_fit * b.severity + b.confidence;
    return b_key - a_key;
  });

  return out;
}

function summarize_for_audit(llm_text: string): string {
  const trimmed = llm_text.trim();
  return trimmed.length > 240 ? `${trimmed.slice(0, 240)}…` : trimmed;
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
