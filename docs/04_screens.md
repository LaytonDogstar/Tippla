# 04 · Screens

For each screen: **Job** (the one thing it must do) · **Content** · **Interactions** · **States**. Data sources reference `06_data_mapping.md`. Every screen must render for `jess`, `marcus`, `priya`, in light and dark, with skeleton loading (not spinners) while the mock API resolves.

---

## Onboarding

*(06/10/2026, retention spec 04, flag `onboarding_v2`.)* The flow is now: **O0 Welcome → O1–O4 → O4a First insight → O5 SmartScore intro → O6 Goal → O7 Alerts → Today.** With the flag off it is O1–O5 → Today as before.

### O0 Welcome (`/onboarding/welcome`)
- One sentence: "We'll tell you what's coming, what needs a look, and how to get ahead, every pay cycle." Three short points, "Get started".

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
- After: "Connected to CBA · Smart Access". Then ask plainly for the others: "Do you use any other accounts, like savings or another bank? Connecting them keeps money you move between your own accounts out of your spending." Buttons: "Add another account" · "That's all of them". Every connected account improves transfer matching (Q20).

### O4 Analysing
- Four steps tick through in plain language (see copy doc). ~8 s simulated. No bouncing illustrations. Reduced motion: steps appear without animation.

### O4a First insight (`/onboarding/insight`)
- **Job:** one concrete, personal win within a minute of the data loading.
- The single most valuable finding, full screen, chosen in this order (`selectors/firstValue.ts`):
  1. A shortfall this pay cycle: "Heads up: you could be about $53 short before your 01/10 payday" (jess), with "See what's due" (bills before payday in a sheet).
  2. Three or more subscriptions: "You're paying $810 a year across 5 subscriptions".
  3. Pay advance fees in the last 90 days: "You've paid $30 in pay advance fees in the last 3 months".
  4. Positive fallback: the strongest factor, never Gambling & alcohol spending, Spending mix or Income sources ("Your payments go through on time. That's your strongest factor." for marcus). With no score: the pay rhythm ("Your pay comes in every second Thursday, about $1,960…" for priya).
- The detail opens in a sheet so the flow carries on; "Next" goes to the score. Sample logic (Q29).

### O5 SmartScore reveal
- **Job:** handle a lower-than-expected number gently, with context and a next step.
- **Content:** ScoreRing (hero size) with stage label; one sentence of context; the single factor with most room to move (lowest factor that is actionable — exclude GOVERNMENT_RELIANCE); one first action card; "See everything" → Dashboard.
- **priya (override -998):** no number. "We need a bit more history to work out your SmartScore — usually 90 days. We'll calculate it automatically. Meanwhile, here's what we can already see." Then pay cycle and spending.
- **No confetti. No "Congratulations".**
- *(spec 04)* With `onboarding_v2` this is the short score intro: no first-action card (the goal decides the first step), and "Next" goes to the goal picker.

### O6 Goal (`/onboarding/goal`)
- "What would help most right now?" Pick one, changeable later: Get to payday without running short · Stop relying on pay advances · Lift my SmartScore to {next stage} ("Build my SmartScore" with no score) · Cut my bills and subscriptions · Build a small buffer · Spend less on gambling (only when gambling transactions are detected, last, with "Only you see this choice."). Nothing preselected; Continue waits for a choice.
- The goal (`focusGoal` in the account state, flag `goals_v1`) drives: which step leads "Your plan" and "Next thing to do" (when short before payday a no-cost step still leads), the check-in ("Your goal: …"), and which recap line comes first (money left the day before payday, pay advances, or SmartScore; never gambling).

### O7 Alerts (`/onboarding/alerts`)
- "Want a heads-up before you run short?" with what we'd send and the limits. "Yes, turn on alerts" asks the browser; if it's refused: "Your browser didn't allow notifications. You can turn them on later in Account › Profile." "Not now" goes straight on. Either way it records the onboarding date and lands on Today.

---

## Portal

### P1 Today (Home, `/`)
- **Job:** show what Tippla has done and what needs a look, so the customer doesn't have to scan. Not a data fire-hose. *(Updated 05/10/2026: the snapshot became a loop.)*
- **Content (top to bottom, mobile):**
  0. **Status line** from the refresh timestamp: "Checked 32 new transactions this morning · 7 things to look at" (transactions since the previous refresh).
  1. Urgent state banner, only if one exists (priority order): bank connection expired → hardship trigger → score dropped ≥ 20 pts since last refresh. One at a time. **Never an offer** (05/10 guardrail). The hardship banner steps aside when a "Needs a look" card already offers "Options if money's tight".
  1a. *(06/10, spec 03)* A "You can pause your $9.99 Tippla payment" card (Help section, urgency 3) when the member is short before payday or has opened Hardship support this pay cycle.
  1a. **Needs a look** (`src/lib/feed/`): at most 3 ranked cards, each with one clear action plus Done / Snooze (until tomorrow, until payday) / Not relevant, all with Undo, persisted per customer. "See all (n)" lists the rest. Rules: shortfall before payday, bill bigger than the forecast balance (due within 3 days), repayment due within 3 days, new subscription, subscription price rise (≥ $1 or ≥ 5%), possible duplicate charge (within 48 hours), unusual spend vs the median of the last 3 pay cycles (never gambling or alcohol), score change of 5+ points with explanation, bank connection needs reconnecting, and the Tippla payment pause (spec 03). Lender offers are never a rule.
     - *(06/10, retention specs 01–02)* **Ranking:** urgency × 10 + log10(amount at stake) × 5, ties to the soonest expiry (`RANK_WEIGHTS`, `feed/rank.ts`). A card marked Done or Not relevant comes back if its amount at stake changes by more than 20%. Jess on 25/09: shortfall, possible double charge, pause Tippla (7 open). When nothing needs a look: "All caught up. We checked n transactions."
     - **Status line** says when the data is stale (bank disconnected or expired) and links to reconnect.
  1b. **Safe to spend today** (05/10, `selectors/safeToSpend.ts`): `(forecast balance the day before payday − buffer − this cycle's goal step) ÷ days to payday`, rounded down, never below $0. The forecast is balance − predicted bills + expected income before payday. "How we worked this out" opens the working as a sheet. When nothing is spare it says "Nothing spare before payday" and links to hardship options (jess on 25/09; $28 a day on payday 01/10). *(06/10, spec 02)* The buffer defaults to $0 and the member sets it in the sheet ($0 / $25 / $50 / $100). "Up $4 since yesterday" appears only when the figure rose against one seen on an earlier day (never when it falls). Without a known next payday it uses a 7-day window ("for the next 7 days"); with irregular income (INCOME factor < 5) the payday is marked "Estimate".
  1c. **Payday check-in** (replaces 1b on the morning wages or Centrelink land): what landed, the bills and repayments due this pay cycle, whether a pay advance is due back, safe to spend, and the one focus for this pay cycle. *(06/10, spec 02)* "Something's not right?" lets the member mark a predicted bill as already paid or add a one-off before payday; safe to spend recalculates at once. On a payday morning before the pay has landed, a "Waiting for your pay" card shows instead.
  1d. **Your last pay cycle** recap (payday only, below the feed): spent and paid in, pay advances (or "You got through without a new pay advance", plus "That's N pay cycles in a row" only when N ≥ 2), SmartScore from → to, bank fees, fees avoided, the three biggest category changes (never gambling or alcohol). Never an offer. Nothing is ever said about a streak ending. *(06/10, spec 07 wording)* With no current streak it shows the best-ever one ("Your best is 10 pay cycles in a row without a new pay advance."), then "For the next pay cycle: …" and a link to past pay cycles.
  1e. **Tippla has helped you save** (right column, only once something is counted or pending): savings we can see in bank data after an in-app action. Counts: a subscription marked "I've cancelled it" whose next charge doesn't come (3-day grace); each whole pay cycle without a new advance after "I'll try this" on "Skip the next pay advance" (the advance fee); a "bill bigger than your balance" card marked Done before the date where the bill then went through with no failed-payment fee, counted at 50% of the usual fee (spec 02; Jess $7.50). Subscription savings are capped at 12 months. Before anything is counted: "As you use Tippla, we'll track what it saves you." Pending items say when they'll be confirmed.
  2. **SmartScore card:** ScoreRing (medium), stage, change since last refresh **with its explanation** ("Down 17 since 11/09: new pay advance −9, gambling deposits −6, money left over −2 · Estimate"), link to Score.
  3. **Next thing to do:** one RecommendationCard (highest projected impact the customer can act on **within this pay cycle** — don't lead with an action that costs money the customer doesn't have; when "left after bills" is negative, prefer a no-cost action). Opens the recommendation sheet.
   - jess (−$53 before payday): "Skip the next pay advance if you can" — "You've taken a $300 Beforepay advance every fortnight since 27/08. Each costs $15 and comes out the day before payday." Paying off Nimble (~$610, estimated) is second, on `/savings`.
  4. **Pay cycle card:** "{spent} spent · {days} days to payday · {left_after_bills} left after bills" with the spent/due track (from `derived.json`). Link to Spending.
   - **Days to payday** = calendar days from the data date to the next payday (jess: Fri 25/09 → Thu 01/10 = 6 days). Show the payday too: "6 days to payday (Thu 01/10)".
   - **Definition:** `left_after_bills = current available balance − predicted bills due before next payday`. Not "income − spending" for the cycle, which ignores money carried in or owed from last cycle.
   - **"Paid in"** counts income only; pay advances are shown separately and never added to it ("Plus a $300 pay advance (not income): $315 due back 30/09"). Jess's $2,483 is wages only.
   - **Short before payday** (jess: $314 balance − $367 due = −$53): headline "About $53 short before payday" in `caution` (not red), with two options: "See what's due" (calendar) and "Options if money's tight" (hardship). This is the most useful thing the app can tell her.
  5. **Next bill:** the next upcoming bill (date, merchant, amount, "predicted").
  6. **Six-month spending** mini bar chart (monthly totals from AM2004 monthly_values) — tappable to Spending.
- **Your goal** *(06/10, spec 04)*: a row near the top, "Your goal: Stop relying on pay advances · Change" ("Pick a goal" if none), opening the same picker in a sheet.
- **First payday after onboarding** *(spec 04)*: the check-in opens with "Your first payday with Tippla. Here's your pay cycle, with your goal in view."
- **Corrections** *(06/10, spec 05)*: "See what's due" lists each bill with "Not right?": Already paid · Different amount · Moved to another day · Not a bill · This has ended. Each applies at once to the forecast, safe to spend, the feed and the plan, with "Got it. Your forecast is updated" and Undo (jess: Telstra already paid → "About $1 short before payday"). The same "Not right?" is on each subscription (This has ended · Not a subscription), each loan card (This has ended · This isn't a loan, which treats its payments as a bill) and each transaction (category for every payment from that merchant, now and in future; for money in: One-off or Regular pay).
- **Forecast accuracy** *(spec 05, flag `forecast_accuracy_v1`)*: the safe-to-spend working shows "Our forecasts for you have been within $20 on 9 of the last 10 days" only when at least 8 of the last 10 were. When yesterday's forecast missed by more than $100 or 30%, a card asks "We got this one wrong. Was there something unusual?" (A one-off cost · A bill came out on a different day, which opens the bill fixes · My pay was different · Nothing unusual), once per day (jess on 25/09: expected about $70 for 24/09, it ended at $428).
- **Connection health** *(spec 05)*: stale data (48 h+) or a consent ending within 14 days shows in the status line and as a "Needs a look" card; over 72 h, safe to spend pauses rather than guess, and every portal page shows "Based on data from {day} · Reconnect".
- **Gambling insights setting** *(06/10, spec 01)*: Profile › Insights › "Show gambling insights" (on by default). When off, the Spending gambling insight is hidden and gambling is folded into "Spending mix and other factors" in the score explanation.
- **Feature flags** (`config/featureFlags.ts`): the feed, status line, safe to spend, buffer, check-in, recap, score attribution and value tally each sit behind their pack flag; demo personas see them all.
- **States:** declining (jess), improving (marcus: "Up 11 since 11/09"), no score (priya), lapsed subscription (limited: score visible, drill-downs show a reactivate prompt), bank link broken (banner + stale timestamp).

### P2 SmartScore (`/score`)
- **If you act on your next step** (05/10, Q3 sample logic, `scoring/estimate.ts`): "Skip the next pay advance: about 490 by 23/10", labelled Estimate. Points = sample factor weight × assumed factor lift; the date is two fortnightly refreshes after the last one. Hidden when there's no score.
- **What changed** (05/10): each factor that moved since the last refresh, from → to, its estimated points (labelled "Estimate", Q3) and the transactions behind it ("New Beforepay pay advance (24/09)"). The points always add up to the actual change.
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
- List from `derived.json → subscriptions`: merchant, amount, cadence, last charged, per-pay-cycle and per-year cost. Actions per row: Keep · Remind me before next charge · How to cancel (sheet with steps, and "I've cancelled it", which the value tally later confirms). No fake urgency.
- *(06/10, spec 06, `cancel_helper_v1`)* Merchant-specific steps where the directory has them (Apple iCloud: changed on the Apple device), with "Steps can change…"; otherwise the generic steps. "Still using {merchant}?" Yes / No on subscriptions over $10 a month (No opens the guide). Charged again after "I've cancelled it": a "Needs a look" card, "{merchant} charged again: the cancellation may not have gone through". Acceptance: iCloud marked cancelled, no charge on 20/10 → $4.49 counted once the 3-day grace passes (23/10, Q21).

### P7 Your plan (`/savings`) *(renamed from "Ways to lift your score", 06/10, spec 01)*
- RecommendationCards ordered by projected impact: what, why, projected impact (dollars per pay cycle and factor points), one action, "Not relevant to me" (hides for this pay cycle), "Snooze".
- Projections come from `lib/selectors/recommendations.ts`; score-point impacts are **illustrative until Q3** — render a "Sample estimate" tag in dev mode.
- **Compare your bills** *(06/10, spec 06, `bill_switch_v1`, gates G2 and G4)*: phone, internet and energy bills found in the transactions (jess: Telstra about $52 a month, Origin Energy about $82). General information only: energy links to Energy Made Easy (Victorian Energy Compare is mentioned for VIC); phone and internet open plain tips. No providers named as recommended, no prices, no referral links. "I've switched or changed plan" records the monthly saving as self-reported: it's listed in the value tally sheet under "You told us (not counted in the total)".

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
- *(06/10, spec 06, `hardship_autofill_v1`, gate G6)* **Write my letter**: pre-filled from the data (jess: Beforepay, $315, due Wed 30/09, Jess Taylor), each detail editable; optional questions (what's changed, how long, what you could pay a fortnight, how to contact you); the letter in plain English, editable; Copy · Open in email (a draft in the member's own email app) · Download PDF. "Tippla never sends this for you." Lender hardship contacts come from the lender directory once verified; until then, "Look for 'hardship' on {lender}'s website or app…". General note on credit law (counsel to review, spec 11). Next pay cycle a "Did you hear back from Beforepay?" card (Yes, they agreed · Yes, they said no → National Debt Helpline · Not yet → asked again next cycle).

### P12 Help / FAQ (`/help`)
- Search first. Seed questions a stressed customer would ask: "Why was I declined?", "Will checking my score hurt my credit?", "Who sees my data?", "How do I stop lenders contacting me?", "How do I cancel?", "Why is my income wrong?", "I changed banks".
- **Support you might be able to get** *(06/10, spec 06, `/help/entitlements`, `entitlements_v1`, gate G3)*: six optional questions (who lives with you, anyone relying on you, work, study, renting, concession card), then pointers to official sources only (Services Australia Payment and Service Finder, Rent Assistance, concession cards, state concessions for NSW/VIC/QLD, Good Shepherd No Interest Loans, Energy Made Easy). No-interest loans come second for members using pay advances. Tippla doesn't decide eligibility. Answers are kept only if "Remember my answers" is ticked (off by default). It appears once in "Needs a look" (urgency 2) for members in Building or Steadying or short before payday, until done.

### P13 Account
- **Profile & settings:** name, email, mobile, notifications (spec 10, 06/10: "Notifications on this device" with a test send; pause all; quiet hours, default 9pm–8am; amounts on the lock screen off by default; weekly summary for SmartScore updates; push and email per type), usage data, theme.
- **Subscription & billing:** plan, next charge, history, change plan, **cancel in one tap** with a confirmation sheet (no retention dark patterns).
  - **Billing on payday** (retention pack spec 03, flag `payday_billing_v1`, 06/10): the charge moves to the day after the payday nearest the old date ("Next charge $11.32 on Fri 02/10 (the day after your payday)", with "We've moved your Tippla payment to after your pay lands on Thu 01/10."). A charge that would take the forecast balance below $0 before the next pay is moved to after pay lands, and says so. The first move shows its proration (days × price ÷ days in the period). "When we charge you": the day after payday (recommended) or a fixed day (1–28); "How often": monthly or each pay cycle (monthly × 12 ÷ 26). Failed payments are retried only after the next pay lands, at most twice, with no fee and no threatening wording. "Pause for a month" sits on the page itself, with "If money's tight…" when the member is short before payday or has used Hardship support this pay cycle. Every date change is logged once with its reason (`billing_events`).
- **Consents:** each consent with status, date given, version, withdraw/grant. Withdrawing lender matching shows: "Lender matching is paused. Lenders won't see your profile."
- **Bank connections:** connected accounts, last refresh, reconnect, disconnect.
  - *(06/10, spec 05, flag `connection_health_v1`)* Status per connection (Connected · Not updating · Needs reconnecting · Ending soon), "Access ends {date}" (12 months from consent), the push reminder dates when ending, and "Renew access" / "Reconnect", which opens `/account/bank/reconnect?return=…`: an explainer, the TaleFin screen, then straight back to the page the member came from. When transfers go to an account in the member's name that isn't connected: "Add your other account?".
- **Your corrections** *(spec 05, flag `corrections_v1`, `/account/corrections`)*: everything the member has told Tippla in plain words ("Stan: subscription has ended", "Telstra due 26/09: already paid"), each with Remove.

### P14 Notifications (`/notifications`)
- Inbox, grouped by today / this week / earlier. **Event-driven only** (05/10): shortfall forecast within 5 days (links to hardship), a bill tomorrow bigger than the balance, pay landed (check-in), the pay-cycle recap, SmartScore updates (amount only, never factor detail), and changes to the customer's account (subscription cancelled or paused, bank disconnected). No routine "refreshed" or "payment went through" messages. **Never offers or lenders; never gambling or alcohol.** Each item says how it was delivered: to the phone, by email, kept here (over the daily limit, paused, or turned off), or in the weekly summary. *(06/10, spec 10: the central policy decides: 1 normal or low a day and 3 a week, 1 urgent money alert a day, quiet hours, generic lock-screen text. See docs/15.)* Mark read, settings link.

- **Weekly summary (`/notifications/summary`)** (05/10): the last seven days' events from the inbox, plus safe to spend today, the goal and the value tally. Same guardrails as the inbox. Linked from the inbox; it's what the weekly digest setting sends.

### P15 Your progress (`/progress`, Today section)
- **Job:** answer "is my effort working?" without judging. Linked from Today ("Your progress", with the goal if there is one).
- **Your goal** (one at a time, optional, Q22 sample logic): an amount to have left the day before payday ($100 / $200 / $500 / another amount, $20–$5,000) by the day before one of the next eight paydays (default: the fourth). It builds up evenly: this pay cycle's step = amount × (cycle number ÷ cycles in the goal), and that step is set aside in safe to spend (Today, the check-in, the payday notification and the working all show it). If the step would leave nothing to spend, the goal waits that pay cycle ("That's fine") rather than take the daily figure to $0. Progress = the balance the day before the most recent payday since the goal was set; before one has passed it says when it will show. Change and Remove (with Undo). Never a fail state.
- **Going well:** streaks of 2+ pay cycles in a row: no new pay advance, no failed payments, money left before payday. Nothing is said when a streak ends; with none, a neutral line explains what shows here.
- **Money left the day before payday:** the last six completed pay cycles (the most recent is the same cycle, with the same figures, as the payday recap). Bars only for money left; a cycle that ended below $0 is words, not a bar. Pay advances and bank fees noted plainly.
- **Your SmartScore and what you did:** the last six score updates with the customer's in-app actions on the same timeline (cancelled a subscription, chose to skip the next advance, acted on a bill-over-balance card).
- **Tippla has helped you save:** shown once something is counted or pending, with the same breakdown sheet as Today.
- No comparisons with other people. No offers.

---

## Pro vs Standard (Q9)
Both tiers get the complete core product. Pro adds (placeholder): more frequent refresh, extra history range, early repayment calculator scenarios. Never show Standard as crippled; no greyed-out teaser panels on core screens.
