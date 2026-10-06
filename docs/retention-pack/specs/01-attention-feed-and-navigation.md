# 01 — Attention Feed, Score Explanations, Navigation and Status Line

Feature flags: `feed_v1`, `score_attribution_v1`, `nav_v2`, `status_line_v1`

## Goal

Members open Tippla and see immediately what needs their attention, ranked, with one action each. They don't have to scroll and analyse every screen.

## 1. "Needs a look" attention feed

### Behaviour

- Sits at the top of Home, above every other widget.
- Shows **at most 3 cards**, ranked. A "See all (n)" link opens the full list.
- Each card has: icon, title (the conclusion), one-line body (the evidence), one primary action, and an overflow menu with **Done**, **Snooze** (until tomorrow / next pay cycle) and **Not relevant**.
- Card states persist per member. Dismissed or "not relevant" cards of the same rule and entity don't come back unless the underlying facts change materially (e.g. the amount changes by more than 20%).
- Empty state: "Nothing needs a look right now. We checked 38 new transactions this morning." This reuses the status line. Never show a blank space.
- Feed items are regenerated on every data refresh and on payday.

### Rules engine

Build a pluggable engine. Each rule is a pure function that takes the member's computed state and returns zero or more items:

```ts
type FeedItem = {
  id: string;               // deterministic: ruleId + entityId + period
  ruleId: string;
  section: 'today' | 'money' | 'score' | 'borrowing' | 'help';
  title: string;            // conclusion, ≤ 60 chars
  body: string;             // evidence, ≤ 120 chars
  action: { label: string; route: string; params?: object };
  urgency: 1 | 2 | 3 | 4 | 5;     // 5 = act today
  amountAtStakeCents: number;     // 0 if not monetary
  expiresAt: string | null;       // ISO
  sensitive: boolean;             // true = never push, never lock screen
};
```

Ranking score = `urgency × 10 + log10(max(amountAtStakeCents/100, 1)) × 5`. Break ties on `expiresAt`, soonest first. Put the weights in config.

### Initial rules

| ruleId | Trigger | Example title | Action | Urgency |
|---|---|---|---|---|
| `bill_exceeds_balance` | Bill due in ≤3 days and forecast balance on the due date < bill amount | "Telstra $52 is due Sat — you'll have $262" (or the shortfall version) | See options | 5 if ≤1 day, else 4 |
| `cycle_shortfall` | Forecast end-of-cycle balance < 0 | "About $53 short before payday" | See options (links to hardship and plan) | 4 |
| `repayment_due` | Loan or advance repayment due in ≤3 days | "Beforepay $315 comes out Wed" | View repayment | 4 |
| `new_subscription` | New recurring merchant detected (≥2 charges at a similar interval) | "New subscription found: Apple iCloud $4.49/mo" | Review | 2 |
| `subscription_price_rise` | Recurring charge up ≥5% or ≥$1 against the prior 2 charges | "Netflix went up $3 a month" | Review | 3 |
| `possible_duplicate` | Same merchant and amount within 48h (excluding known recurring patterns) | "Possible double charge from Woolworths $86.40" | Check it | 3 |
| `unusual_spend` | Category spend in the cycle > 1.5× the 3-cycle median and > $50 over | "Takeaway is $140 higher than usual this cycle" | See spending | 2 |
| `score_changed` | SmartScore moved ≥5 points since last viewed | "Your score dropped 17 — here's why" | See what changed | 3 |
| `bank_reconnect` | Connection unhealthy or consent expiring in ≤14 days (from spec 05) | "Reconnect your bank to keep forecasts accurate" | Reconnect | 4 if broken, 2 if expiring |

Gambling-related items have `sensitive: true`. They can appear in the feed only if the member hasn't hidden gambling insights. Never push them.

**Never generate feed items for lender offers.**

### Hardship pairing

If `cycle_shortfall` or `bill_exceeds_balance` is showing, the card's action sheet always includes "Options if money's tight" linking to `/hardship`.

### Tests

- Each rule: positive, negative and boundary cases.
- Ranking order across mixed items.
- Persistence of dismissal and snooze, and re-surfacing when facts change.
- No offer-derived items can ever be emitted. Add an assertion test.

### Events

`feed_viewed {item_count, rule_ids}`, `feed_item_actioned {rule_id, position}`, `feed_item_done`, `feed_item_snoozed {duration}`, `feed_item_dismissed {reason}`, `feed_see_all_opened`.

## 2. Score change attribution

- On every SmartScore recalculation, store the factor-level deltas and the top contributing transactions or events behind each delta.
- Plain-English explanation, ordered by impact: "Your score dropped 17: a new pay advance (−9), gambling deposits (−6), less money left over (−2)."
- Gambling attribution follows the member's gambling-insight setting. If hidden, use "spending mix and other factors".
- Show on Home (score card) and at the top of `/score`, replacing the bare "Down 17 since 11/09".
- Positive changes are celebrated in the same format: "Up 12 — no new pay advances this cycle (+8)..."

Data: `score_snapshots(member_id, calculated_at, score, band, factors jsonb, deltas jsonb, drivers jsonb)`.

Tests: attribution sums to the total delta (put any rounding remainder into an "other" bucket); drivers are reproducible from transactions.

## 3. Navigation consolidation

Move from 12 sidebar items to 5 sections, keeping Account in the header and profile menu:

| Section | Contains (existing routes) |
|---|---|
| **Today** | `/` (Home: feed, safe to spend, cycle) |
| **Money** | `/spending`, `/calendar`, `/subscriptions` (tabs) |
| **Score** | `/score`, `/savings` (rename "Ways to lift your score" to "Your plan") |
| **Borrowing** | `/loans`, `/offers` |
| **Help** | `/hardship`, `/help` |

- Keep existing URLs working (redirect or nest).
- **Badges:** each section shows the count of open feed items whose `section` matches. Offers never contribute a badge.
- Mobile: bottom tab bar with the 5 sections. Desktop: sidebar with the same 5 groups.
- "Hardship support" stays reachable within 1 tap from every screen, e.g. a persistent help entry.

Events: `nav_section_opened {section, had_badge}`.

## 4. Status line

- A short line on Home under the greeting: "Checked 38 new transactions this morning · 1 thing to look at".
- Variants: "Your bank data is from Tue 22/09 — reconnect to update" (stale, links to spec 05); "All caught up · next payday Thu 01/10".
- Source it from the last refresh timestamp, the count of new transactions since the last refresh, and the open feed count.

## Acceptance criteria

- Jess's Home shows, in order: `bill_exceeds_balance` or `cycle_shortfall`, `repayment_due` (Beforepay $315 Wed 30/09), then `score_changed`. The others sit behind "See all".
- The score card reads "Down 17 — here's why" with attribution.
- Navigation shows 5 sections with correct badges.
- Every interaction persists across reloads.
