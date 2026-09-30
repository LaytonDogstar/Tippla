# 06 · Data mapping: TaleFin → portal

Source: *Tippla Customer Portal Product Specification Sheet — Talefin API to Portal Metric Mapping v2.0 (April 2026)*, with corrections from the September 2026 review. The mock fixtures in `mock-data/<persona>/talefin_bank_statement.json` follow these shapes and are **computed from `transactions.json`**, so they reconcile.

## Response shape (bank statement analysis)

- Root: `version`, `application_id`, `timestamp`, `metrics[]` (139 in production; the mock contains the subset the portal uses), `profiles[]` → `accounts[]`.
- Array-format metrics: `value.{14|30|60|90|180|365}` each with `sum_amount, count, min_amount, max_amount, mean_amount, monthly_mean_amount, days_since_last, days_since_first, earliest, latest`, plus `value.monthly_values["0".."5"]` (0 = current calendar month; the mock includes `month` for clarity).
- Percentage metrics: `value.{period}` → number (percent).
- Scalars: boolean, currency, count, days, date, string, string_array. AM2019 is a **time series** (the spec's appendix lists it as string_array — treat as array of `{date, balance}`).
- When a person has fewer days of data than a period (priya: 45 days), longer periods are computed over available days. The UI must show "based on 45 days" where relevant.

## Data-use classes (enforced in `src/lib/dataUse.ts`)

- **SHOW** — may be displayed to the customer.
- **SCORE_ONLY** — used to explain the score, shown only in factor detail as plain facts.
- **LENDER_ONLY** — never shown to the customer; may be included in a lender package only with lender-matching consent.
- **INTERNAL** — used in logic; never displayed.
- **NEVER_DISPLAY** — sensitive inference; never displayed, never logged in analytics, excluded from lender packages unless legal sign-off (Q11).

## Corrections to the v2.0 spec (apply these)

1. **Monthly income:** do **not** use `AM2072.value.30.sum_amount`. For fortnightly earners 30 days captures two or three pays (jess's fixture shows the swing). Use `AM2072.value.90.monthly_mean_amount`. Per-pay-cycle figures come from transactions.
2. **Gambling amounts are deposits (gross).** No winnings/returns metric is mapped. Label "gambling deposits" (Q5).
3. **Inferred gambling (AM2015)** is `INTERNAL`. Never shown as gambling.
4. **Loan balances are estimates** (AM2024, AM2132). Always labelled "estimated".
5. **Lender thresholds are INTERNAL:** ">10% warning / >20% critical" gambling, "Centrelink >50% flag", "DTI target <40%", ">2 wage advance providers warning", "dishonours >5%", "overdrawn >30%". None of these appear as labels, colours or badges in the customer UI.
6. **Balance heat map:** the spec's "green if positive, red if negative" is replaced by neutral tones + hatched below zero.
7. **Account numbers:** display only nickname + last 4 (`Smart Access ••4821`). Never display or log full BSB/number.

## Mapping

| Portal element | Code / path | Class | Notes |
|---|---|---|---|
| Monthly income | AM2072 `.90.monthly_mean_amount` | SHOW | Correction 1 |
| Wages | AM2001 `.90` | SHOW | Pay dates & amounts via transactions |
| Centrelink income | AM2002 `.90` | SHOW | Same styling as wages |
| Other credits | AM2012 | SHOW | |
| Centrelink % of income | AM2033 | SCORE_ONLY | Only inside "How your score works" |
| Employer name | AM2163 | SHOW | Title-case it |
| Primary income type | AM2101 | SHOW | |
| Employment status | AM2038 | INTERNAL | |
| Days since last income / wage | AM2021 / AM2074 | INTERNAL | |
| Next expected pay date | AM2077 | SHOW | Pay-cycle hero, calendar |
| Irregular wages | AM2110 | SCORE_ONLY | "Your pay varied by up to $x over 90 days" |
| Total debits | AM2004 | SHOW | Six-month chart from `monthly_values` |
| Living expenses | AM2008 | SHOW | "Essentials" |
| Housing costs | AM2010 | SHOW | |
| Mortgage | AM2136 | SHOW | Not in mock |
| Withdrawals % of income | AM2034 | INTERNAL | |
| Debt-to-income | AM2069 `.90` | SHOW | Label "Debt repayments as a share of income"; no target badge |
| Category breakdown | AM2151 | SHOW | Monthly means only; per-pay-cycle figures come from transactions. `category_id` list to confirm (Q12) |
| Gambling deposits | AM2005 `.90`, `monthly_values` | SHOW (neutral) | Correction 2 |
| Gambling % of income | AM2023 / AM2031 `.90` | SCORE_ONLY | In gambling insight only |
| Gambling % wages / credits | AM2075 / AM2043 | INTERNAL | |
| Gambling on loan day | AM2134 | NEVER_DISPLAY | |
| SACC / MACC / AOCC present | AM2025–27 | INTERNAL | Use counts instead |
| Active loan counts | AM2172–AM2175 | SHOW | |
| SACC outstanding / non-SACC outstanding | AM2024 / AM2132 | SHOW | "Estimated" |
| Repayments (SACC, MACC, AOCC, wage advance, BNPL) | AM2022, AM2055, AM2056, AM2156, AM2158 | SHOW | Monthly; convert to per pay cycle ×12/26 |
| Providers | AM2117, AM2120, AM2123 | SHOW | Provider names on LoanCards |
| Distinct SACC / wage advance 60d | AM2048 / AM2137 | SCORE_ONLY | |
| Wage advance credits / debits | AM2138 / AM2139 | SHOW | "Pay advances" |
| BNPL | AM2128, AM2080 | SHOW | |
| Dishonours (all, loan, BNPL, wage advance) | AM2011, AM2029, AM2058, AM2059, AM2071, AM2084, AM2088 | SHOW as facts | "1 payment to Nimble didn’t go through on 09/09" (jess fixture) — no red |
| Dishonour % | AM2032, AM2085 | SCORE_ONLY | |
| Loan status / default / past due | AM2049, AM2105–AM2107, AM2125, AM2126 | LENDER_ONLY | Potentially shown in Hardship context only after Q11 |
| Debt collection, charge-off | AM2091, AM2063 | NEVER_DISPLAY | |
| Insolvency, budget management, Public Trustee, financial counsellor, dependants, high-risk Centrelink | AM2017, AM2018, AM2064, AM2092, AM2093, AM2062 | NEVER_DISPLAY | See `08_compliance_guardrails.md` |
| Current / available balance | `profiles[0].accounts[n].balance/.available` | SHOW | |
| Overdraft limit | AM2068 | SHOW | Not in mock |
| Balance stats | AM2161 | SHOW | "Lowest balance in the last 90 days" |
| Daily balance | AM2019 | SHOW | Calendar and balance chart |
| Days overdrawn | AM2177 / AM2066 | SHOW as fact | "Below $0 on 16 of the last 90 days" — neutral |
| Credits / debits / DDs / ATM | AM2003, AM2004, AM2013, AM2016, AM2020 | SHOW | |
| Credit cards | AM2050–AM2054, AM2057 | SHOW | Utilisation as "Using {x}% of your card limits"; cash advances SCORE_ONLY |
| Customer name, bank | `profiles[0].full_name`, `.bank.name` | INTERNAL / SHOW | Use profile first name for greetings |

## Not in TaleFin — Tippla must derive (see `derived.json`)

| Need | Source in mock | Real build |
|---|---|---|
| Transaction-level list with categories | `transactions.json` | Confirm TaleFin transaction schema and category field (Q12) |
| Pay cycle start/end, next payday | `derived.json.pay_cycle` | From wage transactions + AM2077 |
| Upcoming bills (predicted) | `derived.json.upcoming_bills` | Tippla recurring-detection logic |
| Subscriptions | `derived.json.subscriptions` | Tippla recurring-detection logic |
| Budgets | localStorage | Tippla DB |
| Score history & factor movement | `score_history.json` | Tippla DB (persist each score) |
| Peer cohort ranges | synthetic in selectors | Tippla aggregate data (Q6) |
| Loan rate / term | customer input | Customer input (Q7) |
| Recategorisation overrides | in-memory / localStorage | Tippla DB, keyed by transaction id |
