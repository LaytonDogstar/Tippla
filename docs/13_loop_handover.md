# Tippla: from snapshot to loop

Handover for the team · 06/10/2026 · branch `claude/fervent-dirac-3o3yre`

## Why we changed it

Tippla used to be a snapshot. It showed where the customer stood, but not what had changed, what to do next, or whether their effort was working. The home page gave about six widgets equal weight, so the customer had to scan everything and work it out themselves.

The loop changes that. Each refresh, Tippla tells the customer what it checked, surfaces the few things that need a look, gives them one number to live by until payday, and shows them later whether what they did worked. Everything stays about the customer's own money: lender offers never appear in the loop.

## What the customer sees

### Today (home)

From top to bottom on a phone:

- **Status line:** what Tippla did at the last refresh, e.g. "Checked 32 new transactions this morning · 7 things to look at".
- **Safe to spend today** (or the **payday check-in** on the morning pay lands).
- **Needs a look:** up to three ranked cards, each with one clear action plus Done, Snooze and Dismiss (all with Undo).
- **Your last pay cycle** recap (payday only).
- Pay cycle summary, SmartScore with the reason it moved, "Tippla has helped you save", a link to **Your progress**, the next thing to do, the next bill and six months of spending.

### Navigation

Five sections, each with a badge counting its open "Needs a look" items: **Today**, **Money** (spending, calendar, subscriptions), **Score** (including ways to lift it), **Borrowing** (loans, offers) and **Help** (hardship, help). Account sits behind the header avatar. Hardship support stays visible on every screen.

### Needs a look: the rules

Each rule is one small file, so adding a rule is a file plus one line. Cards are ranked by urgency × the dollars at stake.

| Rule | When it shows | Where it points |
|---|---|---|
| Shortfall before payday | Balance minus bills due before payday is below $0 | What's due, plus "Options if money's tight" |
| Bill bigger than the balance | A predicted bill is more than the forecast balance the day before it | That day on the calendar, plus hardship options |
| Repayment due in 3 days | A pay advance, loan or BNPL repayment within 3 days (unless the card above already covers it) | Upcoming repayments |
| New subscription | First charge in the last 35 days | Subscriptions |
| Subscription price rise | The latest charge is higher than the one before it | Subscriptions |
| Possible double charge | Same merchant and amount twice on one day | The two charges |
| Unusual spend | A category well above its usual (never gambling or alcohol) | Spending |
| SmartScore changed | The score moved at the last refresh, with the reason | Score |

### Safe to spend today

(Forecast balance the day before payday − $50 buffer − this pay cycle's goal step) ÷ days to payday, rounded down and never below $0. The forecast is the balance, minus predicted bills, plus expected income. Tapping "How we worked this out" shows every line. When nothing is spare it says so plainly and links to hardship options.

### Payday check-in and recap

On the morning wages or Centrelink land, the check-in shows what landed, the bills and repayments due this pay cycle, whether a pay advance is due back, and safe to spend.

The recap covers the pay cycle that just ended: spent and paid in, pay advances (or "You got through without a new pay advance"), SmartScore from → to, bank fees, fees avoided and the three biggest category changes. A streak is mentioned only when it's two or more pay cycles. A streak ending is never mentioned.

### SmartScore explanations and projection

When the score moves, the change is split across the factors that moved and linked to the transactions behind them: "Down 17 since 11/09: new pay advance −9, gambling deposits −6, money left over −2 · Estimate". The parts always add up to the real change.

The Score page also shows "If you act on your next step: Skip the next pay advance: about 490 by 23/10", always labelled Estimate.

### Tippla has helped you save

This only counts savings we can see in the bank data after something the customer did in the app:

- **Subscription cancelled:** they tapped "I've cancelled it" and the next expected charge didn't come (3 days' grace). If it charges again, we say so gently and count nothing.
- **Pay advance fee avoided:** they tapped "I'll try this" on "Skip the next pay advance", and a whole pay cycle passed without a new advance.
- **Failed-payment fee avoided:** they marked a "bill bigger than your balance" card Done before the date, and the bill went through with no fee.

### Your progress and goals

The progress page answers "is it working?" without judging:

- **One optional goal:** an amount to have left the day before payday, by a chosen payday. It builds up evenly each pay cycle and that step is taken out of safe to spend. If the step would leave nothing to spend, the goal simply waits that pay cycle.
- **Going well:** streaks of two or more pay cycles (no new pay advance, no failed payments, money left before payday).
- **Money left the day before payday** for the last six pay cycles. Bars only for money left; a cycle below $0 is words, not a bar.
- **SmartScore and what you did:** score updates and in-app actions on one timeline.

### Notifications

Only when something happens: a shortfall within 5 days (links to hardship), a bill tomorrow bigger than the balance, pay landed, the recap, a SmartScore update (the amount only) and changes to the customer's account. Routine "data refreshed" and "payment went through" messages are gone.

In Profile the customer chooses up to 1, 2 or 3 a day to their phone (default 2; the rest wait in the inbox, money alerts first) and can move score updates and recaps into a weekly summary. Shortfalls and bills always come straight away.

## Guardrails (and how they're enforced)

| Guardrail | Enforced by |
|---|---|
| Lender offers never in the feed, notifications or recaps | No offer rule or notification type exists; tests scan every persona and snapshot |
| Gambling and alcohol never in unusual-spend cards, recaps, progress or notifications | Excluded in the rules and selectors; tests scan the text |
| Never shame a missed streak | Streak copy only exists for 2+; a test checks the copy for words like "broke" or "missed" |
| Hardship options reachable whenever a shortfall is forecast | Shortfall and bill cards, safe to spend and the shortfall notification all link to hardship |
| Australian English, AUD, DD/MM dates | Banned-phrase test over all copy; shared formatters |
| One source of truth for numbers | Every figure comes from selectors; tests check the recap, progress page and hero agree |

## Trying it (demo script)

Open the app with `?persona=jess&present=1`. Dev states are added with `&state=` and stick until `&state=none`.

1. **Today on 25/09:** "Nothing spare before payday", three ranked cards, section badges, the score explanation.
2. **Act:** tap "See how" on "Skip the next pay advance", then "I'll try this". On Subscriptions, open Binge › How to cancel › "I've cancelled it". On Today, tap Done on the Beforepay card.
3. **Payday:** add `&state=payday` (Thu 01/10). See the check-in, the recap, $15 fees avoided and the two savings waiting to confirm.
4. **Goal:** open Your progress, set the default $200 goal, and go back to Today: safe to spend drops from $24 to $22 a day, "including $40 towards your goal".
5. **Notifications:** `&state=bill_due` (Tue 29/09) shows "Beforepay $315 is due tomorrow". Change the daily limit and weekly summary in Profile.
6. **Marcus** (`?persona=marcus`): positive streaks ("13 pay cycles in a row") and a lender-ready profile, with no offers anywhere in the loop.

## Sample logic to confirm

These are placeholders, isolated in config and tagged "Sample logic" in dev mode. They need a decision before launch.

| Ref | What | Current default | Owner |
|---|---|---|---|
| Q3 | Score points per factor and projections | Sample factor weights and assumed lifts; always labelled Estimate | TaleFin |
| Q21 | Safe-to-spend buffer | $50 | Product |
| Q21 | Notifications to the phone per day | 2 (customer can choose 1–3) | Product |
| Q21 | Shortfall notification window | 5 days | Product |
| Q21 | Savings confirmation | 3 days' grace after an expected charge; failed-payment fee = the customer's last one, else $15 | Product |
| Q22 | How a goal builds up | Even steps each pay cycle (at least two), waits when it would leave nothing to spend | Product |
| Q22 | How goal progress is measured | Balance the day before the latest payday | Product |
| Q4 | Score stage bands | 0–449 / 450–599 / 600–749 / 750–1,000 | Product |

## Known limits

- **No backend yet.** Customer choices (Done, Snooze, goals, actions, notification settings) live in a browser cookie. They're shaped so a database can replace them without changing screens.
- **Nothing is actually sent.** Notifications are generated with their delivery (phone, inbox or weekly summary), but no push, SMS or email goes out.
- **Fixed dates.** The data is frozen at Fri 25/09/2026, with extra snapshots for payday (01/10) and Jess's bill eve (29/09).
- **Nav badges** work out the feed on every page. That's fine on mock data; a real build would use a light badge endpoint.
- **Gambling in the score explanation:** the SmartScore explanation on Today can name "gambling deposits", following the brief's own example. It never appears in notifications, recaps or the progress page. Change this if you'd rather keep gambling off Today entirely.

## Quality checks at handover

- All 236 unit tests and all 94 browser tests pass (the three core journeys, the loop journeys, accessibility checks in light and dark for all three personas, 200% text size, reduced motion).
- Lighthouse mobile accessibility: every screen scored 100 for all three personas, including the progress page, the weekly summary, the payday state and the bill-eve notifications (target ≥ 95).
- A code review of the loop found six real issues, all fixed with regression tests: a price-rise card that came back every month, a duplicate card for one repayment, an empty score explanation, a cancelled subscription that stayed "waiting" forever after charging again, one-off charges counted as subscriptions, and recategorisations ignored on Subscriptions. One line of copy that gave lifestyle advice was also rewritten.
