/**
 * Sprint 4 T-I09 — POST /api/intake/[id]/approvals route tests.
 */

import { describe, expect, it } from "vitest";

import { POST as IntakePOST } from "../../app/api/intake/route";
import { POST as SelectionsPOST } from "../../app/api/intake/[id]/selections/route";
import { POST as ApprovalsPOST } from "../../app/api/intake/[id]/approvals/route";

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

async function create_intake_with_selections(): Promise<number> {
  const res = await IntakePOST(
    make_request("http://localhost/api/intake", { goals: valid_goals }),
  );
  const body = (await res.json()) as { intake_id: number };
  const intake_id = body.intake_id;

  // Add selections so approvals can proceed.
  await SelectionsPOST(
    make_request(`http://localhost/api/intake/${intake_id}/selections`, {
      selections: ["rec-001", "rec-002", "rec-003"],
    }),
    { params: Promise.resolve({ id: String(intake_id) }) },
  );

  return intake_id;
}

async function create_intake_without_selections(): Promise<number> {
  const res = await IntakePOST(
    make_request("http://localhost/api/intake", { goals: valid_goals }),
  );
  const body = (await res.json()) as { intake_id: number };
  return body.intake_id;
}

describe("POST /api/intake/[id]/approvals", () => {
  it("stores approvals and returns 200 ok", async () => {
    const intake_id = await create_intake_with_selections();
    const res = await ApprovalsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/approvals`, {
        approvals: {
          approved: ["rec-001", "rec-002"],
          declined: ["rec-003"],
        },
      }),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 400 when no selections exist yet", async () => {
    const intake_id = await create_intake_without_selections();
    const res = await ApprovalsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/approvals`, {
        approvals: {
          approved: ["rec-001"],
          declined: [],
        },
      }),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/selections must be submitted/i);
  });

  it("returns 404 for non-existent intake", async () => {
    const res = await ApprovalsPOST(
      make_request("http://localhost/api/intake/9999999/approvals", {
        approvals: { approved: ["rec-001"], declined: [] },
      }),
      { params: Promise.resolve({ id: "9999999" }) },
    );
    expect(res.status).toBe(404);
  });

  it("returns 400 for invalid intake id", async () => {
    const res = await ApprovalsPOST(
      make_request("http://localhost/api/intake/abc/approvals", {
        approvals: { approved: [], declined: [] },
      }),
      { params: Promise.resolve({ id: "abc" }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing approvals field", async () => {
    const intake_id = await create_intake_with_selections();
    const res = await ApprovalsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/approvals`, {}),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid approvals shape", async () => {
    const intake_id = await create_intake_with_selections();
    const res = await ApprovalsPOST(
      make_request(`http://localhost/api/intake/${intake_id}/approvals`, {
        approvals: { approved: "not-an-array" },
      }),
      { params: Promise.resolve({ id: String(intake_id) }) },
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const intake_id = await create_intake_with_selections();
    const res = await ApprovalsPOST(
      new Request(
        `http://localhost/api/intake/${intake_id}/approvals`,
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
});
