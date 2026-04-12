import { describe, expect, it } from "vitest";

import type { Recommendation, RedactedPrompt } from "@/contracts";
import {
  capture_expert_action,
  capture_llm_call,
  capture_recommendation,
  query_audit_trail,
} from "@/lib/audit/capture";

// DB lifecycle (fresh pglite per test) is owned by tests/audit/setup.ts.

function rp(): RedactedPrompt {
  return {
    redacted_text: "stub",
    token_map: {},
    session_salt: "s",
  };
}

function rec(id: string): Recommendation {
  return {
    id,
    rule_id: "r",
    finding_id: "f",
    category: "rsu",
    severity: 3,
    irc_citation: "IRC §83",
    one_line_summary: `summary ${id}`,
    detail: "d",
    affected_lines: [],
    dollar_impact: { estimate: 1, low: 0, high: 2 },
    audit_risk_delta: 0,
    goal_fits: [],
    composite_goal_fit: 0.5,
    confidence: 0.5,
    llm_only: false,
    audit_id: "0",
  };
}

describe("query_audit_trail", () => {
  it("returns events in chronological order (by insert id)", async () => {
    await capture_llm_call("case-a", "m", rp(), "first");
    await capture_recommendation("case-a", rec("r1"));
    await capture_expert_action("r1", "accept");
    await capture_llm_call("case-a", "m", rp(), "second");

    const events = await query_audit_trail("case-a");
    expect(events.length).toBe(4);
    const types = events.map((e) => e.event_type);
    expect(types).toEqual([
      "llm_call",
      "recommendation_produced",
      "expert_action",
      "llm_call",
    ]);

    // ids are strictly increasing
    for (let i = 1; i < events.length; i++) {
      expect(events[i].id).toBeGreaterThan(events[i - 1].id);
    }
  });

  it("filters by case_id — events from other cases do not leak", async () => {
    await capture_llm_call("case-a", "m", rp(), "A summary");
    await capture_llm_call("case-b", "m", rp(), "B summary");
    await capture_llm_call("case-a", "m", rp(), "A summary 2");

    const a = await query_audit_trail("case-a");
    const b = await query_audit_trail("case-b");

    expect(a.length).toBe(2);
    expect(b.length).toBe(1);
    for (const e of a) expect(e.case_id).toBe("case-a");
    for (const e of b) expect(e.case_id).toBe("case-b");
  });

  it("returns an empty array for an unknown case_id", async () => {
    const events = await query_audit_trail("no-such-case");
    expect(events).toEqual([]);
  });
});
