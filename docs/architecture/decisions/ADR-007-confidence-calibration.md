# ADR-007 — Confidence calibration

**Status:** Accepted

## Context

Every recommendation the engine produces carries a confidence score in [0, 1]. The score is meaningful only if it is calibrated: a recommendation tagged 0.9 should be correct ~90% of the time across a large sample, and a recommendation tagged 0.5 should be correct ~50% of the time. Without calibration, experts either over-trust the AI (because high confidence does not mean what they think it means) or ignore confidence entirely (defeating the point of surfacing it).

## Decision

A calibration eval harness runs against a 50-return synthetic test set on every recommendation engine change. The harness produces a calibration curve (predicted confidence vs empirical correctness) bucketed into deciles, plus a single "max calibration error" number for CI gating.

**Target:** calibration curve within 5 percentage points across all deciles.

The calibration eval is gated in CI: a PR that pushes the max calibration error above the threshold cannot merge without an explicit override.

The calibration data is captured in the SQLite `calibration_runs` table for trend analysis.

## Why

Calibration is the only way to make a confidence score earn the trust of senior experts. Without a measurable target and a CI gate, the score will drift as the recommendation engine evolves. A 50-return synthetic test set is small enough to run on every commit and large enough to detect a meaningful calibration regression.

## Consequences

The 50-return synthetic test set is the second most important artifact after the 50-rule corpus. It must cover the edge cases where the LLM is most likely to hallucinate confidence (single-state vs multi-state, simple W-2 vs RSU vs K-1, presence of a rental, presence of a wash sale, presence of an HSA). Agent 1 owns the test set; Agent 5 owns the harness; Agent 6 wires the CI gate.
