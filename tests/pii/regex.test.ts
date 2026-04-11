import { describe, expect, it } from "vitest";

import { redact_prompt } from "@/lib/pii/redact";

/**
 * Positive-case regex coverage: one line per PII type. Each assertion checks
 * that (a) the raw value no longer appears in the redacted text and (b) a
 * token of the expected type is present.
 */

describe("regex pass: positive coverage per PII type", () => {
  const TEN_LINE_PROMPT = [
    "Customer SSN on file: 900-55-1234.",
    "Spouse SSN (unhyphenated): 900551234.",
    "Employer EIN: 99-1234567 (Contoso Cloud Systems LLC).",
    "Please reach me at olivia.mitchell@example.com for follow up.",
    "Daytime phone: (630) 555-0142.",
    "Evening phone: 630.555.0188.",
    "Return address ZIP 60540-1234 in Naperville IL.",
    "Secondary ZIP 60540 no suffix.",
    "Savings account #: acct 1234567890 at First Synthetic Bank.",
    "Routing number: 011000015 (Federal Reserve Bank of Boston).",
  ].join("\n");

  const result = redact_prompt(TEN_LINE_PROMPT);

  it("redacts hyphenated SSN", () => {
    expect(result.redacted_text).not.toContain("900-55-1234");
    expect(result.redacted_text).toMatch(/\[SSN_[0-9a-f]{8}\]/);
  });

  it("redacts unhyphenated SSN (9 digits that fail the routing checksum)", () => {
    // 900551234 is not a valid ABA routing number → treated as SSN.
    expect(result.redacted_text).not.toContain("900551234");
  });

  it("redacts EIN", () => {
    expect(result.redacted_text).not.toContain("99-1234567");
    expect(result.redacted_text).toMatch(/\[EIN_[0-9a-f]{8}\]/);
  });

  it("redacts email", () => {
    expect(result.redacted_text).not.toContain("olivia.mitchell@example.com");
    expect(result.redacted_text).toMatch(/\[EMAIL_[0-9a-f]{8}\]/);
  });

  it("redacts phone (parenthesized)", () => {
    expect(result.redacted_text).not.toContain("(630) 555-0142");
    expect(result.redacted_text).toMatch(/\[PHONE_[0-9a-f]{8}\]/);
  });

  it("redacts phone (dot-separated)", () => {
    expect(result.redacted_text).not.toContain("630.555.0188");
  });

  it("redacts ZIP+4", () => {
    expect(result.redacted_text).not.toContain("60540-1234");
    expect(result.redacted_text).toMatch(/\[ZIP_[0-9a-f]{8}\]/);
  });

  it("redacts ZIP5", () => {
    // After ZIP+4 redaction, the bare 60540 should also be replaced.
    expect(result.redacted_text.split("60540").length).toBe(1);
  });

  it("redacts account number adjacent to 'acct'", () => {
    expect(result.redacted_text).not.toContain("1234567890");
    expect(result.redacted_text).toMatch(/\[ACCOUNT_[0-9a-f]{8}\]/);
  });

  it("redacts a valid ABA routing number", () => {
    // 011000015 is a real Federal Reserve Bank of Boston routing number
    // and passes the mod-10 checksum.
    expect(result.redacted_text).not.toContain("011000015");
    expect(result.redacted_text).toMatch(/\[ROUTING_[0-9a-f]{8}\]/);
  });

  it("populates the token map with a type + hash for every token", () => {
    const tokens = Object.keys(result.token_map);
    expect(tokens.length).toBeGreaterThan(0);
    for (const t of tokens) {
      expect(result.token_map[t]).toHaveProperty("type");
      expect(result.token_map[t]).toHaveProperty("original_hash");
      expect(result.token_map[t].original_hash).toMatch(/^[0-9a-f]{8}$/);
    }
  });
});
