# 03 — Align Tippla's Own Billing to the Member's Payday

Feature flag: `payday_billing_v1`

## Problem

In the demo, Jess's Tippla charge is due Mon 28/09, two days before she's forecast to run $53 short, while her payday is Thu 01/10. Charging a member who's struggling just before payday risks dishonour fees, resentment and cancellation. It also undercuts the product's own message.

## Requirements

1. **Default billing date = detected payday + 1 day** (or the same day once the income transaction has cleared). Recalculate if the pay pattern changes.
2. **Never charge when Tippla's own forecast says the charge would take the balance below $0 (or below the member's buffer).** If that's the case on the billing date, defer to the next detected income. Show a notice: "We've moved your Tippla payment to after your pay lands on Thu 01/10."
3. **Member choice:** in Account → Subscription and billing, members can choose "Charge me the day after payday (recommended)" or a fixed date.
4. **Billing cadence options:** a per-pay-cycle option (fortnightly, priced pro rata) alongside monthly. Annual stays optional, with no pressure.
5. **Failed payment retries:** never retry before the next detected income. A maximum of 2 retries. No dunning language that sounds threatening.
6. **Proration:** handle the first move of the billing date with a prorated charge or credit. Show the calculation.
7. **Transparency:** the Account page shows "Next charge: Fri 02/10 (the day after your payday)".
8. If the member is in hardship flows (has opened `/hardship` this cycle or has an active shortfall), surface "Pause or downgrade Tippla" proactively in the feed (`ruleId: tippla_billing_relief`, urgency 3). It must never be hidden behind a retention flow.

## Integration notes

- Check the billing provider's support for changing the anchor date and pausing (e.g. Stripe `billing_cycle_anchor`, pause collection). Explore the codebase to confirm which provider is in use.
- Log every date change with its reason: `billing_events(member_id, type, from_date, to_date, reason, created_at)`.

## Tests

- Payday detection drives the anchor date. Payday changes are re-anchored with proration.
- A forecast shortfall on the billing date defers the charge.
- Retries respect income timing.

## Events

`billing_date_aligned`, `billing_deferred {reason}`, `billing_preference_changed {mode}`, `pause_offered`, `pause_taken`, `downgrade_taken`.

## Acceptance criteria

- Jess's next charge shows as after 01/10, not Mon 28/09, with an explanatory notice.
