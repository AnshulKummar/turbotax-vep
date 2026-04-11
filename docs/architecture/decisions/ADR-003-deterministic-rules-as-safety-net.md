# ADR-003 — Deterministic rules as the safety net

**Status:** Accepted

## Context

The Washington Post tested Intuit Assist on 16 tax questions reviewed by credentialed pros and found it wrong on more than half initially, and on roughly 25% even after Intuit was given a chance to patch. If the workbench's confidence scores are not calibrated, the workbench teaches experts to over-trust the AI, which is worse than no AI at all. The mechanically detectable errors that recur in the public TurboTax record (RSU double counting, missing wash sale Code W on Form 8949, Form 8889 HSA limit mismatches, IRC §469 passive activity loss, depreciation allocation, foreign tax credit triggers, SALT cap) are precisely the errors a deterministic rules engine can catch with 100% recall.

## Decision

The 50-rule deterministic tax corpus is the source of truth for mechanically detectable errors. The LLM ranks, scores, explains, and personalizes; **it does not mechanically detect**.

The flow on every recommendation:

1. The deterministic rules engine runs against the return and produces a list of mechanically detectable findings, each with rule citation, severity, dollar impact, and audit risk delta.
2. The LLM consumes the rules engine output plus the customer's stated goals plus the customer context, and produces a ranked recommendation list with goal fit scores and natural-language explanations.
3. The LLM is **not allowed to invent findings the rules engine did not produce**. If the LLM wants to surface a finding the rules engine missed, it must be flagged as "LLM-only, low confidence" and routed to the expert with a warning.

## Why

This caps the worst-case AI error rate at the rules engine's error rate, which is auditable and improvable. The LLM's role becomes ranking and explanation, which is what LLMs are good at. It also gives senior experts a deterministic floor they can trust, which is the precondition for getting them to use the workbench at all.

## Consequences

The 50-rule corpus is the project's most important artifact. It must be maintained as tax law changes and as new error patterns are observed. The corpus is versioned, tested, and owned by Agent 1 (Domain & Data) in the multi-agent build. ADR-007 (calibration) defines how the LLM's confidence scores are evaluated against the rules engine's findings.
