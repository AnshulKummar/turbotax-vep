/**
 * 50-rule deterministic tax corpus.
 *
 * Per ADR-003, this corpus is the source of truth for mechanically
 * detectable errors. The LLM layer ranks and explains the findings this
 * file produces; it is NOT allowed to invent findings outside of it.
 *
 * Rule counts by category (totals to 50):
 *
 *   wash sale                 3
 *   HSA (Form 8889)           4
 *   RSU reconciliation        4
 *   passive activity loss     4
 *   depreciation              4
 *   foreign tax credit        3
 *   SALT cap                  3
 *   retirement contribution   5
 *   state PTET election       3
 *   §121 home sale            3
 *   credit eligibility        6
 *   AMT                       4
 *   estimated tax safe harbor 4
 *   ------------------------- --
 *   TOTAL                     50
 */

import type { DollarImpact, Rule, RuleFinding, TaxReturn } from "@/contracts";

import { amt_rules } from "./amt";
import { credit_rules } from "./credits";
import { depreciation_rules } from "./depreciation";
import { estimated_tax_rules } from "./estimated-tax";
import { foreign_tax_credit_rules } from "./foreign-tax-credit";
import { hsa_rules } from "./hsa";
import { passive_activity_rules } from "./passive-activity";
import { ptet_rules } from "./ptet";
import { retirement_rules } from "./retirement";
import { rsu_rules } from "./rsu";
import { salt_cap_rules } from "./salt-cap";
import { section_121_rules } from "./section-121";
import { wash_sale_rules } from "./wash-sale";

export const tax_rules: Rule[] = [
  ...wash_sale_rules,
  ...hsa_rules,
  ...rsu_rules,
  ...passive_activity_rules,
  ...depreciation_rules,
  ...foreign_tax_credit_rules,
  ...salt_cap_rules,
  ...retirement_rules,
  ...ptet_rules,
  ...section_121_rules,
  ...credit_rules,
  ...amt_rules,
  ...estimated_tax_rules,
];

/** Convenience: run every rule against a return and return all findings. */
export function evaluate_all(return_data: TaxReturn): RuleFinding[] {
  const all: RuleFinding[] = [];
  for (const rule of tax_rules) {
    all.push(...rule.evaluate(return_data));
  }
  return all;
}

/**
 * Dollar impact re-estimation. Agent 2 may call this after filtering a
 * subset of findings; for now it returns the finding's own
 * dollar_impact since the rule module is fully deterministic.
 */
export function estimate_dollar_impact(finding: RuleFinding): DollarImpact {
  return finding.dollar_impact;
}

/** The rule IDs the Mitchell hero return is expected to fire. */
export const MITCHELL_EXPECTED_RULE_IDS = [
  "rsu-double-count-001",
  "wash-sale-code-w-001",
  "hsa-8889-reconcile-001",
  "depreciation-land-split-001",
  "passive-469-agi-phaseout-001",
  "salt-cap-tcja-2025-001",
  "ptet-election-il-001",
  "retirement-401k-headroom-003",
] as const;
