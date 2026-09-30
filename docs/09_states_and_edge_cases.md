# 09 · States and edge cases

## Personas in `mock-data/`

| Persona | Story | Score | Key states exercised |
|---|---|---|---|
| **jess** (default) | Hospitality shift worker, NSW, paid fortnightly (Thu). Declined by FF for $2,500. | 472, down from 521 over 5 refreshes | Declining; 2 SACC + 1 MACC + Afterpay + Zip; a $300 Beforepay advance every fortnight since 27/08 ($315 repaid the day before payday); gambling deposits rising (Apr $260 → Aug $845; Sep $705 to 25/09); overdrawn 16 of last 90 days; two dishonour fees; spending above income; no offers |
| **marcus** | Warehouse part-time + Centrelink FTB, QLD, Pro tier | 612, up from 548 | Improving; Centrelink shown as ordinary income; one SACC paid off; Latitude AOCC; one matched offer (lender consent on); dependants flag present in fixture (must never render) |
| **priya** | Retail, VIC, changed banks | none (override -998 thin file) | Insufficient history (45 days); onboarding and dashboard without a score; estimated date score will be available |

Fixtures include a **pending** transaction for each persona (status `pending`, `balance_after: null`).

## User states to implement (toggle via dev switcher where not persona-driven)

- Brand new — bank connected, analysis in progress (skeleton + analysing copy)
- Active (marcus) · Improving (marcus) · Declining (jess)
- Matched — live offer (marcus)
- In hardship — triggered by: overdrawn ≥ 15 of 90 days **and** dishonours in last 30 days, or customer self-selects (jess qualifies: show a gentle Hardship banner on the dashboard)
- Lapsed subscription — limited surfaces: dashboard score visible; drill-downs show reactivate sheet
- Lender matching consent off — Offers shows the explainer

## Data states

- Bank connection broken/expired — banner, stale timestamp, reconnect flow
- Insufficient history (< 60–90 days) — priya
- Anomalous data — a large one-off (dev toggle adds a $4,000 bond refund credit): exclude from "monthly income" with a note "We've left out a one-off $4,000 deposit on 12/09"
- Multi-account — dev toggle adds a second account; account filter appears on Spending
- Pending transactions — shown in feed, excluded from totals until posted

## Mode states

- Light and dark (both production-grade)
- Reduced motion
- Dynamic type 200% — no clipped labels (the Figma mobile screens clipped stage labels and collided budget text: test for this)
- Offline / API error — cached last data with "Couldn't refresh. Showing data from {time}."
