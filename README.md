# Tippla build pack

Everything needed for **Astra (ChatGPT)** to produce the design system and for **Claude Code** to build a fully working, mock-data model of the Tippla consumer portal.

## How to use it

1. **Design first (Astra).** Open `design/ASTRA_PROMPTS.md` and run Prompts 0–9 in one ChatGPT conversation. Prompt 2 is where you pick a direction. Save what Astra returns into `design/` using the filenames it's asked for (`tokens.json` is the one that matters most).
2. **Build (Claude Code).** Put this whole folder at the root of a new repo. Start Claude Code there and paste the kick-off prompt from `docs/11_build_plan.md`. Claude Code reads `CLAUDE.md` automatically.
   - You don't have to wait for Astra: Claude Code can start with `design/tokens.template.json` and swap in `tokens.json` later.
3. **Review per phase.** The build plan stops after each phase for review, with screenshots for all three personas.

## What's in here

| Path | What it is |
|---|---|
| `CLAUDE.md` | Instructions Claude Code follows: stack, non-negotiables, reading order, definition of done |
| `docs/01–11` | Product brief, copy rules, IA, every screen, SmartScore, TaleFin data mapping, interaction patterns, guardrails, states, open questions, build plan |
| `mock-data/` | Three fictional personas (jess, marcus, priya) with transactions, TaleFin-shaped bank statement analysis, TaleFin Score, score history, offers, consents. All numbers are computed from the transactions, so every screen reconciles |
| `scripts/generate_mock_data.py` | Regenerates the fixtures (edit personas here, never the JSON) |
| `design/ASTRA_PROMPTS.md` | The Astra prompt set, with exact sample data for mock-ups |
| `design/tokens.template.json` | Token schema Astra must fill; placeholder values so the build can start |
| `reference/` | Interactive spending prototype, original design brief, TaleFin Score V2 quick start, original product spec summary, review findings |

## Before you share it

- Figures, people, employers and lenders in the fixtures are fictional. Score impacts are illustrative until TaleFin confirms weights (`docs/10_open_questions.md` Q3).
- The pack contains Tippla's commercial model and open legal questions. Share it with Claude Code and your design partner only, not publicly.
- Guardrails in `docs/08_compliance_guardrails.md` are product rules for the build, not legal advice. Items marked Q need counsel sign-off before production.

## Running the app (Phase 0)

```bash
npm install
npm run dev            # http://localhost:3000 → /dev/selectors shows every figure per persona
npm test               # reconciliation, prompt figures, banned phrases, sensitive data, formatters, tokens
npm run typecheck && npm run lint
npm run tokens:check   # checks design/tokens.json from Astra (add --table for the full contrast table)
```

- `/dev/selectors?persona=marcus`: switch persona (`jess`, `marcus` or `priya`). Add `&fail=score` to simulate a score API failure.
- Tokens: `npm run dev` and `npm run build` regenerate `src/styles/tokens.css` from `design/tokens.json`. They fall back to `design/tokens.template.json` if Astra's file isn't there yet.
- `tests/design-data.test.ts` checks every number given to Astra in `design/ASTRA_PROMPTS.md`. If you change the fixtures, it tells you which prompt figures to update.

## Running the finished app

```bash
npm install
npm run build && npm start   # http://localhost:3000
npm test                     # unit tests (selectors reconcile, banned phrases, NEVER_DISPLAY, formatters, states)
npm run test:e2e             # Playwright: the three journeys, every screen in axe (both themes), 200% text, states
npm run lighthouse           # Lighthouse mobile accessibility on every screen × persona (target ≥ 95); needs npm start running
```

**Database (retention pack, spec 09 onwards):** set `DATABASE_URL` to a Postgres database (on Railway: add the Postgres service, then reference its `DATABASE_URL` in this service's Variables). Tables are created automatically on first use. Without it, the app uses PGlite, an in-process Postgres stored in `.data/` (fine locally; on Railway it resets on each deploy). Optional: `ANALYTICS_SALT` (any long random string) for the pseudonymous member ids, and `FLAGS_OFF` (comma-separated flag names) to switch features off.

**Ask Tippla assistant (spec 08):** without an API key it answers from templates over the same figures ("scripted" mode). To have Claude write the answers, set `ANTHROPIC_API_KEY` in Railway's Variables (it uses Claude Opus 5.5 at low effort, with server-side refusal fallback). `ASSISTANT_MODE=scripted` forces templates even with a key. Every model answer is checked in code: numbers must come from the tools, no credit advice, distress always gets the scripted support answer; anything failing falls back to the scripted answer. Run the eval against the model with `ANTHROPIC_API_KEY=… npx vitest run tests/assistantLive.test.ts` (it costs money; not in CI).

**Notifications and the installable app (spec 10):** see `docs/15_notifications_and_app.md`. Set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` for push and `CRON_SECRET` to let a scheduled job call `POST /api/notify/dispatch`. `/dev/outbox` shows the notification log and the email outbox (no email provider yet).

**Analytics dashboards:** `/dev/analytics` shows the north star, retention by signup week, feed performance and the guardrails, on generated demo data plus any real usage. See `docs/14_analytics.md`.

**Password for a hosted preview:** set the environment variable `SITE_PASSWORD` (on Railway: service › Variables). Every page then asks for that password first, and a correct entry is remembered for 30 days on that device. Leave it unset locally and the app opens straight away. To sign out on a device, visit `/api/gate?signout=1`. To change the password, change the variable and redeploy; everyone is asked again.

Dev controls (all carried in cookies, so they stick as you click around):

- `?persona=jess|marcus|priya` switches the customer. The **Dev** pill bottom-left does the same.
- `?present=1` is presentation mode: hides the Dev pill and every "Sample logic" tag. `?present=0` turns it off.
- `?state=` turns on the docs/09 states, comma-separated, or `?state=none` to clear. Also in the Dev pill.
  - `analysing`: brand new, bank connected, analysis in progress
  - `lapsed`: subscription ended. Home keeps the score; other screens show the reactivate sheet. Hardship, Help and Account are never blocked
  - `bank_expired`: the expired-connection banner, with a way to reconnect
  - `offline`: "Couldn't refresh. Showing data from …"
  - `one_off`: a $4,000 bond refund on 12/09, left out of monthly income with a note (Score › Income stability)
  - `two_accounts`: a second connected account, so the Spending account filter appears
  - `payday`: the morning the next pay lands (Jess Thu 01/10, Marcus and Priya Thu 08/10): payday check-in, last pay cycle recap, payday notifications. Same history; the SmartScore is still the 25/09 one
  - `billing_failed`: the last Tippla payment didn't go through; Subscription and billing shows the retry after the next pay lands (spec 03)
  - `bill_due`: Jess on Tue 29/09, the day before her Beforepay repayment, which is bigger than her balance (the "due tomorrow" notification). Other personas stay on 25/09
- Customer choices persist the same way: recategorised transactions, consents, subscription status, dismissed offers, read notifications, bank connection, "Needs a look" choices, notification settings, the goal, and the in-app actions the value tally confirms ("I've cancelled it", "I'll try this"). Clear the site's cookies to reset.

## Changes since the first version (30/09/2026 review)

- **Astra prompts:** corrected weekdays (26/09 is a Saturday, 30/09 a Wednesday, 25/09 a Friday). Days to payday is now 6. The Jess category list now includes Subscriptions $4, so it reconciles to $1,832. The calendar now shows only the predicted below-$0 day (30/09). The dashboard layout now matches `docs/04_screens.md` (hardship banner, plus a short-before-payday pay cycle card). Jess's first action is now "Skip the next pay advance if you can". Added screens: Marcus improving dashboard, factor detail sheet, consents, desktop dashboard, and Priya's expected score date (10/11/2026). Added batching and verification notes for working in ChatGPT.
- **Tokens template:** stage and category colours now meet 3:1 on surface and surface2. Added `income`, `centrelink` and `uncategorised` categories. The neutral-family categories are now distinguishable from each other. Added `chart` tokens, `focusRing` and breakpoints.
- **Marcus offer:** changed to $2,500 over 78 weeks at $75.47 per fortnight, $2,943.33 total, so it matches the 21.9% comparison rate and is no longer a SACC.
- **Docs:** fixed the "Updated" weekday, fixed "Up 11 since 11/09", gambling copy now compares full months (Apr $260 → Aug $845), corrected the Jess pay-advance description, and added definitions for days to payday and for what "Next thing to do" can recommend.
- **Pay cycles include Centrelink:** a pay cycle now starts at the first regular income in the fortnight (wages *or* Centrelink). Marcus's cycle is now 23/09 – 06/10, with a next payday of Wed 07/10 and $1,747 paid in.
- **Decisions (30/09):** transactions can be extracted, 180-day pulls, AEST, and per-lender figures come from transactions only. TaleFin can't flag transfers between a customer's own accounts, so Tippla matches them across connected accounts (`src/lib/selectors/transfers.ts`) and onboarding asks customers to connect every account they use.
