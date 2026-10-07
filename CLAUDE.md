# Tippla Consumer Portal — build instructions for Claude Code

You are building a **fully working, mobile-first model of the Tippla consumer portal** as a Next.js web app, running entirely on mock data. Read this file first, then the docs in order. When anything here conflicts with a design file from Astra, **this pack wins on behaviour, copy and data; Astra wins on visual styling.**

## What Tippla is (one paragraph)

Tippla is an Australian financial health subscription for people who have just been declined for a small loan by Friendly Finance. They connect their bank via TaleFin, get a SmartScore (the TaleFin Score, 0–1,000, with nine factors), see where their money goes, and get specific, achievable steps to become credit-ready. When their profile improves, partner lenders can make offers. The customer must feel **helped, not sold to**. Full context: `docs/01_product_brief.md`.

## Stack (fixed)

- Next.js 14+ (App Router), TypeScript (strict), Tailwind CSS
- Design tokens from `design/tokens.json` mapped into `tailwind.config.ts` as CSS variables (light + dark)
- Charts: hand-built SVG components or Recharts; no chart library that forces its own colours
- Motion: Framer Motion, always respecting `prefers-reduced-motion`
- State: React state + URL search params for filters; no global store unless needed
- Testing: Vitest for pure logic (selectors, formatters, score copy), Playwright for 3 smoke journeys
- No backend. A **mock API layer** in `src/lib/api/` reads `mock-data/<persona>/*.json` and mimics TaleFin response shapes and latency (200–600 ms), so real TaleFin calls can replace it later without touching UI.

## Non-negotiables

1. **Mobile is the primary canvas.** Design at 390 px first; bottom tab bar; bottom sheets for drill-downs; tap targets ≥ 44 px. Desktop is a responsive enhancement (sidebar nav, sheets become right-side drawers).
2. **One source of truth for numbers.** Every figure on every screen is computed from the persona fixtures through selectors in `src/lib/selectors/`. Never hard-code a figure in a component. Totals must reconcile across screens (a unit test must assert this).
3. **Pay-cycle framing.** Customers are paid fortnightly. Default spending/calendar views are the current pay cycle (`derived.json → pay_cycle`), not calendar months. "Monthly income" uses `monthly_mean_amount` over 90 days, **never** a 30-day `sum_amount` (see `docs/06_data_mapping.md`).
4. **Copy rules are code.** Follow `docs/02_voice_and_copy.md`. Australian English. Banned phrases list is enforced by a unit test that scans `src/content/`.
5. **Data-use classes are enforced.** Every TaleFin field has a class in `docs/06_data_mapping.md`: `SHOW`, `SCORE_ONLY`, `LENDER_ONLY`, `INTERNAL`, `NEVER_DISPLAY`. Build a typed allowlist; components can only read `SHOW` fields. Sensitive flags (insolvency, Public Trustee, financial counsellor, dependants, high-risk Centrelink, etc.) are `NEVER_DISPLAY`, and a test must prove they never render.
6. **No saturated red for "bad", no confetti, no rankings.** Negative states (short before payday, a falling score) use only the soft negative tint (`negativeSoft` behind `negative` text), always with an icon or label and always next to a way forward. Never a saturated red, orange or green fill. Declines use a neutral vocabulary. No percentile rankings against peers. See `docs/07_interaction_patterns.md` and `reference/today-desktop-mockup.html` (approved 07/10/2026).
7. **Every link goes somewhere.** No dead-end CTAs. If a destination is out of scope, open a sheet that says what would happen.
8. **Accessibility:** WCAG 2.2 AA contrast in both themes, visible focus, dynamic type to 200% without clipping, reduced motion.

## Reading order

1. `docs/01_product_brief.md` — who, why, the tightropes
2. `docs/02_voice_and_copy.md` — tone, banned phrases, gambling wording
3. `docs/03_information_architecture.md` — sitemap and navigation
4. `docs/04_screens.md` — every screen: purpose, content, interactions, states
5. `docs/05_smartscore.md` — TaleFin Score, factor names, nulls, overrides
6. `docs/06_data_mapping.md` — TaleFin metrics → UI, data-use classes, corrections
7. `docs/07_interaction_patterns.md` — the neo-bank patterns and components
8. `docs/08_compliance_guardrails.md` — privacy, consent, sensitive data
9. `docs/09_states_and_edge_cases.md` — personas and states to support
10. `docs/10_open_questions.md` — unknowns; stub them, don't invent answers
11. `docs/11_build_plan.md` — phases and acceptance criteria
11a. `docs/12_talefin_response_review.md` — what a real TaleFin response looks like, its quirks, and data we can use
12. `reference/spending_interaction_prototype.html` — open in a browser; it is the behavioural reference for the Spending screen
13. `design/` — Astra's outputs land here (`tokens.json`, `components/`, `screens/`, `icons/`)

## Personas (switchable in the app)

Add a persona switcher (dev-only, bottom-left pill, hidden in "presentation mode" via `?present=1`):

- `jess` — declining, score 472, gambling up, pay advance, overdrawn days. The hardest case; design for her first.
- `marcus` — improving, score 612, Centrelink + wages, near lender-ready, Pro tier.
- `priya` — thin file (45 days), TaleFin override `-998`, no score yet.

Regenerate fixtures with `python scripts/generate_mock_data.py`. Do not hand-edit JSON.

## Suggested source layout

```
src/
  app/(portal)/            dashboard, score, spending, calendar, subscriptions, savings,
                           loans, offers, repayment, hardship, help, account/*, notifications
  app/onboarding/          create-account, consents, connect-bank, analysing, score-reveal
  components/ui/           Button, Chip, SegmentedControl, Sheet, Card, ListRow, Toast, Skeleton, EmptyState
  components/domain/       ScoreRing, FactorTile, PayCycleHero, CategoryRow, InsightCard, TransactionRow,
                           CalendarCell, LoanCard, OfferCard, RecommendationCard, SubscriptionRow
  lib/api/                 mock TaleFin client (bank statement, score), persona loader, latency sim
  lib/selectors/           all derived numbers (pure functions, unit tested)
  lib/format/              AUD, dates DD/MM/YYYY, relative days, percentages
  lib/dataUse.ts           field allowlist by data-use class
  content/                 all user-facing strings (en-AU), insight templates, factor copy
```

## Definition of done (whole build)

- All screens in `docs/04_screens.md` exist, for all three personas, light and dark.
- The three Playwright journeys pass: onboarding → score reveal; dashboard → spending → category → merchant sheet → recategorise; dashboard → score → factor detail → recommendation sheet.
- Unit tests: selectors reconcile; banned-phrase scan; `NEVER_DISPLAY` fields never rendered; formatters (AUD, DD/MM/YYYY).
- Lighthouse mobile: accessibility ≥ 95.
- `docs/10_open_questions.md` items are visibly stubbed (a small "Sample logic" tag in dev mode), not silently invented.
