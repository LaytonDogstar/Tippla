# Roadmap and Sequencing

## Phase 0: Foundations and quick wins (start immediately)

| Item | Spec | Why first |
|---|---|---|
| Analytics event layer and north-star metric | 09 | Without it you can't tell what works. Every later spec emits events into it. |
| Billing alignment to payday | 03 | Small change, outsized effect on cancellations. |
| PWA, push infrastructure and notification policy | 10 | Push and the daily habit depend on it. Decide PWA vs native before the notification work goes far. |

## Phase 1: Guidance core

| Item | Spec | Depends on |
|---|---|---|
| Attention feed rules engine and Home redesign | 01 | 09 |
| Score change attribution | 01 | — |
| Navigation consolidation and badges | 01 | Feed |
| Status line ("what Tippla did") | 01 | — |
| Onboarding first-value moment and goal selection | 04 | Feed rules (reuses them) |

## Phase 2: Pay-cycle loop

| Item | Spec | Depends on |
|---|---|---|
| Safe to spend today | 02 | Forecast engine |
| Payday check-in and end-of-cycle recap | 02 | 10 (push), 09 |
| Score projection | 02 | 01 attribution |
| Value tally ("Tippla has helped you save") | 02 | 06 adds more sources later |
| Event-driven notifications | 02 / 10 | 10 |

## Phase 3: Trust and action

| Item | Spec | Depends on |
|---|---|---|
| User corrections and forecast accuracy | 05 | — |
| Bank connection health and re-consent | 05 | 10 |
| Hardship letter autofill | 06 | Loans detection |
| Subscription cancellation helper | 06 | Subscriptions |
| Bill switching pointers (telco and energy) | 06 | Compliance check (11) |
| Entitlements check | 06 | — |

## Phase 4: Progression and assistant

| Item | Spec | Depends on |
|---|---|---|
| Plans and streaks (multi-cycle) | 07 | 02 |
| Buffer and savings goals | 07 | 02 |
| Credit file tracking, refinancing step | 07 | **Compliance gate** (11) |
| Ask Tippla assistant | 08 | 05 (clean data), **compliance gate** (11) |

## Suggested milestones

- **M1, "It tells me what matters":** 09, 03, 01 live for the demo persona and an internal cohort.
- **M2, "It has a rhythm":** 10 and 02 live. First recap delivered.
- **M3, "I trust it and it helps me act":** 04, 05, 06.
- **M4, "It takes me somewhere":** 07 and 08 (subject to gates).

## Success metrics to watch per milestone

- M1: % of Home sessions that act on a feed card; time to first action.
- M2: weekly active members; % of members opening the app on payday; recap open rate.
- M3: 30, 60 and 90-day retention by signup cohort; forecast accuracy; reconnect completion rate.
- M4: north-star metric (spec 09); % of members reaching Healthy who stay subscribed after 60 days.
