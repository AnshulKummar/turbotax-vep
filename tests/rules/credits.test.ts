import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { Person, W2 } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const child_under_13: Person = {
  id: "child-1",
  first_name: "Kiddo",
  last_name: "Test",
  ssn: "900-00-0001",
  dob: "2018-06-01",
};

const child_17_plus: Person = {
  id: "child-2",
  first_name: "Teen",
  last_name: "Test",
  ssn: "900-00-0002",
  dob: "2007-06-01",
};

const base_w2: W2 = {
  employer_name: "Test Co",
  employer_ein: "99-0000001",
  employee: dummy_person,
  box1_wages: 100_000,
  box2_fed_withholding: 10_000,
  box3_ss_wages: 100_000,
  box4_ss_withholding: 6_200,
  box5_medicare_wages: 100_000,
  box6_medicare_withholding: 1_450,
  box12: [],
  box14: [],
  state_wages: [],
};

describe("credit-ctc-001", () => {
  const rule = get("credit-ctc-001");
  it("fires when a qualifying child under 17 is present", () => {
    const findings = rule.evaluate(
      make_return({ dependents: [child_under_13], agi: 150_000 }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when no dependents are under 17", () => {
    expect(
      rule.evaluate(make_return({ dependents: [child_17_plus], agi: 150_000 })),
    ).toHaveLength(0);
  });
});

describe("credit-eitc-002", () => {
  const rule = get("credit-eitc-002");
  it("fires at low AGI", () => {
    expect(rule.evaluate(make_return({ agi: 30_000 }))).toHaveLength(1);
  });
  it("does not fire at high AGI", () => {
    expect(rule.evaluate(make_return({ agi: 300_000 }))).toHaveLength(0);
  });
});

describe("credit-aotc-003", () => {
  const rule = get("credit-aotc-003");
  const college_age: Person = {
    id: "child-c",
    first_name: "College",
    last_name: "Kid",
    ssn: "900-00-0003",
    dob: "2006-06-01",
  };
  it("fires when MFJ has a college-age dependent and AGI below ceiling", () => {
    expect(
      rule.evaluate(make_return({ dependents: [college_age], agi: 150_000 })),
    ).toHaveLength(1);
  });
  it("does not fire when AGI is above the ceiling", () => {
    expect(
      rule.evaluate(make_return({ dependents: [college_age], agi: 500_000 })),
    ).toHaveLength(0);
  });
});

describe("credit-llc-004", () => {
  const rule = get("credit-llc-004");
  it("fires when AGI is below phaseout ceiling", () => {
    expect(rule.evaluate(make_return({ agi: 150_000 }))).toHaveLength(1);
  });
  it("does not fire above the phaseout ceiling", () => {
    expect(rule.evaluate(make_return({ agi: 500_000 }))).toHaveLength(0);
  });
});

describe("credit-dependent-care-005", () => {
  const rule = get("credit-dependent-care-005");
  it("fires on MFJ with an under-13 dependent and two W-2s", () => {
    const findings = rule.evaluate(
      make_return({
        dependents: [child_under_13],
        w2s: [base_w2, { ...base_w2, employer_ein: "99-0000002" }],
      }),
    );
    expect(findings).toHaveLength(1);
  });
  it("does not fire when only one W-2 exists for MFJ", () => {
    expect(
      rule.evaluate(
        make_return({ dependents: [child_under_13], w2s: [base_w2] }),
      ),
    ).toHaveLength(0);
  });
});

describe("credit-ptc-reconcile-006", () => {
  const rule = get("credit-ptc-reconcile-006");
  it("fires at low AGI with no W-2", () => {
    expect(
      rule.evaluate(make_return({ agi: 50_000, w2s: [] })),
    ).toHaveLength(1);
  });
  it("does not fire at high AGI", () => {
    expect(
      rule.evaluate(make_return({ agi: 250_000, w2s: [] })),
    ).toHaveLength(0);
  });
});
