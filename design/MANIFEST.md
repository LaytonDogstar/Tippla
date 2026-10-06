# Tippla — handoff manifest and self-review

Review date: **01/10/2026**. Customer-data snapshot: **Fri 25/09/2026**, unchanged. Direction: **Banking Clarity**. Token version: **1.0.2**.

This inventories **131 files** under `design/`: the 129 existing deliverables and two new round-2 ZIPs. The current screen set remains **71 PNGs**. Rendering and audit working files are not deliverables.

## Start here

Claude should use `design/tokens.json`, `design/icons.md`, `design/components.md`, `design/screens.md` and `design/illustration-and-motion.md` together. Later explicit user fixtures take precedence over earlier templates. The component PNGs are state references; customer screen PNGs are exact-size viewport captures. Additional scroll captures expose content below the fold; they are not separate app routes.

The six empty-state illustrations are genuine SVG vectors, theme-bound through `currentColor` and one accent token. They passed review unchanged. No custom UI-icon SVGs were produced: all requested UI/category needs map to Lucide in `icons.md`. Early exploratory images outside `design/` are not build assets in this handoff.

## Round 2 — corrections and downloads

Use `design/tippla-screens-v2.zip` for the complete current screen set and `design/corrections-round-2.zip` for this round’s changed source files and images. Do not use the old `tippla-screens.zip`: the user’s downloaded copy has no ZIP directory. The new archive has a new filename and is built from the current loose files, independently of that old archive.

| Finding | Correction | Files affected |
| --- | --- | --- |
| Marcus used the earlier cycle and income total. | Cycle 23/09–06/10, 12 days to Wed 07/10; $301 spent, $1,747 paid in; identical Centrelink/wage rows; current balance $2,363, $663 due and $1,700 left. Upcoming Centrelink and wage payments shown equally. | All affected dashboard-improving captures, screens.md and screen preview. |
| Jess’s advance was incorrectly counted as income. | $2,483 is wages only. Exact “Plus a $300 pay advance (not income): $315 due back 30/09 ($300 + $15 fee)” disclosure across the relevant mobile/desktop views and component references. Removed the incorrect 21% qualification. | Jess pay-cycle/due/continuation/loan frames; desktop views; PayCycleHero boards; screen/component docs and fixtures. |
| Dark housing and BNPL were too similar. | Housing is #3C86BA; BNPL stays #8AAAFF. Housing passes 3.98:1 on surface and 3.69:1 on surface2; contrast-safe dimming also passes. | tokens.json, donut boards, dark spending breakdown and contrast tables. |
| Ninth factor was described as missing data. | Hidden by design. Eight visible factor tiles remain correct; the income-mix explanation appears under “How your score works”. No ninth score or improvement advice. | smartscore-more-factors in both themes; screen/component docs and this manifest. |
| Verified comparison rate lacked its annual label; cost label was unclear. | “21.9% p.a. comparison rate” and “Total cost of borrowing $443 (includes the $150 fee)”. Removed the sample-rate caveat. | Offers and matching continuation in both themes; screens.md and fixtures. |
| Gambling sheet omitted supplied outcome copy. | Added “What it would change” and the exact 90-day guidance. | spending-sheet in both themes; screens.md and screen preview. |
| Downloaded screens ZIP still failed to open. | Independently rebuilt under a new filename; enumerated all 75 entries and checked every CRC plus byte equality with current sources. | tippla-screens-v2.zip; archive listing below. |

The small correction ZIP contains **40 changed loose files**, including this manifest; it excludes unchanged assets and full bundles. Three component ZIPs are refreshed in place. Prior `corrected-files.zip` is retained only as the round-1 historical delta. Each inventory status below refers to **this round**.

## Self-review against the hard rules

| Rule / risk | Result after correction | Evidence / qualification |
| --- | --- | --- |
| Red used for money states | Pass | Scores, shortfalls, declining deltas, borrowing and below-zero balances stay neutral/cobalt. Red appears only on destructive controls and permitted form-validation errors. |
| Low score as punishment | Pass | Four-stage single-cobalt progression; Jess ring is exactly 22/150, about 14.67%, with 128 points to Healthy. No minimum-fill trick, warning colour or risk stamp. |
| Confetti, badges, streaks, leaderboards or percentiles | Pass | None. The required strongest-factor sentence is a fact about Jess’s factors, not a ranking against other people. Selection underlines/checks are control states, not rewards. |
| Green for spending increases | Pass | All monthly increases retain cobalt. Category identity colours are not trend/success signals. Marcus Jul/Aug bars are not green. |
| Gambling highlighted or judgemental | Pass | Ordinary slate `category.gambling`, Lucide `Layers`, same row/card weight. The specifically requested gambling insight uses the standard InsightCard treatment; no warning icon or priority badge. |
| Centrelink treated differently from wages | Pass | Same ArrowDownToLine icon, stroke, opacity, container and label hierarchy. Income/Centrelink have matched OKLCH lightness/chroma within 8-bit rounding; the later token prompt permits different hue. |
| AU language, AUD and dates | Pass | Australian customer-facing spelling and dollar amounts. User-supplied compact DD/MM labels remain verbatim in the fixed 2026 context; full accessible/production dates use DD/MM/YYYY. All explicit weekday/date occurrences checked against 2026. API identifiers such as `color` are not customer copy. |
| Contrast | Pass for audited static palette | 293 recalculated pairs: text minimum 5.49:1 (target 4.5); essential graphics minimum 3.05:1 (target 3, contrast-safe dimmed donut fills). Stage minimum 4.05:1; category minimum on surface/surface2 3.69:1. Dark housing is the only category colour changed. |
| Missing dark variants | Pass with explicit exceptions | All paired mobile screens and all 23 component boards include both themes. Consents (three captures) and desktop (two captures) are light-only as explicitly permitted. The six SVGs inherit either theme and have a both-theme preview. |
| Exact mobile/desktop sizes | Pass | 69 mobile PNGs are 390 × 844; two desktop PNGs are 1440 × 900. Component boards intentionally contain multiple fragments at 2×. Drawer is 420 px; sidebar is now 260 px throughout. |
| Five tabs, sheets and 44 px targets | Pass in design contract | Home, Score, Spending, Loans, Support; plain support access remains visible. Details use sheets/drawers. Minimum targets, keyboard focus and safe-area reserves specified. Consent onboarding is the explicitly separate shell. |
| Customer data changed or invented | No numeric/date deviation found | Exact supplied scores, deltas, stage distances, borrowing, pay cycles, balances, bills, fees, monthly totals, offer terms and forecast dates preserved. Qualifications below prevent invented missing values. The latest round-2 data supersedes the earlier Marcus cycle and Jess income interpretation. |
| Summary first and controls lead somewhere | Specified | Chart taps filter/open details, transaction search/category editing and explicit destinations are documented. Scroll continuations keep readable type rather than squeezing all data into one viewport. |
| Typography and restrained character | Pass | Inter from Google Fonts with system fallbacks; Lucide UI icons. Clean neutral/cobalt surfaces, no urgency stamps, glass effects, handshake photos or wellness motifs. |
| Runtime WCAG 2.2 AA | Implementation verification still required | PNG/SVG and palette checks cannot prove DOM semantics, focus order, zoom/reflow, target hitboxes, assistive-technology announcements or live interactions. The acceptance requirements are in components.md; this is not a certification of an unbuilt app. |

## Source-data qualifications kept visible

- Jess has **nine score factors; eight are visible by design**. Government payments in income is never a tile, scored item or improvement recommendation. “How your score works” says: “Your score also looks at the mix of wages and government payments in your income.”
- The eleven rounded spending rows sum to **$1,830**; the explicitly supplied total is **$1,832**. Both remain unchanged with the rounding note. Mock-up donut angles are approximate from the rounded rows; production angles require the unrounded transaction totals.
- Marcus’s itemised bills total **$662.99**; his supplied headline remains **$663**. The due sheet identifies rounding.
- Priya’s supplied **10/11/2026** expectation remains unchanged alongside 45 days of history; no inferred replacement date.
- Harbour Lending’s verified sample is **$2,500 / 78 weeks / 21.9% p.a. comparison rate / $150 included fee / $75.47 per fortnight / $2,943.33 total repayable**. Display **“Total cost of borrowing $443 (includes the $150 fee)”**. The exact arithmetic is $443.33 above principal; 39 × $75.47 = $2,943.33. The fee is not added twice.
- Calendar: **Sat 26/09** Telstra, **Wed 30/09** Beforepay, **Thu 01/10** next payday. Only 30/09 has a below-zero forecast. No confirmed below-zero date or unavailable historical balance is fabricated.
- Jess’s **$2,483 paid in is wages only**. The $300 Beforepay advance is separate borrowing and **not income**. Her supplied approximately 21% debt-repayment share is unchanged.

## File inventory

“Earlier extract/copy” means retained for traceability; use the canonical consolidated file when instructions overlap. Every path is relative to the handoff root.

### Core specifications and review

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/tokens.json` | Exact-schema implementation tokens, v1.0.2: both themes, stage/category/chart colours, type, layout and motion. | JSON | Changed this round |
| `design/icons.md` | Lucide UI/category mapping and rendering rules; no custom UI icons were needed. | Markdown | Unchanged |
| `design/components.md` | Canonical specifications for components 01–17, all states, accessibility and interaction contracts. | Markdown | Changed this round |
| `design/screens.md` | Canonical screen specifications, exact fixtures, routes, scroll captures and light-only exceptions for screens 01–14. | Markdown | Changed this round |
| `design/illustration-and-motion.md` | Six empty-state SVG sources, placement, motion/reduced-motion rules and verified-payoff acknowledgement. | Markdown | Unchanged |
| `design/component-specs.md` | Earlier components 01–04 extract, reconciled with current tokens; use components.md for the consolidated contract. | Markdown | Changed this round |
| `design/component-specs-05-10.md` | Earlier components 05–10 extract; use components.md for the consolidated contract. | Markdown | Changed this round |
| `design/MANIFEST.md` | Complete file inventory, audit findings, corrections, data qualifications and contrast evidence. | Markdown | Changed this round |

### Canonical component state boards

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/components/bottom-navigation-states.png` | 17a · All five selected tabs, keyboard focus and persistent plain Hardship support row. | Light + dark · PNG state board | Unchanged |
| `design/components/bottom-sheet-states.png` | 09 · Bottom-sheet detents, scrim and desktop drawer; background chrome illustrative. | Light + dark · PNG state board | Unchanged |
| `design/components/button-states.png` | 15a · Four button variants, three sizes and default/hover/focus/pressed/disabled/loading. | Light + dark · PNG state board | Unchanged |
| `design/components/calendar-cell-states.png` | 11 · Calendar events, forecasts, neutral below-zero hatches and outside-range payday marker. | Light + dark · PNG state board | Unchanged |
| `design/components/category-row-states.png` | 06 · Category rows, merchant expansion, budget, insight, lifestyle and ordinary gambling treatment. | Light + dark · PNG state board | Unchanged |
| `design/components/choice-control-states.png` | 15c · Checkbox, toggle and radio states. | Light + dark · PNG state board | Unchanged |
| `design/components/desktop-sidebar-states.png` | 17b · Grouped 260 px rail; Home and Hardship support selected/focused, with pinned support. | Light + dark · PNG state board | Unchanged |
| `design/components/donut-states.png` | 07 · Default/selected donut and contrast-safe dimming; schematic, not customer data. | Light + dark · PNG state board | Changed this round |
| `design/components/empty-state-variants.png` | 16b · Six compact icon-based empty states; dedicated views use the separate SVGs. | Light + dark · PNG state board | Unchanged |
| `design/components/factor-tile-states.png` | 03 · Ordinary, strongest, null, pressed and focused FactorTile. | Light + dark · PNG state board | Unchanged |
| `design/components/feedback-states.png` | 16a · Toasts and info/caution/technical-failure inline messages. | Light + dark · PNG state board | Unchanged |
| `design/components/input-states.png` | 15b · Text/currency inputs, validation, read-only and disabled. | Light + dark · PNG state board | Unchanged |
| `design/components/insight-card-states.png` | 05a · InsightCard, manual pager, loading, empty and dismissed states. | Light + dark · PNG state board | Unchanged |
| `design/components/insight-sheet-states.png` | 05b · InsightSheet content blocks and voluntary actions. | Light + dark · PNG state board | Unchanged |
| `design/components/loan-card-states.png` | 12 · Collapsed/expanded/missing-balance LoanCard with field-specific estimates. | Light + dark · PNG state board | Unchanged |
| `design/components/offer-card-states.png` | 13 · Comparable OfferCard, matching reasons and unavailable terms; generic data bindings. | Light + dark · PNG state board | Unchanged |
| `design/components/pay-cycle-hero-states.png` | 04 · Money-left template and Jess short-before-payday PayCycleHero. | Light + dark · PNG state board | Changed this round |
| `design/components/recommendation-card-states.png` | 14 · Recommendation, saved and dismissed states. | Light + dark · PNG state board | Unchanged |
| `design/components/score-ring-states.png` | 01 · Hero/medium/small ScoreRing; normal, loading, null and override. | Light + dark · PNG state board | Unchanged |
| `design/components/selection-control-states.png` | 10 · SegmentedControl, period Chip and dismissible FilterChip. | Light + dark · PNG state board | Unchanged |
| `design/components/skeleton-states.png` | 16c · Static loading skeletons, slow load and refresh guidance. | Light + dark · PNG state board | Unchanged |
| `design/components/stage-scale-states.png` | 02 · Four-stage scale, current position and next-stage distance. | Light + dark · PNG state board | Unchanged |
| `design/components/transaction-row-states.png` | 08 · Posted, pending and recategorised transactions; generic data bindings. | Light + dark · PNG state board | Unchanged |

### Mobile and desktop screens

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/screens/calendar-dark.png` | 12 · Jess fortnight: Thu–Wed grid, today 25/09, forecast balances and outside-range payday. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/calendar-forecast-dark.png` | 12 · Wed 30/09 day sheet: predicted $315 Beforepay and only negative day, forecast −$53. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/calendar-forecast-light.png` | 12 · Wed 30/09 day sheet: predicted $315 Beforepay and only negative day, forecast −$53. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/calendar-light.png` | 12 · Jess fortnight: Thu–Wed grid, today 25/09, forecast balances and outside-range payday. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/calendar-telstra-dark.png` | 12 · Sat 26/09 day sheet: predicted $52 Telstra and $262 forecast balance. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/calendar-telstra-light.png` | 12 · Sat 26/09 day sheet: predicted $52 Telstra and $262 forecast balance. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/consents-light.png` | 13 · Onboarding: three unticked consents and disabled Continue. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/consents-optional-details-light.png` | 13 · Optional matching explanation expanded; no persuasion or preselection. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/consents-ready-light.png` | 13 · Required consents ticked, matching unticked; Continue enabled. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/dashboard-dark.png` | 03 · Jess Home opening: hardship banner, score path, next action and pay-cycle headline. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/dashboard-desktop-drawer-light.png` | 14 · Jess dashboard with 420 px due-items drawer. | Light · 1440 × 900 PNG | Changed this round |
| `design/screens/dashboard-desktop-light.png` | 14 · Jess dashboard at 1440 × 900 with complete grouped 260 px sidebar. | Light · 1440 × 900 PNG | Changed this round |
| `design/screens/dashboard-due-dark.png` | 03 · Jess due-items bottom sheet; Telstra and Beforepay both explicitly predicted. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-due-light.png` | 03 · Jess due-items bottom sheet; Telstra and Beforepay both explicitly predicted. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-dark.png` | 04 · Marcus Home opening: one offer, 612 Healthy, neutral +11 delta and next action. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-due-dark.png` | 04 · Marcus due-items sheet: rent, Telstra, Afterpay and Netflix; rounded $663 total. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-due-light.png` | 04 · Marcus due-items sheet: rent, Telstra, Afterpay and Netflix; rounded $663 total. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-light.png` | 04 · Marcus Home opening: one offer, 612 Healthy, neutral +11 delta and next action. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-pay-cycle-dark.png` | 04 · Marcus Home continuation: supplied pay-cycle totals, $663 due and next bill. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-pay-cycle-light.png` | 04 · Marcus Home continuation: supplied pay-cycle totals, $663 due and next bill. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-spending-dark.png` | 04 · Marcus Home continuation: Apr–Sep spending bars; increases retain cobalt. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-improving-spending-light.png` | 04 · Marcus Home continuation: Apr–Sep spending bars; increases retain cobalt. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-light.png` | 03 · Jess Home opening: hardship banner, score path, next action and pay-cycle headline. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/dashboard-pay-cycle-dark.png` | 03 · Jess Home continuation: $314 balance, $367 due, $53 short and advance disclosure. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-pay-cycle-light.png` | 03 · Jess Home continuation: $314 balance, $367 due, $53 short and advance disclosure. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-spending-dark.png` | 03 · Jess Home continuation: predicted Telstra bill and Apr–Sep spending bars. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/dashboard-spending-light.png` | 03 · Jess Home continuation: predicted Telstra bill and Apr–Sep spending bars. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/factor-sheet-dark.png` | 06 · Current borrowing detail over SmartScore; estimates, drivers and related action. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/factor-sheet-light.png` | 06 · Current borrowing detail over SmartScore; estimates, drivers and related action. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-counselling-dark.png` | 11 · National Debt Helpline contact sheet and source website. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-counselling-light.png` | 11 · National Debt Helpline contact sheet and source website. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-dark.png` | 11 · Support opening: lender arrangement, free counselling and subscription options. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-gambling-support-dark.png` | 11 · Voluntary Gambling Help Online, BetStop and bank-card block options. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-gambling-support-light.png` | 11 · Voluntary Gambling Help Online, BetStop and bank-card block options. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-light.png` | 11 · Support opening: lender arrangement, free counselling and subscription options. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-options-dark.png` | 11 · Support continuation including ordinary gambling support option. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-options-light.png` | 11 · Support continuation including ordinary gambling support option. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-template-dark.png` | 11 · Editable hardship message template; copy action, never sends automatically. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/hardship-template-light.png` | 11 · Editable hardship message template; copy action, never sends automatically. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/loans-dark.png` | 09 · Loans overview opening: approximately 21% of income and estimated small-loan balances. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/loans-light.png` | 09 · Loans overview opening: approximately 21% of income and estimated small-loan balances. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/loans-more-dark.png` | 09 · Loans continuation: Right Road Finance, BNPL and independently qualified repayments. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/loans-more-light.png` | 09 · Loans continuation: Right Road Finance, BNPL and independently qualified repayments. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/loans-pay-advance-dark.png` | 09 · Loans continuation: Afterpay, Zip and $300 Beforepay / $315 repayment breakdown. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/loans-pay-advance-light.png` | 09 · Loans continuation: Afterpay, Zip and $300 Beforepay / $315 repayment breakdown. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/offers-dark.png` | 10 · Marcus: Harbour Lending sample offer, all comparable financial fields. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/offers-light.png` | 10 · Marcus: Harbour Lending sample offer, all comparable financial fields. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/offers-why-matched-dark.png` | 10 · Offer continuation: exact matching reasons, View details and Not interested. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/offers-why-matched-light.png` | 10 · Offer continuation: exact matching reasons, View details and Not interested. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/score-reveal-dark.png` | 01 · Jess: 472, Steadying, exact 22/150 ring and 128 points to Healthy; opening viewport. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/score-reveal-details-dark.png` | 01 · Scroll continuation: Current borrowing 2.9/10, three loans and complete Beforepay action. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/score-reveal-details-light.png` | 01 · Scroll continuation: Current borrowing 2.9/10, three loans and complete Beforepay action. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/score-reveal-light.png` | 01 · Jess: 472, Steadying, exact 22/150 ring and 128 points to Healthy; opening viewport. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/score-reveal-thinfile-dark.png` | 02 · Priya: no score; 90-day explanation, expected 10/11/2026 and supplied history/pay cycle. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/score-reveal-thinfile-light.png` | 02 · Priya: no score; 90-day explanation, expected 10/11/2026 and supplied history/pay cycle. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/smartscore-dark.png` | 05 · Jess Score opening: ring, stage scale, six-reading trend and factual strength. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/smartscore-factors-dark.png` | 05 · Score continuation: supplied factors with room to move. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/smartscore-factors-light.png` | 05 · Score continuation: supplied factors with room to move. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/smartscore-light.png` | 05 · Jess Score opening: ring, stage scale, six-reading trend and factual strength. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/smartscore-more-factors-dark.png` | 05 · Score continuation: remaining supplied factors, including Income stability 7.4. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/smartscore-more-factors-light.png` | 05 · Score continuation: remaining supplied factors, including Income stability 7.4. | Light · 390 × 844 PNG | Changed this round |
| `design/screens/spending-overview-breakdown-dark.png` | 07 · Spending continuation: $1,832 total, rounded-category donut and first rows. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/spending-overview-breakdown-light.png` | 07 · Spending continuation: $1,832 total, rounded-category donut and first rows. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/spending-overview-categories-dark.png` | 07 · Spending continuation: middle category rows; Gambling uses ordinary slate/Layers. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/spending-overview-categories-light.png` | 07 · Spending continuation: middle category rows; Gambling uses ordinary slate/Layers. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/spending-overview-dark.png` | 07 · Spending opening: periods, pay-cycle summary and standard first insight. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/spending-overview-light.png` | 07 · Spending opening: periods, pay-cycle summary and standard first insight. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/spending-overview-more-categories-dark.png` | 07 · Spending continuation: remaining rows, including $4 Subscriptions. | Dark · 390 × 844 PNG | Unchanged |
| `design/screens/spending-overview-more-categories-light.png` | 07 · Spending continuation: remaining rows, including $4 Subscriptions. | Light · 390 × 844 PNG | Unchanged |
| `design/screens/spending-sheet-dark.png` | 08 · Requested gambling insight sheet with supplied 16.5%, factor 3.2 and optional support. | Dark · 390 × 844 PNG | Changed this round |
| `design/screens/spending-sheet-light.png` | 08 · Requested gambling insight sheet with supplied 16.5%, factor 3.2 and optional support. | Light · 390 × 844 PNG | Changed this round |

### SVG illustrations

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/empty-states/no-bank-data.svg` | Bank and statement drawing for the no-bank-data empty state. | Both themes · 160 × 120 SVG | Unchanged |
| `design/empty-states/no-offers.svg` | Equal document outlines for the no-offers empty state. | Both themes · 160 × 120 SVG | Unchanged |
| `design/empty-states/no-recommendations.svg` | Reference book drawing for no recommendations available. | Both themes · 160 × 120 SVG | Unchanged |
| `design/empty-states/no-search-results.svg` | Search lens drawing for no results. | Both themes · 160 × 120 SVG | Unchanged |
| `design/empty-states/no-subscriptions.svg` | Recurring card drawing for no subscriptions found. | Both themes · 160 × 120 SVG | Unchanged |
| `design/empty-states/no-transactions-in-range.svg` | Calendar/range drawing for the empty transaction period. | Both themes · 160 × 120 SVG | Unchanged |

### Previews

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/screens-preview.png` | Overview contact sheet for screens 01–05; light top, dark bottom. | PNG overview | Changed this round |
| `design/screens-06-11-preview.png` | Overview contact sheet for screens 06–11; light top, dark bottom. | PNG overview | Changed this round |
| `design/screens-12-14-preview.png` | Overview of calendar, consent and desktop frames; permitted themes labelled. | PNG overview | Changed this round |
| `design/empty-states-preview.png` | All six SVG illustrations resolved in light and dark themes. | PNG overview | Unchanged |

### Earlier root-level component copies

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/bottom-sheet-states.png` | Earlier root-level copy of `design/components/bottom-sheet-states.png`; 09 · Bottom-sheet detents, scrim and desktop drawer; background chrome illustrative. | Light + dark · PNG state board | Unchanged |
| `design/category-row-states.png` | Earlier root-level copy of `design/components/category-row-states.png`; 06 · Category rows, merchant expansion, budget, insight, lifestyle and ordinary gambling treatment. | Light + dark · PNG state board | Unchanged |
| `design/donut-states.png` | Earlier root-level copy of `design/components/donut-states.png`; 07 · Default/selected donut and contrast-safe dimming; schematic, not customer data. | Light + dark · PNG state board | Changed this round |
| `design/factor-tile-states.png` | Earlier root-level copy of `design/components/factor-tile-states.png`; 03 · Ordinary, strongest, null, pressed and focused FactorTile. | Light + dark · PNG state board | Unchanged |
| `design/insight-card-states.png` | Earlier root-level copy of `design/components/insight-card-states.png`; 05a · InsightCard, manual pager, loading, empty and dismissed states. | Light + dark · PNG state board | Unchanged |
| `design/insight-sheet-states.png` | Earlier root-level copy of `design/components/insight-sheet-states.png`; 05b · InsightSheet content blocks and voluntary actions. | Light + dark · PNG state board | Unchanged |
| `design/pay-cycle-hero-states.png` | Earlier root-level copy of `design/components/pay-cycle-hero-states.png`; 04 · Money-left template and Jess short-before-payday PayCycleHero. | Light + dark · PNG state board | Changed this round |
| `design/score-ring-states.png` | Earlier root-level copy of `design/components/score-ring-states.png`; 01 · Hero/medium/small ScoreRing; normal, loading, null and override. | Light + dark · PNG state board | Unchanged |
| `design/selection-control-states.png` | Earlier root-level copy of `design/components/selection-control-states.png`; 10 · SegmentedControl, period Chip and dismissible FilterChip. | Light + dark · PNG state board | Unchanged |
| `design/stage-scale-states.png` | Earlier root-level copy of `design/components/stage-scale-states.png`; 02 · Four-stage scale, current position and next-stage distance. | Light + dark · PNG state board | Unchanged |
| `design/transaction-row-states.png` | Earlier root-level copy of `design/components/transaction-row-states.png`; 08 · Posted, pending and recategorised transactions; generic data bindings. | Light + dark · PNG state board | Unchanged |

### Download packages

| Path under design/ | Purpose | Theme / format | Review status |
| --- | --- | --- | --- |
| `design/tippla-component-handoff.zip` | Refreshed early components 01–04 package; seven files. Superseded in scope by tippla-components.zip. | ZIP | Changed this round |
| `design/tippla-components-05-10.zip` | Refreshed early components 05–10 package; ten files. Superseded in scope by tippla-components.zip. | ZIP | Changed this round |
| `design/tippla-components.zip` | Refreshed consolidated components 01–17 package; 26 files including current tokens/specs. | ZIP | Changed this round |
| `design/tippla-screens.zip` | Superseded prior archive; the user’s copy failed to open. Use tippla-screens-v2.zip. | ZIP | Superseded; not reissued |
| `design/illustration-and-motion.zip` | Unchanged illustration/motion module: six SVGs, specification and theme preview; eight files. | ZIP | Unchanged |
| `design/corrected-files.zip` | Historical round-1 delta, retained for traceability. Use corrections-round-2.zip for this round. | ZIP | Unchanged historical package |
| `design/tippla-screens-v2.zip` | New verified screen package: all 71 current screen PNGs, screens.md and three screen previews; 75 entries. | ZIP | New, CRC verified |
| `design/corrections-round-2.zip` | Round-2 delta: 40 changed loose files, including MANIFEST.md. | ZIP | New, CRC verified |

## Contrast audit — expected foreground/background pairs

Ratios use unrounded sRGB relative luminance for decisions, rounded here to two decimals. Text requires 4.5:1; essential graphics require 3:1. Decorative gridlines, empty tracks and inactive skeletons are not claimed as essential contrast boundaries. Dimmed slices use the documented opaque blend; no whole-SVG opacity.

| Pair | Light ratio | Dark ratio | Required | Result |
| --- | --- | --- | --- | --- |
| `text / bg` | 17.49:1 | 16.88:1 | 4.5:1 | Pass / Pass |
| `text / surface` | 17.94:1 | 14.67:1 | 4.5:1 | Pass / Pass |
| `text / surface2` | 16.28:1 | 13.60:1 | 4.5:1 | Pass / Pass |
| `text / accentSoft` | 15.43:1 | 11.60:1 | 4.5:1 | Pass / Pass |
| `text / neutralSoft` | 15.84:1 | 12.37:1 | 4.5:1 | Pass / Pass |
| `textMuted / bg` | 6.22:1 | 10.09:1 | 4.5:1 | Pass / Pass |
| `textMuted / surface` | 6.38:1 | 8.77:1 | 4.5:1 | Pass / Pass |
| `textMuted / surface2` | 5.79:1 | 8.13:1 | 4.5:1 | Pass / Pass |
| `textMuted / accentSoft` | 5.49:1 | 6.93:1 | 4.5:1 | Pass / Pass |
| `textMuted / neutralSoft` | 5.63:1 | 7.39:1 | 4.5:1 | Pass / Pass |
| `accent / bg` | 6.85:1 | 10.10:1 | 4.5:1 | Pass / Pass |
| `accent / surface` | 7.02:1 | 8.78:1 | 4.5:1 | Pass / Pass |
| `accent / surface2` | 6.37:1 | 8.15:1 | 4.5:1 | Pass / Pass |
| `accent / accentSoft` | 6.04:1 | 6.95:1 | 4.5:1 | Pass / Pass |
| `accent / neutralSoft` | 6.20:1 | 7.40:1 | 4.5:1 | Pass / Pass |
| `onAccent / accent` | 7.02:1 | 8.82:1 | 4.5:1 | Pass / Pass |
| `positive / positiveSoft` | 6.07:1 | 6.65:1 | 4.5:1 | Pass / Pass |
| `caution / cautionSoft` | 5.98:1 | 7.78:1 | 4.5:1 | Pass / Pass |
| `info / infoSoft` | 6.04:1 | 6.81:1 | 4.5:1 | Pass / Pass |
| `neutral / neutralSoft` | 5.63:1 | 7.39:1 | 4.5:1 | Pass / Pass |
| `destructive / bg (form error only)` | 5.97:1 | 10.25:1 | 4.5:1 | Pass / Pass |
| `destructive / surface (form error only)` | 6.12:1 | 8.91:1 | 4.5:1 | Pass / Pass |
| `destructive / surface2 (form error only)` | 5.55:1 | 8.26:1 | 4.5:1 | Pass / Pass |
| `destructive button foreground / destructive` | 6.12:1 | 8.95:1 | 4.5:1 | Pass / Pass |
| `stage.building / surface` | 4.47:1 | 4.51:1 | 3:1 | Pass / Pass |
| `stage.building / surface2` | 4.05:1 | 4.18:1 | 3:1 | Pass / Pass |
| `stage.steadying / surface` | 5.73:1 | 6.44:1 | 3:1 | Pass / Pass |
| `stage.steadying / surface2` | 5.19:1 | 5.98:1 | 3:1 | Pass / Pass |
| `stage.healthy / surface` | 7.45:1 | 8.63:1 | 3:1 | Pass / Pass |
| `stage.healthy / surface2` | 6.75:1 | 8.00:1 | 3:1 | Pass / Pass |
| `stage.thriving / surface` | 9.56:1 | 10.89:1 | 3:1 | Pass / Pass |
| `stage.thriving / surface2` | 8.67:1 | 10.10:1 | 3:1 | Pass / Pass |
| `category.housing / surface` | 5.92:1 | 3.98:1 | 3:1 | Pass / Pass |
| `category.housing / surface2` | 5.37:1 | 3.69:1 | 3:1 | Pass / Pass |
| `category.housing / accentSoft` | 5.09:1 | 3.15:1 | 3:1 | Pass / Pass |
| `category.housing dimmed / surface` | 3.40:1 | 3.30:1 | 3:1 | Pass / Pass |
| `category.housing dimmed / surface2` | 3.09:1 | 3.06:1 | 3:1 | Pass / Pass |
| `category.groceries / surface` | 5.04:1 | 8.29:1 | 3:1 | Pass / Pass |
| `category.groceries / surface2` | 4.57:1 | 7.69:1 | 3:1 | Pass / Pass |
| `category.groceries / accentSoft` | 4.33:1 | 6.56:1 | 3:1 | Pass / Pass |
| `category.groceries dimmed / surface` | 3.38:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.groceries dimmed / surface2` | 3.06:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.food / surface` | 4.84:1 | 6.98:1 | 3:1 | Pass / Pass |
| `category.food / surface2` | 4.39:1 | 6.47:1 | 3:1 | Pass / Pass |
| `category.food / accentSoft` | 4.16:1 | 5.52:1 | 3:1 | Pass / Pass |
| `category.food dimmed / surface` | 3.38:1 | 3.29:1 | 3:1 | Pass / Pass |
| `category.food dimmed / surface2` | 3.06:1 | 3.06:1 | 3:1 | Pass / Pass |
| `category.transport / surface` | 5.03:1 | 7.73:1 | 3:1 | Pass / Pass |
| `category.transport / surface2` | 4.56:1 | 7.17:1 | 3:1 | Pass / Pass |
| `category.transport / accentSoft` | 4.33:1 | 6.11:1 | 3:1 | Pass / Pass |
| `category.transport dimmed / surface` | 3.40:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.transport dimmed / surface2` | 3.08:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.bills / surface` | 5.94:1 | 6.95:1 | 3:1 | Pass / Pass |
| `category.bills / surface2` | 5.39:1 | 6.45:1 | 3:1 | Pass / Pass |
| `category.bills / accentSoft` | 5.11:1 | 5.50:1 | 3:1 | Pass / Pass |
| `category.bills dimmed / surface` | 3.38:1 | 3.31:1 | 3:1 | Pass / Pass |
| `category.bills dimmed / surface2` | 3.07:1 | 3.07:1 | 3:1 | Pass / Pass |
| `category.subscriptions / surface` | 5.46:1 | 6.62:1 | 3:1 | Pass / Pass |
| `category.subscriptions / surface2` | 4.96:1 | 6.14:1 | 3:1 | Pass / Pass |
| `category.subscriptions / accentSoft` | 4.70:1 | 5.23:1 | 3:1 | Pass / Pass |
| `category.subscriptions dimmed / surface` | 3.38:1 | 3.33:1 | 3:1 | Pass / Pass |
| `category.subscriptions dimmed / surface2` | 3.07:1 | 3.09:1 | 3:1 | Pass / Pass |
| `category.entertainment / surface` | 5.12:1 | 7.33:1 | 3:1 | Pass / Pass |
| `category.entertainment / surface2` | 4.64:1 | 6.80:1 | 3:1 | Pass / Pass |
| `category.entertainment / accentSoft` | 4.40:1 | 5.80:1 | 3:1 | Pass / Pass |
| `category.entertainment dimmed / surface` | 3.38:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.entertainment dimmed / surface2` | 3.07:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.alcohol / surface` | 5.71:1 | 6.06:1 | 3:1 | Pass / Pass |
| `category.alcohol / surface2` | 5.18:1 | 5.62:1 | 3:1 | Pass / Pass |
| `category.alcohol / accentSoft` | 4.91:1 | 4.79:1 | 3:1 | Pass / Pass |
| `category.alcohol dimmed / surface` | 3.36:1 | 3.31:1 | 3:1 | Pass / Pass |
| `category.alcohol dimmed / surface2` | 3.05:1 | 3.07:1 | 3:1 | Pass / Pass |
| `category.gambling / surface` | 4.28:1 | 8.06:1 | 3:1 | Pass / Pass |
| `category.gambling / surface2` | 3.88:1 | 7.47:1 | 3:1 | Pass / Pass |
| `category.gambling / accentSoft` | 3.68:1 | 6.37:1 | 3:1 | Pass / Pass |
| `category.gambling dimmed / surface` | 3.39:1 | 3.30:1 | 3:1 | Pass / Pass |
| `category.gambling dimmed / surface2` | 3.08:1 | 3.06:1 | 3:1 | Pass / Pass |
| `category.health / surface` | 4.77:1 | 7.94:1 | 3:1 | Pass / Pass |
| `category.health / surface2` | 4.32:1 | 7.37:1 | 3:1 | Pass / Pass |
| `category.health / accentSoft` | 4.10:1 | 6.28:1 | 3:1 | Pass / Pass |
| `category.health dimmed / surface` | 3.36:1 | 3.31:1 | 3:1 | Pass / Pass |
| `category.health dimmed / surface2` | 3.05:1 | 3.07:1 | 3:1 | Pass / Pass |
| `category.shopping / surface` | 5.83:1 | 6.57:1 | 3:1 | Pass / Pass |
| `category.shopping / surface2` | 5.29:1 | 6.10:1 | 3:1 | Pass / Pass |
| `category.shopping / accentSoft` | 5.01:1 | 5.20:1 | 3:1 | Pass / Pass |
| `category.shopping dimmed / surface` | 3.39:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.shopping dimmed / surface2` | 3.07:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.loan_repayment / surface` | 10.94:1 | 5.27:1 | 3:1 | Pass / Pass |
| `category.loan_repayment / surface2` | 9.92:1 | 4.89:1 | 3:1 | Pass / Pass |
| `category.loan_repayment / accentSoft` | 9.40:1 | 4.17:1 | 3:1 | Pass / Pass |
| `category.loan_repayment dimmed / surface` | 3.36:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.loan_repayment dimmed / surface2` | 3.05:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.bnpl / surface` | 5.26:1 | 6.95:1 | 3:1 | Pass / Pass |
| `category.bnpl / surface2` | 4.77:1 | 6.45:1 | 3:1 | Pass / Pass |
| `category.bnpl / accentSoft` | 4.52:1 | 5.50:1 | 3:1 | Pass / Pass |
| `category.bnpl dimmed / surface` | 3.37:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.bnpl dimmed / surface2` | 3.05:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.wage_advance / surface` | 5.23:1 | 6.40:1 | 3:1 | Pass / Pass |
| `category.wage_advance / surface2` | 4.75:1 | 5.93:1 | 3:1 | Pass / Pass |
| `category.wage_advance / accentSoft` | 4.50:1 | 5.06:1 | 3:1 | Pass / Pass |
| `category.wage_advance dimmed / surface` | 3.36:1 | 3.32:1 | 3:1 | Pass / Pass |
| `category.wage_advance dimmed / surface2` | 3.05:1 | 3.08:1 | 3:1 | Pass / Pass |
| `category.cash / surface` | 5.14:1 | 8.86:1 | 3:1 | Pass / Pass |
| `category.cash / surface2` | 4.67:1 | 8.22:1 | 3:1 | Pass / Pass |
| `category.cash / accentSoft` | 4.42:1 | 7.01:1 | 3:1 | Pass / Pass |
| `category.cash dimmed / surface` | 3.39:1 | 3.29:1 | 3:1 | Pass / Pass |
| `category.cash dimmed / surface2` | 3.08:1 | 3.05:1 | 3:1 | Pass / Pass |
| `category.fees / surface` | 4.69:1 | 6.99:1 | 3:1 | Pass / Pass |
| `category.fees / surface2` | 4.25:1 | 6.48:1 | 3:1 | Pass / Pass |
| `category.fees / accentSoft` | 4.03:1 | 5.53:1 | 3:1 | Pass / Pass |
| `category.fees dimmed / surface` | 3.37:1 | 3.31:1 | 3:1 | Pass / Pass |
| `category.fees dimmed / surface2` | 3.05:1 | 3.07:1 | 3:1 | Pass / Pass |
| `category.income / surface` | 5.32:1 | 7.85:1 | 3:1 | Pass / Pass |
| `category.income / surface2` | 4.83:1 | 7.28:1 | 3:1 | Pass / Pass |
| `category.income / accentSoft` | 4.58:1 | 6.21:1 | 3:1 | Pass / Pass |
| `category.income dimmed / surface` | 3.38:1 | 3.31:1 | 3:1 | Pass / Pass |
| `category.income dimmed / surface2` | 3.06:1 | 3.07:1 | 3:1 | Pass / Pass |
| `category.centrelink / surface` | 5.37:1 | 7.82:1 | 3:1 | Pass / Pass |
| `category.centrelink / surface2` | 4.87:1 | 7.25:1 | 3:1 | Pass / Pass |
| `category.centrelink / accentSoft` | 4.62:1 | 6.18:1 | 3:1 | Pass / Pass |
| `category.centrelink dimmed / surface` | 3.39:1 | 3.30:1 | 3:1 | Pass / Pass |
| `category.centrelink dimmed / surface2` | 3.07:1 | 3.06:1 | 3:1 | Pass / Pass |
| `category.uncategorised / surface` | 4.64:1 | 5.93:1 | 3:1 | Pass / Pass |
| `category.uncategorised / surface2` | 4.21:1 | 5.50:1 | 3:1 | Pass / Pass |
| `category.uncategorised / accentSoft` | 3.99:1 | 4.69:1 | 3:1 | Pass / Pass |
| `category.uncategorised dimmed / surface` | 3.40:1 | 3.31:1 | 3:1 | Pass / Pass |
| `category.uncategorised dimmed / surface2` | 3.08:1 | 3.07:1 | 3:1 | Pass / Pass |
| `chart.predicted / surface` | 4.61:1 | 6.92:1 | 3:1 | Pass / Pass |
| `chart.predicted / surface2` | 4.18:1 | 6.42:1 | 3:1 | Pass / Pass |
| `chart.predicted / accentSoft` | 3.96:1 | 5.47:1 | 3:1 | Pass / Pass |
| `chart.predicted / cautionSoft` | 4.06:1 | 5.59:1 | 3:1 | Pass / Pass |
| `chart.hatch / surface` | 6.38:1 | 8.77:1 | 3:1 | Pass / Pass |
| `chart.hatch / surface2` | 5.79:1 | 8.13:1 | 3:1 | Pass / Pass |
| `chart.hatch / accentSoft` | 5.49:1 | 6.93:1 | 3:1 | Pass / Pass |
| `chart.hatch / cautionSoft` | 5.63:1 | 7.08:1 | 3:1 | Pass / Pass |
| `empty SVG neutral / bg` | 6.22:1 | 10.09:1 | 3:1 | Pass / Pass |
| `empty SVG neutral / surface` | 6.38:1 | 8.77:1 | 3:1 | Pass / Pass |
| `empty SVG neutral / surface2` | 5.79:1 | 8.13:1 | 3:1 | Pass / Pass |
| `empty SVG accent / bg` | 6.85:1 | 10.10:1 | 3:1 | Pass / Pass |
| `empty SVG accent / surface` | 7.02:1 | 8.78:1 | 3:1 | Pass / Pass |
| `empty SVG accent / surface2` | 6.37:1 | 8.15:1 | 3:1 | Pass / Pass |
| `focus / bg` | 6.85:1 | 10.10:1 | 3:1 | Pass / Pass |
| `focus / surface` | 7.02:1 | 8.78:1 | 3:1 | Pass / Pass |
| `focus / surface2` | 6.37:1 | 8.15:1 | 3:1 | Pass / Pass |
| `focus / accentSoft` | 6.04:1 | 6.95:1 | 3:1 | Pass / Pass |
| `brand white / steadying` | 5.73:1 | 5.73:1 | 4.5:1 | Pass / Pass |
| `brand white / thriving` | 9.56:1 | 9.56:1 | 4.5:1 | Pass / Pass |
| `brand filled arc / track` | 4.47:1 | 4.47:1 | 3:1 | Pass / Pass |

All six SVGs pass XML, geometry and theme-binding checks; no raster embedding, embedded text, external assets or extra colours. The corrected files retain the exact original token keys/nesting. All local file references resolve. All archive contents were compared byte-for-byte with their current source files and passed CRC checks.

## Screen ZIP contents and CRC verification

`tippla-screens-v2.zip`: 75 unique entries; 71 PNGs under `design/screens/`, three previews and `design/screens.md`. ZIP directory readable; every entry extracted successfully, passed its CRC, and matched the current source bytes. CRC32 is shown in hexadecimal.

```text
CRC32     Bytes  Path
D6D3AE86    88902  design/screens/calendar-dark.png
8B405114    77003  design/screens/calendar-forecast-dark.png
59BCF000    73647  design/screens/calendar-forecast-light.png
958DE51F    80351  design/screens/calendar-light.png
4A365B12    75588  design/screens/calendar-telstra-dark.png
0066A58B    72394  design/screens/calendar-telstra-light.png
C384ED1A    95675  design/screens/consents-light.png
8EC13FD2    98268  design/screens/consents-optional-details-light.png
6E42F7C8    94719  design/screens/consents-ready-light.png
DCAC4541   121626  design/screens/dashboard-dark.png
A544C707   299520  design/screens/dashboard-desktop-drawer-light.png
64898D65   248007  design/screens/dashboard-desktop-light.png
47D85A51    79704  design/screens/dashboard-due-dark.png
2121735D    76434  design/screens/dashboard-due-light.png
FFE07DE3   117716  design/screens/dashboard-improving-dark.png
FDBA105C    82904  design/screens/dashboard-improving-due-dark.png
A17DD710    79953  design/screens/dashboard-improving-due-light.png
748AD9F5   107736  design/screens/dashboard-improving-light.png
07EF79A2   112698  design/screens/dashboard-improving-pay-cycle-dark.png
E5A6B071   103481  design/screens/dashboard-improving-pay-cycle-light.png
258630E3    94414  design/screens/dashboard-improving-spending-dark.png
D284F578    82887  design/screens/dashboard-improving-spending-light.png
505E13E5   111916  design/screens/dashboard-light.png
3708D1DD   105995  design/screens/dashboard-pay-cycle-dark.png
74B413D6    98798  design/screens/dashboard-pay-cycle-light.png
9AC565A9    89605  design/screens/dashboard-spending-dark.png
EEDA5371    78190  design/screens/dashboard-spending-light.png
58CE45FF    95423  design/screens/factor-sheet-dark.png
64CCA985    85098  design/screens/factor-sheet-light.png
07CD40C9    91764  design/screens/hardship-counselling-dark.png
8DA7AFC3    91992  design/screens/hardship-counselling-light.png
5979B49B   106641  design/screens/hardship-dark.png
1A00B3FC    87034  design/screens/hardship-gambling-support-dark.png
6611579D    80373  design/screens/hardship-gambling-support-light.png
B9DE1FED    98635  design/screens/hardship-light.png
EA37CF06   100289  design/screens/hardship-options-dark.png
68556D58    90330  design/screens/hardship-options-light.png
6BBA3896    83563  design/screens/hardship-template-dark.png
7F2145D3    81451  design/screens/hardship-template-light.png
70F6249A    85933  design/screens/loans-dark.png
3E567FD6    77561  design/screens/loans-light.png
04E88C67    88933  design/screens/loans-more-dark.png
F25B2C6E    79732  design/screens/loans-more-light.png
81E5A057    88689  design/screens/loans-pay-advance-dark.png
0DA53130    78500  design/screens/loans-pay-advance-light.png
B155CDFB    90087  design/screens/offers-dark.png
5665E6AC    80268  design/screens/offers-light.png
23AA1B97    95593  design/screens/offers-why-matched-dark.png
BA8EE89F    83716  design/screens/offers-why-matched-light.png
610C2020    93732  design/screens/score-reveal-dark.png
2D64AE7D    93136  design/screens/score-reveal-details-dark.png
F13CC336    83833  design/screens/score-reveal-details-light.png
39A9F053    89755  design/screens/score-reveal-light.png
E106B2F5    92377  design/screens/score-reveal-thinfile-dark.png
AFE29E23    84543  design/screens/score-reveal-thinfile-light.png
AEFD7AE7    98166  design/screens/smartscore-dark.png
079D3344    90104  design/screens/smartscore-factors-dark.png
42F89D54    79978  design/screens/smartscore-factors-light.png
609F556E    88168  design/screens/smartscore-light.png
46FC6282    85539  design/screens/smartscore-more-factors-dark.png
A3233844    76481  design/screens/smartscore-more-factors-light.png
DBB33D94    89670  design/screens/spending-overview-breakdown-dark.png
24C2EAE2    81417  design/screens/spending-overview-breakdown-light.png
E8B95652    69210  design/screens/spending-overview-categories-dark.png
E17CE6B4    61890  design/screens/spending-overview-categories-light.png
C40DF4FD   114644  design/screens/spending-overview-dark.png
87E47D61   108059  design/screens/spending-overview-light.png
532E57AA    71126  design/screens/spending-overview-more-categories-dark.png
498C41CE    63729  design/screens/spending-overview-more-categories-light.png
3F107B16   110364  design/screens/spending-sheet-dark.png
1D010452    97615  design/screens/spending-sheet-light.png
78A39E1E    89207  design/screens.md
310AA372   516822  design/screens-06-11-preview.png
222CF7BB   546700  design/screens-12-14-preview.png
08CA12F0   434833  design/screens-preview.png
```
