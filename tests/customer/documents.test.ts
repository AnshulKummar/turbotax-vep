/**
 * Sprint 3 T-E05 — Demo document catalogue tests.
 */

import { describe, expect, it } from "vitest";

import {
  DEMO_DOCUMENTS,
  DOCUMENT_IDS,
  get_documents_by_ids,
} from "@/lib/customer/documents";

describe("DEMO_DOCUMENTS catalogue", () => {
  it("has exactly 8 documents", () => {
    expect(DEMO_DOCUMENTS).toHaveLength(8);
  });

  it("all IDs are unique", () => {
    const unique = new Set(DOCUMENT_IDS);
    expect(unique.size).toBe(DEMO_DOCUMENTS.length);
  });

  it("every document has non-empty form_type, issuer, description, category", () => {
    for (const doc of DEMO_DOCUMENTS) {
      expect(doc.form_type.length).toBeGreaterThan(0);
      expect(doc.issuer.length).toBeGreaterThan(0);
      expect(doc.description.length).toBeGreaterThan(0);
      expect(doc.category.length).toBeGreaterThan(0);
    }
  });
});

describe("get_documents_by_ids", () => {
  it("returns matching documents for valid IDs", () => {
    const result = get_documents_by_ids(["w2-acme", "1098"]);
    expect(result).toHaveLength(2);
    expect(result.map((d) => d.id).sort()).toEqual(["1098", "w2-acme"]);
  });

  it("returns empty array for nonexistent IDs", () => {
    const result = get_documents_by_ids(["nonexistent"]);
    expect(result).toHaveLength(0);
  });

  it("returns empty array for empty input", () => {
    const result = get_documents_by_ids([]);
    expect(result).toHaveLength(0);
  });
});
