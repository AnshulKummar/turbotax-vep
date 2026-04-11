import { describe, expect, it } from "vitest";

import { redact_prompt } from "@/lib/pii/redact";

/**
 * Stability contract for token minting:
 *
 *   - Redacting the same SSN twice WITHIN THE SAME SESSION yields the same
 *     token (so the LLM can reason about entity identity).
 *   - Redacting the same SSN across DIFFERENT sessions yields different
 *     tokens (so audit rows aren't cross-linkable by token).
 */

describe("stability: per-session token determinism", () => {
  it("same SSN in same session → same token (both occurrences)", () => {
    const prompt = "SSN 900-55-1234 ... later in the doc SSN 900-55-1234 again.";
    const result = redact_prompt(prompt);
    // Both occurrences should collapse to the same token.
    const tokens = [...result.redacted_text.matchAll(/\[SSN_[0-9a-f]{8}\]/g)].map(
      (m) => m[0],
    );
    expect(tokens.length).toBe(2);
    expect(tokens[0]).toBe(tokens[1]);
  });

  it("same SSN across two independent sessions → different tokens", () => {
    const prompt = "Taxpayer SSN 900-55-1234 on file.";
    const a = redact_prompt(prompt);
    const b = redact_prompt(prompt);
    expect(a.session_salt).not.toBe(b.session_salt);
    // Given different salts, the hashes (and therefore tokens) differ.
    const token_a = Object.keys(a.token_map).find((t) => t.startsWith("[SSN_"));
    const token_b = Object.keys(b.token_map).find((t) => t.startsWith("[SSN_"));
    expect(token_a).toBeDefined();
    expect(token_b).toBeDefined();
    expect(token_a).not.toBe(token_b);
  });

  it("different SSNs in same session → different tokens", () => {
    const prompt = "Primary 900-55-1234, spouse 900-55-5678.";
    const result = redact_prompt(prompt);
    const tokens = [...result.redacted_text.matchAll(/\[SSN_[0-9a-f]{8}\]/g)].map(
      (m) => m[0],
    );
    expect(tokens.length).toBe(2);
    expect(tokens[0]).not.toBe(tokens[1]);
  });

  it("unhyphenated and hyphenated forms of the same SSN normalize to the same token", () => {
    const prompt = "Primary 900-55-1234 also shown as 900551234 later.";
    const result = redact_prompt(prompt);
    const tokens = [...result.redacted_text.matchAll(/\[SSN_[0-9a-f]{8}\]/g)].map(
      (m) => m[0],
    );
    // Both forms normalize (strip hyphens) so they should tokenize identically.
    expect(tokens.length).toBe(2);
    expect(tokens[0]).toBe(tokens[1]);
  });

  it("explicit session_salt option is honored (two calls with same salt → same tokens)", () => {
    const salt = "fixed-test-salt-0123456789abcdef";
    const prompt = "SSN 900-55-1234.";
    const a = redact_prompt(prompt, undefined, { session_salt: salt });
    const b = redact_prompt(prompt, undefined, { session_salt: salt });
    expect(a.redacted_text).toBe(b.redacted_text);
  });
});
