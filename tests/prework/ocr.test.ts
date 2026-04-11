import { describe, expect, it } from "vitest";

import { mitchell_return } from "@/data/mitchell-return";
import { LOW_CONFIDENCE_LINE_IDS, mock_ocr } from "@/lib/prework/ocr";

describe("mock_ocr", () => {
  const output = mock_ocr(mitchell_return);

  it("emits at least one field per form in the Mitchell return", () => {
    // W-2 fields for both employees
    expect(output.fields["w2.0.box1_wages"]?.value).toBe(245_000);
    expect(output.fields["w2.1.box1_wages"]?.value).toBe(72_000);
    // RSU code V
    expect(output.fields["w2.0.box12.V"]?.value).toBe(48_000);
    // 1099-B lots — RSU vest lots and wash sale lots
    expect(output.fields["8949.row.RSU-VEST-001.cost_basis"]?.value).toBe(0);
    expect(
      output.fields["8949.row.WASH-001.wash_sale_loss_disallowed"]?.value,
    ).toBe(1_600);
    // K-1 passive loss
    expect(output.fields["k1.box1.ordinary_business_income"]?.value).toBe(
      -2_800,
    );
    // Rental and HSA
    expect(output.fields["rental.0.rents_received"]?.value).toBe(32_000);
    expect(output.fields["rental.expense.mortgage_interest"]?.value).toBe(
      14_200,
    );
    expect(output.fields["8889.line6.allowable"]?.value).toBe(8_300);
    // 1040 header
    expect(output.fields["1040.agi"]?.value).toBe(325_850);
    expect(output.fields["1040.filing_status"]?.value).toBe("mfj");
  });

  it("every field has confidence in [0, 1]", () => {
    for (const [, field] of Object.entries(output.fields)) {
      expect(field.confidence).toBeGreaterThanOrEqual(0);
      expect(field.confidence).toBeLessThanOrEqual(1);
    }
  });

  it("every field has a source document and bbox", () => {
    for (const [line_id, field] of Object.entries(output.fields)) {
      expect(field.source, `missing source for ${line_id}`).toBeDefined();
      const src = field.source!;
      expect(src.source_document).toMatch(/\.pdf$/);
      expect(src.page).toBeGreaterThanOrEqual(1);
      expect(src.bbox).toBeDefined();
      expect(src.bbox).toHaveLength(4);
      const [x, y, w, h] = src.bbox!;
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(w).toBeGreaterThan(0);
      expect(h).toBeGreaterThan(0);
    }
  });

  it("low-confidence lines cluster in [0.60, 0.80]", () => {
    // At least 3 low-confidence entries surfaced (brief calls for 3-5).
    const low = LOW_CONFIDENCE_LINE_IDS.filter(
      (id) => output.fields[id] !== undefined,
    );
    expect(low.length).toBeGreaterThanOrEqual(3);
    expect(low.length).toBeLessThanOrEqual(6);
    for (const id of low) {
      const c = output.fields[id].confidence;
      expect(c, `${id} should be low confidence`).toBeGreaterThanOrEqual(0.6);
      expect(c).toBeLessThanOrEqual(0.8);
    }
  });

  it("high-confidence lines cluster in [0.90, 1.00]", () => {
    const low_set = new Set<string>(LOW_CONFIDENCE_LINE_IDS);
    for (const [line_id, field] of Object.entries(output.fields)) {
      if (low_set.has(line_id)) continue;
      expect(field.confidence, `${line_id}`).toBeGreaterThanOrEqual(0.9);
      expect(field.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it("emits a documents manifest with one entry per source pdf", () => {
    expect(output.documents.length).toBeGreaterThan(0);
    for (const doc of output.documents) {
      expect(doc.name).toMatch(/\.pdf$/);
      expect(doc.pages).toBeGreaterThanOrEqual(1);
    }
    // Mitchell return should produce distinct docs for both W-2s, the
    // broker 1099-B, the 1099-DIV, the K-1, the 1098, the Schedule E
    // rental, the HSA 8889, and the 1040 header.
    const names = output.documents.map((d) => d.name);
    expect(names.some((n) => n.startsWith("W2_Olivia"))).toBe(true);
    expect(names.some((n) => n.startsWith("W2_Ryan"))).toBe(true);
    expect(names.some((n) => n.startsWith("1099B_"))).toBe(true);
    expect(names.some((n) => n.startsWith("K1_"))).toBe(true);
    expect(names.some((n) => n.startsWith("Form8889_"))).toBe(true);
    expect(names.some((n) => n.startsWith("Form1040_"))).toBe(true);
  });

  it("is deterministic across invocations", () => {
    const a = mock_ocr(mitchell_return);
    const b = mock_ocr(mitchell_return);
    expect(JSON.stringify(a)).toEqual(JSON.stringify(b));
  });
});
