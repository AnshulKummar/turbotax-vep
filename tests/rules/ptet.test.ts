import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { ScheduleK1 } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const passthrough_k1: ScheduleK1 = {
  partnership_name: "Test LP",
  partnership_ein: "99-9999999",
  partner: dummy_person,
  is_passive: true,
  ordinary_business_income: -2_000,
  rental_real_estate_income: 0,
  interest_income: 0,
  dividend_income: 0,
  guaranteed_payments: 0,
  section_179_deduction: 0,
};

describe("ptet-election-il-001", () => {
  const rule = get("ptet-election-il-001");
  it("fires when IL slice is PTET-eligible and K-1 passthrough income exists", () => {
    const findings = rule.evaluate(
      make_return({
        k1s: [passthrough_k1],
        state_returns: [
          {
            state: "IL",
            residency: "resident",
            state_wages: 0,
            state_withholding: 0,
            ptet_election_eligible: true,
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when no K-1 passthrough income exists", () => {
    expect(
      rule.evaluate(
        make_return({
          state_returns: [
            {
              state: "IL",
              residency: "resident",
              state_wages: 0,
              state_withholding: 0,
              ptet_election_eligible: true,
            },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("ptet-election-ca-002", () => {
  const rule = get("ptet-election-ca-002");
  it("fires when CA slice is PTET-eligible", () => {
    const findings = rule.evaluate(
      make_return({
        k1s: [passthrough_k1],
        state_returns: [
          {
            state: "CA",
            residency: "non_resident",
            state_wages: 0,
            state_withholding: 0,
            ptet_election_eligible: true,
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when CA slice is not PTET-eligible", () => {
    expect(
      rule.evaluate(
        make_return({
          k1s: [passthrough_k1],
          state_returns: [
            {
              state: "CA",
              residency: "non_resident",
              state_wages: 0,
              state_withholding: 0,
              ptet_election_eligible: false,
            },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});

describe("ptet-apportionment-003", () => {
  const rule = get("ptet-apportionment-003");
  it("fires when 2+ PTET-eligible states exist and K-1 exists", () => {
    const findings = rule.evaluate(
      make_return({
        k1s: [passthrough_k1],
        state_returns: [
          {
            state: "IL",
            residency: "resident",
            state_wages: 0,
            state_withholding: 0,
            ptet_election_eligible: true,
          },
          {
            state: "CA",
            residency: "non_resident",
            state_wages: 0,
            state_withholding: 0,
            ptet_election_eligible: true,
          },
        ],
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire with only one PTET-eligible state", () => {
    expect(
      rule.evaluate(
        make_return({
          k1s: [passthrough_k1],
          state_returns: [
            {
              state: "IL",
              residency: "resident",
              state_wages: 0,
              state_withholding: 0,
              ptet_election_eligible: true,
            },
          ],
        }),
      ),
    ).toHaveLength(0);
  });
});
