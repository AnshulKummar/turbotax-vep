/**
 * RSU income reconciliation rules — IRC §83, IRS Pub 525.
 *
 * Covers the #1 mechanically detectable error in the public TurboTax
 * record: RSU vest income appearing on both W-2 Box 1 (via supplemental
 * wages, usually tagged with code V in Box 12) AND on the 1099-B (same-
 * day sell-to-cover with cost_basis = 0).
 *
 * The fix is to set the cost_basis on the 1099-B lot equal to the
 * Box 1 inclusion amount (usually proceeds), producing a near-zero
 * gain or loss on Schedule D.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import {
  dollar_impact,
  estimated_marginal_rate,
  is_mfj,
  make_finding_id,
} from "./helpers";

// Rule 8 ---------------------------------------------------------------
/**
 * Double-count detection — the headline rule.
 * Fires when there is a W-2 box 12 code V and 1099-B lots with basis
 * near zero on vest-date sales.
 */
const rsu_double_count: Rule = {
  id: "rsu-double-count-001",
  name: "RSU vest double-counted on W-2 Box 1 and 1099-B",
  category: "rsu",
  severity: 5,
  irc_citation: "IRC §83(a)",
  pub_citation: "IRS Pub 525",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    // Gather all W-2s that have a code V (RSU/NQSO income amount)
    const w2s_with_rsu = return_data.w2s.filter((w) =>
      w.box12.some((b) => b.code === "V"),
    );
    if (w2s_with_rsu.length === 0) return findings;

    for (const f of return_data.form_1099_b) {
      const suspect_lots = f.lots.filter(
        (l) =>
          l.date_acquired === l.date_sold &&
          l.cost_basis < l.proceeds * 0.05,
      );
      if (suspect_lots.length === 0) continue;
      const total_suspect_proceeds = suspect_lots.reduce(
        (acc, l) => acc + l.proceeds,
        0,
      );
      findings.push({
        finding_id: make_finding_id(
          "rsu-double-count-001",
          suspect_lots.map((l) => l.lot_id).join("_"),
        ),
        rule_id: "rsu-double-count-001",
        category: "rsu",
        severity: 5,
        irc_citation: "IRC §83(a)",
        pub_citation: "IRS Pub 525",
        summary: `${suspect_lots.length} RSU vest lot(s) with basis near $0 — likely double-counted`,
        detail:
          "The W-2 has a Box 12 code V (RSU / NQSO income) and the 1099-B has " +
          "same-day sale-to-cover lots with a cost basis near zero. RSU vest " +
          "income is already included in W-2 Box 1 wages; the 1099-B lot cost " +
          "basis should equal the Box 1 inclusion amount, not zero. Leaving the " +
          "basis at zero double-counts the vest as both wage income and a " +
          "capital gain. This is the single most common mechanically detectable " +
          "error in the public TurboTax record — a $3,200 refund delta is in " +
          "Intuit's own public record.",
        affected_lines: suspect_lots.map((l) => `8949.row.${l.lot_id}`),
        dollar_impact: dollar_impact(
          Math.round(
            total_suspect_proceeds *
              estimated_marginal_rate(
                return_data.agi ?? 0,
                is_mfj(return_data),
              ),
          ),
          0.2,
        ),
        audit_risk_delta: -0.2, // actually LOWERS audit risk because it
        // replaces an obviously wrong Schedule D with a correct one
      });
    }
    return findings;
  },
};

// Rule 9 ---------------------------------------------------------------
/**
 * W-2 box 1 should equal at least the sum of non-RSU wages plus the
 * code V amount. If Box 1 minus code V is smaller than box 3 (SS wages,
 * up to the wage base) minus code V, the W-2 is internally inconsistent.
 * This is a weaker rule — mostly catches bad W-2 data entry.
 */
const rsu_box1_consistency: Rule = {
  id: "rsu-box1-consistency-002",
  name: "W-2 Box 1 inconsistent with Box 12 code V RSU amount",
  category: "rsu",
  severity: 3,
  irc_citation: "IRC §83(a)",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const w of return_data.w2s) {
      const code_v = w.box12
        .filter((b) => b.code === "V")
        .reduce((acc, b) => acc + b.amount, 0);
      if (code_v === 0) continue;
      if (w.box1_wages < code_v) {
        findings.push({
          finding_id: make_finding_id(
            "rsu-box1-consistency-002",
            w.employee.id,
          ),
          rule_id: "rsu-box1-consistency-002",
          category: "rsu",
          severity: 3,
          irc_citation: "IRC §83(a)",
          summary: `${w.employee.first_name}: Box 1 ($${w.box1_wages}) is less than code V ($${code_v})`,
          detail:
            "W-2 Box 1 wages must include the code V RSU amount. If Box 1 is less " +
            "than code V, the W-2 data is internally inconsistent and the return " +
            "is under-reporting RSU income.",
          affected_lines: ["w2.box1", "w2.box12.V"],
          dollar_impact: dollar_impact(
            Math.round(
              (code_v - w.box1_wages) *
                estimated_marginal_rate(
                  return_data.agi ?? 0,
                  is_mfj(return_data),
                ),
            ),
          ),
          audit_risk_delta: 0.3,
        });
      }
    }
    return findings;
  },
};

// Rule 10 --------------------------------------------------------------
/**
 * Missing 1099-B for a vested RSU position. If the W-2 has a code V
 * amount but there is no 1099-B at all, the preparer is likely missing
 * the sale-to-cover broker report.
 */
const rsu_missing_1099b: Rule = {
  id: "rsu-missing-1099b-003",
  name: "W-2 code V present but no 1099-B on file",
  category: "rsu",
  severity: 4,
  irc_citation: "IRC §83(a)",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const has_rsu = return_data.w2s.some((w) =>
      w.box12.some((b) => b.code === "V"),
    );
    if (!has_rsu) return [];
    if (return_data.form_1099_b.length > 0) return [];
    const code_v_total = return_data.w2s
      .flatMap((w) => w.box12)
      .filter((b) => b.code === "V")
      .reduce((acc, b) => acc + b.amount, 0);
    return [
      {
        finding_id: make_finding_id("rsu-missing-1099b-003", "global"),
        rule_id: "rsu-missing-1099b-003",
        category: "rsu",
        severity: 4,
        irc_citation: "IRC §83(a)",
        summary: "RSU vest on W-2 but no 1099-B on file",
        detail:
          "The W-2 reports a code V RSU amount but no 1099-B is on file. A " +
          "sale-to-cover is almost always present; the preparer should request " +
          "the broker 1099-B and reconcile it.",
        affected_lines: ["w2.box12.V"],
        dollar_impact: dollar_impact(Math.round(code_v_total * 0.05)),
        audit_risk_delta: 0.3,
      },
    ];
  },
};

// Rule 11 --------------------------------------------------------------
/**
 * Supplemental flat withholding on RSU vest is 22% federal up to $1M of
 * supplemental wages per year, then 37%. If code V exceeds $1M and Box
 * 2 withholding appears to be only 22%, flag it.
 */
const rsu_supplemental_withholding: Rule = {
  id: "rsu-supplemental-withholding-004",
  name: "RSU supplemental withholding may be under the 37% rate",
  category: "rsu",
  severity: 2,
  irc_citation: "IRC §3402(g)",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const w of return_data.w2s) {
      const code_v = w.box12
        .filter((b) => b.code === "V")
        .reduce((acc, b) => acc + b.amount, 0);
      if (code_v <= 1_000_000) continue;
      const implied_rate = w.box2_fed_withholding / w.box1_wages;
      if (implied_rate < 0.3) {
        findings.push({
          finding_id: make_finding_id(
            "rsu-supplemental-withholding-004",
            w.employee.id,
          ),
          rule_id: "rsu-supplemental-withholding-004",
          category: "rsu",
          severity: 2,
          irc_citation: "IRC §3402(g)",
          summary: "Large RSU vest with possibly under-withheld supplemental tax",
          detail:
            "Code V exceeds $1M but Box 2 federal withholding looks lower than " +
            "the 37% mandatory supplemental rate for supplemental wages above " +
            "$1M. Estimated tax underpayment penalty is likely.",
          affected_lines: ["w2.box2", "w2.box12.V"],
          dollar_impact: dollar_impact(Math.round((0.37 - implied_rate) * code_v * 0.5)),
          audit_risk_delta: 0.1,
        });
      }
    }
    return findings;
  },
};

export const rsu_rules: Rule[] = [
  rsu_double_count,
  rsu_box1_consistency,
  rsu_missing_1099b,
  rsu_supplemental_withholding,
];
