import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { BrokerageLot, W2 } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const base_w2: W2 = {
  employer_name: "Test Co",
  employer_ein: "99-0000001",
  employee: dummy_person,
  box1_wages: 100_000,
  box2_fed_withholding: 20_000,
  box3_ss_wages: 100_000,
  box4_ss_withholding: 6_200,
  box5_medicare_wages: 100_000,
  box6_medicare_withholding: 1_450,
  box12: [],
  box14: [],
  state_wages: [],
};

describe("rsu-double-count-001", () => {
  const rule = get("rsu-double-count-001");
  it("fires when W-2 has code V and 1099-B has same-day 0-basis lots", () => {
    const lots: BrokerageLot[] = [
      {
        lot_id: "R1",
        description: "50 sh TST (RSU)",
        date_acquired: "2025-05-15",
        date_sold: "2025-05-15",
        proceeds: 20_000,
        cost_basis: 0,
        code: null,
        reported_to_irs: true,
      },
    ];
    const return_data = make_return({
      w2s: [{ ...base_w2, box12: [{ code: "V", amount: 20_000 }] }],
      form_1099_b: [
        {
          payer_name: "Broker",
          payer_ein: "99-1111111",
          recipient: dummy_person,
          lots,
        },
      ],
      agi: 200_000,
    });
    expect(rule.evaluate(return_data)).toHaveLength(1);
  });

  it("does not fire when cost basis matches proceeds", () => {
    const lots: BrokerageLot[] = [
      {
        lot_id: "R1",
        description: "50 sh TST (RSU)",
        date_acquired: "2025-05-15",
        date_sold: "2025-05-15",
        proceeds: 20_000,
        cost_basis: 20_000,
        code: null,
        reported_to_irs: true,
      },
    ];
    const return_data = make_return({
      w2s: [{ ...base_w2, box12: [{ code: "V", amount: 20_000 }] }],
      form_1099_b: [
        {
          payer_name: "Broker",
          payer_ein: "99-1111111",
          recipient: dummy_person,
          lots,
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });
});

describe("rsu-box1-consistency-002", () => {
  const rule = get("rsu-box1-consistency-002");
  it("fires when Box 1 < code V amount", () => {
    const return_data = make_return({
      w2s: [
        {
          ...base_w2,
          box1_wages: 50_000,
          box12: [{ code: "V", amount: 80_000 }],
        },
      ],
      agi: 200_000,
    });
    expect(rule.evaluate(return_data)).toHaveLength(1);
  });
  it("does not fire when Box 1 >= code V", () => {
    const return_data = make_return({
      w2s: [
        {
          ...base_w2,
          box1_wages: 100_000,
          box12: [{ code: "V", amount: 20_000 }],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });
});

describe("rsu-missing-1099b-003", () => {
  const rule = get("rsu-missing-1099b-003");
  it("fires when W-2 has code V but no 1099-B on file", () => {
    const return_data = make_return({
      w2s: [{ ...base_w2, box12: [{ code: "V", amount: 30_000 }] }],
    });
    expect(rule.evaluate(return_data)).toHaveLength(1);
  });
  it("does not fire when a 1099-B exists", () => {
    const return_data = make_return({
      w2s: [{ ...base_w2, box12: [{ code: "V", amount: 30_000 }] }],
      form_1099_b: [
        {
          payer_name: "Broker",
          payer_ein: "99-1111111",
          recipient: dummy_person,
          lots: [],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });
});

describe("rsu-supplemental-withholding-004", () => {
  const rule = get("rsu-supplemental-withholding-004");
  it("fires on >$1M code V with low implied withholding rate", () => {
    const return_data = make_return({
      w2s: [
        {
          ...base_w2,
          box1_wages: 2_000_000,
          box2_fed_withholding: 400_000, // 20% implied
          box12: [{ code: "V", amount: 1_500_000 }],
        },
      ],
      agi: 2_000_000,
    });
    expect(rule.evaluate(return_data).length).toBeGreaterThanOrEqual(1);
  });
  it("does not fire when code V < $1M", () => {
    const return_data = make_return({
      w2s: [
        {
          ...base_w2,
          box1_wages: 200_000,
          box12: [{ code: "V", amount: 50_000 }],
        },
      ],
    });
    expect(rule.evaluate(return_data)).toHaveLength(0);
  });
});
