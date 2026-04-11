/**
 * 50-return synthetic test set generator (T-603).
 *
 * Produces `return-001.json` through `return-050.json` plus a matching
 * `return-NNN.ground_truth.json` sibling for each. The set is a parameter
 * sweep across:
 *
 *   - Filing status: single / mfj / mfs / hoh
 *   - Income tier:   under $50K / $50-150K / $150-300K / $300K+
 *   - Wage profile:  W-2 only / W-2 + 1099 / full Schedule C
 *   - State mix:     single state / IL+CA / NY+NJ / CA+WA
 *   - Feature flags: rental, K-1, RSU, HSA, wash sale, ISO, foreign income
 *   - Prior year:    present / absent
 *
 * Ground truth is derived at generation time by calling the live
 * `evaluate_all()` on Agent 1's 50-rule corpus. This keeps the calibration
 * harness pointed at the contracts rather than at frozen expectations.
 *
 * Every identifier is synthetic: SSNs use the SSA-reserved 9XX range,
 * EINs use 99-, addresses are fabricated.
 *
 * Usage:
 *
 *   npx tsx tests/calibration/test-set/generate.ts
 *
 * The script is idempotent — each return is written deterministically
 * from a seeded index so re-running it produces identical output.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { evaluate_all } from "@/lib/rules";
import type {
  BrokerageLot,
  FilingStatus,
  Form1099B,
  Form1099Div,
  HSAContribution,
  Person,
  PriorYearSnapshot,
  RentalProperty,
  RuleFinding,
  ScheduleK1,
  StateCode,
  StateReturnSlice,
  TaxReturn,
  W2,
} from "@/contracts";

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) so every call of generate() is stable.
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

// ---------------------------------------------------------------------------
// Parameter sweep. 50 returns = cross-product sampled deterministically.
// ---------------------------------------------------------------------------

type IncomeTier = "low" | "mid" | "upper" | "high";
type WageProfile = "w2_only" | "w2_plus_1099" | "schedule_c";
type StateMix = "single_il" | "single_tx" | "il_ca" | "ny_nj" | "ca_wa";

interface ReturnParams {
  index: number;
  filing_status: FilingStatus;
  income_tier: IncomeTier;
  wage_profile: WageProfile;
  state_mix: StateMix;
  has_rental: boolean;
  has_k1: boolean;
  has_rsu: boolean;
  has_hsa: boolean;
  has_wash_sale: boolean;
  has_iso: boolean;
  has_foreign: boolean;
  has_prior_year: boolean;
}

const FILING_STATUSES: FilingStatus[] = ["single", "mfj", "mfs", "hoh"];
const INCOME_TIERS: IncomeTier[] = ["low", "mid", "upper", "high"];
const WAGE_PROFILES: WageProfile[] = ["w2_only", "w2_plus_1099", "schedule_c"];
const STATE_MIXES: StateMix[] = [
  "single_il",
  "single_tx",
  "il_ca",
  "ny_nj",
  "ca_wa",
];

function build_params(index: number): ReturnParams {
  const rand = mulberry32(0xc0ffee + index);
  const pick = <T>(arr: readonly T[]): T =>
    arr[Math.floor(rand() * arr.length)]!;
  const flag = (p: number): boolean => rand() < p;

  return {
    index,
    filing_status: pick(FILING_STATUSES),
    income_tier: INCOME_TIERS[index % INCOME_TIERS.length]!,
    wage_profile: WAGE_PROFILES[index % WAGE_PROFILES.length]!,
    state_mix: pick(STATE_MIXES),
    has_rental: flag(0.45),
    has_k1: flag(0.35),
    has_rsu: flag(0.4),
    has_hsa: flag(0.55),
    has_wash_sale: flag(0.4),
    has_iso: flag(0.2),
    has_foreign: flag(0.25),
    has_prior_year: flag(0.75),
  };
}

// ---------------------------------------------------------------------------
// Income tier → wage amounts.
// ---------------------------------------------------------------------------

function primary_wages(tier: IncomeTier): number {
  switch (tier) {
    case "low":
      return 38_500;
    case "mid":
      return 92_000;
    case "upper":
      return 215_000;
    case "high":
      return 420_000;
  }
}

// ---------------------------------------------------------------------------
// Synthetic people — 9XX SSNs, stable per return index.
// ---------------------------------------------------------------------------

const FIRST_NAMES = [
  "Jordan",
  "Avery",
  "Riley",
  "Morgan",
  "Harper",
  "Parker",
  "Casey",
  "Quinn",
  "Reese",
  "Rowan",
];
const LAST_NAMES = [
  "Kim",
  "Patel",
  "Nguyen",
  "Garcia",
  "Sato",
  "Mensah",
  "Silva",
  "Okafor",
  "Larsen",
  "Duval",
];

function synthetic_person(index: number, slot: "tp" | "sp" | "dep"): Person {
  const first = FIRST_NAMES[(index * 3 + (slot === "sp" ? 1 : 0)) % FIRST_NAMES.length]!;
  const last = LAST_NAMES[(index + (slot === "sp" ? 2 : 0)) % LAST_NAMES.length]!;
  const ssn_suffix = (1000 + index * 7 + (slot === "sp" ? 11 : slot === "dep" ? 33 : 0))
    .toString()
    .padStart(4, "0")
    .slice(-4);
  const area = slot === "dep" ? "901" : slot === "sp" ? "902" : "900";
  const group = slot === "dep" ? "66" : slot === "sp" ? "55" : "44";
  const dob =
    slot === "dep"
      ? `201${(index % 9) + 1}-0${((index % 9) + 1)}-1${(index % 8) + 1}`
      : `198${(index % 9) + 1}-0${((index % 9) + 1)}-1${(index % 8) + 1}`;
  return {
    id: `person-${slot}-${index.toString().padStart(3, "0")}`,
    first_name: first,
    last_name: last,
    ssn: `${area}-${group}-${ssn_suffix}`,
    dob,
    occupation:
      slot === "tp"
        ? "Software Engineer"
        : slot === "sp"
          ? "Teacher"
          : undefined,
  };
}

// ---------------------------------------------------------------------------
// State mix helpers.
// ---------------------------------------------------------------------------

function states_for(mix: StateMix): StateCode[] {
  switch (mix) {
    case "single_il":
      return ["IL"];
    case "single_tx":
      return ["TX"];
    case "il_ca":
      return ["IL", "CA"];
    case "ny_nj":
      return ["NY", "NJ"];
    case "ca_wa":
      return ["CA", "WA"];
  }
}

// ---------------------------------------------------------------------------
// Wash sale lot factory — deliberately omits Code W so the wash-sale rule
// fires on any return flagged has_wash_sale.
// ---------------------------------------------------------------------------

function wash_sale_lots(index: number): BrokerageLot[] {
  return [
    {
      lot_id: `TS${index}-WASH-001`,
      description: "100 sh EXMP ETF",
      date_acquired: "2024-11-02",
      date_sold: "2025-01-14",
      proceeds: 4_200 + index * 10,
      cost_basis: 5_800 + index * 10,
      wash_sale_loss_disallowed: 1_600,
      code: null,
      reported_to_irs: true,
    },
    {
      lot_id: `TS${index}-WASH-002`,
      description: "50 sh SYNT Corp",
      date_acquired: "2024-12-18",
      date_sold: "2025-02-01",
      proceeds: 6_400 + index * 5,
      cost_basis: 7_830 + index * 5,
      wash_sale_loss_disallowed: 1_430,
      code: null,
      reported_to_irs: true,
    },
  ];
}

// RSU sell-to-cover lots — same-day sale with zero basis. Triggers
// Agent 1's rsu-double-count rule when paired with a Box 12 code V W-2.
function rsu_lots(index: number): BrokerageLot[] {
  return [
    {
      lot_id: `TS${index}-RSU-001`,
      description: "100 sh RSU vest",
      date_acquired: "2025-03-15",
      date_sold: "2025-03-15",
      proceeds: 18_000,
      cost_basis: 0,
      code: null,
      reported_to_irs: true,
    },
  ];
}

function ordinary_lot(index: number): BrokerageLot {
  return {
    lot_id: `TS${index}-LT-001`,
    description: "200 sh VTI",
    date_acquired: "2021-06-10",
    date_sold: "2025-09-05",
    proceeds: 52_000,
    cost_basis: 38_000,
    code: null,
    reported_to_irs: true,
  };
}

// ---------------------------------------------------------------------------
// Build a TaxReturn from params.
// ---------------------------------------------------------------------------

function build_return(params: ReturnParams): TaxReturn {
  const { index } = params;
  const taxpayer = synthetic_person(index, "tp");
  const spouse =
    params.filing_status === "mfj" || params.filing_status === "mfs"
      ? synthetic_person(index, "sp")
      : undefined;
  const dependents =
    params.filing_status === "hoh" || params.filing_status === "mfj"
      ? [synthetic_person(index, "dep")]
      : [];

  const states = states_for(params.state_mix);
  const primary_state = states[0]!;

  const address = {
    line1: `${1000 + index} Sample Avenue`,
    city: "Synthetic City",
    state: primary_state,
    zip: `9${(index % 9999).toString().padStart(4, "0")}`,
    county: "Example",
  };

  const wages = primary_wages(params.income_tier);
  const rsu_amount = params.has_rsu ? 18_000 : 0;

  const box12: W2["box12"] = [];
  if (params.has_rsu) box12.push({ code: "V", amount: rsu_amount });
  box12.push({ code: "D", amount: 14_000 }); // 401k deferral — leaves headroom

  const state_wage_split: W2["state_wages"] = states.map((s, i) => ({
    state: s,
    wages: i === 0 ? Math.round(wages * 0.8) : Math.round(wages * 0.2),
    withholding: i === 0 ? Math.round(wages * 0.05) : Math.round(wages * 0.01),
  }));

  const primary_w2: W2 = {
    employer_name: `Example Employer ${index}`,
    employer_ein: `99-${(1_000_000 + index).toString().slice(-7)}`,
    employee: taxpayer,
    box1_wages: wages,
    box2_fed_withholding: Math.round(wages * 0.12),
    box3_ss_wages: Math.min(wages, 176_100),
    box4_ss_withholding: Math.round(Math.min(wages, 176_100) * 0.062),
    box5_medicare_wages: wages,
    box6_medicare_withholding: Math.round(wages * 0.0145),
    box12,
    box14: [],
    state_wages: state_wage_split,
  };

  const w2s: W2[] = [primary_w2];
  if (spouse) {
    w2s.push({
      employer_name: `Public School District ${index}`,
      employer_ein: `99-${(2_000_000 + index).toString().slice(-7)}`,
      employee: spouse,
      box1_wages: 68_000,
      box2_fed_withholding: 7_900,
      box3_ss_wages: 68_000,
      box4_ss_withholding: 4_216,
      box5_medicare_wages: 68_000,
      box6_medicare_withholding: 986,
      box12: [{ code: "E", amount: 6_000 }],
      box14: [],
      state_wages: [
        {
          state: primary_state,
          wages: 68_000,
          withholding: 3_300,
        },
      ],
    });
  }

  // 1099-B lots
  const lots: BrokerageLot[] = [ordinary_lot(index)];
  if (params.has_wash_sale) lots.push(...wash_sale_lots(index));
  if (params.has_rsu) lots.push(...rsu_lots(index));

  const form_1099_b: Form1099B[] = [
    {
      payer_name: "Synthetic Brokerage LLC",
      payer_ein: `99-${(3_000_000 + index).toString().slice(-7)}`,
      recipient: taxpayer,
      lots,
    },
  ];

  const form_1099_div: Form1099Div[] = [
    {
      payer_name: "Synthetic Brokerage LLC",
      payer_ein: `99-${(3_000_000 + index).toString().slice(-7)}`,
      recipient: taxpayer,
      ordinary_dividends: 2_400,
      qualified_dividends: 1_900,
      capital_gain_distributions: 0,
      foreign_tax_paid: params.has_foreign ? 480 : 0,
    },
  ];

  const k1s: ScheduleK1[] = params.has_k1
    ? [
        {
          partnership_name: `Synthetic Partners ${index} LP`,
          partnership_ein: `99-${(4_000_000 + index).toString().slice(-7)}`,
          partner: taxpayer,
          is_passive: true,
          ordinary_business_income: -2_500,
          rental_real_estate_income: 0,
          interest_income: 100,
          dividend_income: 60,
          guaranteed_payments: 0,
          section_179_deduction: 0,
        },
      ]
    : [];

  const rental_properties: RentalProperty[] = params.has_rental
    ? [
        {
          property_id: `rental-${index.toString().padStart(3, "0")}`,
          address: {
            line1: `${2000 + index} Rental Rd`,
            city: "Rental City",
            state: primary_state,
            zip: `9${(index % 9999).toString().padStart(4, "0")}`,
            county: "Example",
          },
          fair_rental_days: 365,
          personal_use_days: 0,
          related_party_rental: false,
          rents_received: 24_000,
          expenses: {
            advertising: 0,
            auto_travel: 200,
            cleaning_maintenance: 900,
            commissions: 0,
            insurance: 1_200,
            legal_professional: 200,
            management_fees: 2_400,
            mortgage_interest: 11_000,
            repairs: 1_100,
            supplies: 250,
            taxes: 4_200,
            utilities: 0,
            other: 0,
          },
          depreciation: {
            purchase_price: 285_000,
            // Deliberately omit land_value/building_value so the
            // depreciation-land-split rule fires for test returns with
            // a rental.
            placed_in_service: "2021-05-01",
            depreciation_method: "MACRS_27.5",
            prior_year_depreciation: 41_400,
            current_year_depreciation: 10_364,
          },
        },
      ]
    : [];

  const hsa: HSAContribution[] = params.has_hsa
    ? [
        {
          account_holder: taxpayer,
          // Stale TY2024 family limit to deliberately trip the HSA rule.
          line2_contributions: 4_150,
          line6_allowable: 8_300,
          line13_deduction: 4_150,
          coverage: "family",
          employer_contributions: 0,
        },
      ]
    : [];

  const state_returns: StateReturnSlice[] = states.map((s, i) => ({
    state: s,
    residency: i === 0 ? "resident" : "non_resident",
    workdays_in_state: i === 0 ? undefined : 22,
    state_wages: i === 0 ? Math.round(wages * 0.8) : Math.round(wages * 0.2),
    state_withholding:
      i === 0 ? Math.round(wages * 0.05) : Math.round(wages * 0.01),
    ptet_election_eligible: params.has_k1,
  }));

  const prior_year: PriorYearSnapshot | undefined = params.has_prior_year
    ? {
        tax_year: 2024,
        filing_status: params.filing_status,
        agi: Math.max(10_000, wages - 5_000),
        total_tax: Math.round(wages * 0.15),
        refund_or_owed: 1_000,
        filed_date: "2025-03-15",
        prior_preparer_name: "Pat Daniels, CPA",
        prior_preparer_credential: "CPA",
        carryforwards: {
          capital_loss: 2_500,
          passive_activity_loss: 1_000,
        },
      }
    : undefined;

  // Approximate AGI — includes wages, dividends, K-1 loss, and rental loss.
  // This isn't the real tax calc; it's enough to drive phase-out rules.
  const agi =
    wages +
    (spouse ? 68_000 : 0) +
    2_400 +
    (k1s[0]?.ordinary_business_income ?? 0) +
    (rental_properties.length > 0 ? -1_500 : 0);

  const return_data: TaxReturn = {
    tax_year: 2025,
    case_id: `test-return-${index.toString().padStart(3, "0")}`,
    filing_status: params.filing_status,
    taxpayer,
    spouse,
    dependents,
    address,
    w2s,
    form_1099_b,
    form_1099_div,
    k1s,
    form_1098: [],
    rental_properties,
    hsa,
    state_returns,
    prior_year,
    agi,
    total_tax: Math.round(agi * 0.18),
  };

  return return_data;
}

// ---------------------------------------------------------------------------
// Ground truth = live output of Agent 1's rules engine for this return.
// The calibration harness (Agent 5) reads these ground-truth files.
// ---------------------------------------------------------------------------

interface GroundTruth {
  case_id: string;
  params: ReturnParams;
  expected_finding_rule_ids: string[];
  expected_findings: RuleFinding[];
}

function derive_ground_truth(
  return_data: TaxReturn,
  params: ReturnParams,
): GroundTruth {
  const findings = evaluate_all(return_data);
  return {
    case_id: return_data.case_id,
    params,
    expected_finding_rule_ids: Array.from(
      new Set(findings.map((f) => f.rule_id)),
    ).sort(),
    expected_findings: findings,
  };
}

// ---------------------------------------------------------------------------
// Write out all 50 returns + ground truth files.
// ---------------------------------------------------------------------------

function out_dir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return here;
}

export interface GeneratedReturnFile {
  params: ReturnParams;
  return_data: TaxReturn;
  ground_truth: GroundTruth;
}

export function generate_all(): GeneratedReturnFile[] {
  const results: GeneratedReturnFile[] = [];
  for (let i = 1; i <= 50; i++) {
    const params = build_params(i);
    const return_data = build_return(params);
    const ground_truth = derive_ground_truth(return_data, params);
    results.push({ params, return_data, ground_truth });
  }
  return results;
}

function write_all(): void {
  const dir = out_dir();
  mkdirSync(dir, { recursive: true });
  const files = generate_all();
  for (const file of files) {
    const base = `return-${file.params.index.toString().padStart(3, "0")}`;
    writeFileSync(
      join(dir, `${base}.json`),
      JSON.stringify(file.return_data, null, 2),
      "utf8",
    );
    writeFileSync(
      join(dir, `${base}.ground_truth.json`),
      JSON.stringify(file.ground_truth, null, 2),
      "utf8",
    );
  }

  console.log(`Generated ${files.length} synthetic returns in ${dir}`);
}

// Allow `npx tsx tests/calibration/test-set/generate.ts` to run directly.
const invoked_directly =
  typeof process !== "undefined" &&
  Array.isArray(process.argv) &&
  process.argv[1] !== undefined &&
  process.argv[1].replace(/\\/g, "/").endsWith("tests/calibration/test-set/generate.ts");

if (invoked_directly) {
  write_all();
}
