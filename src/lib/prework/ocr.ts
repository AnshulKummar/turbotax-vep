/**
 * Mocked OCR output for the Pre-Work Engine (B3 mock).
 *
 * Per ADR-002, the prototype does not run a real OCR pipeline. This module
 * walks the synthetic Mitchell return and emits an `MockedOCROutput` that
 * looks as if a production OCR had produced it: every parsed field carries
 * a confidence score in [0, 1], a plausible `source_document` path, and a
 * bounding box for click-through provenance in the workbench UI.
 *
 * Confidence policy
 * -----------------
 * - Most fields land in [0.90, 1.00] so the workbench does not spam the
 *   expert with low-confidence badges.
 * - A deliberately small set of "tricky" fields are dropped into
 *   [0.60, 0.80] so Agent 4 has something to surface as low-confidence.
 *   These are fields a real OCR would struggle with:
 *     - Handwritten K-1 line items
 *     - Smudged 1099-B basis cells on the wash sale lots
 *     - HSA Form 8889 line 6 (the known-stale limit field)
 *     - Rental schedule E mortgage interest from a faxed 1098
 *
 * Determinism
 * -----------
 * The OCR output is fully deterministic given the same input return.
 * A cheap FNV-1a hash over the field key seeds a local PRNG that drives
 * bbox placement so two runs produce identical results. This lets the
 * workbench diff pre-work runs across sessions without spurious noise.
 */

import type {
  BrokerageLot,
  DocumentRef,
  FieldWithConfidence,
  LineId,
  MockedOCROutput,
  TaxReturn,
} from "@/contracts";

// ---------------------------------------------------------------------------
// Deterministic pseudo-randomness
// ---------------------------------------------------------------------------

/** FNV-1a 32-bit. Small, fast, deterministic across JS engines. */
function fnv1a(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Seeded real-valued generator in [0, 1) from a string. */
function seeded_unit(key: string, salt: string): number {
  const h = fnv1a(`${key}|${salt}`);
  return (h % 1_000_000) / 1_000_000;
}

function seeded_bbox(
  key: string,
): [number, number, number, number] {
  const x = Math.round(40 + seeded_unit(key, "x") * 500);
  const y = Math.round(80 + seeded_unit(key, "y") * 650);
  const w = Math.round(60 + seeded_unit(key, "w") * 120);
  const h = Math.round(12 + seeded_unit(key, "h") * 8);
  return [x, y, w, h];
}

// ---------------------------------------------------------------------------
// Confidence policy
// ---------------------------------------------------------------------------

/**
 * Line IDs that should always land in the low-confidence bucket. These
 * correspond to fields a real OCR would plausibly struggle with and give
 * the workbench UI something to surface with a yellow badge.
 */
const LOW_CONFIDENCE_LINES: readonly string[] = [
  // HSA Form 8889 line 6 — deliberately stale and often hand-edited
  "8889.line6.allowable",
  // K-1 line 1 ordinary income — partnership K-1s often hand-keyed
  "k1.box1.ordinary_business_income",
  // 1099-B wash sale basis — smudged on the scanned PDF
  "8949.row.WASH-001.cost_basis",
  "8949.row.WASH-002.cost_basis",
  // Rental mortgage interest — faxed 1098
  "rental.expense.mortgage_interest",
];

function confidence_for(line_id: LineId): number {
  if (LOW_CONFIDENCE_LINES.includes(line_id)) {
    // Cluster in [0.60, 0.80], deterministic per line.
    return Math.round((0.6 + seeded_unit(line_id, "conf-low") * 0.2) * 1000) / 1000;
  }
  // Cluster in [0.90, 1.00]; bias slightly toward 0.98.
  return Math.round((0.9 + seeded_unit(line_id, "conf-high") * 0.1) * 1000) / 1000;
}

function make_field<T extends string | number>(
  line_id: LineId,
  value: T,
  source: DocumentRef,
): FieldWithConfidence<T> {
  return {
    value,
    confidence: confidence_for(line_id),
    source,
  };
}

function ref(
  doc_name: string,
  page: number,
  line_id: LineId,
): DocumentRef {
  return {
    source_document: doc_name,
    page,
    bbox: seeded_bbox(`${doc_name}::${page}::${line_id}`),
  };
}

// ---------------------------------------------------------------------------
// Field emitters per form
// ---------------------------------------------------------------------------

function emit_w2_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  w2_index: number,
  w2: TaxReturn["w2s"][number],
): { name: string; pages: number } {
  const name = `W2_${w2.employee.first_name}_${w2.employee.last_name}.pdf`;
  const prefix = `w2.${w2_index}`;

  const set = (
    line_id: LineId,
    value: number | string,
  ): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };

  set(`${prefix}.employer_name`, w2.employer_name);
  set(`${prefix}.employer_ein`, w2.employer_ein);
  set(`${prefix}.box1_wages`, w2.box1_wages);
  set(`${prefix}.box2_fed_withholding`, w2.box2_fed_withholding);
  set(`${prefix}.box3_ss_wages`, w2.box3_ss_wages);
  set(`${prefix}.box4_ss_withholding`, w2.box4_ss_withholding);
  set(`${prefix}.box5_medicare_wages`, w2.box5_medicare_wages);
  set(`${prefix}.box6_medicare_withholding`, w2.box6_medicare_withholding);

  for (const item of w2.box12) {
    set(`${prefix}.box12.${item.code}`, item.amount);
  }
  for (const item of w2.box14) {
    set(`${prefix}.box14.${item.label}`, item.amount);
  }
  for (const sw of w2.state_wages) {
    set(`${prefix}.state_wages.${sw.state}.wages`, sw.wages);
    set(`${prefix}.state_wages.${sw.state}.withholding`, sw.withholding);
  }

  return { name, pages: 1 };
}

function emit_1099b_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  payer_index: number,
  form: TaxReturn["form_1099_b"][number],
): { name: string; pages: number } {
  const name = `1099B_${form.payer_name.replace(/\s+/g, "_")}.pdf`;
  const prefix = `1099b.${payer_index}`;

  const set = (
    line_id: LineId,
    value: number | string,
  ): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };

  set(`${prefix}.payer_name`, form.payer_name);
  set(`${prefix}.payer_ein`, form.payer_ein);

  form.lots.forEach((lot: BrokerageLot, idx: number) => {
    const lot_prefix = `8949.row.${lot.lot_id}`;
    const page = Math.floor(idx / 6) + 1;
    const make_lot_ref = (): DocumentRef =>
      ref(name, page, lot_prefix);
    fields[`${lot_prefix}.description`] = make_field(
      `${lot_prefix}.description`,
      lot.description,
      make_lot_ref(),
    );
    fields[`${lot_prefix}.date_acquired`] = make_field(
      `${lot_prefix}.date_acquired`,
      lot.date_acquired,
      make_lot_ref(),
    );
    fields[`${lot_prefix}.date_sold`] = make_field(
      `${lot_prefix}.date_sold`,
      lot.date_sold,
      make_lot_ref(),
    );
    fields[`${lot_prefix}.proceeds`] = make_field(
      `${lot_prefix}.proceeds`,
      lot.proceeds,
      make_lot_ref(),
    );
    fields[`${lot_prefix}.cost_basis`] = make_field(
      `${lot_prefix}.cost_basis`,
      lot.cost_basis,
      make_lot_ref(),
    );
    if (typeof lot.wash_sale_loss_disallowed === "number") {
      fields[`${lot_prefix}.wash_sale_loss_disallowed`] = make_field(
        `${lot_prefix}.wash_sale_loss_disallowed`,
        lot.wash_sale_loss_disallowed,
        make_lot_ref(),
      );
    }
    fields[`${lot_prefix}.code`] = make_field(
      `${lot_prefix}.code`,
      lot.code ?? "",
      make_lot_ref(),
    );
  });

  return { name, pages: Math.max(1, Math.ceil(form.lots.length / 6)) };
}

function emit_1099div_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  idx: number,
  form: TaxReturn["form_1099_div"][number],
): { name: string; pages: number } {
  const name = `1099DIV_${form.payer_name.replace(/\s+/g, "_")}.pdf`;
  const prefix = `1099div.${idx}`;

  const set = (line_id: LineId, value: number | string): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };

  set(`${prefix}.payer_name`, form.payer_name);
  set(`${prefix}.payer_ein`, form.payer_ein);
  set(`${prefix}.ordinary_dividends`, form.ordinary_dividends);
  set(`${prefix}.qualified_dividends`, form.qualified_dividends);
  set(`${prefix}.capital_gain_distributions`, form.capital_gain_distributions);
  if (typeof form.foreign_tax_paid === "number") {
    set(`${prefix}.foreign_tax_paid`, form.foreign_tax_paid);
  }

  return { name, pages: 1 };
}

function emit_k1_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  idx: number,
  k1: TaxReturn["k1s"][number],
): { name: string; pages: number } {
  const name = `K1_${k1.partnership_name.replace(/\s+/g, "_")}.pdf`;

  const set = (line_id: LineId, value: number | string): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };

  set(`k1.${idx}.partnership_name`, k1.partnership_name);
  set(`k1.${idx}.partnership_ein`, k1.partnership_ein);
  set(`k1.${idx}.is_passive`, k1.is_passive ? "true" : "false");
  // Note: the bare `k1.box1.ordinary_business_income` key is intentionally
  // in LOW_CONFIDENCE_LINES because handwritten K-1s are notoriously dicey.
  fields["k1.box1.ordinary_business_income"] = make_field(
    "k1.box1.ordinary_business_income",
    k1.ordinary_business_income,
    ref(name, 1, "k1.box1.ordinary_business_income"),
  );
  set(`k1.${idx}.box2.rental_real_estate_income`, k1.rental_real_estate_income);
  set(`k1.${idx}.interest_income`, k1.interest_income);
  set(`k1.${idx}.dividend_income`, k1.dividend_income);
  set(`k1.${idx}.guaranteed_payments`, k1.guaranteed_payments);
  set(`k1.${idx}.section_179_deduction`, k1.section_179_deduction);

  return { name, pages: 1 };
}

function emit_1098_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  idx: number,
  form: TaxReturn["form_1098"][number],
): { name: string; pages: number } {
  const name = `1098_${form.lender_name.replace(/\s+/g, "_")}.pdf`;
  const set = (line_id: LineId, value: number | string): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };
  set(`1098.${idx}.lender_name`, form.lender_name);
  set(`1098.${idx}.mortgage_interest_paid`, form.mortgage_interest_paid);
  set(`1098.${idx}.outstanding_principal`, form.outstanding_principal);
  if (typeof form.property_tax_paid === "number") {
    set(`1098.${idx}.property_tax_paid`, form.property_tax_paid);
  }
  return { name, pages: 1 };
}

function emit_rental_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  idx: number,
  rental: TaxReturn["rental_properties"][number],
): { name: string; pages: number } {
  const name = `ScheduleE_${rental.property_id}.pdf`;
  const prefix = `rental.${idx}`;

  const set = (line_id: LineId, value: number | string): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };

  set(`${prefix}.property_id`, rental.property_id);
  set(`${prefix}.fair_rental_days`, rental.fair_rental_days);
  set(`${prefix}.personal_use_days`, rental.personal_use_days);
  set(`${prefix}.rents_received`, rental.rents_received);
  for (const [line_key, amount] of Object.entries(rental.expenses)) {
    set(`${prefix}.expense.${line_key}`, amount as number);
  }
  // Also emit the bare `rental.expense.mortgage_interest` so the
  // LOW_CONFIDENCE_LINES key has a home.
  fields["rental.expense.mortgage_interest"] = make_field(
    "rental.expense.mortgage_interest",
    rental.expenses.mortgage_interest,
    ref(name, 1, "rental.expense.mortgage_interest"),
  );
  set(`${prefix}.depreciation.purchase_price`, rental.depreciation.purchase_price);
  set(
    `${prefix}.depreciation.current_year_depreciation`,
    rental.depreciation.current_year_depreciation,
  );
  set(
    `${prefix}.depreciation.prior_year_depreciation`,
    rental.depreciation.prior_year_depreciation,
  );
  return { name, pages: 2 };
}

function emit_hsa_fields(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  idx: number,
  hsa: TaxReturn["hsa"][number],
): { name: string; pages: number } {
  const name = `Form8889_${hsa.account_holder.first_name}_${hsa.account_holder.last_name}.pdf`;

  const set = (line_id: LineId, value: number | string): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };
  set(`8889.${idx}.coverage`, hsa.coverage);
  set(`8889.${idx}.line2_contributions`, hsa.line2_contributions);
  // Canonical low-confidence key lives outside the index prefix so the
  // LOW_CONFIDENCE_LINES constant can reference it without needing per-HSA
  // duplication.
  fields["8889.line6.allowable"] = make_field(
    "8889.line6.allowable",
    hsa.line6_allowable,
    ref(name, 1, "8889.line6.allowable"),
  );
  set(`8889.${idx}.line6_allowable`, hsa.line6_allowable);
  set(`8889.${idx}.line13_deduction`, hsa.line13_deduction);
  set(`8889.${idx}.employer_contributions`, hsa.employer_contributions);
  return { name, pages: 1 };
}

function emit_return_header(
  fields: Record<LineId, FieldWithConfidence<number | string>>,
  return_data: TaxReturn,
): { name: string; pages: number } {
  const name = `Form1040_${return_data.case_id}.pdf`;
  const set = (line_id: LineId, value: number | string): void => {
    fields[line_id] = make_field(line_id, value, ref(name, 1, line_id));
  };
  set("1040.tax_year", return_data.tax_year);
  set("1040.filing_status", return_data.filing_status);
  set("1040.case_id", return_data.case_id);
  if (typeof return_data.agi === "number") {
    set("1040.agi", return_data.agi);
  }
  if (typeof return_data.total_tax === "number") {
    set("1040.total_tax", return_data.total_tax);
  }
  for (const sr of return_data.state_returns) {
    set(`state.${sr.state}.residency`, sr.residency);
    set(`state.${sr.state}.state_wages`, sr.state_wages);
    set(`state.${sr.state}.state_withholding`, sr.state_withholding);
  }
  return { name, pages: 2 };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Walk the tax return and emit a deterministic mocked OCR view.
 *
 * The returned object is safe to serialize to JSON and ship across the
 * Next.js API boundary unchanged.
 */
export function mock_ocr(return_data: TaxReturn): MockedOCROutput {
  const fields: Record<LineId, FieldWithConfidence<number | string>> = {};
  const documents: { name: string; pages: number }[] = [];

  documents.push(emit_return_header(fields, return_data));

  return_data.w2s.forEach((w2, idx) => {
    documents.push(emit_w2_fields(fields, idx, w2));
  });
  return_data.form_1099_b.forEach((form, idx) => {
    documents.push(emit_1099b_fields(fields, idx, form));
  });
  return_data.form_1099_div.forEach((form, idx) => {
    documents.push(emit_1099div_fields(fields, idx, form));
  });
  return_data.k1s.forEach((k1, idx) => {
    documents.push(emit_k1_fields(fields, idx, k1));
  });
  return_data.form_1098.forEach((form, idx) => {
    documents.push(emit_1098_fields(fields, idx, form));
  });
  return_data.rental_properties.forEach((rental, idx) => {
    documents.push(emit_rental_fields(fields, idx, rental));
  });
  return_data.hsa.forEach((hsa, idx) => {
    documents.push(emit_hsa_fields(fields, idx, hsa));
  });

  return { fields, documents };
}

/**
 * Exported so tests can verify the low-confidence set stays in sync with
 * the fields actually emitted. The workbench UI should also consume this
 * to highlight fields that warrant expert review.
 */
export const LOW_CONFIDENCE_LINE_IDS = LOW_CONFIDENCE_LINES;
