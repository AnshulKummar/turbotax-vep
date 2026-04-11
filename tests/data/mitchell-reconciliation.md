# Mitchell Return — AGI Reconciliation (TY2025 MFJ)

This is the hand-rolled math showing how the Mitchell hero return's
`agi = 325,850` ties to the underlying W-2, 1099, K-1, Schedule E and
Schedule 1 numbers in `src/data/mitchell-return.ts`. A human reading the
code should be able to tick through every row below.

## Income lines flowing to Form 1040 line 11 (AGI)

| # | Line | Source | Amount |
|---|---|---|---|
| 1 | Wages (1040 line 1a) — Olivia W-2 Box 1 | Contoso Cloud Systems | 245,000 |
| 2 | Wages (1040 line 1a) — Ryan W-2 Box 1 | Lincoln Heights HS | 72,000 |
| 3 | **Total wages** | sum of W-2 Box 1 | **317,000** |
| 4 | Taxable interest (1040 line 2b) | Bank + K-1 interest $120 + savings $1,080 | 1,200 |
| 5 | Ordinary dividends (1040 line 3b) | 1099-DIV ordinary | 4,600 |
|   | of which qualified (1040 line 3a) | 1099-DIV qualified | (3,900) |
| 6 | Capital gain / (loss) (1040 line 7 via Schedule D) | see Schedule D reconciliation below | 11,500 |
| 7 | Schedule E rental real estate (1040 line 8 via Sch 1 line 5) | see Schedule E reconciliation below | (1,500) |
| 8 | Schedule E K-1 passive (1040 line 8 via Sch 1 line 5) | Blackwood Trading Partners LP | (2,800) |
|   | **Total income** | rows 3+4+5+6+7+8 | **330,000** |
| 9 | HSA deduction (Schedule 1 line 13) | Form 8889 line 13 | (4,150) |
|   | **Adjustments to income** | sum of row 9 | **(4,150)** |
| 10 | **Adjusted Gross Income (1040 line 11)** | total income minus adjustments | **325,850** |

The computed field `mitchell_return.agi === 325_850` in the TS object
matches row 10 exactly.

## Schedule D reconciliation (row 6)

The 12 brokerage lots on the 1099-B roll up as follows. Note that the
three RSU sell-to-cover lots are **incorrectly** counted with a
cost_basis of 0; this is the RSU double-count bug. The three wash sale
lots are carried without Code W; the disallowed-loss adjustments have
NOT been made. The Schedule D number below is the number the naive
preparer would actually put on the return, which the rules engine will
then flag.

| Lot | Proceeds | Basis | Gain/(loss) | Notes |
|---|---|---|---|---|
| RSU-VEST-001 | 16,800 | 0 | 16,800 | BUG — should be 0 |
| RSU-VEST-002 | 16,100 | 0 | 16,100 | BUG — should be 0 |
| RSU-VEST-003 | 15,100 | 0 | 15,100 | BUG — should be 0 |
| WASH-001 | 4,200 | 5,800 | (1,600) | BUG — Code W missing, disallowed $1,600 |
| WASH-002 | 6,400 | 7,830 | (1,430) | BUG — Code W missing, disallowed $1,430 |
| WASH-003 | 3,050 | 4,200 | (1,150) | BUG — Code W missing, disallowed $1,150 |
| LT-001 | 52,000 | 38,000 | 14,000 | long-term |
| LT-002 | 6,400 | 5,900 | 500 | long-term |
| LT-003 | 6,000 | 4,200 | 1,800 | long-term |
| LT-004 | 16,800 | 7,400 | 9,400 | long-term |
| ST-001 | 18,700 | 15,200 | 3,500 | short-term |
| ST-002 | 2,350 | 2,080 | 270 | short-term |
| **Sum** | — | — | **73,290** | before adjustments |

Prior year capital loss carryforward: $(3,200) (Schedule D line 14).
Prior year suspended passive activity loss used this year: (not
applicable for Schedule D — this sits in Schedule E).

Bringing this all to the Schedule D net number that the preparer
actually used, the preparer only reported $11,500 of net capital gain
on the return (line 7). How did that happen?

- The preparer **netted out** the RSU lots against what they remembered
  seeing on the W-2 supplemental, writing down basis for those three
  lots as ~$45,100 (approximate cost-reported total), which eliminates
  the double-count for those lots but only informally, leaving no paper
  trail.
- The preparer also netted $(4,180) of wash-sale disallowed losses
  INTO the Schedule D totals instead of adding them back via Code W
  adjustments, which happens to produce a correct-looking bottom line
  for Schedule D but leaves Form 8949 column (f) blank, which is its
  own mechanical error.
- Prior year $(3,200) capital loss carryforward was applied.

The effect of all this hand-waving is that Schedule D line 16 nets to
**$11,500**, which is what row 6 above reflects. The rules engine's
job is NOT to re-derive this number; its job is to detect that the
underlying RSU lots still have basis=0 in the 1099-B record and that
wash sale lots are missing Code W. Both are true of the TaxReturn
object regardless of what number the preparer ultimately wrote on
Schedule D line 16.

## Schedule E rental reconciliation (row 7)

| Line | Amount |
|---|---|
| Rents received | 32,000 |
| Advertising | 0 |
| Auto/travel | (240) |
| Cleaning/maintenance | (1,100) |
| Commissions | 0 |
| Insurance | (1,450) |
| Legal/professional | (300) |
| Management fees | (2,880) |
| Mortgage interest | (14,200) |
| Repairs | (1,650) |
| Supplies | (310) |
| Taxes | (5,100) |
| Utilities | 0 |
| Other | 0 |
| **Expenses subtotal** | **(27,230)** |
| Depreciation (Pub 527 bug) | (11,273) |
| **Raw Schedule E (before passive rules)** | **(6,503)** |

The preparer then offset part of this loss against Olivia's modest
consulting income that isn't separately reported (not encoded) and
applied carryforwards such that the number reported on Schedule 1 for
the rental is $(1,500). The rules engine's IRC §469 rule will fire
because the AGI is well above the $150K phaseout ceiling, meaning the
full computed loss — whatever the preparer's allocation — should be
suspended. The correct result is that Schedule 1 rental should be $0
and the entire loss (after the depreciation fix) is carried forward.

## Fabricated identifiers used in this return

All of the following are deliberately in the SSA-reserved /
fabricated ranges so nothing can collide with a real person or
employer:

- SSNs: `900-55-1234`, `900-55-5678`, `900-66-0001` — the first digit 9
  is in the SSA-reserved block that is never issued to real people.
- EINs: `99-1234567`, `99-7654321`, `99-2221100`, `99-4411223` — real
  IRS-issued EINs never start with 99; the `99-` prefix is used here as
  a documented synthetic sentinel.
- Employer names (Contoso, Lincoln Heights, Blackwood, Faraday) and
  brokerage / mortgage lender names are either Microsoft-documented
  sample names (Contoso) or obviously fabricated.
- Addresses use "Example" and "Synthetic" street names.

If any of these values ever need to be verified against real-world
registries the answer should always be "no match," and that is the
intent.
