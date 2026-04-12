/**
 * T-707 — /api/intake route handlers.
 *
 * Covers:
 *   - POST happy path: validates, persists, returns 201 + intake_id
 *   - POST validation failure: 400 with ZodError issues
 *   - POST body-parse failure: 400
 *   - GET happy path: returns stored goal vector
 *   - GET 404 for missing id
 *   - GET 400 for invalid id
 *
 * DB lifecycle (fresh pglite per test) is owned by tests/audit/setup.ts.
 */

import { describe, expect, it } from "vitest";

import { POST } from "../../app/api/intake/route";
import { GET } from "../../app/api/intake/[id]/route";

const valid_goals = [
  { id: "maximize_refund", rank: 1, weight: 5 },
  { id: "minimize_audit_risk", rank: 2, weight: 3 },
  { id: "optimize_next_year", rank: 3, weight: 2 },
];

function make_post_request(body: unknown): Request {
  return new Request("http://localhost/api/intake", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
      "x-forwarded-for": "127.0.0.1",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/intake", () => {
  it("creates an intake and returns 201 + numeric intake_id", async () => {
    const res = await POST(make_post_request({ goals: valid_goals }));
    expect(res.status).toBe(201);
    const body = (await res.json()) as { intake_id: number; expires_at: string };
    expect(body.intake_id).toBeGreaterThan(0);
    expect(body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Round-trip via GET.
    const get_res = await GET(
      new Request(`http://localhost/api/intake/${body.intake_id}`),
      { params: Promise.resolve({ id: String(body.intake_id) }) },
    );
    expect(get_res.status).toBe(200);
    const fetched = (await get_res.json()) as {
      intake_id: number;
      goals: { id: string; rank: number; weight: number }[];
    };
    expect(fetched.intake_id).toBe(body.intake_id);
    expect(fetched.goals.map((g) => g.id)).toEqual([
      "maximize_refund",
      "minimize_audit_risk",
      "optimize_next_year",
    ]);
    expect(fetched.goals.map((g) => g.rank)).toEqual([1, 2, 3]);
    expect(fetched.goals.map((g) => g.weight)).toEqual([5, 3, 2]);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/intake", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/invalid json/i);
  });

  it("returns 400 when goals fail schema validation", async () => {
    // Two goals with rank 1 — violates the unique-rank refinement.
    const bad = [
      { id: "maximize_refund", rank: 1, weight: 5 },
      { id: "minimize_audit_risk", rank: 1, weight: 3 },
    ];
    const res = await POST(make_post_request({ goals: bad }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string; issues: unknown[] };
    expect(body.error).toBe("Invalid goals payload");
    expect(Array.isArray(body.issues)).toBe(true);
  });

  it("returns 400 when the goals field is missing", async () => {
    const res = await POST(make_post_request({}));
    expect(res.status).toBe(400);
  });
});

describe("GET /api/intake/[id]", () => {
  it("returns 404 for an unknown intake_id", async () => {
    const res = await GET(
      new Request("http://localhost/api/intake/9999999"),
      { params: Promise.resolve({ id: "9999999" }) },
    );
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/not found/i);
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await GET(
      new Request("http://localhost/api/intake/abc"),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for a negative id", async () => {
    const res = await GET(
      new Request("http://localhost/api/intake/-1"),
      { params: Promise.resolve({ id: "-1" }) },
    );
    expect(res.status).toBe(400);
  });
});
