import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { Recommendation, RedactedPrompt } from "@/contracts";
import {
  capture_calibration_run,
  capture_expert_action,
  capture_llm_call,
  capture_recommendation,
  query_audit_trail,
  query_llm_call_for_recommendation,
} from "@/lib/audit/capture";
import { close_audit_db, set_audit_db_path } from "@/lib/audit/db";

let tmp_dir: string;

beforeEach(() => {
  tmp_dir = mkdtempSync(path.join(tmpdir(), "audit-capture-"));
  set_audit_db_path(path.join(tmp_dir, "audit.db"));
});

afterEach(() => {
  close_audit_db();
  rmSync(tmp_dir, { recursive: true, force: true });
});

function make_redacted(): RedactedPrompt {
  return {
    redacted_text: "Customer [SSN_abcdef12] flagged on W-2.",
    token_map: {
      "[SSN_abcdef12]": { type: "SSN", original_hash: "abcdef12" },
    },
    session_salt: "test-salt",
  };
}

function make_recommendation(id: string, case_id: string): Recommendation {
  return {
    id,
    rule_id: "rsu-double-count-001",
    finding_id: "finding-1",
    category: "rsu",
    severity: 5,
    irc_citation: "IRC §83",
    one_line_summary: "Fix RSU double-count on Contoso vest",
    detail: "Details ...",
    affected_lines: ["1040.line.1a"],
    dollar_impact: { estimate: 9500, low: 7000, high: 12000 },
    audit_risk_delta: -0.2,
    goal_fits: [],
    composite_goal_fit: 0.82,
    confidence: 0.87,
    llm_only: false,
    audit_id: "1",
  };
}

describe("capture.ts round-trip", () => {
  it("captures an LLM call and returns the autoincrement row id", async () => {
    const rp = make_redacted();
    const id = await capture_llm_call(
      "case-mitchell",
      "claude-sonnet-4-6",
      rp,
      "Recommended 7 findings",
    );
    expect(typeof id).toBe("number");
    expect(id).toBeGreaterThan(0);

    const events = await query_audit_trail("case-mitchell");
    expect(events.length).toBe(1);
    expect(events[0].event_type).toBe("llm_call");
    expect(events[0].model).toBe("claude-sonnet-4-6");
    expect(events[0].redacted_prompt).toContain("[SSN_abcdef12]");
    expect(events[0].metadata).toBeDefined();
    const meta = events[0].metadata as { session_salt?: string };
    expect(meta.session_salt).toBe("test-salt");
  });

  it("captures a recommendation and links it back by case_id", async () => {
    const rec = make_recommendation("rec-001", "case-mitchell");
    await capture_recommendation("case-mitchell", rec);

    const events = await query_audit_trail("case-mitchell");
    expect(events.length).toBe(1);
    expect(events[0].event_type).toBe("recommendation_produced");
    expect(events[0].response_summary).toBe(rec.one_line_summary);
    const meta = events[0].metadata as { recommendation_id?: string };
    expect(meta.recommendation_id).toBe("rec-001");
  });

  it("captures an expert action in both tables", async () => {
    const rec = make_recommendation("rec-042", "case-mitchell");
    await capture_recommendation("case-mitchell", rec);
    await capture_expert_action("rec-042", "accept", "Looks correct");

    const events = await query_audit_trail("case-mitchell");
    // recommendation_produced + expert_action
    expect(events.length).toBe(2);
    const action = events.find((e) => e.event_type === "expert_action");
    expect(action).toBeDefined();
    expect(action?.expert_action).toBe("accept");
    expect(action?.expert_reason).toBe("Looks correct");
  });

  it("query_llm_call_for_recommendation returns the originating llm_call", async () => {
    const rp = make_redacted();
    await capture_llm_call(
      "case-mitchell",
      "claude-sonnet-4-6",
      rp,
      "Produced 1 rec",
    );
    const rec = make_recommendation("rec-099", "case-mitchell");
    await capture_recommendation("case-mitchell", rec);

    const llm = await query_llm_call_for_recommendation("rec-099");
    expect(llm).not.toBeNull();
    expect(llm?.event_type).toBe("llm_call");
    expect(llm?.redacted_prompt).toContain("[SSN_abcdef12]");
  });

  it("captures a calibration run row", async () => {
    const id = await capture_calibration_run({
      ts: "2025-04-11T00:00:00.000Z",
      test_set_size: 5,
      max_calibration_error: 3.2,
      decile_curve_json: JSON.stringify([{ decile: 5, x: 1 }]),
      passed_gate: true,
    });
    expect(id).toBeGreaterThan(0);
  });
});
