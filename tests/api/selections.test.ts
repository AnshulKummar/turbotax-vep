/**
 * Sprint 4 T-I09 — POST /api/intake/[id]/selections route tests.
 */

import { describe, expect, it } from "vitest";

import { POST as IntakePOST } from "../../app/api/intake/route";
import { POST as SelectionsPOST } from "../../app/api/intake/[id]/selections/route";

const valid_goals = [
  { id: "maximize_refund", rank: 1, weight: 5 },
  { id: "minimize_audit_risk", rank: 2, weight: 3 },
  { id: "optimize_next_year", rank: 3, weight: 2 },
];

function make_request(url: string, body: unknown): Request {
  return new Request(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "vitest",
      "x-forwarded-for": "127.0.0.1",
    },
    body: JSON.stringify(body),
  });
}

async function create_intake(): Promise<number> {
  const res = await IntakePOST(
    make_request("http://localhost/api/intake", { goals: valid_goals }),
  );
  const body = (await res.json()) as { intake_id: number };
  return body.intake_id;
}

describe("POST /api/intake/[id]/selections", () => {
  it("stores selections and returns 200 ok", async () => {
    const intake_id = await create_intake();
    const res = await SelectionsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/selections`, {
        selections: ["rec-001", "rec-002"],
      }),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 404 for non-existent intake", async () => {
    const res = await SelectionsPOST(
      make_request("http://localhost/api/intake/9999999/selections", {
        selections: ["rec-001"],
      }),
      { params: Promise.resolve({ id: "9999999" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid intake id", async () => {
    const res = await SelectionsPOST(
      make_request("http://localhost/api/intake/abc/selections", {
        selections: ["rec-001"],
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for empty selections array", async () => {
    const intake_id = await create_intake();
    const res = await SelectionsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/selections`, {
        selections: [],
      }),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/invalid selections/i);
  });

  it("returns 400 for invalid JSON body", async () => {
    const intake_id = await create_intake();
    const res = await SelectionsPOST(
      new Request(
        `http://localhost/api/intake/${intake_id}/selections`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: "{bad json",
        },
      ),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing selections field", async () => {
    const intake_id = await create_intake();
    const res = await SelectionsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/selections`, {}),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(400);
  });
});
