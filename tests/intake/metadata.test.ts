/**
 * Sprint 3 T-E05 — CustomerMetadata Zod schema validation tests.
 */

import { describe, expect, it } from "vitest";

import {
  customer_metadata_schema,
  validate_customer_metadata,
} from "@/lib/intake/metadata";

describe("customer_metadata_schema", () => {
  it("valid full metadata parses", () => {
    const input = {
      display_name: "Jane Mitchell (synthetic)",
      filing_status: "mfj" as const,
      agi_band: "100_250k" as const,
      document_ids: ["w2-acme", "1098"],
    };
    const result = customer_metadata_schema.parse(input);
    expect(result).toEqual(input);
  });

  it("valid partial metadata (only display_name) parses", () => {
    const input = { display_name: "Alex" };
    const result = customer_metadata_schema.parse(input);
    expect(result).toEqual(input);
  });

  it("null input returns undefined via validate_customer_metadata", () => {
    expect(validate_customer_metadata(null)).toBeUndefined();
  });

  it("undefined input returns undefined via validate_customer_metadata", () => {
    expect(validate_customer_metadata(undefined)).toBeUndefined();
  });

  it("invalid filing_status throws ZodError", () => {
    expect(() =>
      customer_metadata_schema.parse({ filing_status: "married" }),
    ).toThrow();
  });

  it("display_name > 40 chars throws", () => {
    expect(() =>
      customer_metadata_schema.parse({
        display_name: "A".repeat(41),
      }),
    ).toThrow();
  });

  it("document_ids > 20 items throws", () => {
    const ids = Array.from({ length: 21 }, (_, i) => `doc-${i}`);
    expect(() =>
      customer_metadata_schema.parse({ document_ids: ids }),
    ).toThrow();
  });
});
