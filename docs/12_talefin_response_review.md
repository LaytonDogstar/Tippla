# 12 · Review of a production TaleFin response (30/09/2026)

Source: a real TaleFin bank statement response supplied by Layton on 30/09/2026 (`type: "summary"`, 90 days, four CBA accounts, 139 metrics). **It contains a real person's details and is not stored in this repo.** Only its structure, metric names and category ids were used. They are in `scripts/talefin_catalogue.json`.

## The five things that change the build

1. **The summary response has no transaction list.** Each account says how many transactions it has (`transactions_num`), but none are included. Everything in the portal that works at transaction level needs TaleFin's transaction-level data (Q18):
   - per-pay-cycle category totals, merchants and recategorising
   - the transaction feed and search
   - splitting two loans of the same type
   - naming the lender in "a payment didn't go through"

   The build keeps `transactions.json` as the stand-in for that feed. Where the summary alone is enough, a `…FromSummary` selector exists as well.
2. **Transfers between the customer's own accounts swamp everything.** The sample had $48,703 of debits (AM2004) in 90 days against $13,981 of income, because most of it was money moving between the person's four accounts. AM2047 (credits from internal transfers) was $25,351. Any "spent", "paid in" or six-month figure taken straight from AM2003/AM2004 would be wrong. The build now:
   - excludes a `transfer` category from every total
   - subtracts AM2047 from AM2004 for the six-month bars
3. **A standard pull is 90 days** (`report_period.days_requested: 90`). The months before that come back as zero with a null count. The six-month chart in the designs would show three real bars. Ask TaleFin for 180 days, or design the chart for three months (Q17).
4. **The "active provider" lists are usually empty.** AM2117, AM2120 and AM2123 only list a lender whose *latest* transaction is a loan deposit. The sample had 1 small loan and 1 medium loan open, but all three lists were empty. Lender names come reliably from:
   - AM2049 (small-loan status)
   - AM2105–AM2107 (defaults)
   - AM2125–AM2127 (past due)
   - AM2030 (third parties)

   Those lists are `LENDER_ONLY` because of what they say (defaults, arrears), so the API layer now takes the **names only** and strips the rest.
5. **The response carries full identity details:**
   - holder name, email and mobile (profile and `application`)
   - joint owners and home address (`account_owner_info`)
   - DOB and gender fields (`account_json`)
   - bank login field definitions
   - **the full, unmasked BSB and account number**

   `src/lib/api/talefin.ts` now drops all of it at the boundary and keeps only the account nickname and last 4 digits. A test proves it.

## Answers to the questions raised

| Question | Answer |
|---|---|
| **Can we show the amount debited by a lender?** | **Yes.** From the summary alone, by loan type: small loans AM2044, medium loans AM2045, other credit AM2046, pay advances AM2139 and AM2087, BNPL AM2080, and all loans AM2081. Each has the 90-day total, count, first and last date, and monthly values. When a type has one lender (true for the sample: one small loan, one medium loan), that figure *is* that lender's. With two lenders of the same type (Jess: Nimble and Cash Train), a per-lender split needs the transaction feed. Built: `activeLoans()[].activity` (per lender, from transactions), `lenderActivityFromSummary()` (exact only when unambiguous, otherwise null) and `loanTotals().repaid90` (by type). Copy: "Repaid to Nimble in the last 90 days: $576 (6 repayments)". |
| **Loan balances** | TaleFin's "outstanding balance" (AM2024) is defined as *the latest loan deposit minus repayments since, excluding dishonoured ones*. It ignores fees and interest, so it is closer to "how much of the last loan has been paid back" than a balance. Suggest the loan card says what's known: **"Borrowed $300 on 24/09 · $56.57 repaid so far"** (AM2040 + AM2044), with "estimated" kept on any balance. |
| **Timezone** | Decided: **AEST**. TaleFin timestamps carry their own offset (+10:00, and +11:00 in daylight saving; the sample's next-pay date was +11:00). `toAEST()` converts every one; the Score's `SCORED_DATETIME` has no offset and is taken as AEST. In summer this shows NSW/VIC/TAS/ACT customers a time one hour behind their clock, and dates near midnight can shift. Revisit with per-state time (Q19). |
| **Can we show when all incomes come in?** | **Yes.** TaleFin gives a next date only for the primary income (AM2037 any income, AM2077 wages). Every income metric also has a count and first/last dates, so the cadence and next date can be estimated for each type: wages AM2001, Centrelink AM2002, WorkCover AM2197, and monthly means for 10 income categories in AM2152. Built: `incomeStreams()` (from transactions, one stream per payer) and `incomeStreamsFromSummary()` (from metrics alone). Both agree on every persona. `upcomingIncome()` feeds the pay cycle card, the calendar (predicted income days) and the balance forecast, which can now run past payday. Marcus: "Centrelink $412 · Wed 07/10" and "Southside Logistics about $1,350 · Thu 08/10". Fixed amounts (Centrelink) show exactly; varying pay shows "about". |

## Format quirks the mock now copies (and the normaliser handles)

| Quirk | Production | Handling |
|---|---|---|
| Timestamps | `2026-07-09T09:43:48+10:00` | → AEST calendar date |
| Monthly values | `{ "month": "September", "year": 2026, … }`, 12 months | → `"2026-09"` |
| Empty periods | every field `null` (sum and count) | → 0; months before the history starts are drawn as "no data", never $0 |
| Balances | strings: `"-63.6200"` | → numbers |
| Debit min/max | can arrive swapped (min 859.48, max 414.86) | swapped back |
| Monthly means | `sum ÷ (period ÷ 30)` whatever the history, so 45 days of data over a 90-day window reads as **half** | `monthlyIncome()` rescales by the days actually covered (AM2035) |
| Flags | per-period objects with monthly values, not plain booleans | read as objects |
| Extras | `trimmed`, `trimmed_monthly`, `date_range_in_days`, `friendly_name`, `description`, `group_colour_rgba` | trimmed means are available for steadier "typical" figures; TaleFin's group colours are ignored (tokens only) |

## Useful data we weren't using

| Code | What | Class | Use |
|---|---|---|---|
| AM2037 / AM2077 | Next expected income (any) / wages, primary account | SHOW | Payday, days to payday |
| AM2035 / AM2036 | Oldest transaction, all accounts / primary | SHOW | "Based on 45 days"; the thin-file date |
| AM2152 | Income categories (Wages 36, Centrelink 45, Income 40, Other Credit 3, Benefits 32, Child Support 59, Work Cover 46, Superannuation 47, Emergency Payment 60, Cash Deposits 34) | SHOW, some labels sensitive | All income streams |
| AM2197 | WorkCover income | SHOW as "Other regular income" (Q16) | Income streams |
| AM2040 / 41 / 42 | Loan deposits received, by type | SHOW | "Borrowed $300 on 24/09" |
| AM2044 / 45 / 46, AM2078 / 79 / 81 | Loan repayments and direct debits, by type | SHOW | Repaid per lender or type |
| AM2138 / AM2139 / AM2087 | Pay advances received and repaid | SHOW | Pay-advance cycle insight |
| AM2116 / 2119 / 2122 / 2157 | Confirmed active repayments (monthly) | SHOW | Loan totals |
| AM2049 | Small-loan status per lender: active, settled, arrears, failed | Names + active/settled SHOW; arrears/failed LENDER_ONLY | "Paid off" as a fact |
| AM2030 | Third-party (pay advance) providers | SHOW | Name pay-advance providers |
| AM2029 / 2058 / 2059 / 2084 / 2088 | Dishonours by type, with amounts and dates | SHOW as facts | "A $96 repayment didn't go through on 09/09" |
| AM2067 | Pending debits | SHOW | Pending state |
| AM2068 | Estimated overdraft limit per account | SHOW | Show separately; never fold into "left after bills" |
| AM2164 | Primary wage, with opening/closing balance around each pay | SHOW | "Your balance just before payday" |
| AM2161 | Balance stats incl. trimmed mean | SHOW | Lowest balance |
| CM2001–CM2139 (per account, 17 each) | Per-account debits, credits, daily balance, overdrawn days, dishonours, overdraft | SHOW / INTERNAL | Multi-account filter; which account went below $0 |
| AM2151 | 56 debit categories incl. parents (Debit 2, Fixed 5, Variable 6, Risk 4, Loans 8, Other Debit 140) | SHOW | Category mapping (below) |

## Categories (Q12, mostly answered)

The real AM2151 ids replace the placeholders in the generator. The old "35 = rent" was wrong: **35 is Accommodation; Rent is 9.** Tippla's mapping:

| Tippla | TaleFin ids |
|---|---|
| Rent & housing | 9 Rent, 35 Accommodation (+ AM2136 mortgage) |
| Groceries | 21 |
| Food & dining | 22 Eating Place (67 Drinking Place → Alcohol) |
| Transport | 15 Transport, 27 Fuel, 25 Public Transport, 24 Taxi, 44 Road Tolls, 28 Vehicle Maintenance |
| Bills & utilities | 7 Utilities, 16 Telecommunications, 17 Energy/Gas, 10 Insurance, 18 Council |
| Subscriptions | 37 Subscription Services, 56 Memberships |
| Entertainment | 58 Leisure |
| Alcohol | 23 Alcohol, 67 Drinking Place |
| Gambling | 30 |
| Health | 52 Medical, 53 Pharmacy, 64 Personal Care |
| Shopping | 13 Retail, 62 Clothing |
| Loan repayments | 19 SACC Loans, 20 Non SACC Loans (8 Loans is their parent) |
| Buy now, pay later | 69 |
| Pay advances | 71 Wage Advance |
| Cash withdrawals | 70 ATM Withdrawals, 33 Withdrawal |
| Bank fees | 29 Fees, 50 Dishonour Fees |
| Other (to design) | 57 Childcare, 66 Education, 65 Pet Care, 26 Airlines, 68 Charitable Donations, 72 Cryptocurrency, 63 Money Transfer, 54 Tax Collection, 55 Court Fines, 61 Centrelink Repayment |
| Never shown as a category | 31 Debt Collection, 38 Debt Management, 49 Budget Management (sensitive; fold into "Other") |

In the sample, "Other Debit" (140) was $12,428 of $14,752 a month. Much of that is transfers, but ask TaleFin how much real spending ends up uncategorised. A donut that's mostly "Other" would undo the Spending screen.

## New sensitive fields (all `NEVER_DISPLAY` until counsel says otherwise, Q11)

- AM2006 Centrelink emergency (advance) payments
- AM2009 debt collection payments
- AM2065 financial counsellor payments
- AM2095 Public Trustee payments
- AM2070 superannuation present (can mean early release on hardship grounds)
- Income categories that imply circumstances: Child Support (59) implies dependants, WorkCover (46) implies an injury. Show the money as "Other regular income", never the label (Q16).
- Everything in `account_json` and `account_owner_info`.

## What changed in the build (this commit)

- **Mock now matches production:** `scripts/generate_mock_data.py` emits the real shape. That covers:
  - real metric names, offsets, month names and string balances
  - full fictional BSB and account numbers, plus holder details, so the stripping is tested
  - empty "active provider" lists, with lender names in the status and default lists
  - loan-by-type metrics, income categories and the real category ids
- **Normaliser:** `src/lib/api/talefin.ts` turns TaleFin's raw format into the portal's shape. The client then strips anything by data-use class.
- **Selectors:**
  - `incomeStreams` / `incomeStreamsFromSummary` / `upcomingIncome` — when each income comes in
  - `activeLoans()[].activity`, `lenderActivityFromSummary`, `loanTotals().repaid90` — what each lender debited
  - `isTransfer` exclusion
  - `monthlyIncome` rescaled for thin files
  - six-month bars net of own-account transfers
  - calendar and forecast now include expected income
- **Data-use classes:** every code seen in the production response now has a class (fail-closed for anything else).
- **Tests:** `tests/talefin.test.ts` (normaliser, AEST, masking, lender names) and `tests/income.test.ts` (income schedule, lender debits, transfers, thin-file income).

## Asks for TaleFin

1. The transaction-level endpoint (date, description, amount, category id, account, pending flag) and whether it's billed separately (Q18).
2. A 180-day (or longer) pull: cost and consent implications (Q17).
3. How much real spending lands in "Other Debit" (140), and whether transfers between the customer's own accounts can be flagged on transactions.
4. Per-lender balance and repayment figures, or confirmation that transactions are the only route.
5. Whether `SCORED_DATETIME` is AEST, UTC or server-local.
6. When AM2117/AM2120/AM2123 are populated, and what `credit_deposit` holds.
