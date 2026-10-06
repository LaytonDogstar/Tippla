# 14 · Analytics, feature flags and experiments (retention pack, spec 09)

Built 06/10/2026. The foundation every later workstream reports into.

## North star

**% of members' pay cycles completed without a new pay advance or short-term loan**, rolling 4 cycles. Shown weekly on `/dev/analytics` with the supporting metrics: weekly and monthly active members, % opening Tippla on payday, % of feed cards acted on, days with a session per cycle, and % of cycles ending at or above $0.

## Where things live

| What | Where |
|---|---|
| Event registry (every event from specs 01–08 and 10, with typed props) | `src/lib/analytics/registry.ts` |
| Browser tracking: `track(event, props)`, batched, offline queue | `src/lib/analytics/client.ts` |
| Server: validation, envelope, consent, storage, `trackServer()` | `src/lib/analytics/server.ts` |
| Intake endpoint | `POST /api/events` |
| Dashboard queries and demo data | `src/lib/analytics/metrics.ts`, `src/lib/analytics/seed.ts` |
| Dashboards | `/dev/analytics` |
| Feature flags (pack names) and experiments | `src/config/featureFlags.ts` |
| Database (Postgres or PGlite) and migrations | `src/lib/db/` |

## Rules the code enforces

- **Only registered events.** An unregistered event throws in development (at the `track()` call) and is dropped in production. A test checks that every event named in the specs is registered.
- **No sensitive values.** Props are typed: counts, true/false, fixed lists, short identifiers. There's no free-text type. Amounts are stored as ranges ("20-50"), never exact. Anything that looks like gambling or alcohol is rejected even as an identifier.
- **Pseudonymous.** The member id is a salted hash (`m_…`), never a name or email.
- **Consent.** Profile › Usage data turns analytics off; nothing is stored while it's off (Q23).
- **Envelope** (spec 09): event, member_id, session_id, ts, props, app_version, platform (web or pwa), active flags.

## Feature flags

All 29 flags from the pack are listed with their spec, whether they're built, and their compliance gates. Demo personas get every built flag. Real members (none yet) only get a gated flag once a sign-off is recorded against it. `FLAGS_OFF` switches flags off everywhere.

## Experiments

Four candidates from the spec are defined as drafts (feed card count, safe-to-spend placement, payday notification copy, aha order). Assignment is stable per member (hash), and an `experiment_exposed` event is registered. None run until one is switched to `running`, with a primary metric and at least 2 pay cycles.

## Events wired into the app so far

Session start and page views on every portal page; the feed (viewed, acted on, done, snoozed, dismissed, see all); navigation sections; safe to spend (viewed, working opened); payday check-in and recap opened; subscription cancel guide and "I've cancelled it"; goal created; notification opened and settings changed; usage-data consent; onboarding steps and bank connection time; hardship letter started and copied; offers viewed (with the guardrail context). The rest are registered and get wired as each workstream is built.

Spec 04 added: welcome, first insight, goal and alerts steps; `aha_shown` / `aha_actioned` (by type); `goal_selected` (onboarding and Today); `push_opt_in`.

## First session (spec 04)

`/dev/analytics` › First session: median seconds from bank connected to first insight (target under 60), share within 60 seconds, share who picked a goal, share who said yes to alerts, goals picked, and day-7 / day-30 retention (a session in days 7–13 / 30–36 after the first insight) by first-insight type. Demo onboarding events use their own random stream, so the other demo numbers didn't move.

## Forecast accuracy (spec 05)

`/dev/analytics` › Forecast accuracy: mean absolute error by segment (each demo persona) and horizon (1, 3, 7, 14 days), backtested on bank balances, with 1-day hits within $20 and whether the member-facing line would show; plus stored daily snapshots once real days have passed (dispatch records them). Events: `correction_made`, `forecast_error_prompt_shown` / `_answered`, `connection_status_changed`, `reconnect_started` / `_completed`, `add_account_prompt_shown`.

## Guardrails on the dashboard

- Offers shown to members short before payday, in hardship or in Building: **must be 0**. The demo data and the app both keep it at 0, and a test proves a breach would show.
- Notification setting changes and hardship letters started, to watch after notification changes.

## Demo data

`/dev/analytics` generates about 360 synthetic members over 12 weeks on first visit (flagged `seeded`, ids `m_seed…`). "Regenerate demo data" replaces them. Real events from using the app are counted alongside.
