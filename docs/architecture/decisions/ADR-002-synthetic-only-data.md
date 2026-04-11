# ADR-002 — Synthetic-only data

**Status:** Accepted

## Context

The prototype demonstrates a workbench that ingests tax documents and produces AI recommendations. Real tax documents contain SSNs, addresses, account numbers, dates of birth, and dependents' information. Even if the developer has access to their own real return, putting real PII in a public repository creates legal and ethical exposure that is disproportionate to the demo value.

## Decision

100% synthetic data, zero real PII, at every stage of the prototype.

The hero return is the **Olivia and Ryan Mitchell** synthetic Form 1040: married filing jointly, AGI ~$326K, residential rental, RSU vesting, K-1 from a small partnership, HSA contributions, mixed wash sale lots in a brokerage account, mortgage interest on Form 1098, multi-state IL+CA obligations, prior year return on file. All names, SSNs, addresses, and account numbers are fabricated. All dollar amounts are realistic but invented.

The 50-return calibration test set used by ADR-007 is also entirely synthetic, generated procedurally from a template with parameter sweeps.

## Why

- Removes legal and ethical exposure from a public repository
- Lets the prototype be open-sourced and shared during hiring conversations
- Forces the rules engine and recommendation engine to handle the long tail of edge cases (because we control the test set), rather than overfitting to one real return

## Consequences

The prototype cannot demonstrate real OCR quality (real W-2 PDFs vary; synthetic documents are clean). Real OCR is in B3 production and out of MVP scope. The PII redaction tests in `tests/pii/` use synthetic SSNs and addresses with verified-realistic formats so the regex layer is exercised the same way it would be in production.
