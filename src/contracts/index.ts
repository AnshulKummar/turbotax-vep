/**
 * Cross-layer contracts for the Virtual Expert Workbench.
 *
 * These types are the ONLY shared surface between the six build agents.
 * Per ADR-008, agents do not import each other's internals — they consume
 * each other through these contracts.
 *
 * If you need to change a contract, surface it as a blocker rather than
 * mutating this file unilaterally. Contract drift is the failure mode of
 * multi-agent code generation.
 *
 * Owner: Architecture (pinned before Sprint 1 kickoff)
 * Consumers: All six build agents
 */

import { z } from "zod/v4";

// ============================================================================
// PRIMITIVES
// ============================================================================

export type FilingStatus = "single" | "mfj" | "mfs" | "hoh" | "qw";
export type StateCode = "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE"
  | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME"
  | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ"
  | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD"
  | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY" | "DC";

/** A confidence score, always in [0, 1]. */
export type Confidence = number;

/** A line ID on the return surface, e.g. "1040.line.1a" or "8949.row.7". */
export type LineId = string;

/** A document reference for click-through provenance. */
export interface DocumentRef {
  source_document: string;  // e.g. "W2_Olivia.pdf"
  page: number;
  bbox?: [number, number, number, number];  // x, y, w, h in PDF points
}

// ============================================================================
// TAX RETURN (owned by Agent 1)
// ============================================================================

export interface Person {
  id: string;            // synthetic stable ID, never a real SSN
  first_name: string;
  last_name: string;
  ssn: string;           // synthetic, format-valid only
  dob: string;           // YYYY-MM-DD
  occupation?: string;
}

export interface Address {
  line1: string;
  line2?: string;
  city: string;
  state: StateCode;
  zip: string;
  county?: string;       // for property records / depreciation rules
}

export interface W2 {
  employer_name: string;
  employer_ein: string;
  employee: Person;
  box1_wages: number;
  box2_fed_withholding: number;
  box3_ss_wages: number;
  box4_ss_withholding: number;
  box5_medicare_wages: number;
  box6_medicare_withholding: number;
  box12: { code: string; amount: number }[];   // RSUs land here as code "V"
  box14: { label: string; amount: number }[];
  state_wages: { state: StateCode; wages: number; withholding: number }[];
}

export type WashSaleCode = "W" | "B" | "T" | "N" | "X" | "Q" | "S" | null;

export interface BrokerageLot {
  lot_id: string;
  description: string;            // e.g. "100 sh AAPL"
  date_acquired: string;          // YYYY-MM-DD
  date_sold: string;
  proceeds: number;
  cost_basis: number;
  wash_sale_loss_disallowed?: number;
  code: WashSaleCode;             // Code W means wash sale
  reported_to_irs: boolean;       // covered (true) vs noncovered (false)
}

export interface Form1099B {
  payer_name: string;
  payer_ein: string;
  recipient: Person;
  lots: BrokerageLot[];
}

export interface Form1099Div {
  payer_name: string;
  payer_ein: string;
  recipient: Person;
  ordinary_dividends: number;
  qualified_dividends: number;
  capital_gain_distributions: number;
  foreign_tax_paid?: number;
}

export interface ScheduleK1 {
  partnership_name: string;
  partnership_ein: string;
  partner: Person;
  is_passive: boolean;
  ordinary_business_income: number;     // box 1
  rental_real_estate_income: number;    // box 2
  interest_income: number;
  dividend_income: number;
  guaranteed_payments: number;
  section_179_deduction: number;
}

export interface Form1098 {
  lender_name: string;
  borrower: Person;
  property_address: Address;
  mortgage_interest_paid: number;       // box 1
  outstanding_principal: number;
  property_tax_paid?: number;
}

export interface RentalProperty {
  property_id: string;
  address: Address;
  fair_rental_days: number;
  personal_use_days: number;
  related_party_rental: boolean;
  rents_received: number;
  expenses: {
    advertising: number;
    auto_travel: number;
    cleaning_maintenance: number;
    commissions: number;
    insurance: number;
    legal_professional: number;
    management_fees: number;
    mortgage_interest: number;
    repairs: number;
    supplies: number;
    taxes: number;
    utilities: number;
    other: number;
  };
  /**
   * Depreciation basis. The IRC §168 / Pub 527 rule is that LAND must be
   * excluded from the depreciable basis. The Mitchell return deliberately
   * does NOT split land/building so the rules engine can detect it.
   */
  depreciation: {
    purchase_price: number;
    land_value?: number;          // missing on Mitchell return — that is the bug
    building_value?: number;      // missing on Mitchell return
    placed_in_service: string;    // YYYY-MM-DD
    depreciation_method: "MACRS_27.5" | "MACRS_39" | "ADS";
    prior_year_depreciation: number;
    current_year_depreciation: number;
  };
}

export interface HSAContribution {
  account_holder: Person;
  /** Form 8889 line 2: contributions made by the taxpayer */
  line2_contributions: number;
  /** Form 8889 line 6: allowable contributions (after limits) */
  line6_allowable: number;
  /** Form 8889 line 13: HSA deduction (Schedule 1) */
  line13_deduction: number;
  /** Coverage type drives the contribution limit */
  coverage: "self" | "family";
  /** Employer contributions — should NOT be in line 2 */
  employer_contributions: number;
}

export interface StateReturnSlice {
  state: StateCode;
  residency: "resident" | "part_year_resident" | "non_resident";
  workdays_in_state?: number;
  state_wages: number;
  state_withholding: number;
  ptet_election_eligible?: boolean;
}

export interface PriorYearSnapshot {
  tax_year: number;
  filing_status: FilingStatus;
  agi: number;
  total_tax: number;
  refund_or_owed: number;
  filed_date: string;
  prior_preparer_name?: string;
  prior_preparer_credential?: "CPA" | "EA" | "Attorney" | "AFSP" | "Unenrolled";
  notes?: string;                  // free-text notes from prior expert
  carryforwards?: {
    capital_loss?: number;
    passive_activity_loss?: number;
    nol?: number;
    foreign_tax_credit?: number;
    amt_credit?: number;
  };
}

export interface TaxReturn {
  tax_year: number;                // 2025 for the Mitchell hero return
  case_id: string;
  filing_status: FilingStatus;
  taxpayer: Person;
  spouse?: Person;
  dependents: Person[];
  address: Address;

  w2s: W2[];
  form_1099_b: Form1099B[];
  form_1099_div: Form1099Div[];
  k1s: ScheduleK1[];
  form_1098: Form1098[];
  rental_properties: RentalProperty[];
  hsa: HSAContribution[];

  state_returns: StateReturnSlice[];

  /** The prior year on file. Required for YoY delta engine (Agent 3). */
  prior_year?: PriorYearSnapshot;

  /** Computed by the rules engine; do not set manually. */
  agi?: number;
  total_tax?: number;
}

// ============================================================================
// CUSTOMER GOALS (owned by Agent 2, schema in ADR-005)
// ============================================================================

export const GOAL_IDS = [
  "maximize_refund",
  "minimize_audit_risk",
  "plan_life_event",
  "optimize_next_year",
  "harvest_losses",
  "optimize_retirement",
  "simplify_filing",
  "dispute_irs_notice",
  "plan_major_purchase",
  "other",
] as const;

export type GoalId = (typeof GOAL_IDS)[number];

export type GoalTag =
  | "refund" | "deductions" | "credits"
  | "audit_risk" | "conservatism" | "documentation"
  | "life_event" | "dependent" | "marriage" | "home"
  | "carryforward" | "loss_harvesting" | "investment"
  | "retirement" | "ira" | "401k"
  | "speed" | "simplicity"
  | "irs_notice" | "amendment"
  | "major_purchase" | "business";

export interface Goal {
  /** One of the canonical goal IDs, or "other" with free text. */
  id: GoalId;
  /** Customer rank, 1 = highest priority. Top three only. */
  rank: 1 | 2 | 3;
  /** Customer-stated weight 1-5 (intensity of the preference). */
  weight: 1 | 2 | 3 | 4 | 5;
  /** Free text rationale, optional. Required when id === "other". */
  rationale?: string;
  /** Tag vector — set automatically from the taxonomy unless id === "other". */
  tags: GoalTag[];
}

export const GoalSchema = z.object({
  id: z.enum(GOAL_IDS),
  rank: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  weight: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  rationale: z.string().max(500).optional(),
  tags: z.array(z.string()),
});

export interface CustomerContext {
  case_id: string;
  customer_display_name: string;
  goals: Goal[];
  prior_year_summary?: string;
  prior_expert_notes?: string;
}

// ============================================================================
// RULES ENGINE (owned by Agent 1, consumed by Agents 2 and 3)
// ============================================================================

export type RuleSeverity = 1 | 2 | 3 | 4 | 5;

export type RuleCategory =
  | "wash_sale"
  | "hsa"
  | "rsu"
  | "passive_activity_loss"
  | "depreciation"
  | "foreign_tax_credit"
  | "salt_cap"
  | "retirement_contribution"
  | "ptet_election"
  | "section_121"
  | "credit_eligibility"
  | "amt"
  | "estimated_tax";

export interface DollarImpact {
  /** Best-estimate dollar impact (positive = customer benefit). */
  estimate: number;
  /** Lower bound of the impact range. */
  low: number;
  /** Upper bound of the impact range. */
  high: number;
}

/**
 * A finding produced by a deterministic tax rule.
 *
 * Per ADR-003, the LLM is NOT allowed to invent findings outside this list.
 * If the LLM wants to surface something the rules engine missed, it must be
 * marked llm_only on the Recommendation, with confidence capped at 0.5.
 */
export interface RuleFinding {
  finding_id: string;
  rule_id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  /** IRC section, e.g. "IRC §1091" for wash sale */
  irc_citation: string;
  pub_citation?: string;
  /** Plain-language one-liner, max 140 chars */
  summary: string;
  /** Long-form explanation the workbench shows on click */
  detail: string;
  affected_lines: LineId[];
  dollar_impact: DollarImpact;
  /** -1 (lowers risk) to +1 (raises risk) */
  audit_risk_delta: number;
}

export interface Rule {
  id: string;
  name: string;
  category: RuleCategory;
  severity: RuleSeverity;
  irc_citation: string;
  pub_citation?: string;
  /** Returns zero or more findings if the rule fires against the return. */
  evaluate: (return_data: TaxReturn) => RuleFinding[];
}

// ============================================================================
// PRE-WORK OUTPUT (owned by Agent 3)
// ============================================================================

export interface FieldWithConfidence<T> {
  value: T;
  confidence: Confidence;
  source?: DocumentRef;
}

export interface MockedOCROutput {
  /**
   * The "as if a real OCR had produced it" view of the return.
   * Each field carries a confidence and a click-through source ref.
   */
  fields: Record<LineId, FieldWithConfidence<number | string>>;
  /** Document refs in source order, for the provenance modal. */
  documents: { name: string; pages: number }[];
}

export interface YoYDelta {
  line_id: LineId;
  current_value: number;
  prior_value: number;
  delta: number;
  delta_percent: number;
  /** Plain-language explanation, e.g. "RSU vesting up $42K from a new vest tranche" */
  explanation: string;
}

export interface ComplexityScore {
  /** 1-10, where 10 is the most complex */
  score: number;
  /** Per-factor breakdown for transparency */
  factors: {
    factor: string;
    contribution: number;
  }[];
}

export interface RiskRegisterEntry {
  id: string;
  rule_id: string;
  severity: RuleSeverity;
  dollar_impact_estimate: number;
  audit_risk_delta: number;
  irc_citation: string;
  one_line_summary: string;
  affected_lines: LineId[];
  /** Rank, 1 = highest priority */
  rank: number;
}

export interface PreWorkOutput {
  case_id: string;
  ocr: MockedOCROutput;
  yoy_delta: YoYDelta[];
  complexity: ComplexityScore;
  risk_register: RiskRegisterEntry[];
}

// ============================================================================
// RECOMMENDATIONS (owned by Agent 2)
// ============================================================================

export interface GoalFitScore {
  goal_id: GoalId;
  /** [0, 1] — how well this recommendation advances this specific goal */
  score: number;
  /** Plain-language reason this recommendation serves the goal */
  rationale: string;
}

export interface Recommendation {
  id: string;
  /** The rule finding this recommendation maps to. */
  rule_id: string;
  /** Null only if llm_only === true (and only with confidence <= 0.5). */
  finding_id: string | null;
  category: RuleCategory;
  severity: RuleSeverity;
  irc_citation: string;
  pub_citation?: string;
  one_line_summary: string;
  detail: string;
  affected_lines: LineId[];
  dollar_impact: DollarImpact;
  audit_risk_delta: number;
  /** Per-goal fit + composite */
  goal_fits: GoalFitScore[];
  composite_goal_fit: number;
  /** [0, 1] — confidence the recommendation is correct */
  confidence: Confidence;
  /** True if the LLM surfaced this without a backing rule finding (capped 0.5) */
  llm_only: boolean;
  /** Audit trail row ID linking back to the LLM call that produced this rec */
  audit_id: string;
}

// ============================================================================
// ROUTING (owned by Layer 2; mocked in Sprint 1 as a single chip)
// ============================================================================

export interface RoutingDecision {
  case_id: string;
  expert_id: string;
  expert_display_name: string;
  expert_credentials: ("CPA" | "EA" | "Attorney" | "AFSP")[];
  reasons: {
    specialty_match: string[];      // e.g. ["RSU", "multi-state IL+CA"]
    jurisdiction_match: StateCode[];
    continuity: boolean;            // same expert as last year
    complexity_score: number;       // from PreWorkOutput.complexity
  };
  eta_to_handoff_minutes: number;
}

// ============================================================================
// EXPERT ACTIONS + AUDIT TRAIL (owned by Agent 5)
// ============================================================================

export type ExpertActionType = "accept" | "edit" | "reject" | "defer";

export interface ExpertAction {
  id: string;
  recommendation_id: string;
  type: ExpertActionType;
  reason?: string;
  /** For "edit": what the expert changed the value to */
  edited_value?: string | number;
  ts: string;                       // ISO 8601
}

export type AuditEventType =
  | "llm_call"
  | "recommendation_produced"
  | "expert_action"
  | "case_routed"
  | "goals_captured"
  | "prework_completed";

export interface AuditEvent {
  id: number;                       // SQLite autoincrement
  ts: string;                       // ISO 8601
  case_id: string;
  event_type: AuditEventType;
  model?: string;                   // e.g. "claude-sonnet-4-6"
  redacted_prompt?: string;         // [PII_TYPE_HASH8] form, never raw PII
  response_summary?: string;
  expert_action?: ExpertActionType;
  expert_reason?: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// PII REDACTION (owned by Agent 5, ADR-006)
// ============================================================================

export type PIIType =
  | "SSN" | "EIN" | "ACCOUNT" | "ROUTING"
  | "EMAIL" | "PHONE" | "ADDRESS" | "ZIP" | "DOB"
  | "PERSON_NAME";

export interface RedactedPrompt {
  /** The redacted string with [PII_TYPE_HASH8] tokens in place of real PII */
  redacted_text: string;
  /** Map from token (e.g. "[SSN_a3f8b1c2]") to original-value hash. Never original. */
  token_map: Record<string, { type: PIIType; original_hash: string }>;
  /** Per-session salt used for the hash. Never persisted with the original. */
  session_salt: string;
}

// ============================================================================
// CALIBRATION (owned by Agent 5, ADR-007)
// ============================================================================

export interface CalibrationDecile {
  decile: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  predicted_confidence_avg: number;
  empirical_accuracy: number;
  sample_count: number;
}

export interface CalibrationRun {
  id: number;
  ts: string;
  test_set_size: number;
  /** Max gap between predicted and empirical, in percentage points */
  max_calibration_error: number;
  decile_curve: CalibrationDecile[];
  /** True if max_calibration_error <= 5 (the CI gate threshold) */
  passed_gate: boolean;
}

// ============================================================================
// API REQUEST / RESPONSE SHAPES (the surface Agents 4 + 6 consume)
// ============================================================================

export interface RecommendationsRequest {
  return_data: TaxReturn;
  goals: Goal[];
  customer_context: CustomerContext;
}

export interface RecommendationsResponse {
  recommendations: Recommendation[];
  audit_id: number;
}

export interface PreWorkRequest {
  return_data: TaxReturn;
  prior_return?: PriorYearSnapshot;
}

export type PreWorkResponse = PreWorkOutput;

export interface AuditTrailResponse {
  events: AuditEvent[];
}

// ============================================================================
// CONTRACT VERSION
// ============================================================================

/**
 * Increment when any contract above changes. Agents check this on boot
 * and refuse to run against an unexpected version.
 */
export const CONTRACT_VERSION = "1.0.0";

// Re-export Sprint 3 customer metadata contract
export type { CustomerMetadata } from "./customer-metadata";
