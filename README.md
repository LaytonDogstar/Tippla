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

## Changes since the first version (30/09/2026 review)

- **Astra prompts:** corrected weekdays (26/09 is a Saturday, 30/09 a Wednesday, 25/09 a Friday). Days to payday is now 6. The Jess category list now includes Subscriptions $4, so it reconciles to $1,832. The calendar now shows only the predicted below-$0 day (30/09). The dashboard layout now matches `docs/04_screens.md` (hardship banner, plus a short-before-payday pay cycle card). Jess's first action is now "Skip the next pay advance if you can". Added screens: Marcus improving dashboard, factor detail sheet, consents, desktop dashboard, and Priya's expected score date (10/11/2026). Added batching and verification notes for working in ChatGPT.
- **Tokens template:** stage and category colours now meet 3:1 on surface and surface2. Added `income`, `centrelink` and `uncategorised` categories. The neutral-family categories are now distinguishable from each other. Added `chart` tokens, `focusRing` and breakpoints.
- **Marcus offer:** changed to $2,500 over 78 weeks at $75.47 per fortnight, $2,943.33 total, so it matches the 21.9% comparison rate and is no longer a SACC.
- **Docs:** fixed the "Updated" weekday, fixed "Up 11 since 11/09", gambling copy now compares full months (Apr $260 → Aug $845), corrected the Jess pay-advance description, and added definitions for days to payday and for what "Next thing to do" can recommend.
- **Pay cycles include Centrelink:** a pay cycle now starts at the first regular income in the fortnight (wages *or* Centrelink). Marcus's cycle is now 23/09 – 06/10, with a next payday of Wed 07/10 and $1,747 paid in.
- **Decisions (30/09):** transactions can be extracted, 180-day pulls, AEST, and per-lender figures come from transactions only. TaleFin can't flag transfers between a customer's own accounts, so Tippla matches them across connected accounts (`src/lib/selectors/transfers.ts`) and onboarding asks customers to connect every account they use.
