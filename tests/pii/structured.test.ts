import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import { redact_prompt } from "@/lib/pii/redact";

/**
 * The structured pass walks the TaxReturn and redacts every named PII
 * field. Runs the Mitchell hero return through a prompt that interpolates
 * SSNs / EINs / addresses and asserts they all disappear.
 */

function build_prompt_from_return(): string {
  const r = mitchell_return;
  const lines: string[] = [];
  lines.push(
    `Case ${r.case_id}: ${r.taxpayer.first_name} ${r.taxpayer.last_name} ` +
      `(SSN ${r.taxpayer.ssn}, DOB ${r.taxpayer.dob}).`,
  );
  if (r.spouse) {
    lines.push(
      `Spouse ${r.spouse.first_name} ${r.spouse.last_name}, SSN ${r.spouse.ssn}.`,
    );
  }
  for (const dep of r.dependents) {
    lines.push(`Dependent ${dep.first_name} ${dep.last_name} SSN ${dep.ssn}.`);
  }
  lines.push(`Home: ${r.address.line1}, ${r.address.city} ${r.address.zip}.`);
  for (const w2 of r.w2s) {
    lines.push(
      `W-2 employer ${w2.employer_name} EIN ${w2.employer_ein}, employee ${w2.employee.first_name} ${w2.employee.last_name} SSN ${w2.employee.ssn}.`,
    );
  }
  for (const k of r.k1s) {
    lines.push(
      `K-1 from ${k.partnership_name} EIN ${k.partnership_ein} to ${k.partner.first_name} ${k.partner.last_name} SSN ${k.partner.ssn}.`,
    );
  }
  for (const rp of r.rental_properties) {
    lines.push(
      `Rental ${rp.property_id} at ${rp.address.line1}, ${rp.address.city} ${rp.address.zip}.`,
    );
  }
  return lines.join("\n");
}

describe("structured pass: Mitchell return end-to-end", () => {
  const prompt = build_prompt_from_return();
  const result = redact_prompt(prompt, mitchell_return);

  it("removes every taxpayer/spouse/dependent SSN", () => {
    expect(result.redacted_text).not.toContain(mitchell_return.taxpayer.ssn);
    if (mitchell_return.spouse) {
      expect(result.redacted_text).not.toContain(mitchell_return.spouse.ssn);
    }
    for (const d of mitchell_return.dependents) {
      expect(result.redacted_text).not.toContain(d.ssn);
    }
  });

  it("removes every DOB", () => {
    expect(result.redacted_text).not.toContain(mitchell_return.taxpayer.dob);
  });

  it("removes every full name", () => {
    const t = mitchell_return.taxpayer;
    expect(result.redacted_text).not.toContain(`${t.first_name} ${t.last_name}`);
    expect(result.redacted_text).not.toContain(t.first_name);
    expect(result.redacted_text).not.toContain(t.last_name);
  });

  it("removes every EIN (W-2 employers, K-1 partnerships, 1099 payers)", () => {
    for (const w of mitchell_return.w2s) {
      expect(result.redacted_text).not.toContain(w.employer_ein);
    }
    for (const k of mitchell_return.k1s) {
      expect(result.redacted_text).not.toContain(k.partnership_ein);
    }
    for (const b of mitchell_return.form_1099_b) {
      expect(result.redacted_text).not.toContain(b.payer_ein);
    }
  });

  it("removes the home + rental addresses and ZIPs", () => {
    expect(result.redacted_text).not.toContain(mitchell_return.address.line1);
    expect(result.redacted_text).not.toContain(mitchell_return.address.zip);
    for (const rp of mitchell_return.rental_properties) {
      expect(result.redacted_text).not.toContain(rp.address.line1);
      expect(result.redacted_text).not.toContain(rp.address.zip);
    }
  });

  it("populates a non-empty token_map with structured tokens", () => {
    const types = new Set(
      Object.values(result.token_map).map((v) => v.type),
    );
    expect(types.has("SSN")).toBe(true);
    expect(types.has("EIN")).toBe(true);
    expect(types.has("ADDRESS")).toBe(true);
    expect(types.has("ZIP")).toBe(true);
    expect(types.has("PERSON_NAME")).toBe(true);
  });
});
