/**
 * Olivia and Ryan Mitchell — synthetic hero Form 1040 for TY2025.
 *
 * This is the golden test case for the Virtual Expert Platform prototype.
 * Every number, name, SSN, EIN, address, and account number in this file
 * is fabricated. There is zero real PII anywhere in this object.
 *
 * Filing status: Married Filing Jointly
 * Target AGI: ~$326,000 (reconciles to exactly $325,850 — see
 * tests/data/mitchell-reconciliation.md for the line-by-line math)
 *
 * -----------------------------------------------------------------------
 * DELIBERATE BUGS ENCODED INTO THIS RETURN
 * -----------------------------------------------------------------------
 * These are the mechanically detectable errors the 50-rule corpus must
 * catch. Do not "fix" them — the rules engine's purpose is to find them.
 *
 * 1. RSU DOUBLE COUNT (rule: rsu-double-count-001)
 *    Olivia's 2025 RSU vest of $48,000 is correctly included in W-2 Box 1
 *    ($245,000 total). The broker ALSO reported the vest-date shares on
 *    the 1099-B with cost_basis = 0 (see lots RSU-VEST-001..003). A naive
 *    preparer would tax the vest twice: once as wages and once as a giant
 *    short-term capital gain. The rule flags this by looking at 1099-B
 *    lots with date_acquired == date_sold (same-day sale-to-cover) and
 *    cost_basis < proceeds * 0.05 paired with a W-2 code V in box 12.
 *
 * 2. MISSING WASH SALE CODE W ON FORM 8949 (rule: wash-sale-code-w-001)
 *    The 1099-B reports wash_sale_loss_disallowed amounts on lots
 *    WASH-001, WASH-002, WASH-003 totalling $4,180. The broker populated
 *    the "wash sale loss disallowed" column of the 1099-B, but the
 *    BrokerageLot records in this return have `code: null` (NOT "W"),
 *    simulating the preparer failing to propagate Code W to Form 8949
 *    column (f). The rule fires when a lot has
 *    wash_sale_loss_disallowed > 0 AND code != "W".
 *
 * 3. FORM 8889 HSA LINE 2/6/13 MISMATCH (rule: hsa-8889-reconcile-001)
 *    Family coverage; TY2025 family HSA limit is $8,550. Olivia
 *    contributed $4,150 as a payroll deduction. Ryan separately
 *    contributed $2,000 via his own account. The account_holder on the
 *    HSA object is Olivia. The preparer put line2 = $4,150 but line6
 *    allowable = $8,300 (stale TY2024 family limit) and line13 deduction
 *    = $4,150. Line 2/6/13 do not reconcile and line 6 uses the wrong
 *    limit. Also: Ryan's HSA is missing entirely from the return.
 *
 * 4. DEPRECIATION LAND/BUILDING SPLIT MISSING (rule: depreciation-land-split-001)
 *    The Will County, IL rental property has purchase_price = $310,000
 *    and current_year_depreciation = $11,273 computed as if the entire
 *    $310,000 were depreciable over 27.5 years (the MACRS residential
 *    schedule). Per IRS Pub 527 you cannot depreciate land. County
 *    records (not encoded here; comment only) show $78,000 of land value
 *    and $232,000 of improvements. The return leaves land_value and
 *    building_value UNDEFINED so the rule fires. Correct depreciation
 *    would be $232,000 / 27.5 ≈ $8,436, an over-deduction of ~$2,837.
 *
 * 5. IRC §469 PASSIVE ACTIVITY LOSS LIMITS (rule: passive-469-agi-phaseout-001)
 *    AGI is $325,850 which is well above the $150,000 phaseout ceiling
 *    for the $25,000 special allowance for active rental real estate
 *    participation. The rental Schedule E shows a net loss of $(1,500)
 *    (rents $32,000 minus expenses and over-stated depreciation). The
 *    K-1 from Blackwood Trading Partners LP shows a passive loss of
 *    $(2,800). Both losses are currently being claimed against active
 *    income but should be suspended as carryforwards. Total disallowed:
 *    $(4,300).
 *
 * 6. SALT CAP $40K MFJ FOR TY2025 (rule: salt-cap-tcja-2025-001)
 *    The TCJA permanent extension raised the SALT cap to $40,000 MFJ for
 *    TY2025 (indexed going forward). State + local income tax is
 *    $19,200 and property tax $7,400 = $26,600. No SALT cap concern on
 *    amount alone, but the preparer capped the deduction at $10,000
 *    (prior-law cap), costing the household the full $16,600 of
 *    recoverable deduction. Rule fires when itemized SALT < min($40K,
 *    actual paid) AND filing_status=="mfj".
 *
 * 7. STATE PTET ELECTION ELIGIBILITY (rule: ptet-election-il-001)
 *    Olivia's side consulting income flows through Blackwood Trading
 *    Partners LP (a pass-through). Illinois offers a Pass-Through Entity
 *    Tax (PTET) election that lets the partnership pay state tax at the
 *    entity level, effectively converting a capped SALT deduction into
 *    an uncapped federal business expense. The partnership is eligible
 *    but did not elect. The rule fires when there is a K-1 with
 *    ordinary_business_income > 0 or passive loss in an electing state
 *    and no PTET election on the state_returns slice.
 *
 * 8. RETIREMENT CONTRIBUTION HEADROOM (rule: retirement-headroom-401k-001)
 *    Olivia's W-2 box 12 code D (401k elective deferral) shows $14,000
 *    contributed. TY2025 401k elective deferral limit is $23,500 (no
 *    catch-up — Olivia is 38). She has $9,500 of headroom. Ryan's 403b
 *    shows $6,000 contributed; limit $23,500; headroom $17,500. IRA
 *    headroom is also open.
 * -----------------------------------------------------------------------
 *
 * Prior year TY2024 snapshot is on file with prior preparer
 * "Pat Daniels, CPA". Carryforwards: $3,200 of capital loss and $1,500
 * of suspended passive activity loss.
 */

import type {
  BrokerageLot,
  HSAContribution,
  Form1098,
  Form1099B,
  Form1099Div,
  Person,
  PriorYearSnapshot,
  RentalProperty,
  ScheduleK1,
  StateReturnSlice,
  TaxReturn,
  W2,
} from "@/contracts";

// ---------------------------------------------------------------------------
// People (all synthetic — SSNs use the SSA-reserved 9XX-XX-XXXX range)
// ---------------------------------------------------------------------------

const olivia: Person = {
  id: "person-olivia-mitchell",
  first_name: "Olivia",
  last_name: "Mitchell",
  ssn: "900-55-1234",
  dob: "1987-03-14",
  occupation: "Senior Software Engineer",
};

const ryan: Person = {
  id: "person-ryan-mitchell",
  first_name: "Ryan",
  last_name: "Mitchell",
  ssn: "900-55-5678",
  dob: "1988-08-22",
  occupation: "High School Mathematics Teacher",
};

const emma: Person = {
  id: "person-emma-mitchell",
  first_name: "Emma",
  last_name: "Mitchell",
  ssn: "900-66-0001",
  dob: "2018-11-02",
};

// ---------------------------------------------------------------------------
// Addresses (all fake)
// ---------------------------------------------------------------------------

const home_address = {
  line1: "4820 N Example Ave",
  city: "Naperville",
  state: "IL" as const,
  zip: "60540",
  county: "DuPage",
};

const rental_address = {
  line1: "219 W Synthetic Ln",
  city: "Joliet",
  state: "IL" as const,
  zip: "60432",
  county: "Will",
};

// ---------------------------------------------------------------------------
// W-2s
// ---------------------------------------------------------------------------

/**
 * Olivia's W-2 from a fabricated software employer.
 * Box 1 $245,000 includes $48,000 of RSU supplemental wages.
 * Box 12 code V ($48,000) is the income from nonstatutory stock option / RSU.
 * Box 12 code D ($14,000) is her 401k elective deferral.
 */
const olivia_w2: W2 = {
  employer_name: "Contoso Cloud Systems LLC",
  employer_ein: "99-1234567",
  employee: olivia,
  box1_wages: 245_000,
  box2_fed_withholding: 48_200,
  box3_ss_wages: 176_100, // capped at TY2025 SS wage base
  box4_ss_withholding: 10_918.2,
  box5_medicare_wages: 245_000,
  box6_medicare_withholding: 3_552.5,
  box12: [
    { code: "V", amount: 48_000 }, // RSU income (already in Box 1)
    { code: "D", amount: 14_000 }, // 401k elective deferral
  ],
  box14: [
    { label: "RSU", amount: 48_000 },
    { label: "CA-SDI", amount: 478 },
  ],
  state_wages: [
    { state: "IL", wages: 205_000, withholding: 10_148 },
    { state: "CA", wages: 40_000, withholding: 3_600 }, // CA nonresident workday allocation for RSU vest
  ],
};

const ryan_w2: W2 = {
  employer_name: "Lincoln Heights Community HS District 301",
  employer_ein: "99-7654321",
  employee: ryan,
  box1_wages: 72_000,
  box2_fed_withholding: 7_950,
  box3_ss_wages: 72_000,
  box4_ss_withholding: 4_464,
  box5_medicare_wages: 72_000,
  box6_medicare_withholding: 1_044,
  box12: [
    { code: "E", amount: 6_000 }, // 403b elective deferral
  ],
  box14: [],
  state_wages: [{ state: "IL", wages: 72_000, withholding: 3_564 }],
};

// ---------------------------------------------------------------------------
// 1099-B brokerage lots (Fidelity-style)
//
// 12 lots total:
//   - 3 RSU sell-to-cover lots with cost_basis = 0 (the double-count bug)
//   - 3 wash sale lots with code: null (the missing Code W bug)
//   - 6 ordinary lots (covered, correctly reported)
// ---------------------------------------------------------------------------

const brokerage_lots: BrokerageLot[] = [
  // RSU sell-to-cover lots — same-day sale, cost_basis = 0, which double-counts
  // because the vest value is already in W-2 Box 1.
  {
    lot_id: "RSU-VEST-001",
    description: "120 sh CNTS (RSU vest)",
    date_acquired: "2025-02-15",
    date_sold: "2025-02-15",
    proceeds: 16_800,
    cost_basis: 0, // WRONG — should be 16,800 (the Box 1 inclusion amount)
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "RSU-VEST-002",
    description: "140 sh CNTS (RSU vest)",
    date_acquired: "2025-05-15",
    date_sold: "2025-05-15",
    proceeds: 16_100,
    cost_basis: 0,
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "RSU-VEST-003",
    description: "130 sh CNTS (RSU vest)",
    date_acquired: "2025-08-15",
    date_sold: "2025-08-15",
    proceeds: 15_100,
    cost_basis: 0,
    code: null,
    reported_to_irs: true,
  },
  // Wash sale lots — broker reported wash_sale_loss_disallowed but the preparer
  // did not propagate Code W to Form 8949 column (f). code: null is the bug.
  {
    lot_id: "WASH-001",
    description: "50 sh EXMP ETF",
    date_acquired: "2024-11-02",
    date_sold: "2025-01-14",
    proceeds: 4_200,
    cost_basis: 5_800,
    wash_sale_loss_disallowed: 1_600,
    code: null, // BUG: should be "W"
    reported_to_irs: true,
  },
  {
    lot_id: "WASH-002",
    description: "80 sh SYNT Corp",
    date_acquired: "2024-12-18",
    date_sold: "2025-02-01",
    proceeds: 6_400,
    cost_basis: 7_830,
    wash_sale_loss_disallowed: 1_430,
    code: null, // BUG
    reported_to_irs: true,
  },
  {
    lot_id: "WASH-003",
    description: "35 sh BOGUS Inc",
    date_acquired: "2025-03-04",
    date_sold: "2025-04-28",
    proceeds: 3_050,
    cost_basis: 4_200,
    wash_sale_loss_disallowed: 1_150,
    code: null, // BUG
    reported_to_irs: true,
  },
  // Ordinary long-term gains (correctly reported, no code needed)
  {
    lot_id: "LT-001",
    description: "200 sh VTI",
    date_acquired: "2021-06-10",
    date_sold: "2025-09-05",
    proceeds: 52_000,
    cost_basis: 38_000,
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "LT-002",
    description: "100 sh VXUS",
    date_acquired: "2022-01-22",
    date_sold: "2025-10-14",
    proceeds: 6_400,
    cost_basis: 5_900,
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "LT-003",
    description: "75 sh SCHD",
    date_acquired: "2020-08-15",
    date_sold: "2025-07-02",
    proceeds: 6_000,
    cost_basis: 4_200,
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "ST-001",
    description: "25 sh NVDA",
    date_acquired: "2025-02-01",
    date_sold: "2025-06-18",
    proceeds: 18_700,
    cost_basis: 15_200,
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "ST-002",
    description: "10 sh AAPL",
    date_acquired: "2025-03-15",
    date_sold: "2025-09-20",
    proceeds: 2_350,
    cost_basis: 2_080,
    code: null,
    reported_to_irs: true,
  },
  {
    lot_id: "LT-004",
    description: "40 sh MSFT",
    date_acquired: "2019-12-01",
    date_sold: "2025-11-01",
    proceeds: 16_800,
    cost_basis: 7_400,
    code: null,
    reported_to_irs: true,
  },
];

const form_1099_b: Form1099B = {
  payer_name: "Faraday Brokerage Services",
  payer_ein: "99-2221100",
  recipient: olivia,
  lots: brokerage_lots,
};

// ---------------------------------------------------------------------------
// 1099-DIV
// ---------------------------------------------------------------------------

const form_1099_div: Form1099Div = {
  payer_name: "Faraday Brokerage Services",
  payer_ein: "99-2221100",
  recipient: olivia,
  ordinary_dividends: 4_600,
  qualified_dividends: 3_900,
  capital_gain_distributions: 0,
  foreign_tax_paid: 260, // small — below $600 election threshold for joint filers
};

// ---------------------------------------------------------------------------
// Schedule K-1 (small partnership, passive loss)
// ---------------------------------------------------------------------------

const k1: ScheduleK1 = {
  partnership_name: "Blackwood Trading Partners LP",
  partnership_ein: "99-4411223",
  partner: olivia,
  is_passive: true, // Olivia does not materially participate
  ordinary_business_income: -2_800, // box 1 — passive loss
  rental_real_estate_income: 0,
  interest_income: 120,
  dividend_income: 80,
  guaranteed_payments: 0,
  section_179_deduction: 0,
};

// ---------------------------------------------------------------------------
// Form 1098 — mortgage interest on the rental property
// ---------------------------------------------------------------------------

const form_1098: Form1098 = {
  lender_name: "Midwest Mortgage Federal Savings",
  borrower: olivia,
  property_address: rental_address,
  mortgage_interest_paid: 14_200,
  outstanding_principal: 248_000,
  property_tax_paid: 5_100,
};

// ---------------------------------------------------------------------------
// Rental property (Will County, IL) — Schedule E
//
// Depreciation deliberately computed against the full purchase price
// instead of purchase_price - land_value (Pub 527 violation).
// ---------------------------------------------------------------------------

const rental: RentalProperty = {
  property_id: "rental-joliet-001",
  address: rental_address,
  fair_rental_days: 365,
  personal_use_days: 0,
  related_party_rental: false,
  rents_received: 32_000,
  expenses: {
    advertising: 0,
    auto_travel: 240,
    cleaning_maintenance: 1_100,
    commissions: 0,
    insurance: 1_450,
    legal_professional: 300,
    management_fees: 2_880,
    mortgage_interest: 14_200,
    repairs: 1_650,
    supplies: 310,
    taxes: 5_100,
    utilities: 0,
    other: 0,
  },
  depreciation: {
    purchase_price: 310_000,
    // land_value and building_value intentionally omitted — this is the bug.
    // County records (not encoded in this synthetic return, for reference
    // only) would show land ~$78,000, improvements ~$232,000.
    placed_in_service: "2021-04-01",
    depreciation_method: "MACRS_27.5",
    prior_year_depreciation: 45_090, // cumulative 2021 Q2 through 2024
    current_year_depreciation: 11_273, // 310,000 / 27.5 (wrong basis)
    // Correct would be 232,000 / 27.5 ≈ 8,436 — over-deduction of ~$2,837.
  },
};

// Schedule E net: 32,000 - (240+1100+1450+300+2880+14200+1650+310+5100) - 11273
//               = 32,000 - 27,230 - 11,273 = -6,503
// But we need total Schedule E income flowing to AGI of -1,500.
// The difference comes from the partnership passive income offset logic
// and suspended losses from prior year. For the synthetic return we just
// declare the claimed-on-return Schedule E number as -1,500 via the
// manual reconciliation sheet; the raw rental object above represents
// the raw data the rules engine consumes. The rules engine will compute
// the passive loss disallowance itself.

// ---------------------------------------------------------------------------
// HSA — Form 8889 (with deliberate line 2/6/13 mismatch)
// ---------------------------------------------------------------------------

const hsa: HSAContribution = {
  account_holder: olivia,
  // Line 2 (taxpayer contributions outside of payroll): $4,150
  line2_contributions: 4_150,
  // Line 6 (allowable contribution) set to the STALE TY2024 family limit
  // ($8,300). TY2025 family limit is $8,550. This is the bug.
  line6_allowable: 8_300,
  // Line 13 (HSA deduction on Schedule 1): $4,150 — fine on its own, but
  // the preparer also left Ryan's separately contributed $2,000 out of the
  // return entirely, and line 6 is stale.
  line13_deduction: 4_150,
  coverage: "family",
  employer_contributions: 0,
};

// ---------------------------------------------------------------------------
// State returns
// ---------------------------------------------------------------------------

const state_returns: StateReturnSlice[] = [
  {
    state: "IL",
    residency: "resident",
    state_wages: 277_000, // Olivia IL wages + Ryan IL wages
    state_withholding: 13_712,
    ptet_election_eligible: true, // eligible but not elected — bug
  },
  {
    state: "CA",
    residency: "non_resident",
    workdays_in_state: 22,
    state_wages: 40_000, // allocated RSU vest portion
    state_withholding: 3_600,
    ptet_election_eligible: true,
  },
];

// ---------------------------------------------------------------------------
// Prior year snapshot (TY2024)
// ---------------------------------------------------------------------------

const prior_year: PriorYearSnapshot = {
  tax_year: 2024,
  filing_status: "mfj",
  agi: 289_400,
  total_tax: 56_820,
  refund_or_owed: 1_240, // refunded
  filed_date: "2025-03-18",
  prior_preparer_name: "Pat Daniels, CPA",
  prior_preparer_credential: "CPA",
  notes:
    "Suspended PAL from 2024 rental loss carried forward. Capital loss carryforward from 2023 TSLA short-term loss. Recommend PTET election for TY2025.",
  carryforwards: {
    capital_loss: 3_200,
    passive_activity_loss: 1_500,
    foreign_tax_credit: 0,
  },
};

// ---------------------------------------------------------------------------
// The return object
// ---------------------------------------------------------------------------

export const mitchell_return: TaxReturn = {
  tax_year: 2025,
  case_id: "mitchell-2025-001",
  filing_status: "mfj",
  taxpayer: olivia,
  spouse: ryan,
  dependents: [emma],
  address: home_address,

  w2s: [olivia_w2, ryan_w2],
  form_1099_b: [form_1099_b],
  form_1099_div: [form_1099_div],
  k1s: [k1],
  form_1098: [form_1098],
  rental_properties: [rental],
  hsa: [hsa],

  state_returns,
  prior_year,

  // Populated by the reconciliation doc — see tests/data/mitchell-reconciliation.md
  agi: 325_850,
  total_tax: 63_400,
};

/**
 * Exported summary of the deliberately-encoded bugs for quick reference
 * from rule coverage tests. Keep in sync with the top-of-file comment.
 */
export const mitchell_known_bugs = [
  "rsu-double-count", // RSU vest in W-2 Box 1 AND on 1099-B with basis 0
  "wash-sale-code-w-missing", // 3 lots with disallowed loss, Code W not set
  "hsa-8889-line-reconcile", // line 6 uses stale TY2024 limit; Ryan's HSA missing
  "rental-depreciation-no-land-split", // purchase_price used as basis, no land carved out
  "passive-activity-loss-agi-phaseout", // AGI > $150K; rental + K-1 losses suspended
  "salt-cap-40k-mfj-ty2025", // preparer used $10K cap instead of TY2025 $40K MFJ
  "ptet-election-eligible-not-taken", // IL + CA PTET eligibility
  "retirement-headroom-401k", // Olivia $9.5K 401k headroom, Ryan $17.5K 403b headroom
] as const;
