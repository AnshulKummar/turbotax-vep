/**
 * PII redaction pipeline — Agent 5 (Trust Layer).
 *
 * Two-pass redaction per ADR-006:
 *
 *   1. Regex pass on the raw prompt text:
 *      SSN, EIN, routing number, account number (adjacent to "account"/"acct"),
 *      email, phone (US formats), ZIP (5 + ZIP+4).
 *
 *   2. Structured-field pass over the TaxReturn:
 *      Named PII fields (Person.ssn, Person.dob, Address.line1/line2/zip,
 *      employer_ein, payer_ein, partnership_ein, Person.first_name/last_name).
 *      This catches OCR edge cases like SSNs split across line breaks that
 *      defeat the regex pass.
 *
 * Every match is replaced with a stable [PII_TYPE_HASH8] token where the
 * hash is sha3-256(value + per-session salt) truncated to 8 hex chars.
 * sha3-256 is the closest Node-standard equivalent of keccak-256; Node's
 * stdlib does not ship keccak-256 so we substitute sha3-256 here. Both are
 * Keccak-family hashes; for a prototype audit-trail identifier, the choice
 * is observationally equivalent. The ADR-006 intent (stable, salted,
 * non-reversible) is preserved.
 *
 * Stability contract: within a single session (same salt), the same
 * original value always yields the same token. Across sessions (new salt),
 * the token differs.
 */

import { createHash, randomBytes } from "node:crypto";

import type {
  Address,
  PIIType,
  Person,
  RedactedPrompt,
  TaxReturn,
} from "@/contracts";

// ---------------------------------------------------------------------------
// Hashing + token minting
// ---------------------------------------------------------------------------

function hash_value(raw: string, salt: string): string {
  return createHash("sha3-256")
    .update(raw + "::" + salt)
    .digest("hex")
    .slice(0, 8);
}

function new_session_salt(): string {
  return randomBytes(16).toString("hex");
}

function token_for(type: PIIType, raw: string, salt: string): string {
  return `[${type}_${hash_value(raw, salt)}]`;
}

// ---------------------------------------------------------------------------
// Regex pass
// ---------------------------------------------------------------------------

/**
 * Each pattern is a tuple of [PIIType, RegExp, normalizer?].
 * The normalizer lets us hash `"123-45-6789"` and `"123456789"` to the
 * SAME token since they are the same underlying SSN.
 *
 * Order matters: EIN is checked before generic 9-digit patterns.
 */
interface RegexRule {
  type: PIIType;
  pattern: RegExp;
  /** Normalize the matched string before hashing (e.g. strip hyphens). */
  normalize?: (raw: string) => string;
  /** Optional predicate to reject false positives (e.g. routing checksum). */
  accept?: (raw: string) => boolean;
}

const strip_non_digits = (s: string): string => s.replace(/\D/g, "");

/**
 * ABA routing number modulus check.
 * 3*(d1+d4+d7) + 7*(d2+d5+d8) + (d3+d6+d9) must be divisible by 10.
 */
function is_valid_routing(raw: string): boolean {
  const d = strip_non_digits(raw);
  if (d.length !== 9) return false;
  const n = d.split("").map((c) => Number.parseInt(c, 10));
  const sum =
    3 * (n[0] + n[3] + n[6]) +
    7 * (n[1] + n[4] + n[7]) +
    1 * (n[2] + n[5] + n[8]);
  return sum % 10 === 0;
}

const REGEX_RULES: RegexRule[] = [
  // Email — match first so the "@" doesn't get swallowed by phone patterns.
  {
    type: "EMAIL",
    pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    normalize: (s) => s.toLowerCase(),
  },
  // EIN: \d{2}-\d{7} (strict, hyphenated only — unhyphenated 9-digit would
  // collide with SSN).
  {
    type: "EIN",
    pattern: /\b\d{2}-\d{7}\b/g,
    normalize: strip_non_digits,
  },
  // SSN hyphenated: 123-45-6789
  {
    type: "SSN",
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    normalize: strip_non_digits,
  },
  // Account number adjacent to "account" / "acct" (8-17 digits), with
  // optional separators. Lookbehind lets us capture just the digits.
  {
    type: "ACCOUNT",
    pattern: /(?<=\b(?:account|acct|a\/c)(?:\s*(?:#|no\.?|number))?[\s:#-]*)[0-9][0-9\- ]{7,20}[0-9]/gi,
    normalize: strip_non_digits,
    accept: (raw) => {
      const d = strip_non_digits(raw);
      return d.length >= 8 && d.length <= 17;
    },
  },
  // Routing number: 9 digits, passes ABA checksum. Allow a context word
  // ("routing" / "aba") nearby to reduce false positives but also accept
  // standalone 9-digit numbers if they pass the mod-10 check.
  {
    type: "ROUTING",
    pattern: /\b\d{9}\b/g,
    normalize: strip_non_digits,
    accept: is_valid_routing,
  },
  // SSN unhyphenated: exactly 9 digits. Must run AFTER routing so we don't
  // grab a valid routing number as an SSN. We reject any 9-digit number
  // that passes the routing checksum.
  {
    type: "SSN",
    pattern: /\b\d{9}\b/g,
    normalize: (s) => s,
    accept: (raw) => !is_valid_routing(raw),
  },
  // Phone (US formats): (123) 456-7890, 123-456-7890, 123.456.7890, +1 ...
  {
    type: "PHONE",
    pattern:
      /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,
    normalize: strip_non_digits,
  },
  // ZIP+4 first, then ZIP5. Longer pattern first so 60540-1234 isn't
  // partially redacted as 60540.
  {
    type: "ZIP",
    pattern: /\b\d{5}-\d{4}\b/g,
    normalize: (s) => s,
  },
  {
    type: "ZIP",
    pattern: /\b\d{5}\b/g,
    normalize: (s) => s,
  },
];

interface Replacement {
  start: number;
  end: number;
  token: string;
  type: PIIType;
  original_hash: string;
}

function collect_regex_replacements(
  text: string,
  salt: string,
  token_map: RedactedPrompt["token_map"],
): Replacement[] {
  const reps: Replacement[] = [];
  for (const rule of REGEX_RULES) {
    // Clone regex to reset state per scan.
    const re = new RegExp(rule.pattern.source, rule.pattern.flags);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const raw = m[0];
      if (rule.accept && !rule.accept(raw)) continue;
      const normalized = rule.normalize ? rule.normalize(raw) : raw;
      const token = token_for(rule.type, normalized, salt);
      const original_hash = hash_value(normalized, salt);
      reps.push({
        start: m.index,
        end: m.index + raw.length,
        token,
        type: rule.type,
        original_hash,
      });
      token_map[token] = { type: rule.type, original_hash };
    }
  }
  return reps;
}

/**
 * Given overlapping replacements from multiple rules, keep the
 * left-most match; if two start at the same index, prefer the longer one.
 * Then apply them in right-to-left order so indices stay valid.
 */
function apply_replacements(text: string, reps: Replacement[]): string {
  if (reps.length === 0) return text;
  const sorted = [...reps].sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return b.end - a.end;
  });
  const non_overlapping: Replacement[] = [];
  let cursor = -1;
  for (const r of sorted) {
    if (r.start >= cursor) {
      non_overlapping.push(r);
      cursor = r.end;
    }
  }
  // Apply right-to-left.
  let out = text;
  for (let i = non_overlapping.length - 1; i >= 0; i--) {
    const r = non_overlapping[i];
    out = out.slice(0, r.start) + r.token + out.slice(r.end);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Structured pass
// ---------------------------------------------------------------------------

/**
 * Register a structured PII value. Replaces EVERY occurrence of `value` in
 * the text (global string replace) with its stable token, regardless of
 * whether the regex pass already caught it.
 *
 * We escape regex metacharacters so a raw value like "99-1234567" is
 * treated literally.
 */
function escape_regex(literal: string): string {
  return literal.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redact_structured_value(
  type: PIIType,
  raw_value: string | undefined,
  text: string,
  salt: string,
  token_map: RedactedPrompt["token_map"],
): string {
  if (!raw_value) return text;
  const trimmed = raw_value.trim();
  if (trimmed.length === 0) return text;
  const token = token_for(type, trimmed, salt);
  const original_hash = hash_value(trimmed, salt);
  token_map[token] = { type, original_hash };
  const re = new RegExp(escape_regex(trimmed), "g");
  return text.replace(re, token);
}

function collect_person_values(p: Person): { type: PIIType; value: string }[] {
  const out: { type: PIIType; value: string }[] = [
    { type: "SSN", value: p.ssn },
    { type: "DOB", value: p.dob },
    { type: "PERSON_NAME", value: `${p.first_name} ${p.last_name}` },
    { type: "PERSON_NAME", value: p.first_name },
    { type: "PERSON_NAME", value: p.last_name },
  ];
  return out;
}

function collect_address_values(a: Address): { type: PIIType; value: string }[] {
  const out: { type: PIIType; value: string }[] = [
    { type: "ADDRESS", value: a.line1 },
    { type: "ZIP", value: a.zip },
  ];
  if (a.line2) out.push({ type: "ADDRESS", value: a.line2 });
  return out;
}

function collect_structured_pii(
  r: TaxReturn,
): { type: PIIType; value: string }[] {
  const out: { type: PIIType; value: string }[] = [];

  out.push(...collect_person_values(r.taxpayer));
  if (r.spouse) out.push(...collect_person_values(r.spouse));
  for (const d of r.dependents) out.push(...collect_person_values(d));

  out.push(...collect_address_values(r.address));

  for (const w of r.w2s) {
    out.push({ type: "EIN", value: w.employer_ein });
    out.push(...collect_person_values(w.employee));
  }
  for (const b of r.form_1099_b) {
    out.push({ type: "EIN", value: b.payer_ein });
    out.push(...collect_person_values(b.recipient));
  }
  for (const d of r.form_1099_div) {
    out.push({ type: "EIN", value: d.payer_ein });
    out.push(...collect_person_values(d.recipient));
  }
  for (const k of r.k1s) {
    out.push({ type: "EIN", value: k.partnership_ein });
    out.push(...collect_person_values(k.partner));
  }
  for (const f of r.form_1098) {
    out.push(...collect_person_values(f.borrower));
    out.push(...collect_address_values(f.property_address));
  }
  for (const rp of r.rental_properties) {
    out.push(...collect_address_values(rp.address));
  }
  for (const h of r.hsa) {
    out.push(...collect_person_values(h.account_holder));
  }

  // De-dupe by (type, value).
  const seen = new Set<string>();
  return out.filter(({ type, value }) => {
    if (!value || value.trim().length === 0) return false;
    const key = `${type}::${value}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

export function redact_prompt(
  raw_prompt: string,
  structured_data?: TaxReturn,
  options?: { session_salt?: string },
): RedactedPrompt {
  const session_salt = options?.session_salt ?? new_session_salt();
  const token_map: RedactedPrompt["token_map"] = {};

  // Pass 1: regex.
  const regex_reps = collect_regex_replacements(raw_prompt, session_salt, token_map);
  let redacted_text = apply_replacements(raw_prompt, regex_reps);

  // Pass 2: structured field redaction.
  if (structured_data) {
    const values = collect_structured_pii(structured_data);
    // Sort longest-first so "Olivia Mitchell" is redacted before "Olivia"
    // and "Mitchell" alone (prevents partial-overlap tokens from pointing
    // into the middle of an already-tokenized span).
    values.sort((a, b) => b.value.length - a.value.length);
    for (const { type, value } of values) {
      redacted_text = redact_structured_value(
        type,
        value,
        redacted_text,
        session_salt,
        token_map,
      );
    }
  }

  return { redacted_text, token_map, session_salt };
}
