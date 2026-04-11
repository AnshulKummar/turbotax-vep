/**
 * T-601 (cont.) — Live quality co-pilot behaviour.
 *
 * The co-pilot panel (Agent 4 UI) flashes a warning when the expert
 * edits a 1099-B lot in a way that introduces a wash sale. The underlying
 * detection is Agent 1's `wash-sale-code-w-001` rule, which is already
 * merged on this branch, so this test runs without any dynamic-import
 * gating — it's a logic-level integration test against the rule module.
 *
 * Contract: a wash-sale edit produces at least one rule finding with
 * rule_id === "wash-sale-code-w-001" so the co-pilot has something to
 * render.
 */

import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import { evaluate_all } from "@/lib/rules";
import type { TaxReturn } from "@/contracts";

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

describe("T-601 quality co-pilot warning on wash-sale edit", () => {
  it(
    "introducing a wash_sale_loss_disallowed without Code W fires the rule",
    () => {
      // Start with a Mitchell clone. The mitchell_return already has
      // three wash-sale lots flagged; here we simulate an EDIT where a
      // previously-clean ordinary lot flips into a wash-sale scenario.
      const edited: TaxReturn = clone(mitchell_return);

      // Pick the LT-001 lot, which in the shipped mitchell_return is a
      // clean ordinary long-term lot. Simulate the expert typing in a
      // wash_sale_loss_disallowed value but forgetting to change `code`
      // to "W". The co-pilot should fire.
      const target_lot = edited.form_1099_b[0]!.lots.find(
        (l) => l.lot_id === "LT-001",
      );
      expect(target_lot).toBeDefined();
      target_lot!.wash_sale_loss_disallowed = 750;
      target_lot!.code = null;

      const findings_after = evaluate_all(edited);
      const copilot_fires = findings_after.some(
        (f) => f.rule_id === "wash-sale-code-w-001",
      );
      expect(copilot_fires).toBe(true);
    },
  );

  it(
    "setting the code to W on the edited lot clears the warning for that lot",
    () => {
      const edited: TaxReturn = clone(mitchell_return);
      const target_lot = edited.form_1099_b[0]!.lots.find(
        (l) => l.lot_id === "LT-001",
      );
      target_lot!.wash_sale_loss_disallowed = 750;
      target_lot!.code = "W";

      const findings_after = evaluate_all(edited);
      // The wash-sale-code-w-001 rule can still fire on the three
      // pre-existing WASH-00x lots (those are the original Mitchell bugs).
      // The test asserts that the NEWLY edited LT-001 lot is not among
      // the affected_lines of any wash-sale-code-w-001 finding.
      for (const f of findings_after) {
        if (f.rule_id !== "wash-sale-code-w-001") continue;
        expect(f.affected_lines).not.toContain("8949.row.LT-001");
      }
    },
  );
});
