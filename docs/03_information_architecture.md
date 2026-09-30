# 03 · Information architecture

## Onboarding (linear)

1. Create account — email + mobile (two fields), password or passkey
2. Consents — three separate, unticked checkboxes: FF data sharing (required), bank data via TaleFin (required), lender matching (**optional**, clearly labelled optional, product works without it)
3. Connect bank — Tippla page → TaleFin hand-off (simulate with a mock TaleFin screen) → return page
4. Analysing — 30–90 s real time; simulate ~8 s with four plain-language steps; no spinner theatre
5. SmartScore reveal — score, stage, the top factor holding it back, one first action

## Portal navigation

**Mobile bottom tab bar (5):** Home · Score · Spending · Loans · Support
**Desktop sidebar:** grouped as below; "Hardship support" must always be visible without scrolling the nav.

| Tab / group | Routes |
|---|---|
| Home | `/` Dashboard |
| Score | `/score` SmartScore · `/score/[factor]` factor detail · `/savings` Ways to lift your score |
| Spending | `/spending` (Overview · Categories · Budgets tabs) · `/spending/compare` · `/calendar` · `/subscriptions` |
| Loans | `/loans` (Overview · Upcoming · History · Other credit tabs) · `/loans/repayment` calculator · `/offers` |
| Support | `/hardship` · `/help` (search-led FAQ) |
| Account (avatar menu) | `/account/profile` · `/account/subscription` · `/account/consents` · `/account/bank` |
| Global | `/notifications` (bell in header), sheets/drawers for detail |

## Global elements

- Header: page title, notifications bell (badge count), avatar.
- Bank data freshness line where numbers appear: "Updated Fri 25/09, 9:14am".
- Sheets (mobile) / right drawers (desktop) for: transaction detail, merchant detail, category detail, loan detail, lender detail, recommendation detail, factor detail.
- Toasts for confirmations ("Moved to Groceries. Totals updated").
- Dev-only persona switcher and theme toggle.
