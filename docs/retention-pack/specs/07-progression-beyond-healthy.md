# 07 — Plans, Streaks and Progression Beyond "Healthy"

Feature flags: `plans_v1`, `streaks_v1`, `buffer_v1`, `savings_goals_v1`, `credit_file_v1` (gated), `refinance_step_v1` (gated)

## Goal

If Tippla's only job is getting people out of trouble, success means cancellation. Give every band a next stage so improving members have a reason to stay.

## 1. Plans (replacing single tips in "Your plan", formerly `/savings`)

A plan is a sequence of steps over 2–4 pay cycles, linked to the member's goal (spec 04):

| Plan | Steps (example) | Linked factor |
|---|---|---|
| Get off pay advances | Cycle 1: advance ≤ $150 → Cycle 2: ≤ $75 → Cycle 3: none | Current borrowing |
| Reach payday without running short | Set a buffer → keep daily spend ≤ safe to spend for 10 of 14 days → finish the cycle ≥ $0 | Money left over |
| Cut bills and subscriptions | Review every subscription → cancel or keep each → check 2 bills for switching | Spending mix |
| Pay on time | Turn on bill reminders → no dishonours this cycle → two cycles clean | Payments on time |
| Spend less on gambling (opt-in only) | Set a cycle limit → use bank gambling block (link) → stay under the limit | Gambling & alcohol |

- Each step is checked automatically from transactions where possible, with a manual "done" option otherwise.
- Progress is shown on Home (compact), on Score and in the recap.
- Members can switch plans at any time, with no penalty and no guilt copy.

## 2. Streaks

- Positive streaks only: cycles without a new pay advance, bills paid on time, days under safe to spend, cycles finishing ≥ $0.
- Breaking a streak resets it quietly, with no notification. The recap leads with the longest current streak or the best-ever streak ("Your best is 3 cycles").
- Milestones at 2, 4 and 6 cycles get a celebration card. No points, badges-for-badges or leaderboards. This audience is vulnerable, so keep gamification light.

## 3. Buffer and savings goals

- **Buffer:** a member-set amount (suggestions: $50 → $100 → $250 → one cycle of bills) that safe to spend protects. When the cycle ends with a surplus, suggest "Move $X to your buffer?" (Tippla doesn't move money; it shows how in their banking app, or links to the bank's savings account).
- **Savings goals:** named goals with a target and date (e.g. "Christmas $300 by 15/12"). Progress is tracked by member-tagged transfers to savings or a linked savings account balance. The per-cycle amount needed is shown in the check-in.

## 4. Progression path by band

| Band | Primary focus | Unlocks |
|---|---|---|
| Building | Stabilise: get to payday, hardship tools, entitlements | Plans: reach payday, pay on time |
| Steadying | Reduce reliance on short-term borrowing | Plans: get off advances, cut bills; buffer |
| Healthy | Build resilience | Buffer → emergency fund; savings goals; credit file tracking* |
| Thriving | Grow and keep the habit | Multiple goals; annual review; cheaper-credit check* |

\* Gated (see below and spec 11).

Reaching Healthy gets a dedicated moment: a celebration, a summary of the journey ("You went from 472 to 604 in 5 cycles, avoided $90 in fees"), then "What's next" with the Healthy-stage options.

## 5. Gated: credit file tracking and refinancing step

- **Credit file tracking:** show a credit score or file via a bureau partner (e.g. Equifax, Experian, illion). Requires a commercial agreement, privacy and consent design, and compliance review.
- **Cheaper-credit check (refinancing step):** only for members in Healthy or Thriving, with no forecast shortfall, and not engaged with hardship tools in the last 3 cycles. General information and comparison only. Must be cleared under spec 11 (credit assistance and licensing) before any build beyond a design prototype.
- For now: **build the data model and the UI prototype behind the flag, with no partner integration.**

## Data

`member_plans(member_id, plan_type, started_at, steps jsonb, status)`, `streaks(member_id, type, current, best, updated_at)`, `buffers(member_id, target_cents, current_estimate_cents)`, `savings_goals(member_id, name, target_cents, target_date, linked_account_id, status)`.

## Events

`plan_started {plan_type}`, `plan_step_completed {plan_type, step}`, `plan_completed`, `plan_switched`, `streak_milestone {type, length}`, `buffer_set {target_cents}`, `goal_created`, `goal_reached`, `band_reached {band}`, `whats_next_viewed`.

## Acceptance criteria

- Jess (goal: stop relying on pay advances) sees the "Get off pay advances" plan at step 1 with this cycle's target.
- Simulating 5 improving cycles takes the demo persona to Healthy and triggers the milestone and "What's next" flow.
