/**
 * T-WIRE — verifies `apply_rate_limit` is actually wired into the three
 * public mutating API routes.
 *
 * Strategy: for each route, fire `max` requests from the same fake IP,
 * assert none of them were 429, then fire one more and assert it comes
 * back as a 429 with a `Retry-After` header. Because the rate limit
 * runs BEFORE body parsing the route handler doesn't care that the body
 * is empty — the first `max` may return 400 (invalid body) but the
 * `max + 1`-th must be short-circuited to 429 by the limiter.
 *
 * Per-route budgets live in `src/lib/rate-limit-config.ts` so this test
 * and the routes stay in sync whenever we retune the ceilings.
 *
 * The in-memory bucket store is reset between tests so route order and
 * bucket isolation don't leak across cases.
 */

import { describe, expect, it, beforeEach } from "vitest";

import { _reset_rate_limit_store_for_tests } from "@/lib/rate-limit";
import {
  INTAKE_RATE_LIMIT_MAX,
  RECOMMENDATIONS_RATE_LIMIT_MAX,
  PREWORK_RATE_LIMIT_MAX,
} from "@/lib/rate-limit-config";

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

describe("T-WIRE — API routes are rate-limited per-IP", () => {
  it(`POST /api/intake returns 429 on the ${INTAKE_RATE_LIMIT_MAX + 1}th request`, async () => {
    for (let i = 0; i < INTAKE_RATE_LIMIT_MAX; i += 1) {
      const res = await intake_POST(
        make_request("http://localhost/api/intake", {}),
      );
      // Every request up to the ceiling is permitted by the limiter; the
      // handler may reject the body with 400 ("Invalid goals payload" or
      // similar), but it must not be 429.
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

  it(`POST /api/recommendations returns 429 on the ${RECOMMENDATIONS_RATE_LIMIT_MAX + 1}th request`, async () => {
    for (let i = 0; i < RECOMMENDATIONS_RATE_LIMIT_MAX; i += 1) {
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

  it(`POST /api/prework returns 429 on the ${PREWORK_RATE_LIMIT_MAX + 1}th request`, async () => {
    for (let i = 0; i < PREWORK_RATE_LIMIT_MAX; i += 1) {
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
    for (let i = 0; i < INTAKE_RATE_LIMIT_MAX + 1; i += 1) {
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
