import { describe, expect, it } from "vitest";

import { GET } from "../../app/api/audit/[recommendation_id]/route";
import type { Recommendation, RedactedPrompt } from "@/contracts";
import {
  capture_llm_call,
  capture_recommendation,
} from "@/lib/audit/capture";

// DB lifecycle (fresh pglite per test) is owned by tests/audit/setup.ts.

function make_rp(): RedactedPrompt {
  return {
    redacted_text: "Taxpayer [SSN_aaaaaaaa] has [EIN_bbbbbbbb] W-2.",
    token_map: {
      "[SSN_aaaaaaaa]": { type: "SSN", original_hash: "aaaaaaaa" },
      "[EIN_bbbbbbbb]": { type: "EIN", original_hash: "bbbbbbbb" },
    },
    session_salt: "salt-123",
  };
}

function make_rec(id: string): Recommendation {
  return {
    id,
    rule_id: "rsu-double-count-001",
    finding_id: "f-1",
    category: "rsu",
    severity: 5,
    irc_citation: "IRC §83",
    one_line_summary: "Fix RSU double-count",
    detail: "details",
    affected_lines: ["1040.line.1a"],
    dollar_impact: { estimate: 9500, low: 7000, high: 12000 },
    audit_risk_delta: -0.2,
    goal_fits: [],
    composite_goal_fit: 0.8,
    confidence: 0.9,
    llm_only: false,
    audit_id: "1",
  };
}

describe("GET /api/audit/[recommendation_id]", () => {
  it("returns the redacted prompt + token map for a known recommendation", async () => {
    await capture_llm_call(
      "case-mitchell",
      "claude-sonnet-4-6",
      make_rp(),
      "produced 1 rec",
    );
    await capture_recommendation("case-mitchell", make_rec("rec-001"));

    const res = await GET(new Request("http://localhost/api/audit/rec-001"), {
      params: Promise.resolve({ recommendation_id: "rec-001" }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      recommendation_id: string;
      redacted_prompt: string;
      token_map: Record<string, { type: string; original_hash: string }>;
      session_salt: string;
      timestamp: string;
      model: string | null;
    };
    expect(body.recommendation_id).toBe("rec-001");
    expect(body.redacted_prompt).toContain("[SSN_aaaaaaaa]");
    expect(body.redacted_prompt).toContain("[EIN_bbbbbbbb]");
    expect(body.token_map["[SSN_aaaaaaaa]"].type).toBe("SSN");
    expect(body.token_map["[SSN_aaaaaaaa]"].original_hash).toBe("aaaaaaaa");
    expect(body.session_salt).toBe("salt-123");
    expect(body.model).toBe("claude-sonnet-4-6");
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("returns 404 for an unknown recommendation_id", async () => {
    const res = await GET(new Request("http://localhost/api/audit/nope"), {
      params: Promise.resolve({ recommendation_id: "nope" }),
    });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toBe("no LLM call found for recommendation");
  });
});
