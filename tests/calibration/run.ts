#!/usr/bin/env tsx
/**
 * Calibration eval harness — Agent 5 (Trust Layer).
 *
 * Per ADR-007, every recommendation carries a confidence in [0, 1] that
 * must be calibrated: across a large sample, the 0.9-confidence bucket
 * should be correct ~90 % of the time, the 0.5 bucket ~50 %, and so on.
 * This script:
 *
 *   1. Loads the synthetic test set from tests/calibration/test-set/*.json
 *   2. For each return, produces recommendations with predicted confidences
 *   3. Compares each prediction to ground truth (is_correct on the fixture)
 *   4. Buckets predictions into deciles (0.0-0.1 ... 0.9-1.0)
 *   5. Computes the calibration curve: predicted avg vs empirical accuracy
 *   6. Computes max calibration error across deciles (in percentage points)
 *   7. Writes a row into the `calibration_runs` table (T-502 audit trail)
 *   8. Prints the curve to stdout
 *   9. Exits non-zero if max calibration error > 5 percentage points
 *
 * -----------------------------------------------------------------------
 * STUB / DEFERRAL NOTE
 * -----------------------------------------------------------------------
 * Agent 2's recommendation engine (`@/lib/recommendations/engine`) is
 * owned in a parallel worktree and is not yet merged into Agent 5's
 * branch. The brief explicitly allows a local deterministic mock as a
 * stand-in. This file uses a FIXTURE-DRIVEN mock that reads the predicted
 * confidences directly from the test-set JSON files:
 *
 *   produce_recommendations(return_data, ground_truth) returns
 *     Array<{ predicted_confidence: number; is_correct: boolean }>
 *
 * Consequences:
 *   - Zero real LLM calls are made on this worktree. Total API cost = $0.
 *   - No cassettes are recorded on this worktree (nothing to record).
 *     The cassette directory exists so the orchestrator can populate it
 *     after merging Agent 2's engine; a subsequent real run will read
 *     from cassettes unless RECORD_CASSETTES=1 is set.
 *   - The 5-return test set is Agent 5's own stand-in per the brief;
 *     Agent 6's full 50-return set will replace it post-merge.
 *
 * When Agent 2 merges, swap `fixture_driven_engine` for a real call to
 * `produce_recommendations` from `@/lib/recommendations/engine` and wire
 * the cassette pattern. The decile math and the audit-trail write do not
 * need to change.
 * -----------------------------------------------------------------------
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import type { CalibrationDecile, CalibrationRun } from "@/contracts";
import { capture_calibration_run } from "@/lib/audit/capture";

// ---------------------------------------------------------------------------
// Fixture shapes
// ---------------------------------------------------------------------------

interface TestFinding {
  finding_id: string;
  rule_id: string;
  predicted_confidence: number;
  is_correct: boolean;
}

interface TestReturnFixture {
  return_id: string;
  case_id: string;
  label: string;
  findings: TestFinding[];
}

interface Prediction {
  case_id: string;
  finding_id: string;
  predicted_confidence: number;
  is_correct: boolean;
}

// ---------------------------------------------------------------------------
// Fixture loader
// ---------------------------------------------------------------------------

const TEST_SET_DIR = path.resolve(__dirname, "test-set");

function load_test_set(): TestReturnFixture[] {
  if (!existsSync(TEST_SET_DIR)) {
    throw new Error(`test set directory not found: ${TEST_SET_DIR}`);
  }
  const files = readdirSync(TEST_SET_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort();
  const fixtures: TestReturnFixture[] = [];
  for (const f of files) {
    const raw = readFileSync(path.join(TEST_SET_DIR, f), "utf8");
    fixtures.push(JSON.parse(raw) as TestReturnFixture);
  }
  return fixtures;
}

// ---------------------------------------------------------------------------
// Mock recommendation engine (deterministic, fixture-driven)
// ---------------------------------------------------------------------------

/**
 * Stand-in for Agent 2's `produce_recommendations`. Reads predicted
 * confidences directly from the fixture. When Agent 2 merges, replace
 * this with a real call to the engine and record cassettes.
 */
function fixture_driven_engine(fx: TestReturnFixture): Prediction[] {
  return fx.findings.map((f) => ({
    case_id: fx.case_id,
    finding_id: f.finding_id,
    predicted_confidence: f.predicted_confidence,
    is_correct: f.is_correct,
  }));
}

// ---------------------------------------------------------------------------
// Decile bucketing + calibration math
// ---------------------------------------------------------------------------

type DecileIndex = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

function decile_for(confidence: number): DecileIndex {
  // clamp into [0, 1]
  const c = Math.max(0, Math.min(1, confidence));
  if (c === 1) return 10;
  return (Math.floor(c * 10) + 1) as DecileIndex;
}

function compute_curve(predictions: Prediction[]): {
  curve: CalibrationDecile[];
  max_error_pp: number;
} {
  const buckets = new Map<
    DecileIndex,
    { sum_conf: number; correct: number; count: number }
  >();
  for (let d = 1 as DecileIndex; d <= 10; d = (d + 1) as DecileIndex) {
    buckets.set(d, { sum_conf: 0, correct: 0, count: 0 });
  }

  for (const p of predictions) {
    const d = decile_for(p.predicted_confidence);
    const b = buckets.get(d);
    if (!b) continue;
    b.sum_conf += p.predicted_confidence;
    if (p.is_correct) b.correct += 1;
    b.count += 1;
  }

  const curve: CalibrationDecile[] = [];
  let max_error_pp = 0;
  for (let d = 1 as DecileIndex; d <= 10; d = (d + 1) as DecileIndex) {
    const b = buckets.get(d);
    if (!b || b.count === 0) {
      // Empty deciles are reported with zeros and SKIPPED from the error
      // calculation (no samples → no signal → don't penalize).
      curve.push({
        decile: d,
        predicted_confidence_avg: 0,
        empirical_accuracy: 0,
        sample_count: 0,
      });
      continue;
    }
    const predicted_avg = b.sum_conf / b.count;
    const empirical = b.correct / b.count;
    const err_pp = Math.abs(predicted_avg - empirical) * 100;
    if (err_pp > max_error_pp) max_error_pp = err_pp;
    curve.push({
      decile: d,
      predicted_confidence_avg: predicted_avg,
      empirical_accuracy: empirical,
      sample_count: b.count,
    });
  }
  return { curve, max_error_pp };
}

// ---------------------------------------------------------------------------
// Output
// ---------------------------------------------------------------------------

function print_curve(
  run_summary: Pick<
    CalibrationRun,
    "test_set_size" | "max_calibration_error" | "decile_curve" | "passed_gate"
  >,
): void {
  const line = "-".repeat(74);
  console.log(line);
  console.log("Calibration eval — decile curve");
  console.log(line);
  console.log(
    "decile  range        predicted_avg   empirical_acc   gap_pp   n",
  );
  console.log(line);
  for (const d of run_summary.decile_curve) {
    const low = ((d.decile - 1) / 10).toFixed(1);
    const high = (d.decile / 10).toFixed(1);
    const gap_pp = Math.abs(d.predicted_confidence_avg - d.empirical_accuracy) * 100;
    const row = [
      String(d.decile).padStart(6),
      `${low}-${high}`.padEnd(12),
      d.predicted_confidence_avg.toFixed(3).padStart(15),
      d.empirical_accuracy.toFixed(3).padStart(15),
      gap_pp.toFixed(2).padStart(8),
      String(d.sample_count).padStart(4),
    ].join("  ");
    console.log(row);
  }
  console.log(line);
  console.log(
    `test_set_size=${run_summary.test_set_size}  ` +
      `max_calibration_error=${run_summary.max_calibration_error.toFixed(2)}pp  ` +
      `passed_gate=${run_summary.passed_gate}`,
  );
  console.log(line);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const GATE_THRESHOLD_PP = 5;

async function main(): Promise<void> {
  const fixtures = load_test_set();
  if (fixtures.length === 0) {
    console.error("calibration: no test-set fixtures found");
    process.exit(2);
  }

  const all_predictions: Prediction[] = [];
  for (const fx of fixtures) {
    all_predictions.push(...fixture_driven_engine(fx));
  }

  const { curve, max_error_pp } = compute_curve(all_predictions);
  const passed_gate = max_error_pp <= GATE_THRESHOLD_PP;

  const run_summary: Pick<
    CalibrationRun,
    "test_set_size" | "max_calibration_error" | "decile_curve" | "passed_gate"
  > = {
    test_set_size: fixtures.length,
    max_calibration_error: max_error_pp,
    decile_curve: curve,
    passed_gate,
  };

  print_curve(run_summary);

  // Persist to the audit trail. Uses AUDIT_DB_PATH if set (so the harness
  // can run against a temp DB in tests), otherwise defaults to ./data/audit.db.
  await capture_calibration_run({
    ts: new Date().toISOString(),
    test_set_size: run_summary.test_set_size,
    max_calibration_error: run_summary.max_calibration_error,
    decile_curve_json: JSON.stringify(run_summary.decile_curve),
    passed_gate: run_summary.passed_gate,
  });

  if (!passed_gate) {
    console.error(
      `calibration: FAIL — max error ${max_error_pp.toFixed(2)}pp > ${GATE_THRESHOLD_PP}pp threshold`,
    );
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("calibration: harness crashed", err);
  process.exit(2);
});
