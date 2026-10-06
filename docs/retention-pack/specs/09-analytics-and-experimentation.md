# 09 — Analytics, North-Star Metric and Experimentation

Feature flag: n/a (foundation, always on; respects consent)

## Goal

Know which changes improve retention and members' financial outcomes. Every other spec emits events into this layer.

## North-star metric

**% of active members who complete a pay cycle without taking a new pay advance or short-term loan** (measured per cycle, rolling 4 cycles).

It aligns commercial retention with member outcomes. Supporting metrics:

- **Engagement:** WAU/MAU; % opening the app on payday; feed action rate; days per cycle with a session.
- **Retention:** 7, 30, 60 and 90-day retention by signup cohort; monthly subscription churn; pause rate vs cancel rate.
- **Outcomes:** mean SmartScore change per cohort per cycle; % moving up a band within 90 days; % of cycles ending ≥ $0; fees avoided (value tally).
- **Trust:** forecast MAE; correction rate; reconnect completion rate.
- **Guardrail metrics** (alert if they worsen): hardship page visits following notifications; complaints; unsubscribe-from-notifications rate; any offer impressions shown to members with a forecast shortfall (must be 0).

## Event schema

```ts
type AnalyticsEvent = {
  event: string;            // snake_case, from the specs
  member_id: string;        // pseudonymous ID, not email
  session_id: string;
  ts: string;               // ISO UTC
  props: Record<string, string | number | boolean>;
  app_version: string;
  platform: 'web' | 'pwa' | 'ios' | 'android';
  flags: string[];          // active feature flags
};
```

- Never put sensitive values in props (no merchant names for gambling, no free text). Amounts are bucketed where possible.
- Respect the analytics consent setting. Queue events offline in the PWA.
- Explore the codebase for an existing analytics tool. If there's none, propose one (e.g. PostHog, self-hostable, with feature flags and experiments built in) in the plan for approval.

## Dashboards (build or configure)

1. North-star and supporting metrics, weekly.
2. Signup cohort retention curves.
3. Feed performance by rule: shown → actioned → done.
4. Notification performance: sent → opened → actioned, by type. Opt-outs.
5. Funnels: onboarding, reconnect, hardship letter, cancellation.
6. A guardrail panel with alerts.

## Experimentation

- Server-side assignment tied to `member_id`, exposed via the feature flag system. Record `experiment_exposed {experiment, variant}`.
- Initial experiment candidates: feed card count (2 vs 3); safe-to-spend placement; payday notification copy; aha priority order (spec 04).
- Pre-register the primary metric and minimum runtime (at least 2 full pay cycles). No experiment can degrade guardrail metrics. Stop it if they do.

## Acceptance criteria

- All events from specs 01–08 are defined in a single typed registry, and emitting an unregistered event fails in development.
- Dashboards 1–3 are available with seeded or demo data.
