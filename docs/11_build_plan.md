# 11 · Build plan and acceptance criteria

Work in phases; open a PR (or commit) per phase with screenshots of jess/marcus/priya on mobile, light and dark.

## Phase 0 — Foundations
- Next.js + TS strict + Tailwind; tokens from `design/tokens.json` (fallback `tokens.template.json`) → CSS variables, light/dark via `prefers-color-scheme` + manual toggle.
- Mock API (`lib/api`) with latency, persona loader, error simulation (`?fail=score`).
- Selectors + formatters with unit tests. Data-use allowlist + test.
- **Accept:** `npm test` green; a debug page lists every selector output per persona; reconciliation test passes (sum of category totals = total debits for each period; pay-cycle spent = sum of cycle transactions).

## Phase 1 — Design system components
- All components in `07_interaction_patterns.md` with Storybook-style `/dev/components` page (all states, both themes).
- **Accept:** keyboard operable; axe has no violations on `/dev/components`.

## Phase 2 — Onboarding (O1–O5)
- **Accept:** Playwright journey 1 passes for jess and priya (priya ends on no-score reveal).

## Phase 3 — Dashboard, SmartScore, factor detail, Ways to lift your score
- **Accept:** journey 3 passes; null factor and override states render; no banned phrases.

## Phase 4 — Spending (all tabs), comparison, calendar, subscriptions
- Match the reference prototype's behaviour.
- **Accept:** journey 2 passes; recategorising a transaction updates the category list, rows, budgets, hero and dashboard.

## Phase 5 — Loans, calculator, offers, hardship, help, account, notifications
- **Accept:** consent withdrawal hides Offers immediately; cancel subscription in one tap + confirm; hardship always visible in nav.

## Phase 6 — States, polish, accessibility
- All states in `09_states_and_edge_cases.md` via personas/dev toggles; 200% text; reduced motion; Lighthouse a11y ≥ 95.
- Presentation mode `?present=1`: hides dev tools and "Sample logic" tags.

## Kick-off prompt for Claude Code

> Read `CLAUDE.md` and every file in `docs/` in order, then open `reference/spending_interaction_prototype.html` and study its behaviour. Check `design/` for Astra's tokens and assets; if `design/tokens.json` is missing, use `design/tokens.template.json`. Summarise back to me (1) the stack and folder layout you'll create, (2) the selectors you'll need, (3) any conflicts or gaps you found in the specs. Then build Phase 0 and stop for review.
