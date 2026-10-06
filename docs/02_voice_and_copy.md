# 02 · Voice and copy

All strings live in `src/content/` (en-AU). Components never contain literal copy.

## Voice

A friend who knows finance, talking to a capable adult. Plain words, short sentences, specific numbers. State the fact, then why it matters, then one optional action.

**Pattern for any insight:** *What's happening* (fact + number + period) → *Why it matters* (usually: how lenders see it, or what it does to the pay cycle) → *What it would change* (dollars and/or score points) → *A choice* (act / adjust / "Not relevant to me").

## Rules

1. Australian English. Dates DD/MM/YYYY, or "Thu 01/10" in compact UI. Currency `$1,234.56`; whole dollars in headlines (`$1,235`), cents in transaction lists.
2. Always name the period ("this pay cycle", "last 90 days"). Never a bare number.
3. Positive only when earned and specific ("Payments on time is your strongest factor"). Never generic praise.
4. No imperatives about lifestyle ("cook more", "use public transport", "meal prep"). Offer the number and let them decide.
5. Support is offered, never prescribed. "If you'd like…", "Options include…".
6. Up is not automatically good. Spending up is neutral-to-caution styling, never success green.
7. Every CTA says exactly what happens ("Adjust my food budget", not "Take action").
8. Errors: what happened + what to do. No apologies, no blame.
9. Estimates are labelled ("about", "estimated") — especially loan balances (TaleFin estimates them).

## Banned (enforced by `tests/content.banned.test.ts`)

Case-insensitive; fail the build if any appears in `src/content/`:

```
significant concern, areas of concern, safe levels, escalating, red flag, warning:, critical,
top performers, top savers, your ranking, you rank, percentile, better than %, worse than,
nice work, great job, well done, congratulations, you're on the right track, keep it up,
avoid gambling, knowing the pattern, first step, addiction, problem gambling,
cook more, meal prep, try cooking, use public transport, cut back on,
customize, color, behavior, organization, prioritize, recognize,
reduce gambling to $0, unbudgeted, biggest gap, worth a closer look,
act now, limited time, hurry, don't miss out, pre-approved, guaranteed approval
```

(`critical`/`warning` may appear in code identifiers, not in content strings.)

## Replacements for copy found in the current Figma designs

| Current design copy | Replace with |
|---|---|
| "You spend more on gambling than 98% of your peers. This is a significant concern." | Remove. Gambling is never in peer comparisons. |
| "Gambling Impact — Significantly above safe levels" | "Gambling & alcohol spending · 3.2 / 10 — this is one of the factors lowering your score." |
| "140% increase over 6 months — escalating pattern" | "Up from $260 in April to $845 in August." (compare full calendar months; the current month is partial) |
| "Knowing the pattern is the first step — you can set a limit or find support whenever you're ready." | Use the gambling insight template below. |
| "37% Gambling + entertainment — Worth a closer look" | Separate categories. No nudge label. |
| "Set a gambling limit — $1,923 unbudgeted gambling is your biggest gap" | Only offer actions Tippla can actually perform; link to real tools instead. |
| "Avoid Gambling — 94% of top savers spend $0" / "Reduce gambling to $0" | Remove. |
| "Consider meal prep to reduce costs" / "try cooking 2 more meals/week" / "Public transport for half of these…" | "$342 on Uber Eats this pay cycle, 11 orders." + budget option. |
| "Great use of alternatives!" / "Nice work!" / "You're on the right track!" | Remove, or a specific fact: "Groceries: $38 under the budget you set." |
| "See how you compare to people like you — and learn from top performers" | "How your spending compares with people in a similar situation (age, income, region)." |
| "Your Rankings" tab | Remove. |
| "DTI Ration" | "Debt-to-income" |
| "Based on your credit report accounts" (income/debt) | "From your connected bank account, last 90 days" |
| "Customize" | "Customise" |
| "0 · Needs Work" chip | Remove; use the stage scale. |

## Gambling insight template (decided: credit-context wording + optional support)

Title: **How gambling affects your SmartScore**

> Lenders look at gambling transactions when they review bank statements. Over the last 90 days, gambling deposits averaged {pct_income_90}% of your income. {if factor available: "Your Gambling & alcohol spending factor is {adverse_spend}/10."}

Block "What it would change": only show projected score impact if the scoring model provides it (see open question Q3); otherwise show "Keeping gambling lower over the next 90 days is one of the ways to lift this factor."

Block "If you want them":

> Tools some people find useful: a gambling block on your bank card, BetStop (the national self-exclusion register), and free, confidential support through Gambling Help Online.

Actions: "See how your score is worked out" · "View support options" · "Not now".

Rules: gambling uses a **neutral slate category colour**, a neutral stacked-layers icon, never highlighted rows, never warning icons, never in peer comparisons, never "inferred gambling" (AM2015) in the UI. Amounts are **deposits** (gross) — label them "gambling deposits" until TaleFin confirms a net metric (Q5).

## Factor copy

See `05_smartscore.md` for names, one-line explanations, "why it's lower" and "what lifts it" templates.

## Microcopy set (starter)

- Empty — no bank data: "Connect your bank to see your SmartScore. It takes about two minutes and you can disconnect any time."
- Empty — no offers: "No offers right now. Tippla checks for you every time your data refreshes. You don't need to do anything."
- Empty — no transactions in range: "Nothing in this period. Try a longer range."
- Empty — no subscriptions: "We haven't found any regular subscriptions."
- Empty — no recommendations: "Nothing to suggest this pay cycle."
- Empty — search: "No transactions match "{q}"."
- Bank link expired: "Your bank connection has expired, so your numbers stopped updating on {date}. Reconnect to refresh them."
- Analysing (onboarding): "Reading 6 months of transactions" → "Finding your pay cycle" → "Checking loans and repayments" → "Working out your SmartScore".
- Score reveal: "Your SmartScore is {score}. That puts you in the {stage} stage. Here's what's shaping it, and the first thing that would move it."
