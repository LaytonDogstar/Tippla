# 05 · SmartScore (TaleFin Score V2)

**Decision:** the SmartScore *is* the TaleFin Score. Tippla renames the nine factors for customers but does not change the model. Source: *TaleFin Score V2 Quick Start* (TaleFin Wiki, extracted 30/09/2026).

## Endpoint (for the mock client and later real integration)

- `POST https://banks.talefin.com/api/v1/score/calculate/{vendor_label}/` (staging: `banks-staging.talefin.com`)
- Auth: HMAC (same as bank-statement endpoints). Body: `{ "vendor_specific_id": "…" }` — **bank statements only**. Do not send `enquiry_reference_number` (bureau) unless Q1 is resolved in favour (Privacy Act Part IIIA).
- Prerequisite: the bank-statement application must already be processed. There is **no "score ready" webhook**: call after `application.report_ready` with a short retry (1 s, then 2 s, then 4 s, max 3), or wait for `application.documents_ready`.
- **Persist `score_id`** with every result (needed to retrieve reports). Tippla stores the history; TaleFin does not return it.
- `RISK_GRADE` is returned as a **string** ("3"); parse to int. Grade is 0–10, higher is better. Do not show risk grade to customers (class `LENDER_ONLY`).
- Each refresh of the score requires a **new bank-statement pull** (cost + consent/credential refresh — Q10). Mock cadence: fortnightly.

## Response → UI

| Field | Class | UI use |
|---|---|---|
| `score.SCORE` (0–1,000) | SHOW | SmartScore number, ring, stage |
| `score.RISK_GRADE` (0–10, string) | LENDER_ONLY | Not shown |
| `score.OVERRIDE`, `score.OVERRIDE_SCORE` | SHOW (as state) | Drives the no-score states below |
| `metadata.SCORED_DATETIME` | SHOW | "Updated Thu 25/09, 9:14am" (convert to AEST/AEDT) |
| `metadata.BANKS_REFERENCE`, `BUREAU_REFERENCE` | INTERNAL | Not shown |
| `score_breakdown.*` (0–10, higher better, may be `null`) | SHOW (except GOVERNMENT_RELIANCE, see below) | Factor tiles and detail |
| `Consumer.FULL_NAME` | INTERNAL | Not shown (use profile first name) |
| `score_id` | INTERNAL | Persist |

## The nine factors — customer names and copy

Scale shown to customers: **x / 10** with one decimal. Higher is always better, so every name reads positively.

| TaleFin key | Customer name | One-line explanation | Main drivers to surface (confirm with TaleFin, Q2) | What lifts it (template) |
|---|---|---|---|---|
| INCOME | **Income stability** | How steady and regular your pay is | AM2001 count/amounts, AM2110 irregular wages, AM2074 days since last wage | "Regular pay into the connected account, on a steady schedule" |
| DISPOSABLE_INCOME | **Money left over** | How well your pay covers your regular bills and repayments | AM2072 (monthly mean) vs AM2008 + AM2010 + repayments; AM2161 balances | "More of each pay left after bills — e.g. lowering a regular cost by ${x} per pay cycle" |
| LOAN_AMOUNT_AND_TYPE | **Current borrowing** | How many loans and credit products you have, and what kind | AM2172–AM2175, AM2024, AM2132, AM2158 | "Fewer open loans — paying one off, or not taking a new one" |
| MISSED_PAYMENT | **Payments on time** | Recent missed or failed payments (recent ones count most) | AM2011, AM2032, AM2059, AM2088, AM2084 | "A run of pay cycles with no failed payments" |
| RELIABLE_PAYMENT_HISTORY | **Payment track record** | Your longer-term record of paying on time | AM2011 over 180/365 days | "Keeps improving the longer payments go through" |
| CASH_SPEND | **Cash use** | How much you take out as cash (lenders can't see where cash goes) | AM2020 ATM withdrawals | "Paying by card instead of cash where you can" |
| PRODUCTIVE_SPEND | **Spending mix** | The balance of essentials and other spending *(definition to confirm, Q2)* | AM2008 vs total debits | "Placeholder until TaleFin confirms definition" |
| ADVERSE_SPEND | **Gambling & alcohol spending** | Spending lenders treat as higher risk | AM2005, AM2023 (gambling deposits), alcohol category from AM2151 | Use gambling template in `02_voice_and_copy.md`; never AM2015 |
| GOVERNMENT_RELIANCE | *Not shown as a tile* | Explained inside Income stability and in "How your score works" as "the mix of wages and government payments in your income" | AM2033 | Never framed as something to improve |

**Hierarchy (Q2 default rule until TaleFin weights are known):** the top three tiles are the three lowest-scoring factors among `DISPOSABLE_INCOME, LOAN_AMOUNT_AND_TYPE, MISSED_PAYMENT, ADVERSE_SPEND, INCOME, CASH_SPEND`. For jess: Current borrowing 2.9, Gambling & alcohol 3.2, Money left over 3.4.

**Strengths are allowed:** the page may name the single strongest actionable factor as a specific fact (for jess: "Income stability is your strongest factor at 7.4"). No generic praise.

## Null and override handling

| Condition | UI |
|---|---|
| A factor is `null` (e.g. RELIABLE_PAYMENT_HISTORY) | Tile shows "Not enough history yet" with a neutral empty ring; excluded from top-three selection. Never render as 0. |
| `OVERRIDE_SCORE = -998` Thin file | No number. "We need a bit more history — usually 90 days of transactions. We'll work out your SmartScore automatically." Show what we can see (pay cycle, spending). Estimated date = first transaction + 90 days. |
| `-997` No debits or credits / `-996` No debits | "We couldn't see enough activity in the account you connected." CTA: connect your main everyday account. |
| `-995` Unidentified income | "We couldn't find your pay in this account. If you're paid into a different account, connect it too." CTA: add account (multi-account state). |
| `-999` Overdue payments on bureau | Only possible if bureau data is used (Q1). Copy: "Your credit file shows overdue payments, so we can't calculate a SmartScore right now. Hardship options and what to do next →" |
| API error / not ready | Skeleton, then retry; after 3 fails: "Your SmartScore is still being worked out. Check back in a few minutes." |

## Stages (placeholder bands — Q4)

Building 0–449 · Steadying 450–599 · Healthy 600–749 · Thriving 750–1,000. Colours are a single-hue progression from design tokens, **never** red→green. The ring shows progress to the *next* stage boundary as the dominant visual; the absolute number sits inside.

## Trend

From `score_history.json`. Show change since last refresh with neutral styling in both directions ("Down 17 since 11/09", "Up 11 since 10/09"). Declines explain the likely factor movement if two consecutive breakdowns exist (store breakdowns per refresh in the real build; mock supplies only current breakdown — show movement text only when available).

## Projections ("do X, score goes from Y to Z")

Not possible from TaleFin's documented output: weights are unknown (Q3). Until then:
- Show **dollar** impacts (computable from transactions) as facts.
- Show **factor/score** impacts only via `lib/scoring/estimate.ts`, a clearly isolated placeholder heuristic, tagged "Sample estimate" in dev mode and switchable off via a feature flag `SHOW_SCORE_PROJECTIONS` (default **off** in presentation mode).
