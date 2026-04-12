/**
 * Demo document catalogue — Sprint 3 T-E04.
 *
 * All document names are obviously synthetic per AD-S2-05.
 * These simulate the documents a customer "uploads" during the TurboTax
 * intake flow. The IDs are used in CustomerMetadata.document_ids.
 */

export interface DemoDocument {
  id: string; // e.g. "w2-acme"
  form_type: string; // e.g. "W-2"
  issuer: string; // e.g. "ACME Corp (synthetic)"
  description: string; // e.g. "Wages & salary — $185,000"
  category: "income" | "deduction" | "investment" | "health" | "other";
}

export const DEMO_DOCUMENTS: readonly DemoDocument[] = [
  {
    id: "w2-acme",
    form_type: "W-2",
    issuer: "ACME Corp (synthetic)",
    description: "Wages & salary — $185,000",
    category: "income",
  },
  {
    id: "w2-innovex",
    form_type: "W-2",
    issuer: "Innovex Labs (synthetic)",
    description: "Wages & salary — $141,000",
    category: "income",
  },
  {
    id: "1099-int",
    form_type: "1099-INT",
    issuer: "Synthetic Credit Union",
    description: "Interest income — $2,340",
    category: "income",
  },
  {
    id: "1099-div",
    form_type: "1099-DIV",
    issuer: "Example Brokerage (synthetic)",
    description: "Dividends — $8,750 ($3,200 qualified)",
    category: "investment",
  },
  {
    id: "1099-b",
    form_type: "1099-B",
    issuer: "Example Brokerage (synthetic)",
    description: "Capital gains — $12,400 proceeds",
    category: "investment",
  },
  {
    id: "1098",
    form_type: "1098",
    issuer: "Sample Mortgage Co. (synthetic)",
    description: "Mortgage interest — $18,200",
    category: "deduction",
  },
  {
    id: "1099-r",
    form_type: "1099-R",
    issuer: "Retirement Plan Admin (synthetic)",
    description: "Retirement distribution — $0 (rollover)",
    category: "income",
  },
  {
    id: "1095-a",
    form_type: "1095-A",
    issuer: "Health Insurance Marketplace",
    description: "Health coverage verification",
    category: "health",
  },
] as const;

export const DOCUMENT_IDS = DEMO_DOCUMENTS.map((d) => d.id);

export function get_documents_by_ids(ids: string[]): DemoDocument[] {
  const id_set = new Set(ids);
  return DEMO_DOCUMENTS.filter((d) => id_set.has(d.id));
}
