import { describe, expect, it } from "vitest";

import { tax_rules } from "@/lib/rules";
import type { Form1099Div } from "@/contracts";

import { dummy_person, make_return } from "./fixtures";

const get = (id: string) => {
  const r = tax_rules.find((x) => x.id === id);
  if (!r) throw new Error(`rule not found: ${id}`);
  return r;
};

const div = (ftc: number): Form1099Div => ({
  payer_name: "Test Brokerage",
  payer_ein: "99-0000001",
  recipient: dummy_person,
  ordinary_dividends: 1_000,
  qualified_dividends: 800,
  capital_gain_distributions: 0,
  foreign_tax_paid: ftc,
});

describe("ftc-form-1116-required-001", () => {
  const rule = get("ftc-form-1116-required-001");
  it("fires when MFJ foreign tax > $600", () => {
    expect(rule.evaluate(make_return({ form_1099_div: [div(900)] }))).toHaveLength(1);
  });
  it("does not fire at $300 MFJ", () => {
    expect(rule.evaluate(make_return({ form_1099_div: [div(300)] }))).toHaveLength(0);
  });
});

describe("ftc-small-election-002", () => {
  const rule = get("ftc-small-election-002");
  it("fires when foreign tax <= $600 MFJ", () => {
    expect(rule.evaluate(make_return({ form_1099_div: [div(250)] }))).toHaveLength(1);
  });
  it("does not fire when over the threshold", () => {
    expect(rule.evaluate(make_return({ form_1099_div: [div(900)] }))).toHaveLength(0);
  });
});

describe("ftc-country-by-country-003", () => {
  const rule = get("ftc-country-by-country-003");
  it("fires on 2+ 1099-DIVs with significant FTC", () => {
    expect(
      rule.evaluate(
        make_return({ form_1099_div: [div(900), div(100)] }),
      ),
    ).toHaveLength(1);
  });
  it("does not fire with a single 1099-DIV", () => {
    expect(rule.evaluate(make_return({ form_1099_div: [div(900)] }))).toHaveLength(0);
  });
});
