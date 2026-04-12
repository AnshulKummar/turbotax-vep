/**
 * T-708 — apply_rate_limit unit tests.
 *
 * Uses an injected clock (`now_ms`) so we don't have to sleep on real
 * wall time. Each test clears the module-level bucket store first via
 * the test-only reset helper, so the tests are order-independent.
 */

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  _reset_rate_limit_store_for_tests,
  apply_rate_limit,
  extract_client_ip,
} from "@/lib/rate-limit";

function req(headers: Record<string, string> = {}): Request {
  return new Request("https://example.test/api/probe", { headers });
}

// Controllable clock factory — returns a function suitable for `now_ms`.
function make_clock(initial_ms: number): { now: () => number; advance: (ms: number) => void } {
  let t = initial_ms;
  return {
    now: () => t,
    advance: (ms: number) => {
      t += ms;
    },
  };
}

beforeEach(() => {
  _reset_rate_limit_store_for_tests();
});

afterEach(() => {
  _reset_rate_limit_store_for_tests();
});

describe("apply_rate_limit — happy path", () => {
  it("allows up to max requests within the window", () => {
    const clock = make_clock(1_000_000);
    const r = req({ "x-forwarded-for": "1.1.1.1" });

    for (let i = 0; i < 5; i += 1) {
      const out = apply_rate_limit(r, {
        max: 5,
        window_ms: 60_000,
        bucket: "t-happy",
        now_ms: clock.now,
      });
      expect(out).toBeNull();
    }
  });

  it("returns 429 with a Retry-After header on overflow", async () => {
    const clock = make_clock(1_000_000);
    const r = req({ "x-forwarded-for": "2.2.2.2" });
    const opts = {
      max: 3,
      window_ms: 60_000,
      bucket: "t-overflow",
      now_ms: clock.now,
    };

    for (let i = 0; i < 3; i += 1) {
      expect(apply_rate_limit(r, opts)).toBeNull();
    }

    const blocked = apply_rate_limit(r, opts);
    expect(blocked).not.toBeNull();
    expect(blocked!.status).toBe(429);

    const retry_after = blocked!.headers.get("retry-after");
    expect(retry_after).not.toBeNull();
    const retry_num = Number(retry_after);
    expect(retry_num).toBeGreaterThan(0);
    // 60s window, no time has passed, so we expect ~60s left (ceil).
    expect(retry_num).toBeLessThanOrEqual(60);

    const body = await blocked!.json();
    expect(body.error).toBe("rate_limited");
  });
});

describe("apply_rate_limit — isolation", () => {
  it("independent buckets do not share state", () => {
    const clock = make_clock(1_000_000);
    const r = req({ "x-forwarded-for": "3.3.3.3" });

    // Burn the quota on bucket A.
    for (let i = 0; i < 2; i += 1) {
      expect(
        apply_rate_limit(r, {
          max: 2,
          window_ms: 60_000,
          bucket: "bucket-a",
          now_ms: clock.now,
        }),
      ).toBeNull();
    }
    expect(
      apply_rate_limit(r, {
        max: 2,
        window_ms: 60_000,
        bucket: "bucket-a",
        now_ms: clock.now,
      }),
    ).not.toBeNull();

    // Bucket B from the same IP is still clean.
    expect(
      apply_rate_limit(r, {
        max: 2,
        window_ms: 60_000,
        bucket: "bucket-b",
        now_ms: clock.now,
      }),
    ).toBeNull();
  });

  it("independent IPs do not share state", () => {
    const clock = make_clock(1_000_000);
    const opts = {
      max: 2,
      window_ms: 60_000,
      bucket: "shared",
      now_ms: clock.now,
    };

    const alice = req({ "x-forwarded-for": "10.0.0.1" });
    const bob = req({ "x-forwarded-for": "10.0.0.2" });

    expect(apply_rate_limit(alice, opts)).toBeNull();
    expect(apply_rate_limit(alice, opts)).toBeNull();
    expect(apply_rate_limit(alice, opts)).not.toBeNull(); // Alice blocked

    // Bob has his own budget.
    expect(apply_rate_limit(bob, opts)).toBeNull();
    expect(apply_rate_limit(bob, opts)).toBeNull();
    expect(apply_rate_limit(bob, opts)).not.toBeNull();
  });
});

describe("apply_rate_limit — window expiry", () => {
  it("releases the bucket once the window elapses", () => {
    const clock = make_clock(1_000_000);
    const r = req({ "x-forwarded-for": "4.4.4.4" });
    const opts = {
      max: 2,
      window_ms: 60_000,
      bucket: "t-expiry",
      now_ms: clock.now,
    };

    expect(apply_rate_limit(r, opts)).toBeNull();
    expect(apply_rate_limit(r, opts)).toBeNull();
    expect(apply_rate_limit(r, opts)).not.toBeNull();

    // Advance past the window and try again — should be allowed.
    clock.advance(60_001);
    expect(apply_rate_limit(r, opts)).toBeNull();
    expect(apply_rate_limit(r, opts)).toBeNull();
    // And we're rate-limited again at the new ceiling.
    expect(apply_rate_limit(r, opts)).not.toBeNull();
  });
});

describe("extract_client_ip", () => {
  it("parses the first entry of x-forwarded-for", () => {
    const r = req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" });
    expect(extract_client_ip(r)).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip when x-forwarded-for is absent", () => {
    const r = req({ "x-real-ip": "7.7.7.7" });
    expect(extract_client_ip(r)).toBe("7.7.7.7");
  });

  it("returns 'unknown' when no IP headers are present", () => {
    const r = req();
    expect(extract_client_ip(r)).toBe("unknown");
  });

  it("two requests with different x-forwarded-for firsts are treated as different IPs", () => {
    const clock = make_clock(1_000_000);
    const opts = {
      max: 1,
      window_ms: 60_000,
      bucket: "xff-split",
      now_ms: clock.now,
    };
    const first = req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    const second = req({ "x-forwarded-for": "9.9.9.9, 5.6.7.8" });

    expect(apply_rate_limit(first, opts)).toBeNull();
    expect(apply_rate_limit(first, opts)).not.toBeNull();

    // Different leading IP => different bucket => still allowed.
    expect(apply_rate_limit(second, opts)).toBeNull();
  });
});
