# 15 · Installable app and notifications (retention pack, spec 10)

Built 06/10/2026. Flags `pwa_v1`, `push_v1`, `email_lifecycle_v1` (push and email: gate G5).

## Decision: installable web app now, store app later

| Option | What it gives | Effort | Recommendation |
|---|---|---|---|
| A. Installable web app (PWA) | Home-screen icon, offline Today, push on Android and desktop, and on iPhone (iOS 16.4+) once added to the Home Screen | Built (this workstream) | **Now** |
| B. Store wrapper (Capacitor) around the same app | App Store and Google Play presence, reliable iPhone push without the Home Screen step, Face ID / fingerprint | About 2–3 weeks: wrapper, native push (APNs/FCM) as another channel in the service below, store accounts, reviews, release process | **When iPhone push take-up matters** (watch "opened on payday" by platform) |
| C. Fully native apps | Best experience | Months, two codebases | Not now |

The notification service is channel-agnostic, so option B adds a channel (native push) without changing any rules.

## The policy (src/lib/notify/policy.ts), applied to every channel

- **Caps:** at most 1 normal or low notification a day and 3 a week; urgent money alerts (shortfall, bill tomorrow bigger than the balance) at most 1 a day on top. Anything over waits in the in-app notifications. (Q21)
- **Quiet hours:** 9pm–8am in the member's timezone by default, changeable. Held notifications go at 8am, unless urgent and about something due before then.
- **Dedupe:** by type + entity + period; once sent, never again.
- **Lock-screen privacy:** "You have an update from Tippla" unless the member turns on "Show amounts and names on my lock screen".
- **Block list:** never offers, lenders, gambling or alcohol (on any channel or in the inbox); nothing at all while paused.
- **Priorities:** shortfall and bill alerts high; payday check-in, recap and account changes normal; SmartScore updates low (and the only ones the weekly digest gathers).

## Delivery (src/lib/notify/service.ts)

`notify(member, candidate)` → policy → push (Web Push, VAPID) or email, logged once per member + key + channel in `notifications` (sent, held for quiet hours, kept in the inbox with the reason, or blocked). No device: email if the member wants that category by email; the pay-cycle recap is emailed if push isn't set up. Run `POST /api/notify/dispatch` on a schedule (Railway cron, every 15 minutes, `Authorization: Bearer $CRON_SECRET`); it also sends anything held for quiet hours.

## Email (src/lib/notify/email.ts)

Weekly digest (opt-in, Sundays), recap fallback, win-back after 21 days away (one email with one real insight, at most once every 60 days), and a consent-expiry template for spec 05. Every email names the sender and has a signed one-click unsubscribe (`/api/email/unsubscribe`, also RFC 8058 POST). **No email provider is connected yet:** emails land in an outbox at `/dev/outbox`. Connecting one (e.g. Resend, Postmark, SES) is a change in one function.

## The app (manifest, service worker)

`/manifest.webmanifest`, icons in `public/icons/`, `public/sw.js`: network first for pages (numbers are never stale online), keeps the last copy of Today and the main sections for offline use (account pages aren't kept), an offline page with the National Debt Helpline, push display and tap-to-open. The install card appears on Today after the member has acted on something (or on a second visit), never on first load; iPhone gets the Add to Home Screen steps. Profile › Notifications › "Notifications on this device" turns push on or off and sends a test payday notification.

## Settings (Railway › Variables)

| Variable | Why |
|---|---|
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Push keys (generate with `npx web-push generate-vapid-keys`). Without them a pair is generated and kept in the database. |
| `CRON_SECRET` | Lets a scheduled job call `/api/notify/dispatch` in production. |
| `APP_URL`, `EMAIL_FROM`, `EMAIL_SECRET` | Links and sender in emails; signing unsubscribe links. |

## Not done yet

- **Face ID / fingerprint or PIN re-entry** for the installed app (WebAuthn): needs real sign-in first, so it comes with accounts.
- **iPhone push** needs the app on the Home Screen (Apple's rule); option B removes that step.
- **Settings live in the browser cookie** for the demo; the dispatch job uses defaults for each persona. With real accounts they move to the database.
