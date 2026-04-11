/**
 * T-603 — Asserts the 50-return synthetic test set is well-formed:
 *   - Exactly 50 returns exist on disk
 *   - Each return has a matching ground_truth.json
 *   - Every ground_truth.expected_findings array is non-empty
 *     (the parameter sweep guarantees every return trips at least one rule)
 *   - Returns use only synthetic 9XX SSNs
 *   - Parameter sweep covers all 4 filing statuses and all 5 state mixes
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import type { TaxReturn } from "@/contracts";

const dir = dirname(fileURLToPath(import.meta.url));

function list_return_files(): string[] {
  return readdirSync(dir)
    .filter((f) => /^return-\d{3}\.json$/.test(f))
    .sort();
}

function read_json<T>(name: string): T {
  return JSON.parse(readFileSync(join(dir, name), "utf8")) as T;
}

interface GroundTruth {
  case_id: string;
  params: {
    filing_status: string;
    state_mix: string;
  };
  expected_finding_rule_ids: string[];
  expected_findings: unknown[];
}

describe("T-603 synthetic calibration test set", () => {
  const return_files = list_return_files();

  it("contains exactly 50 returns", () => {
    expect(return_files).toHaveLength(50);
  });

  it("has a ground_truth.json sibling for every return", () => {
    for (const name of return_files) {
      const gt_name = name.replace(".json", ".ground_truth.json");
      expect(() => readFileSync(join(dir, gt_name), "utf8")).not.toThrow();
    }
  });

  it("covers all four filing statuses and all five state mixes", () => {
    const statuses = new Set<string>();
    const state_mixes = new Set<string>();
    for (const name of return_files) {
      const gt = read_json<GroundTruth>(name.replace(".json", ".ground_truth.json"));
      statuses.add(gt.params.filing_status);
      state_mixes.add(gt.params.state_mix);
    }
    expect(statuses.size).toBeGreaterThanOrEqual(4);
    expect(state_mixes.size).toBeGreaterThanOrEqual(5);
  });

  it("every return uses only 9XX synthetic SSNs", () => {
    for (const name of return_files) {
      const ret = read_json<TaxReturn>(name);
      const all_people = [ret.taxpayer, ret.spouse, ...ret.dependents].filter(
        (p): p is NonNullable<typeof p> => p !== undefined,
      );
      for (const p of all_people) {
        expect(p.ssn).toMatch(/^9\d{2}-\d{2}-\d{4}$/);
      }
    }
  });

  it("every return trips at least one rule (non-empty ground truth)", () => {
    for (const name of return_files) {
      const gt = read_json<GroundTruth>(name.replace(".json", ".ground_truth.json"));
      expect(gt.expected_findings.length).toBeGreaterThan(0);
      expect(gt.expected_finding_rule_ids.length).toBeGreaterThan(0);
    }
  });
});
