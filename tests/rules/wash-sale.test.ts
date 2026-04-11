import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { BrokerageLot } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const make_lot = (overrides: Partial<BrokerageLot> & { lot_id: string }): BrokerageLot => ({
  description: "10 sh TEST",
  date_acquired: "2025-01-10",
  date_sold: "2025-03-15",
  proceeds: 1_000,
  cost_basis: 1_200,
  code: null,
  reported_to_irs: true,
  ...overrides,
});

describe("wash-sale-code-w-001", () => {
  const rule = get("wash-sale-code-w-001");

  it("fires when a lot has wash_sale_loss_disallowed > 0 and code != W", () => {
    const return_data = make_return({
      form_1099_b: [
        {
          payer_name: "Test Broker",
          payer_ein: "99-0000001",
          recipient: dummy_person,
          lots: [
            make_lot({
              lot_id: "L1",
              wash_sale_loss_disallowed: 500,
              code: null,
            }),
          ],
        },
      ],
    });
    const findings = rule.evaluate(return_data);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.category).toBe("wash_sale");
  });

  it("does not fire when the same lot has code W set", () => {
    const return_data = make_return({
      form_1099_b: [
        {
          payer_name: "Test Broker",
          payer_ein: "99-0000001",
          recipient: dummy_person,
          lots: [
            make_lot({
              lot_id: "L1",
              wash_sale_loss_disallowed: 500,
              code: "W",
            }),
          ],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });

  it("does not fire on an empty return", () => {
    expect(rule.evaluate(make_return({}))).toHaveLength(0);
  });
});

describe("wash-sale-window-30d-002", () => {
  const rule = get("wash-sale-window-30d-002");

  it("fires on a replacement purchase within 30 days after a loss sale", () => {
    const return_data = make_return({
      form_1099_b: [
        {
          payer_name: "Test Broker",
          payer_ein: "99-0000001",
          recipient: dummy_person,
          lots: [
            make_lot({
              lot_id: "SELL",
              description: "10 sh XYZ",
              date_sold: "2025-03-10",
              date_acquired: "2024-10-01",
              proceeds: 800,
              cost_basis: 1_200,
            }),
            make_lot({
              lot_id: "BUY",
              description: "10 sh XYZ",
              date_acquired: "2025-03-20",
              date_sold: "2025-12-01",
              proceeds: 900,
              cost_basis: 800,
            }),
          ],
        },
      ],
    });
    expect(rule.evaluate(return_data).length).toBeGreaterThanOrEqual(1);
  });

  it("does not fire when no replacement within window", () => {
    const return_data = make_return({
      form_1099_b: [
        {
          payer_name: "Test Broker",
          payer_ein: "99-0000001",
          recipient: dummy_person,
          lots: [
            make_lot({
              lot_id: "SELL",
              description: "10 sh XYZ",
              date_sold: "2025-03-10",
              proceeds: 800,
              cost_basis: 1_200,
            }),
          ],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });
});

describe("wash-sale-adjustment-003", () => {
  const rule = get("wash-sale-adjustment-003");

  it("fires when Code W is set but wash_sale_loss_disallowed is 0", () => {
    const return_data = make_return({
      form_1099_b: [
        {
          payer_name: "Test Broker",
          payer_ein: "99-0000001",
          recipient: dummy_person,
          lots: [
            make_lot({
              lot_id: "L1",
              code: "W",
              wash_sale_loss_disallowed: 0,
            }),
          ],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(1);
  });

  it("does not fire when Code W is set and adjustment is nonzero", () => {
    const return_data = make_return({
      form_1099_b: [
        {
          payer_name: "Test Broker",
          payer_ein: "99-0000001",
          recipient: dummy_person,
          lots: [
            make_lot({
              lot_id: "L1",
              code: "W",
              wash_sale_loss_disallowed: 500,
            }),
          ],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });
});
