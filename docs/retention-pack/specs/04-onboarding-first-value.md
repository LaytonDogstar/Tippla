# 04 — Onboarding and First-Session Value

Feature flags: `onboarding_v2`, `goals_v1`

## Goal

Most retention is decided in the first session or two. The member should see one concrete, personal win within the first session, ideally within 60 seconds of their bank data loading, and leave with a goal.

## Flow

1. **Welcome:** one sentence on what Tippla does ("We'll tell you what's coming, what needs a look, and how to get ahead — every pay cycle").
2. **Connect bank (CDR):** keep the existing consent flow. Add progress reassurance during data retrieval ("Reading 6 months of transactions…").
3. **First insight reveal ("aha"):** run the spec 01 rules plus onboarding-only rules over the history, and show the single most valuable finding as a full-screen card. Priority order:
   1. A forecast shortfall this cycle ("Heads up — you could be about $53 short before your 01/10 payday").
   2. Forgotten or rarely used subscriptions, with the annual total ("You're paying $214 a year across 4 subscriptions").
   3. Pay advance or loan fees paid in the last 90 days ("You've paid $45 in pay advance fees since July").
   4. A positive fallback ("Your income is steady — that's your strongest factor").
4. **SmartScore intro:** the score, band, distance to the next band, and the top factor to lift. Keep it short.
5. **Goal selection:** "What would help most right now?" (pick one, changeable later):
   - Get to payday without running short
   - Stop relying on pay advances
   - Lift my SmartScore to Healthy
   - Cut my bills and subscriptions
   - Build a small buffer
   - (Optional, sensitive) Spend less on gambling. Show it only if gambling transactions are detected, worded neutrally, and never preselected.
6. **Notification opt-in:** ask after the aha moment, framed by value ("Want a heads-up before you run short?").
7. **Land on Home** with the feed populated and the goal shown.

## Goal model

`member_goals(member_id, goal_type, started_at, status, target jsonb)`. The goal drives:

- which "Your plan" recommendation shows first (spec 07)
- check-in focus (spec 02)
- recap emphasis (spec 02)

## First-week nudges

- Day 1: the feed is there. Day 2–3: if they haven't returned, one push or email showing a single new insight (not a generic "come back").
- The first payday after signup gets an enhanced check-in.

## Metrics

- Time from bank connection to first insight viewed (target < 60s at the median).
- % completing goal selection.
- Day-7 and day-30 retention by aha type. Use this to tune the priority order.

## Events

`onboarding_step_viewed {step}`, `bank_connected {duration_ms}`, `aha_shown {type}`, `aha_actioned`, `goal_selected {goal_type}`, `push_opt_in {accepted}`.

## Acceptance criteria

- Replaying onboarding for the demo persona shows the shortfall aha, then the score intro, then the goal picker, then Home.
- A persona with no issues gets the positive fallback.
