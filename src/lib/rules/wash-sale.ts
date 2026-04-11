/**
 * Wash sale rules — IRC §1091, IRS Pub 550, Form 8949 column (f) Code W.
 *
 * When a broker reports a wash-sale-loss-disallowed amount on a 1099-B
 * lot, the preparer MUST propagate Code W to Form 8949 column (f) and
 * add back the disallowed loss on column (g). A common preparer error
 * is to silently net the disallowed loss into Schedule D without
 * leaving a trail, which leaves Form 8949 column (f) empty even though
 * the 1099-B data clearly shows a wash sale.
 */

import type { Rule, RuleFinding, TaxReturn } from "@/contracts";

import { dollar_impact, make_finding_id, NO_FINDINGS } from "./helpers";

// Rule 1 ---------------------------------------------------------------
const wash_sale_code_w_missing: Rule = {
  id: "wash-sale-code-w-001",
  name: "Wash sale Code W missing on Form 8949",
  category: "wash_sale",
  severity: 4,
  irc_citation: "IRC §1091",
  pub_citation: "IRS Pub 550",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const f of return_data.form_1099_b) {
      const bad = f.lots.filter(
        (l) => (l.wash_sale_loss_disallowed ?? 0) > 0 && l.code !== "W",
      );
      if (bad.length === 0) continue;
      const total = bad.reduce(
        (acc, l) => acc + (l.wash_sale_loss_disallowed ?? 0),
        0,
      );
      // Impact: the disallowed loss amount added back to basis on a
      // future sale. For the current year it is a compliance error
      // rather than a dollar loss, but the audit risk delta is real.
      findings.push({
        finding_id: make_finding_id(
          "wash-sale-code-w-001",
          bad.map((b) => b.lot_id).join("_"),
        ),
        rule_id: "wash-sale-code-w-001",
        category: "wash_sale",
        severity: 4,
        irc_citation: "IRC §1091",
        pub_citation: "IRS Pub 550",
        summary: `${bad.length} 1099-B lot(s) missing Code W on Form 8949 (disallowed loss $${total.toLocaleString()})`,
        detail:
          "The broker reported a wash sale loss disallowed amount on these lots, " +
          "but Form 8949 column (f) does not carry Code W and column (g) does not " +
          "add the disallowance back. IRC §1091 requires the disallowed loss to be " +
          "tracked and added to the replacement-lot basis. This is a mechanical " +
          "compliance error that routinely triggers IRS CP2000 notices because the " +
          "IRS wash-sale computer match sees the broker-reported amount and expects " +
          "it on the return.",
        affected_lines: bad.map((l) => `8949.row.${l.lot_id}`),
        dollar_impact: dollar_impact(Math.round(total * 0.25), 0.4),
        audit_risk_delta: 0.35,
      });
    }
    return findings;
  },
};

// Rule 2 ---------------------------------------------------------------
/**
 * Wash sale replacement window: §1091 covers purchases of substantially
 * identical securities within 30 days before or after the sale. This
 * rule looks for lot pairs where the sale of one lot at a loss is
 * followed by a purchase of an identically-described lot within 30
 * calendar days, and flags them as potentially missed wash sales even
 * if the broker did not already flag them.
 */
const wash_sale_window: Rule = {
  id: "wash-sale-window-30d-002",
  name: "Potential wash sale within ±30 day replacement window",
  category: "wash_sale",
  severity: 3,
  irc_citation: "IRC §1091(a)",
  pub_citation: "IRS Pub 550",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const f of return_data.form_1099_b) {
      for (const sell of f.lots) {
        const loss = sell.cost_basis - sell.proceeds;
        if (loss <= 0) continue;
        const sold_day = new Date(sell.date_sold).getTime();
        const window_ms = 30 * 24 * 60 * 60 * 1000;
        const replacement = f.lots.find(
          (other) =>
            other.lot_id !== sell.lot_id &&
            other.description === sell.description &&
            Math.abs(new Date(other.date_acquired).getTime() - sold_day) <=
              window_ms,
        );
        if (replacement && (sell.wash_sale_loss_disallowed ?? 0) === 0) {
          findings.push({
            finding_id: make_finding_id(
              "wash-sale-window-30d-002",
              sell.lot_id,
            ),
            rule_id: "wash-sale-window-30d-002",
            category: "wash_sale",
            severity: 3,
            irc_citation: "IRC §1091(a)",
            pub_citation: "IRS Pub 550",
            summary: `Possible missed wash sale on ${sell.description}`,
            detail:
              "A replacement purchase of an identically-described security " +
              "occurred within 30 days of this loss sale, but the broker did not " +
              "mark it as a wash sale. Review manually; some brokers do not match " +
              "wash sales across accounts.",
            affected_lines: [`8949.row.${sell.lot_id}`],
            dollar_impact: dollar_impact(Math.round(loss * 0.25), 0.5),
            audit_risk_delta: 0.15,
          });
        }
      }
    }
    return findings;
  },
};

// Rule 3 ---------------------------------------------------------------
/**
 * Form 8949 column (g) (adjustment amount) must equal the sum of
 * wash-sale-loss-disallowed for every lot with Code W. This rule
 * detects a preparer mistake where Code W is correctly set but the
 * adjustment amount is missing or zero.
 */
const wash_sale_adjustment_missing: Rule = {
  id: "wash-sale-adjustment-003",
  name: "Wash sale Code W set but column (g) adjustment is zero",
  category: "wash_sale",
  severity: 3,
  irc_citation: "IRC §1091",
  pub_citation: "IRS Pub 550",
  evaluate(return_data: TaxReturn): RuleFinding[] {
    const findings: RuleFinding[] = [];
    for (const f of return_data.form_1099_b) {
      for (const lot of f.lots) {
        if (
          lot.code === "W" &&
          (lot.wash_sale_loss_disallowed ?? 0) === 0
        ) {
          findings.push({
            finding_id: make_finding_id(
              "wash-sale-adjustment-003",
              lot.lot_id,
            ),
            rule_id: "wash-sale-adjustment-003",
            category: "wash_sale",
            severity: 3,
            irc_citation: "IRC §1091",
            pub_citation: "IRS Pub 550",
            summary: `Lot ${lot.lot_id} has Code W but no disallowed amount`,
            detail:
              "Form 8949 Code W requires a nonzero adjustment in column (g) equal " +
              "to the wash sale loss disallowed. This lot has Code W but column (g) " +
              "is zero, which is internally inconsistent.",
            affected_lines: [`8949.row.${lot.lot_id}`],
            dollar_impact: dollar_impact(200, 0.5),
            audit_risk_delta: 0.2,
          });
        }
      }
    }
    return NO_FINDINGS.concat(findings);
  },
};

export const wash_sale_rules: Rule[] = [
  wash_sale_code_w_missing,
  wash_sale_window,
  wash_sale_adjustment_missing,
];
