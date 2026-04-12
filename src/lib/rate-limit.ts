/**
 * Per-IP rate limit helper — T-708.
 *
 * In-process token bucket. Vercel's serverless model means state is NOT
 * shared across instances; the goal here is "prevent accidental abuse from
 * a single visitor on a single warm instance", not airtight defense. AD-S2-04
 * explicitly picks this trade-off so the demo ships without Redis.
 *
 * Shape:
 *   const limited = apply_rate_limit(request, { bucket: "recommendations" });
 *   if (limited) return limited;  // already a 429 Response
 *   // ... normal handler work ...
 *
 * Independent `bucket` strings get independent budgets so `/api/intake`,
 * `/api/recommendations`, and `/api/prework` can each have their own quota
 * without one draining another.
 *
 * IP extraction prefers `x-forwarded-for` (first entry before the first
 * comma) because that's the header Vercel sets on every request. We fall
 * back to `x-real-ip`, then to a stable `"unknown"` token. The unknown
 * bucket is still a real bucket — everyone behind it shares one budget,
 * which is the right behaviour for a loud-neighbour scenario.
 *
 * Agent D will wire this into the actual route files during polish; this
 * module is pure helper + tests only.
 */

export interface RateLimitOptions {
  /** Max requests allowed per window. Default: 20. */
  max?: number;
  /** Window length in milliseconds. Default: 1 hour. */
  window_ms?: number;
  /**
   * Independent budget key. Different routes should pass different bucket
   * strings so one route's traffic doesn't drain another's quota.
   * Default: "default".
   */
  bucket?: string;
  /**
   * Injectable time source. Tests pass a controllable clock; production
   * callers should leave this unset so `Date.now` is used.
   */
  now_ms?: () => number;
}

interface BucketEntry {
  count: number;
  reset_at_ms: number;
}

/**
 * Module-level store. Key shape: `${bucket}:${ip}`. Entries are lazily
 * evicted on read when the window has expired — no background timer, so
 * this is safe in serverless runtimes that freeze idle functions.
 */
const store: Map<string, BucketEntry> = new Map();

const DEFAULT_MAX = 20;
const DEFAULT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEFAULT_BUCKET = "default";

/**
 * Extract the client IP from a Request. Order:
 *   1. First entry of `x-forwarded-for` (Vercel sets this).
 *   2. `x-real-ip`.
 *   3. Literal `"unknown"` — all unknown clients share one bucket, which
 *      is deliberately pessimistic for this bucket.
 */
export function extract_client_ip(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip");
  if (real) {
    const trimmed = real.trim();
    if (trimmed) return trimmed;
  }
  return "unknown";
}

/**
 * Apply the rate limit to a Request. Returns `null` if the request is
 * under budget, or a ready-to-return 429 `Response` (with `Retry-After`
 * seconds) if the caller should bail out.
 *
 * Call at the top of an API route handler:
 *
 *   const limited = apply_rate_limit(request, { bucket: "intake" });
 *   if (limited) return limited;
 */
export function apply_rate_limit(
  request: Request,
  opts: RateLimitOptions = {},
): Response | null {
  const max = opts.max ?? DEFAULT_MAX;
  const window_ms = opts.window_ms ?? DEFAULT_WINDOW_MS;
  const bucket = opts.bucket ?? DEFAULT_BUCKET;
  const now = (opts.now_ms ?? Date.now)();

  const ip = extract_client_ip(request);
  const key = `${bucket}:${ip}`;

  const entry = store.get(key);

  // Lazy cleanup: if the window has already expired, drop the stale row
  // and treat this call as the first in a fresh window.
  if (!entry || now >= entry.reset_at_ms) {
    store.set(key, { count: 1, reset_at_ms: now + window_ms });
    return null;
  }

  if (entry.count >= max) {
    const retry_after_seconds = Math.max(
      1,
      Math.ceil((entry.reset_at_ms - now) / 1000),
    );
    return new Response(
      JSON.stringify({
        error: "rate_limited",
        message: `Too many requests. Retry after ${retry_after_seconds}s.`,
      }),
      {
        status: 429,
        headers: {
          "content-type": "application/json",
          "retry-after": String(retry_after_seconds),
        },
      },
    );
  }

  entry.count += 1;
  return null;
}

/**
 * Test helper — clear the entire bucket store. NOT exported from any
 * public surface; only the unit test imports it directly so each test
 * starts from a clean slate regardless of order.
 */
export function _reset_rate_limit_store_for_tests(): void {
  store.clear();
}
