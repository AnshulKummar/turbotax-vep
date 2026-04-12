/**
 * Sprint 3 T-F07 — StartFlow validation logic + document catalogue smoke tests.
 *
 * Tests the pure form validation logic reuse (make_empty_form, validate_form)
 * and verifies that the default pre-selected documents exist in DEMO_DOCUMENTS.
 */

import { describe, expect, it } from "vitest";

import { DEMO_DOCUMENTS, DOCUMENT_IDS } from "@/lib/customer/documents";
import {
  make_empty_form,
  validate_form,
  type FormState,
} from "@/lib/intake/form";

describe("form validation logic (reuse smoke tests)", () => {
  it("make_empty_form returns 3 rows with ranks 1, 2, 3", () => {
    const form = make_empty_form();
    expect(form.rows).toHaveLength(3);
    expect(form.rows[0].rank).toBe(1);
    expect(form.rows[1].rank).toBe(2);
    expect(form.rows[2].rank).toBe(3);
  });

  it("validate_form rejects an empty form (no goals selected)", () => {
    const form = make_empty_form();
    const result = validate_form(form);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.row_0_id).toBeDefined();
      expect(result.errors.row_1_id).toBeDefined();
      expect(result.errors.row_2_id).toBeDefined();
    }
  });

  it("validate_form accepts a valid 3-goal form", () => {
    const form: FormState = {
      rows: [
        { id: "maximize_refund", rank: 1, weight: 5, rationale: "" },
        { id: "minimize_audit_risk", rank: 2, weight: 3, rationale: "" },
        { id: "optimize_next_year", rank: 3, weight: 2, rationale: "" },
      ],
    };
    const result = validate_form(form);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.goals).toHaveLength(3);
      expect(result.goals[0].id).toBe("maximize_refund");
    }
  });
});

describe("default pre-selected documents", () => {
  const DEFAULT_DOC_IDS = ["w2-acme", "1099-div", "1099-b", "1098"];

  it("all default docs exist in DEMO_DOCUMENTS", () => {
    const allIds = new Set(DOCUMENT_IDS);
    for (const id of DEFAULT_DOC_IDS) {
      expect(allIds.has(id)).toBe(true);
    }
  });

  it("DEMO_DOCUMENTS has the expected 8 IDs", () => {
    expect(DOCUMENT_IDS).toHaveLength(8);
    expect(DOCUMENT_IDS).toContain("w2-acme");
    expect(DOCUMENT_IDS).toContain("w2-innovex");
    expect(DOCUMENT_IDS).toContain("1099-int");
    expect(DOCUMENT_IDS).toContain("1099-div");
    expect(DOCUMENT_IDS).toContain("1099-b");
    expect(DOCUMENT_IDS).toContain("1098");
    expect(DOCUMENT_IDS).toContain("1099-r");
    expect(DOCUMENT_IDS).toContain("1095-a");
  });

  it("each DEMO_DOCUMENT has a valid category", () => {
    const validCategories = new Set(["income", "deduction", "investment", "health", "other"]);
    for (const doc of DEMO_DOCUMENTS) {
      expect(validCategories.has(doc.category)).toBe(true);
    }
  });
});
