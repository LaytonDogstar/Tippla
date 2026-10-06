# 05 — Data Trust: Corrections, Forecast Accuracy and Connection Health

Feature flags: `corrections_v1`, `forecast_accuracy_v1`, `connection_health_v1`

## Goal

Members trust what Tippla tells them. Wrong predictions they can't fix, and data that silently goes stale, are major causes of churn.

## 1. User corrections

- On any transaction, predicted bill, detected subscription or detected loan, the member can:
  - Recategorise (e.g. "This is rent", "This isn't gambling").
  - Mark "Not a bill" / "Not a subscription" / "This has ended" / "This isn't a loan".
  - Mark a predicted bill as "Already paid", "Different amount", or "Moved to <date>".
  - Mark income as "One-off" vs "Regular pay".
- Corrections apply immediately to the forecast, safe to spend, feed and score (where they affect factors), with a confirmation: "Got it — your forecast is updated."
- Corrections persist as member-level rules: `member_rules(member_id, match jsonb, override jsonb, created_at)`. They apply to future matching transactions.
- Aggregate anonymised correction data so the categorisation team can improve the global model. Put this behind a flag and cover it in the privacy notice (see spec 11).

## 2. Forecast accuracy

- Store each daily forecast snapshot. After the date passes, compare it with the actual balance.
- Internal: dashboards of mean absolute error per member segment and per horizon (1, 3, 7 and 14 days).
- Member-facing (once accuracy is good enough; the threshold goes in config): "Our forecasts for you have been within $20 on 9 of the last 10 days." Show it in the safe-to-spend breakdown.
- If a forecast was badly wrong (error > $100 or > 30%), ask: "We got this one wrong — was there something unusual?" with quick options that create corrections.

## 3. Bank connection health

- Track the status of each connection: healthy, stale (no new data for > 48h when activity is expected), broken (provider error), or consent expiring (CDR consent end date ≤ 14 days away; CDR consents last up to 12 months).
- Feed rule `bank_reconnect` (spec 01). Status line variant (spec 01). Push notification at expiry −14 days, −3 days and 0 days (counts toward the frequency cap, except on expiry day).
- One-tap reconnect / re-consent flow that returns the member to where they were.
- While data is stale: stamp every forecast and figure with "Based on data from Tue 22/09", lower confidence labels, and pause safe to spend if the data is older than 72h ("Reconnect to see today's figure").
- Support multiple accounts and banks. Prompt to "Add your other account" if transfers to an unknown own-name account are detected (forecasts are only as good as their coverage).

## Tests

- Corrections propagate to the forecast, feed and score.
- Member rules match future transactions.
- Staleness thresholds and UI states.
- Consent expiry scheduling.

## Events

`correction_made {entity_type, correction_type}`, `forecast_error_prompt_shown`, `forecast_error_prompt_answered`, `connection_status_changed {from, to}`, `reconnect_started`, `reconnect_completed {duration_ms}`, `add_account_prompt_shown`, `account_added`.

## Acceptance criteria

- Jess can mark Telstra as "Already paid" and see the shortfall and safe to spend update.
- Simulating a consent expiring in 10 days produces a feed card, a status line notice and the push schedule.
