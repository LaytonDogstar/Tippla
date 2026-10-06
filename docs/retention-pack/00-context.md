# 00 — Product Context, Principles and Guardrails

Applies to every workstream in this pack.

## What Tippla is

Tippla is an Australian consumer fintech for people living close to payday. It connects to a member's bank account through open banking (CDR), analyses their transactions, and provides:

- **Pay-cycle forecast:** whether they'll get to payday, the balance against bills due, money in and out, and pay advances (treated as borrowing, never as income).
- **SmartScore:** a score from 0 to 1,000 in four bands (Building, Steadying 450–599, Healthy 600+, Thriving), with eight factors each scored out of 10: income stability, payment track record, cash use, payments on time, spending mix, money left over, gambling and alcohol spending, and current borrowing.
- **Ways to lift your score:** one recommendation at a time, tied to the weakest factor.
- **Spending:** six-month view, month drill-down.
- **Calendar:** end-of-day balances for the fortnight or month, with forecasts shown in outline and days below $0 flagged.
- **Subscriptions:** detected recurring charges, with per-cycle and per-year cost, keep, remind and how-to-cancel options.
- **Loans & credit:** loans and pay advances detected from transactions (e.g. Beforepay).
- **Offers:** consent-based lender matching.
- **Hardship support:** a lender hardship message template, the National Debt Helpline, gambling support, and pause or downgrade of the Tippla subscription. Using these doesn't affect the SmartScore.
- **Account:** profile, Tippla subscription and billing (paid plan, e.g. "Standard"), consents, bank connections and notifications.

Current routes: `/`, `/score`, `/savings`, `/spending`, `/calendar`, `/subscriptions`, `/loans`, `/offers`, `/account`, `/notifications`, `/hardship`, `/help`. Deployed on Railway. A demo persona, **Jess Taylor**, has a dev switcher and sample data. Several areas are labelled "Sample logic · Qx", which marks placeholder logic.

### Demo persona snapshot (as of Fri 25/09)

- SmartScore 472 (Steadying), down 17 since 11/09, 128 points to Healthy. Trend 521 → 472 over the fortnights from 17/07.
- Factors: current borrowing 2.9 (3 loans open), gambling and alcohol 3.2 ($2,315 in gambling deposits over the last 90 days), money left over 3.4, spending mix 5.0, payments on time 5.6, cash use 6.1, payment track record 6.8, income stability 7.4.
- Pay cycle 17/09–30/09: about $53 short before payday (Thu 01/10). Balance $314, $367 due. $1,832 spent, $2,483 paid in.
- Beforepay advance: $300 received 24/09, $315 due 30/09.
- Next bill: Telstra $52 on Sat 26/09 (predicted). Subscription: Apple iCloud $4.49 a month.
- Spending Apr–Sep: $4,529, $6,361, $4,989, $5,385, $5,257, $4,821 (Sep to 25/09).
- Tippla Standard plan, next charge Mon 28/09.

## The problem this pack solves

The app is a snapshot, not a loop. It shows where the member stands but not:

1. **What changed** since they last looked.
2. **What needs their attention**, ranked, so they don't have to scan and analyse every screen.
3. **What to do next**, as one clear action.
4. **Whether their effort is working**, through visible progress, wins and value delivered.
5. **Where it leads**, i.e. what happens once they're financially healthier.

There's also nothing to bring them back at the right moment.

## Product principles

1. **Tell, don't make them analyse.** Every screen leads with the conclusion ("You'll be $53 short on the 30th"), then the evidence.
2. **One next action.** Never more than three items demand attention at once. Everything else is secondary.
3. **The pay cycle is the heartbeat.** Structure the experience around payday: a start-of-cycle plan, daily guidance, an end-of-cycle recap.
4. **Show cause and effect.** Every score change and forecast is explainable in plain English and traceable to transactions.
5. **Prove value.** Make visible what Tippla has done and saved. Members pay for this product.
6. **Progress, not perfection.** Celebrate improvement and never shame. Missed streaks reset quietly.
7. **Success shouldn't mean churn.** There's always a next stage beyond fixing the immediate problem.

## Guardrails (non-negotiable)

- **Supportive tone.** Plain, warm, non-judgemental, in line with the existing hardship copy ("Tools if you want them"). No guilt, fear-based urgency or moralising.
- **Lender offers stay out of the retention loop.** Offers never appear in the attention feed, push notifications, payday check-ins, recaps or the assistant's proactive suggestions. They're never shown to someone with a forecast shortfall or who's engaging with hardship tools. (See spec 11.)
- **Hardship is always one tap away** whenever a shortfall is forecast.
- **Gambling and alcohol:** gentle and optional. No push notifications about gambling. No gambling content in recaps unless the member has opted into that goal. Always offer support links.
- **No credit advice.** Tippla gives general information and tools. It doesn't recommend specific credit products or tell members to take or not take a particular loan. Workstreams 07 and 08 have compliance gates.
- **Estimates are labelled as estimates**, including projections, predicted bills and safe-to-spend figures.
- **Privacy:** no sensitive inferences (e.g. gambling) in notification text, email subject lines or anything visible on a lock screen.
- **Accessibility:** WCAG 2.2 AA. Every state must work for screen readers. Colour can't be the only way meaning is shown.

## Conventions

- Australian English spelling. AUD shown as `$1,234` (cents only where meaningful). Dates as `Fri 25/09` or `25/09`. Times as `9:14am`.
- Timezone: the member's local Australian timezone (store as IANA, e.g. `Australia/Sydney`).
- Money stored as integer cents.
- New features go behind feature flags (names given in each spec).
- Keep the "Sample logic · Qx" labelling convention for any logic that's still placeholder.

## Definition of done (every workstream)

- Behind its feature flag, with the flag on for the demo persona.
- Demo seed data extended so every new state can be demoed (including empty, edge and error states).
- Unit tests for rules and calculations. Integration tests for key flows.
- Analytics events from the spec implemented (see spec 09 for the schema).
- Copy reviewed against the guardrails above.
- Short change summary: what shipped, what's still sample logic, open questions.
