/**
 * POST /api/prework
 *
 * Accepts a synthetic `TaxReturn` (and optional `PriorYearSnapshot` that
 * overrides the `return_data.prior_year` field) and returns a
 * `PreWorkOutput`: mocked OCR view, YoY delta strip, complexity score,
 * and ranked risk register.
 *
 * All deterministic — no LLM calls, no network I/O, no persistence.
 * Per ADR-002 the request body is synthetic data only. The route does
 * not import Agent 5's PII redactor because there is no real PII to
 * redact in the prototype.
 *
 * Validation is via Zod v4 against a schema that mirrors the subset of
 * the `TaxReturn` contract we actually read. Unknown fields pass through
 * (`passthrough`) so the contract can grow without breaking the route.
 */

import { NextResponse } from "next/server";
import { z } from "zod/v4";

import { evaluate_all } from "@/lib/rules";
import { run_prework } from "@/lib/prework";
import type { PreWorkOutput, PreWorkRequest, TaxReturn } from "@/contracts";

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const person_schema = z
  .object({
    id: z.string(),
    first_name: z.string(),
    last_name: z.string(),
    ssn: z.string(),
    dob: z.string(),
    occupation: z.string().optional(),
  })
  .passthrough();

const address_schema = z
  .object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    zip: z.string(),
    county: z.string().optional(),
  })
  .passthrough();

const state_wages_schema = z
  .object({
    state: z.string(),
    wages: z.number(),
    withholding: z.number(),
  })
  .passthrough();

const box12_schema = z
  .object({ code: z.string(), amount: z.number() })
  .passthrough();

const box14_schema = z
  .object({ label: z.string(), amount: z.number() })
  .passthrough();

const w2_schema = z
  .object({
    employer_name: z.string(),
    employer_ein: z.string(),
    employee: person_schema,
    box1_wages: z.number(),
    box2_fed_withholding: z.number(),
    box3_ss_wages: z.number(),
    box4_ss_withholding: z.number(),
    box5_medicare_wages: z.number(),
    box6_medicare_withholding: z.number(),
    box12: z.array(box12_schema),
    box14: z.array(box14_schema),
    state_wages: z.array(state_wages_schema),
  })
  .passthrough();

const brokerage_lot_schema = z
  .object({
    lot_id: z.string(),
    description: z.string(),
    date_acquired: z.string(),
    date_sold: z.string(),
    proceeds: z.number(),
    cost_basis: z.number(),
    wash_sale_loss_disallowed: z.number().optional(),
    code: z.union([z.string(), z.null()]).optional(),
    reported_to_irs: z.boolean(),
  })
  .passthrough();

const form_1099_b_schema = z
  .object({
    payer_name: z.string(),
    payer_ein: z.string(),
    recipient: person_schema,
    lots: z.array(brokerage_lot_schema),
  })
  .passthrough();

const form_1099_div_schema = z
  .object({
    payer_name: z.string(),
    payer_ein: z.string(),
    recipient: person_schema,
    ordinary_dividends: z.number(),
    qualified_dividends: z.number(),
    capital_gain_distributions: z.number(),
    foreign_tax_paid: z.number().optional(),
  })
  .passthrough();

const k1_schema = z
  .object({
    partnership_name: z.string(),
    partnership_ein: z.string(),
    partner: person_schema,
    is_passive: z.boolean(),
    ordinary_business_income: z.number(),
    rental_real_estate_income: z.number(),
    interest_income: z.number(),
    dividend_income: z.number(),
    guaranteed_payments: z.number(),
    section_179_deduction: z.number(),
  })
  .passthrough();

const form_1098_schema = z
  .object({
    lender_name: z.string(),
    borrower: person_schema,
    property_address: address_schema,
    mortgage_interest_paid: z.number(),
    outstanding_principal: z.number(),
    property_tax_paid: z.number().optional(),
  })
  .passthrough();

const rental_property_schema = z
  .object({
    property_id: z.string(),
    address: address_schema,
    fair_rental_days: z.number(),
    personal_use_days: z.number(),
    related_party_rental: z.boolean(),
    rents_received: z.number(),
    expenses: z
      .object({
        advertising: z.number(),
        auto_travel: z.number(),
        cleaning_maintenance: z.number(),
        commissions: z.number(),
        insurance: z.number(),
        legal_professional: z.number(),
        management_fees: z.number(),
        mortgage_interest: z.number(),
        repairs: z.number(),
        supplies: z.number(),
        taxes: z.number(),
        utilities: z.number(),
        other: z.number(),
      })
      .passthrough(),
    depreciation: z
      .object({
        purchase_price: z.number(),
        land_value: z.number().optional(),
        building_value: z.number().optional(),
        placed_in_service: z.string(),
        depreciation_method: z.string(),
        prior_year_depreciation: z.number(),
        current_year_depreciation: z.number(),
      })
      .passthrough(),
  })
  .passthrough();

const hsa_schema = z
  .object({
    account_holder: person_schema,
    line2_contributions: z.number(),
    line6_allowable: z.number(),
    line13_deduction: z.number(),
    coverage: z.union([z.literal("self"), z.literal("family")]),
    employer_contributions: z.number(),
  })
  .passthrough();

const state_slice_schema = z
  .object({
    state: z.string(),
    residency: z.union([
      z.literal("resident"),
      z.literal("part_year_resident"),
      z.literal("non_resident"),
    ]),
    workdays_in_state: z.number().optional(),
    state_wages: z.number(),
    state_withholding: z.number(),
    ptet_election_eligible: z.boolean().optional(),
  })
  .passthrough();

const prior_year_schema = z
  .object({
    tax_year: z.number(),
    filing_status: z.string(),
    agi: z.number(),
    total_tax: z.number(),
    refund_or_owed: z.number(),
    filed_date: z.string(),
    prior_preparer_name: z.string().optional(),
    prior_preparer_credential: z.string().optional(),
    notes: z.string().optional(),
    carryforwards: z
      .object({
        capital_loss: z.number().optional(),
        passive_activity_loss: z.number().optional(),
        nol: z.number().optional(),
        foreign_tax_credit: z.number().optional(),
        amt_credit: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

const tax_return_schema = z
  .object({
    tax_year: z.number(),
    case_id: z.string(),
    filing_status: z.union([
      z.literal("single"),
      z.literal("mfj"),
      z.literal("mfs"),
      z.literal("hoh"),
      z.literal("qw"),
    ]),
    taxpayer: person_schema,
    spouse: person_schema.optional(),
    dependents: z.array(person_schema),
    address: address_schema,
    w2s: z.array(w2_schema),
    form_1099_b: z.array(form_1099_b_schema),
    form_1099_div: z.array(form_1099_div_schema),
    k1s: z.array(k1_schema),
    form_1098: z.array(form_1098_schema),
    rental_properties: z.array(rental_property_schema),
    hsa: z.array(hsa_schema),
    state_returns: z.array(state_slice_schema),
    prior_year: prior_year_schema.optional(),
    agi: z.number().optional(),
    total_tax: z.number().optional(),
  })
  .passthrough();

const request_schema = z.object({
  return_data: tax_return_schema,
  prior_return: prior_year_schema.optional(),
});

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = request_schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid request body",
        issues: parsed.error.issues,
      },
      { status: 400 },
    );
  }

  // Zod's passthrough turns the parsed object into a looser shape than
  // the TaxReturn contract. We cast here because the schema validates
  // the fields we actually read; any extra keys are preserved via
  // passthrough but not typed by the contract.
  const payload = parsed.data as PreWorkRequest;
  const return_data = payload.return_data as TaxReturn;

  const findings = evaluate_all(return_data);
  const output: PreWorkOutput = run_prework(
    return_data,
    findings,
    payload.prior_return,
  );

  return NextResponse.json(output, { status: 200 });
}
