import { describe, expect, it } from "vitest";

import { redact_prompt } from "@/lib/pii/redact";

/**
 * 10-prompt synthetic test set covering SSN, EIN, email, phone, ZIP,
 * account + routing. Each prompt must contain ZERO raw PII values in
 * its redacted form. Any leakage is a test failure.
 *
 * These are the eval-set prompts ADR-006 refers to; they exist solely
 * in this test file and are never persisted or logged.
 */

interface LeakageCase {
  name: string;
  prompt: string;
  /** Values that must NOT appear verbatim in the redacted output. */
  raw_pii: string[];
}

const cases: LeakageCase[] = [
  {
    name: "single-SSN",
    prompt: "Customer SSN is 901-23-4567. Please run the recommendations.",
    raw_pii: ["901-23-4567"],
  },
  {
    name: "multi-SSN-in-paragraph",
    prompt:
      "Olivia (SSN 900-55-1234) and Ryan (SSN 900-55-5678) file MFJ. Dependent Emma SSN 900-66-0001.",
    raw_pii: ["900-55-1234", "900-55-5678", "900-66-0001"],
  },
  {
    name: "unhyphenated-SSN",
    prompt: "Taxpayer provided SSN 123456780 on the intake form.",
    raw_pii: ["123456780"],
  },
  {
    name: "EIN-and-SSN-mixed",
    prompt:
      "Employer EIN 12-3456789 issued a W-2 to SSN 900-77-0001 for TY2025.",
    raw_pii: ["12-3456789", "900-77-0001"],
  },
  {
    name: "email-and-phone",
    prompt:
      "Reach the taxpayer at taxpayer.one@example.com or 415-555-0199 during business hours.",
    raw_pii: ["taxpayer.one@example.com", "415-555-0199"],
  },
  {
    name: "phone-variants",
    prompt:
      "Daytime (415) 555-0199, evening 415.555.0180, mobile +1 415 555 0161.",
    raw_pii: ["(415) 555-0199", "415.555.0180", "+1 415 555 0161"],
  },
  {
    name: "zip-variants",
    prompt:
      "Mailing address ZIP is 94107-1234. Prior address ZIP was 10001.",
    raw_pii: ["94107-1234", "10001"],
  },
  {
    name: "account-and-routing",
    prompt:
      "Direct deposit: account #123456789012 at routing 011000015 (verified).",
    raw_pii: ["123456789012", "011000015"],
  },
  {
    name: "mixed-line-breaks",
    prompt:
      "Taxpayer: Olivia Mitchell\nSSN: 900-55-1234\nEIN of employer: 99-1234567\nEmail: olivia@example.com",
    raw_pii: [
      "900-55-1234",
      "99-1234567",
      "olivia@example.com",
    ],
  },
  {
    name: "adjacent-SSNs",
    prompt:
      "Primary 900-11-2222 Spouse 900-33-4444 Dependent 900-55-6666 all confirmed.",
    raw_pii: ["900-11-2222", "900-33-4444", "900-55-6666"],
  },
];

describe("leakage: 10-prompt synthetic eval set has zero leakage", () => {
  for (const c of cases) {
    it(`case ${c.name}`, () => {
      const result = redact_prompt(c.prompt);
      for (const raw of c.raw_pii) {
        expect(
          result.redacted_text.includes(raw),
          `case "${c.name}" leaked "${raw}" — redacted_text was: ${result.redacted_text}`,
        ).toBe(false);
      }
      // Sanity: there must be at least one token for each case.
      expect(Object.keys(result.token_map).length).toBeGreaterThan(0);
    });
  }

  it("aggregate: across all 10 cases, zero raw PII values survive redaction", () => {
    let leaks = 0;
    for (const c of cases) {
      const result = redact_prompt(c.prompt);
      for (const raw of c.raw_pii) {
        if (result.redacted_text.includes(raw)) leaks += 1;
      }
    }
    expect(leaks).toBe(0);
  });
});
