# ADR-006 — PII redaction strategy

**Status:** Accepted

## Context

Every prompt sent to the LLM must be free of personally identifiable information. The prototype uses synthetic data, but the redaction pipeline must be production-realistic so the design can be reused at scale. The classes of PII the workbench encounters: SSN, EIN, full name, mailing address, email, phone, date of birth, account number, routing number, dependent SSNs and names. Across a multi-document return, the same entity (e.g. the customer's SSN) appears in many places and must be tokenized consistently so the LLM can still reason about "the same person" without seeing the actual SSN.

## Decision

Two-pass redaction:

**Pass 1, regex.** Standard regex patterns for SSN (`\d{3}-\d{2}-\d{4}` and variants), EIN (`\d{2}-\d{7}`), routing number (9 digits, modulus check), account number (8-17 digits adjacent to "account" or "acct"), email, phone, ZIP. Each match is replaced with a stable token of the form `[PII_TYPE_HASH8]` where the hash is derived from the original value plus a per-session salt. The same SSN always tokenizes to the same `[SSN_a3f8b1c2]` within a session.

**Pass 2, structured field redaction.** For known document types (W-2, 1099, K-1, 1098, brokerage statement), redact the named fields directly from the parsed structure rather than relying on regex on the OCR text. This catches edge cases like a SSN that runs across a line break in the OCR output.

A "what AI saw" panel renders the redacted prompt back to the expert in real time so they can verify nothing leaked.

A test set in `tests/pii/` runs every redaction pattern against synthetic-but-realistic PII and asserts zero leakage on a 10-return sample.

## Why

Two passes catch the long tail. Stable per-session tokens preserve the LLM's ability to reason about entity identity without exposing PII. The "what AI saw" panel is the trust signal that lets experts use the workbench at all.

## Consequences

Cross-document entity resolution (e.g. linking the customer's SSN on the W-2 to the same SSN on the K-1 even when one comes through OCR and the other through partner feed) is harder than regex alone. The MVP uses a deterministic linking pass keyed on the per-session salt; production would use a small entity linking model. The eval set must grow as new document types are added.
