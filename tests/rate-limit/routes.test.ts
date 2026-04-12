/**
 * T-WIRE — verifies `apply_rate_limit` is actually wired into the three
 * public mutating API routes.
 *
 * Strategy: for each route, fire 21 requests from the same fake IP and
 * assert the 21st comes back as a 429 with a `Retry-After` header. The
 * default ceiling in `apply_rate_limit` is 20/hour, and because the rate
 * limit runs BEFORE body parsing the route handler doesn't care that the
 * body is empty — the first 20 may return 400 (invalid body) but the 21st
 * must be short-circuited to 429 by the limiter.
 *
 * The in-memory bucket store is reset between tests so route order and
 * bucket isolation don't leak across cases.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { _reset_rate_limit_store_for_tests } from "@/lib/rate-limit";

import { POST as intake_POST } from "../../app/api/intake/route";
import { POST as recommendations_POST } from "../../app/api/recommendations/route";
import { POST as prework_POST } from "../../app/api/prework/route";

function make_request(url: string, body: unknown = {}): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest-rate-limit",
      "x-forwarded-for": "192.0.2.77",
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  _reset_rate_limit_store_for_tests();
});

describe("T-WIRE — API routes are rate-limited at 20/hour/IP", () => {
  it("POST /api/intake returns 429 on the 21st request", async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await intake_POST(
        make_request("http://localhost/api/intake", {}),
      );
      // First 20 are permitted by the limiter; the handler may reject the
      // body with 400 ("Invalid goals payload" or similar), but it must
      // not be 429.
      expect(res.status).not.toBe(429);
    }
    const blocked = await intake_POST(
      make_request("http://localhost/api/intake", {}),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).not.toBeNull();
    const body = (await blocked.json()) as { error: string };
    expect(body.error).toBe("rate_limited");
  });

  it("POST /api/recommendations returns 429 on the 21st request", async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await recommendations_POST(
        make_request("http://localhost/api/recommendations", {}),
      );
      expect(res.status).not.toBe(429);
    }
    const blocked = await recommendations_POST(
      make_request("http://localhost/api/recommendations", {}),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).not.toBeNull();
    const body = (await blocked.json()) as { error: string };
    expect(body.error).toBe("rate_limited");
  });

  it("POST /api/prework returns 429 on the 21st request", async () => {
    for (let i = 0; i < 20; i += 1) {
      const res = await prework_POST(
        make_request("http://localhost/api/prework", {}),
      );
      expect(res.status).not.toBe(429);
    }
    const blocked = await prework_POST(
      make_request("http://localhost/api/prework", {}),
    );
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).not.toBeNull();
    const body = (await blocked.json()) as { error: string };
    expect(body.error).toBe("rate_limited");
  });

  it("buckets are independent across routes (intake overflow does not block recommendations)", async () => {
    // Burn the intake bucket.
    for (let i = 0; i < 21; i += 1) {
      await intake_POST(
        make_request("http://localhost/api/intake", {}),
      );
    }
    // Recommendations should still have a fresh budget for the same IP.
    const res = await recommendations_POST(
      make_request("http://localhost/api/recommendations", {}),
    );
    expect(res.status).not.toBe(429);
  });
});
