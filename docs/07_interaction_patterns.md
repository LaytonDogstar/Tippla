# 07 · Interaction patterns (the "neo-bank feel")

The September review found the Figma screens read as **reports, not products**: everything visible at once, nothing responds, equal visual weight, dead-end links, insights parked in a side rail. These patterns fix that. `reference/spending_interaction_prototype.html` demonstrates most of them — open it and click everything.

## Principles

1. **Summary, then detail.** Each screen answers "so what?" in its first card; detail sits one tap down (progressive disclosure).
2. **Charts are controls.** Tapping a bar or day opens its detail where you tapped (08/10/2026: the Spending category list expands in place; it never silently filters another card). Any filter that is applied shows as a dismissible chip on the list it filters.
3. **Insights live where the data is.** One insight at a time at the top ("1 of n"), and each insight also appears as a chip on the category/loan/factor it concerns. No full-height insight rails.
4. **Every tap goes somewhere.** No dead ends. Detail opens in a bottom sheet (mobile) / right drawer (desktop) with: what's happening → what it would change → a choice (including "Not relevant to me").
5. **Transactions are the ground truth.** A searchable feed is always reachable; any transaction can be recategorised and totals update everywhere, with a toast.
6. **Direct feedback.** Every action confirms (toast, subtle motion). Optimistic UI with skeletons, never spinners for content.
7. **Pay-cycle time.** Period chips: This pay cycle · Last pay cycle · 3 months · 12 months. The default is always the current pay cycle.
8. **Calm motion.** 150–320 ms, ease-out, sheets slide from the bottom; shared-element transition from a list row to its sheet header where cheap. Reduced motion = instant.
9. **No gamification.** No streaks, badges, confetti, leaderboards, percentiles.

## Component behaviours

| Component | Behaviour |
|---|---|
| **PayCycleHero** | Spent · paid in (income only; pay advances listed separately) · left after bills (= available balance − bills due before payday; may be negative → "About $x short before payday") · days to payday; track with spent (solid) and due-before-payday (hatched); upcoming bills list (max 3, "See all" → calendar) |
| **ScoreRing** | Sizes: hero (reveal, score page), medium (dashboard), small (header). Shows progress to next stage boundary; number inside; stage label below. Null/override state = dashed neutral ring + message |
| **FactorTile** | Name, x/10, one-line reason, mini bar; tap → factor sheet. Null = "Not enough history yet" |
| **InsightCard** | Eyebrow "Worth knowing", title, one-line summary, pager, "See details →"; opens InsightSheet |
| **InsightSheet** | Blocks: What's happening · What it would change (impact tiles) · optional "If you want them" (support) · actions (primary, "Not relevant to me", Close) |
| **CategoryRow** | Icon in category colour, name, type tag (lifestyle), amount, change vs last period, 6-cycle sparkline, budget bar + note; expands to merchants; insight chip if relevant |
| **MerchantSheet** | Transactions for the merchant in the period, each with a category select (recategorise) |
| **TransactionRow** | Icon, merchant, category, amount; pending state (italic + "Pending"); tap → TransactionSheet |
| **Category list** *(replaced the donut on Spending, 08/10/2026)* | Ranked, bars scaled to the largest category, change vs the previous period, top 5 + "Show N more", rows expand in place |
| **SegmentedControl** | All / Essentials / Lifestyle; Overview / Categories / Budgets |
| **CalendarCell** | Day, solid dots (confirmed), outlined dots (predicted), payday marker, neutral balance bar (hatched below $0) |
| **LoanCard** | Provider, type in plain words, estimated balance, repayment + cadence, next due; expands |
| **OfferCard** | Lender, amount, term, comparison rate, fees, repayment per pay cycle, total cost, "Why you matched"; equal visual weight across offers; no urgency |
| **RecommendationCard** | Title, why, impact (dollars; score only if flag on), one action, "Not relevant to me" |
| **Sheet** | Drag handle, scrim tap/escape closes, focus trapped and restored, max-height 85%, scroll inside |
| **EmptyState** | Six variants (see copy doc): no bank data, no offers, no transactions in range, no subscriptions, no recommendations, search empty |
| **Skeleton** | Matches final layout; shimmer disabled under reduced motion |

## Colour semantics

- Accent: brand primary from Astra tokens.
- Category identity colours: one per category, used on icons, bars and sparklines only. Gambling has its own (orchid) colour, never a warning hue.
- Semantic: `positive`, `caution`, `info`, `neutral`. **No "danger/red" token is used for customer financial states.** A red-family token may exist only for destructive actions (e.g. "Disconnect bank") and form errors.
- Spending increases use `caution` or neutral, never `positive`.
