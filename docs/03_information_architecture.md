# 03 · Information architecture

## Onboarding (linear)

1. Create account — email + mobile (two fields), password or passkey
2. Consents — three separate, unticked checkboxes: FF data sharing (required), bank data via TaleFin (required), lender matching (**optional**, clearly labelled optional, product works without it)
3. Connect bank — Tippla page → TaleFin hand-off (simulate with a mock TaleFin screen) → return page
4. Analysing — 30–90 s real time; simulate ~8 s with four plain-language steps; no spinner theatre
5. SmartScore reveal — score, stage, the top factor holding it back, one first action

## Portal navigation

**Mobile bottom tab bar (5):** Today · Money · Score · Borrowing · Help *(renamed 05/10/2026; routes unchanged)*
**Desktop sidebar:** grouped as below; "Hardship support" must always be visible without scrolling the nav. Account and Notifications sit with the profile at the bottom.
**Badges:** each section shows how many open "Needs a look" items belong to it (Today 1 · Money 4 · Score 1 · Borrowing 1 for Jess).

| Tab / group | Routes |
|---|---|
| Today | `/` Today (status line, Needs a look, pay cycle, score) |
| Score | `/score` SmartScore · `/score/[factor]` factor detail · `/savings` Ways to lift your score |
| Money | `/spending` (Overview · Categories · Budgets tabs) · `/spending/compare` · `/calendar` · `/subscriptions` |
| Borrowing | `/loans` (Overview · Upcoming · History · Other credit tabs) · `/loans/repayment` calculator · `/offers` |
| Help | `/hardship` · `/help` (search-led FAQ) |
| Account (avatar menu) | `/account/profile` · `/account/subscription` · `/account/consents` · `/account/bank` |
| Global | `/notifications` (bell in header), sheets/drawers for detail |

## Global elements

- Header: page title, notifications bell (badge count), avatar.
- Bank data freshness line where numbers appear: "Updated Fri 25/09, 9:14am".
- Sheets (mobile) / right drawers (desktop) for: transaction detail, merchant detail, category detail, loan detail, lender detail, recommendation detail, factor detail.
- Toasts for confirmations ("Moved to Groceries. Totals updated").
- Dev-only persona switcher and theme toggle.
