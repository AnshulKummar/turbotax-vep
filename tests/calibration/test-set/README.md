# Calibration test set — 5-return synthetic stand-in

This directory holds a small synthetic test set Agent 5 uses to develop
and smoke-test the calibration eval harness. Agent 6 owns the real
50-return test set; it is not committed here, and this stand-in will be
replaced after the orchestrator merges Agent 6's branch.

Each `.json` file has the shape:

```jsonc
{
  "return_id": "cal-test-001",
  "case_id": "case-cal-001",
  "label": "short description of what this return exercises",
  "findings": [
    {
      "finding_id": "f-1",
      "rule_id": "rsu-double-count-001",
      "predicted_confidence": 0.92,
      "is_correct": true
    },
    // ...
  ]
}
```

`predicted_confidence` is what the recommendation engine reports for the
finding. `is_correct` is the ground-truth label the calibration curve
compares against. The harness buckets predicted confidences into deciles
and computes empirical accuracy per decile.

These fixtures are used only by `tests/calibration/run.ts`. Do not
reference them from unit tests.
