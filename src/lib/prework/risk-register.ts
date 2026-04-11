/**
 * Risk register builder for the Pre-Work Engine (B3 mock).
 *
 * Takes the raw findings produced by the 50-rule deterministic corpus
 * (passed in — we do NOT call `evaluate_all` directly from here; the API
 * route injects the findings to keep the dependency clean) and produces
 * a ranked list of up to 10 entries suitable for the workbench sidebar.
 *
 * Ranking is `severity * dollar_impact_estimate` descending, with the
 * audit-risk magnitude as a deterministic tiebreaker so two findings
 * with identical severity×impact sort consistently across runs.
 *
 * Deduping: if the same `rule_id` fires multiple times (e.g. 401(k)
 * headroom for both Olivia and Ryan), we keep the finding with the
 * highest individual `severity * dollar_impact_estimate` and drop the
 * rest, so no single rule dominates the top 10.
 */

import type {
  RiskRegisterEntry,
  RuleFinding,
  TaxReturn,
} from "@/contracts";

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

function priority_score(f: RuleFinding): number {
  return f.severity * f.dollar_impact.estimate;
}

function compare_findings(a: RuleFinding, b: RuleFinding): number {
  const delta = priority_score(b) - priority_score(a);
  if (delta !== 0) return delta;
  // Tiebreaker: larger audit-risk magnitude first. Stable fallback on ID.
  const audit = Math.abs(b.audit_risk_delta) - Math.abs(a.audit_risk_delta);
  if (audit !== 0) return audit;
  return a.finding_id.localeCompare(b.finding_id);
}

// ---------------------------------------------------------------------------
// Dedup: one entry per rule_id, highest-scoring wins
// ---------------------------------------------------------------------------

function dedupe_by_rule_id(findings: RuleFinding[]): RuleFinding[] {
  const best = new Map<string, RuleFinding>();
  for (const f of findings) {
    const existing = best.get(f.rule_id);
    if (!existing || compare_findings(f, existing) < 0) {
      best.set(f.rule_id, f);
    }
  }
  return Array.from(best.values());
}

// ---------------------------------------------------------------------------
// Entry construction
// ---------------------------------------------------------------------------

const MAX_ENTRIES = 10;

function to_entry(
  finding: RuleFinding,
  rank: number,
): RiskRegisterEntry {
  return {
    id: `risk-${rank}-${finding.finding_id}`,
    rule_id: finding.rule_id,
    severity: finding.severity,
    dollar_impact_estimate: finding.dollar_impact.estimate,
    audit_risk_delta: finding.audit_risk_delta,
    irc_citation: finding.pub_citation
      ? `${finding.irc_citation} / ${finding.pub_citation}`
      : finding.irc_citation,
    one_line_summary: finding.summary,
    affected_lines: finding.affected_lines,
    rank,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Build a ranked risk register from rule findings.
 *
 * The first argument is the return the findings were computed against —
 * we accept it for future enhancements (e.g. complexity-aware boosting)
 * and to keep the signature stable across the contract, but the current
 * implementation does not read from it. Silencing the lint with a
 * void-reference on the parameter.
 */
export function build_risk_register(
  return_data: TaxReturn,
  rule_findings: RuleFinding[],
): RiskRegisterEntry[] {
  // Currently unused but accepted for signature stability — see above.
  void return_data;

  const deduped = dedupe_by_rule_id(rule_findings);
  const sorted = deduped.slice().sort(compare_findings);
  const top = sorted.slice(0, MAX_ENTRIES);
  return top.map((f, i) => to_entry(f, i + 1));
}
