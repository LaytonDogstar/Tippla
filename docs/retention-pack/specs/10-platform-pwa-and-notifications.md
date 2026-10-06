# 10 — Platform: PWA and Notification Infrastructure

Feature flags: `pwa_v1`, `push_v1`, `email_lifecycle_v1`

## Decision needed first

Tippla is currently a web app. A daily safe-to-spend habit and event-driven notifications need either:

- **Option A: an installable PWA (recommended to start).** Fastest. Web Push works on Android and desktop, and on iOS 16.4+ once the app is added to the home screen. The limitations are iOS install friction and a weaker presence than a native app.
- **Option B: a native wrapper (e.g. Capacitor or Expo) around the existing web app.** Store presence, reliable push on iOS, biometrics. Costs more (store review, release process).
- **Option C: fully native apps.** Best experience, highest cost. Not recommended yet.

Claude Code: assess the current stack and put a recommendation, with effort estimates, in the plan. Build Option A now in a way that doesn't block Option B (keep the notification service channel-agnostic).

## PWA requirements

- Web app manifest (name, icons, theme colour, `display: standalone`), service worker, offline shell, and a cached last-known Home showing "Last updated…".
- An install prompt shown after the first-value moment (spec 04), not on first load. iOS gets a "Add to Home Screen" instruction sheet.
- Biometric or PIN re-entry option for the installed app (WebAuthn where supported).

## Notification service

- A channel-agnostic service: `notify(member_id, type, payload, priority)` → routes to push, email or in-app depending on member preferences and availability.
- **Policy engine** (central, enforced for all channels):
  - Frequency cap: at most 1 normal or low per day and 3 per week. High priority at most 1 per day.
  - Quiet hours default to 9pm–8am in the member's timezone. High priority waits until 8am unless the event is due before then.
  - Dedupe by `type + entity + period`.
  - Lock-screen privacy: generic text by default ("You have an update from Tippla"). Members can opt into detailed text.
  - **Block list:** no offer or lender content; no gambling content; nothing to members who have paused notifications.
- Preferences UI in Account → Notifications: per-type toggles, quiet hours, privacy mode, weekly digest opt-in, email vs push.

## Lifecycle email (secondary channel)

- Weekly digest (opt-in), recap fallback if push isn't enabled, consent-expiry reminders, and a lapsed-member win-back after 21 days inactive (one email with one genuine new insight; no repeat nagging).
- Unsubscribe in one click. Emails meet Spam Act 2003 requirements (consent, identification, unsubscribe).

## Data

`notification_prefs(member_id, …)`, `notifications(id, member_id, type, channel, priority, status, sent_at, opened_at, actioned_at)`, `push_subscriptions(member_id, endpoint, keys, platform, created_at)`.

## Events

`pwa_install_prompted`, `pwa_installed`, `push_permission {granted}`, `notification_sent {type, channel}`, `notification_opened`, `notification_actioned`, `notification_suppressed {reason}`, `notification_prefs_changed`.

## Acceptance criteria

- The installed PWA on Android receives a test payday notification for the demo persona.
- The policy engine has unit tests for caps, quiet hours, dedupe and block-list enforcement (including a test that offer-type notifications are always rejected).
