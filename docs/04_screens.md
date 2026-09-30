# 04 · Screens

For each screen: **Job** (the one thing it must do) · **Content** · **Interactions** · **States**. Data sources reference `06_data_mapping.md`. Every screen must render for `jess`, `marcus`, `priya`, in light and dark, with skeleton loading (not spinners) while the mock API resolves.

---

## Onboarding

### O1 Create account
- **Job:** feel like an opening, not a form.
- **Content:** one line on what Tippla does ("See what's shaping your SmartScore and what would change a lender's answer"), email, mobile (`04XX XXX XXX` mask), continue. Password on the next step or passkey.
- **States:** validation inline, plain language ("That mobile number needs 10 digits, starting with 04").

### O2 Consents
- Three **separate, unticked** checkboxes, each with a two-line plain explanation and a "What this means" expander:
  1. Share my Friendly Finance application with Tippla (required)
  2. Let Tippla read my bank data through TaleFin (required)
  3. Let Tippla show my profile to partner lenders when I might qualify (**optional**). Copy must say: "Optional. Tippla works fully without this. You can turn it on or off any time."
- Continue enabled when 1 and 2 are ticked. Record timestamp and version of each consent (mock).

### O3 Connect bank
- Before: what will happen, which bank, read-only, can disconnect any time, ~2 minutes. Button "Connect with TaleFin".
- Mock TaleFin screen (clearly styled as a third party) → "Returning you to Tippla".
- After: "Connected to CBA · Smart Access". Option to add another account (multi-account state).

### O4 Analysing
- Four steps tick through in plain language (see copy doc). ~8 s simulated. No bouncing illustrations. Reduced motion: steps appear without animation.

### O5 SmartScore reveal
- **Job:** handle a lower-than-expected number gently, with context and a next step.
- **Content:** ScoreRing (hero size) with stage label; one sentence of context; the single factor with most room to move (lowest factor that is actionable — exclude GOVERNMENT_RELIANCE); one first action card; "See everything" → Dashboard.
- **priya (override -998):** no number. "We need a bit more history to work out your SmartScore — usually 90 days. We'll calculate it automatically. Meanwhile, here's what we can already see." Then pay cycle and spending.
- **No confetti. No "Congratulations".**

---

## Portal

### P1 Dashboard (Home)
- **Job:** point to the next two taps. Not a data fire-hose.
- **Content (top to bottom, mobile):**
  1. Urgent state banner, only if one exists (priority order): bank connection expired → hardship trigger → score dropped ≥ 20 pts since last refresh → new offer (if lender consent on). One at a time.
  2. **SmartScore card:** ScoreRing (medium), stage, change since last refresh (neutral styling for drops: "Down 17 since 11/09"), link to Score.
  3. **Next thing to do:** one RecommendationCard (highest projected impact the customer can act on **within this pay cycle** — don't lead with an action that costs money the customer doesn't have; when "left after bills" is negative, prefer a no-cost action). Opens the recommendation sheet.
   - jess (−$53 before payday): "Skip the next pay advance if you can" — "You've taken a $300 Beforepay advance every fortnight since 27/08. Each costs $15 and comes out the day before payday." Paying off Nimble (~$610, estimated) is second, on `/savings`.
  4. **Pay cycle card:** "{spent} spent · {days} days to payday · {left_after_bills} left after bills" with the spent/due track (from `derived.json`). Link to Spending.
   - **Days to payday** = calendar days from the data date to the next payday (jess: Fri 25/09 → Thu 01/10 = 6 days). Show the payday too: "6 days to payday (Thu 01/10)".
   - **Definition:** `left_after_bills = current available balance − predicted bills due before next payday`. Not "income − spending" for the cycle, which ignores money carried in or owed from last cycle.
   - **"Paid in"** counts income only; pay advances are shown separately ("Includes a $300 pay advance, due back 30/09").
   - **Short before payday** (jess: $314 balance − $367 due = −$53): headline "About $53 short before payday" in `caution` (not red), with two options: "See what's due" (calendar) and "Options if money's tight" (hardship). This is the most useful thing the app can tell her.
  5. **Next bill:** the next upcoming bill (date, merchant, amount, "predicted").
  6. **Six-month spending** mini bar chart (monthly totals from AM2004 monthly_values) — tappable to Spending.
- **States:** declining (jess), improving (marcus: "Up 11 since 11/09"), no score (priya), lapsed subscription (limited: score visible, drill-downs show a reactivate prompt), bank link broken (banner + stale timestamp).

### P2 SmartScore (`/score`)
- **Job:** explain the score and show the path to the next stage.
- **Content:**
  1. ScoreRing hero, stage scale (Building 0–449 · Steadying 450–599 · Healthy 600–749 · Thriving 750–1,000 — **placeholder bands**, Q4), "Next stage: Healthy at 600 — 128 points to go" (jess at 472; always computed live from the bands).
  2. Trend chart: SmartScore over time from `score_history.json` (points per refresh). Neutral line; no red segments.
  3. **Top three factors** (large tiles): chosen by Q2 rule (default: the three lowest actionable factors). Each: name, x/10, one-line reason, "What lifts it".
  4. **All nine factors** (compact list, GOVERNMENT_RELIANCE excluded from tiles — see `05_smartscore.md`), each opens `/score/[factor]`.
  5. "How your score works" expander: plain explanation, factors listed including income sources, data source (bank statement only unless Q1 decides otherwise), refresh cadence.
- **Factor detail (`/score/[factor]`, sheet on mobile):** score x/10, what it measures, **what's driving it** (the supporting AM metrics as plain facts with periods), what lifts it, related recommendation(s), "Last updated".

### P3 Spending (`/spending`)
- **Behavioural reference:** `reference/spending_interaction_prototype.html`. Build that behaviour.
- **Tabs:** Overview · Categories · Budgets.
- **Overview:** period chips (This pay cycle · Last pay cycle · 3 months · 12 months) → PayCycleHero (spent / paid in / left after bills / due before payday, upcoming list) → one InsightCard with "1 of n" paging → interactive donut (tap slice filters everything below; tap again clears) → category list → transaction feed with search.
- **Categories tab:** sortable (amount, change vs last period, A–Z), filterable (All · Essentials · Lifestyle; account filter when multi-account), rows expand to merchants → merchant sheet with transactions → recategorise (updates every total, toast confirms). Each row: amount, change vs last period, sparkline (last 6 pay cycles), budget bar if a budget exists, insight chip if an insight refers to it.
- **Budgets tab:** budget vs spent per category for the pay cycle, maths must reconcile (`spent / budget`), "Edit budget" sheet (mock persist in localStorage). Summary: total budgeted vs spent. No "3 of 6 exceeded" unless all six are listed.
- **Gambling:** ordinary row, neutral colour, no highlight; its insight uses the template in `02_voice_and_copy.md`.

### P4 Spending comparison (`/spending/compare`)
- **Job:** context, not a league table.
- **Content:** "You vs your last 3 pay cycles" first (default). Second tab "People in a similar situation": cohort = age band + income band + region only; show median and typical range per category as a band, with the customer's marker. **No percentiles, no rankings, no "top savers", gambling excluded.** Clearly marked "Sample cohort data" (Q6).

### P5 Expense calendar (`/calendar`)
- **Job:** see payday to payday at a glance.
- **Default view:** the current fortnight (two rows of seven), payday highlighted; toggle to month.
- **Cells:** day number; dots for confirmed spend (solid) vs predicted bills (outlined); tiny end-of-day balance bar from AM2019 using neutral tones (below-zero uses a hatched neutral, **not red**).
- Tap a day → sheet: that day's transactions + predicted bills. Range selection (drag or tap-tap) → totals for the range.

### P6 Subscriptions (`/subscriptions`)
- List from `derived.json → subscriptions`: merchant, amount, cadence, last charged, per-pay-cycle and per-year cost. Actions per row: Keep · Remind me before next charge · How to cancel (sheet with steps). No fake urgency.

### P7 Ways to lift your score (`/savings`)
- RecommendationCards ordered by projected impact: what, why, projected impact (dollars per pay cycle and factor points), one action, "Not relevant to me" (hides for this pay cycle), "Snooze".
- Projections come from `lib/selectors/recommendations.ts`; score-point impacts are **illustrative until Q3** — render a "Sample estimate" tag in dev mode.

### P8 Loans & credit (`/loans`)
- **Tabs:** Overview (active loans with estimated balance, repayment, provider, type; totals; debt-to-income) · Upcoming (next 30/60/90 days of repayments) · History (past repayments, dishonours shown as facts) · Other credit (BNPL, pay advances, credit cards).
- LoanCard expands: provider, type (SACC/MACC/AOCC explained in plain words), estimated balance ("estimated from your transactions"), repayment amount and cadence, next due date.
- Denser surface: use tables on desktop, stacked cards on mobile.

### P9 Early repayment calculator (`/loans/repayment`)
- Pick a loan → slider for extra per pay cycle → output: paid off {n} weeks sooner, about ${x} less in fees/interest. **TaleFin provides no interest rate or term** (Q7): ask the customer to confirm balance, rate/fees and remaining term (prefilled estimates, editable). Show "Based on the details you entered".

### P10 Loan offers (`/offers`)
- Only visible when lender-matching consent is on; otherwise an explainer with a toggle to Consents.
- OfferCards: lender, amount, term, comparison rate/fees, repayment per pay cycle, total cost, why you matched (plain), "View details" / "Not interested". Objective, comparable, no countdowns, no "pre-approved".
- `marcus` has one mock offer; `jess` has none (empty state); `priya` none.

### P11 Hardship support (`/hardship`)
- **Job:** relief, not embarrassment.
- Content: plain opener ("If money's tight right now, these are real options, and using them doesn't count against your SmartScore." — confirm Q8); options as cards: ask your lender for a hardship arrangement (what to say, template message), free financial counselling via the National Debt Helpline (show phone as selectable text), pause or downgrade Tippla (one tap), gambling support options (neutral, one of several).

### P12 Help / FAQ (`/help`)
- Search first. Seed questions a stressed customer would ask: "Why was I declined?", "Will checking my score hurt my credit?", "Who sees my data?", "How do I stop lenders contacting me?", "How do I cancel?", "Why is my income wrong?", "I changed banks".

### P13 Account
- **Profile & settings:** name, email, mobile, notification channels (email/SMS/push) per notification type, theme.
- **Subscription & billing:** plan, next charge, history, change plan, **cancel in one tap** with a confirmation sheet (no retention dark patterns).
- **Consents:** each consent with status, date given, version, withdraw/grant. Withdrawing lender matching shows: "Lender matching is paused. Lenders won't see your profile."
- **Bank connections:** connected accounts, last refresh, reconnect, disconnect.

### P14 Notifications (`/notifications`)
- Inbox, grouped by today / this week / earlier; types: score change, bill reminder, offer (consent-gated), subscription event, bank connection. Mark read, settings link.

---

## Pro vs Standard (Q9)
Both tiers get the complete core product. Pro adds (placeholder): more frequent refresh, extra history range, early repayment calculator scenarios. Never show Standard as crippled; no greyed-out teaser panels on core screens.
