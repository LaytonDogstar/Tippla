# 02 — Pay-Cycle Loop

Feature flags: `safe_to_spend_v1`, `cycle_checkin_v1`, `cycle_recap_v1`, `score_projection_v1`, `value_tally_v1`

## Goal

Give each pay cycle a beginning, middle and end so members have a reason to open Tippla daily and a reward every fortnight.

## 1. Safe to spend today

- A single prominent figure on Home: **"$18 safe to spend today"**.
- Formula: `(forecast balance on payday eve − committed outflows not yet in the forecast − buffer) / days remaining until payday`. The buffer defaults to $0 at first. Members can set it, and spec 07 grows it.
- If the result is ≤ 0: show "$0 today" with "You're forecast to be $53 short — see options". This links to the hardship and options sheet. Never show a negative safe-to-spend figure.
- Tap opens a breakdown: balance, bills and repayments still due (listed), buffer, days left, and how it's calculated. Label it "Estimate".
- Recalculate on every data refresh. Show the "yesterday vs today" movement to reward restraint: "Up $4 since yesterday."
- Handle irregular income. If income stability is low, use the next expected income date with a confidence label, and fall back to "next 7 days" mode if no payday can be detected.

Tests: formula correctness, payday edge cases (payday today, payday moved by a public holiday, two incomes), the negative clamp.

Events: `sts_viewed {value_cents, days_left}`, `sts_breakdown_opened`.

## 2. Payday check-in

- Triggered when income is detected matching the payday pattern (or on the expected date if not yet detected, phrased as "Has your pay landed?").
- Push notification (via spec 10): "Pay's in. Here's your plan for the next 14 days." The text must not include amounts on the lock screen if the member has privacy mode on.
- Check-in screen: income received, bills and repayments expected this cycle (with dates), safe to spend per day, one focus for the cycle (taken from the member's plan, see spec 07, or the top factor to lift), plus last cycle's recap if it hasn't been viewed.
- The member can adjust: mark a bill as already paid, add a known one-off, set their buffer.

Events: `checkin_triggered`, `checkin_opened`, `checkin_completed`, `checkin_adjusted {type}`.

## 3. End-of-cycle recap

- Generated when the new pay lands (or on the payday eve). Delivered as a Home card and a push notification.
- Content, positive first:
  - Did they reach payday without a new pay advance or loan? Celebrate it.
  - Score change with attribution (from spec 01).
  - Fees avoided this cycle (from the value tally).
  - Biggest category change vs the 3-cycle median, framed neutrally.
  - Streaks (spec 07): e.g. "2 cycles in a row without a pay advance."
  - One suggestion for next cycle.
- Gambling content only if the member opted into a gambling goal.
- History: recaps are kept and browsable ("Past cycles").

Events: `recap_generated`, `recap_opened {source}`, `recap_shared` (if sharing is added later).

## 4. Score projection

- On `/score` under the top recommendation: "If you skip the next pay advance, you're on track for about 490 by 23/10." Label it "Estimate".
- Implementation: re-run the score model with a simulated scenario (e.g. the advance removed, or current-borrowing factor recomputed) over the next 1–2 cycles. Show a range if confidence is low.
- Never project a band change with false precision. Round to the nearest 5.

Tests: deterministic projections for seeded scenarios.

## 5. Value tally: "Tippla has helped you save"

- A running total on Account and in recaps, with an itemised ledger.
- Sources (only count savings attributable to an action taken in the app):
  - Subscriptions cancelled after a Tippla prompt: monthly cost × months since cancellation, capped at 12.
  - Pay advance or loan fees avoided: cycles without an advance after the member engaged with the "skip the advance" plan, valued at their average prior advance fee.
  - Dishonour or late fees avoided: when a `bill_exceeds_balance` alert was actioned and no dishonour fee followed. Count conservatively, 50% of the typical fee, or omit until it's validated.
  - Later: bill switching savings (spec 06).
- Each ledger line shows the evidence. Be conservative: overstating savings destroys trust.

Data: `value_events(member_id, type, amount_cents, evidence jsonb, created_at)`.

## 6. Event-driven notifications (content; the infrastructure is in spec 10)

| Trigger | Message (default) | Priority |
|---|---|---|
| Forecast shortfall appears ≤5 days before payday | "Heads up: you might be short before payday. See options." | High |
| Bill tomorrow larger than forecast balance | "A bill due tomorrow may not clear. Take a look." | High |
| Pay landed | "Pay's in. Here's your plan." | Normal |
| Recap ready | "Your last pay cycle in review" | Normal |
| Score update ≥5 points | "Your SmartScore changed — see why" | Low |
| Weekly digest (opt-in) | "Your week with Tippla" | Low |

- Frequency cap: at most 1 normal or low notification a day and 3 a week, plus high-priority ones as they occur (max 1 a day).
- Quiet hours default to 9pm–8am local time.
- No amounts, merchant names or sensitive categories in lock-screen text by default.

## Acceptance criteria

- Jess sees "$0 safe to spend today" with the $53 shortfall explanation and a link to options.
- Simulating a payday on Thu 01/10 produces a recap of the 17/09–30/09 cycle and a check-in for 01/10–14/10.
- The value tally ledger renders with seeded events, including the empty state: "As you use Tippla, we'll track what it saves you."
