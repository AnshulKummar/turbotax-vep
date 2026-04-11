/**
 * Minimal fixtures for rule unit tests.
 *
 * These are intentionally bare — a rule's positive case should need
 * only the fields that rule inspects, and a negative case should have
 * an empty return with no triggers.
 */

import type {
  Person,
  TaxReturn,
} from "@/contracts";

export const dummy_person: Person = {
  id: "fixture-person-001",
  first_name: "Test",
  last_name: "Person",
  ssn: "900-00-0000",
  dob: "1985-01-01",
};

export const empty_return: TaxReturn = {
  tax_year: 2025,
  case_id: "fixture-empty",
  filing_status: "mfj",
  taxpayer: dummy_person,
  spouse: { ...dummy_person, id: "fixture-spouse", first_name: "Spouse" },
  dependents: [],
  address: {
    line1: "1 Fixture Way",
    city: "Testville",
    state: "IL",
    zip: "60000",
  },
  w2s: [],
  form_1099_b: [],
  form_1099_div: [],
  k1s: [],
  form_1098: [],
  rental_properties: [],
  hsa: [],
  state_returns: [],
  agi: 0,
};

export function make_return(partial: Partial<TaxReturn>): TaxReturn {
  return { ...empty_return, ...partial };
}
