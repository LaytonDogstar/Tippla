# Astra (ChatGPT) prompt set — Tippla design elements

**How to use:** run these in one ChatGPT conversation, in order. Paste Prompt 0 first and keep it in the thread. After each prompt, review before moving on; Prompt 2 is the decision gate (pick a direction). Save outputs into `design/` using the filenames each prompt asks for, then hand the folder to Claude Code.

**Why the output format matters:** Claude Code builds from **tokens, SVGs and written specs**, not from pictures. Images are visual reference only. Every prompt therefore asks for machine-readable output in code blocks alongside any mock-ups.

---

## Prompt 0 — Context (paste once, first)

```
You are the lead visual designer for Tippla, an Australian financial-health subscription app. I'll run a sequence of prompts; keep this context for all of them. A developer (Claude Code) will build the app from what you deliver, so precision beats flourish.

WHAT TIPPLA IS
Tippla is for Australians who have just been declined for a small loan (by Friendly Finance). They connect their bank (via TaleFin), get a SmartScore (0–1,000) with nine factors, see where their money goes across their fortnightly pay cycle, and get specific steps to become credit-ready. Later, partner lenders can make offers. The customer must feel helped, not sold to. Pricing: Standard $1.99/month, Pro $4.99/month.

WHO USES IT
25–45, household income $40k–$80k, often shift work, usually paid fortnightly, some on Centrelink. Has at least one small loan, some Afterpay/Zip, just declined for $2–3k. On a phone, often late at night, often right after a money event. Arrives frustrated, embarrassed or resigned, and sceptical.

THE CREATIVE JOB
Make people who feel like they're losing see themselves as people getting things back on track. The customer should close the app feeling more in control than when they opened it.

TIGHTROPES (aim for the middle)
Clinical ↔ saccharine → warm, factual, dignified
Doom ↔ cheerful denial → acknowledge difficulty without dwelling
Pushing offers ↔ anti-credit moralising → offers as the customer's choice
Fragile ↔ a problem → a capable adult in a difficult moment
Luxury ↔ cheap → trustworthy and crafted, not aspirational about money

HARD RULES
- Mobile first: design at 390×844. Bottom tab bar (Home, Score, Spending, Loans, Support). Bottom sheets for detail. 44 px tap targets.
- A low score must not feel like punishment: no red, no warning colours for low scores. The score uses a single-hue progression across four stages: Building, Steadying, Healthy, Thriving. The path to the next stage is the dominant visual, not the number.
- No red for customer financial states at all (red only for destructive buttons and form errors). Spending going up is never styled as success green.
- No confetti, badges, streaks, leaderboards or percentile rankings.
- Gambling is shown as an ordinary spending category with a neutral slate colour and a neutral icon (stacked layers). Never highlighted, never a warning icon, never a slot machine or dice.
- Centrelink income is styled exactly like wages.
- Australian English, AUD with $, dates DD/MM/YYYY.
- Light AND dark mode, both production grade, WCAG 2.2 AA contrast.
- Avoid: payday-lender look (red/yellow urgency, approval stamps), corporate bank (navy/gold, handshake photos), crypto (neon, glassmorphism, dark-by-default), wellness cuddliness (pastel yoga, squiggles), default fintech green, generic SaaS admin dashboards.
- References worth studying for feel: Monzo (warmth with credibility), Up Bank (Australian, friendly not childish), Wise (confident typography, clarity), YNAB (calm, respects intelligence), Headspace (dignity with heavy subjects).

WHAT THE APP FEELS LIKE TO USE
A neo-bank app, not a report: summary first, detail one tap down; charts are controls (tap a slice to filter); one insight at a time, attached to the thing it's about; every tap goes somewhere; transactions are searchable and fixable.

OUTPUT DISCIPLINE (every prompt)
- Always put machine-readable output (JSON, SVG, tables) in code blocks.
- Use only fonts available on Google Fonts, with a system fallback.
- Use the sample data I give you verbatim; never invent different numbers.
- When you generate images, say which frame and theme each one is.

Reply "Ready" and a two-line summary of the brief in your own words.
```

---

## Prompt 1 — Three visual directions

```
Create three genuinely different visual directions for Tippla. For each direction give:

1. Name and a one-sentence idea.
2. Why it fits this customer, and its main risk.
3. Palette: accent, 2 supporting colours, neutrals, with hex for light and dark.
4. Type pairing (Google Fonts): display + body, with why.
5. Shape language: corner radius, card vs no-card, density.
6. How the SmartScore visual works in this direction (describe the component).
7. One mobile mock-up image (390×844, light mode) of the SmartScore reveal screen using this data:
   - Name: Jess. SmartScore 472, stage Steadying (Steadying = 450–599, next stage Healthy at 600, 128 points to go).
   - Headline: "Your SmartScore is 472."
   - Line: "That puts you in the Steadying stage. Here's what's shaping it, and the first thing that would move it."
   - Biggest factor with room to move: "Current borrowing · 2.9 / 10 — you have 3 loans open."
   - First action card: "Pay off Nimble ($610 estimated left) before taking new credit."
   - Button: "See your dashboard".

Make the three directions distinct from each other: e.g. one calm/editorial, one confident/single bold colour (not green, not blue), one warm/crafted. Don't give me three variations of the same purple SaaS look.
```

---

## Prompt 2 — Develop the chosen direction (decision gate)

*(Fill in your choice and any tweaks.)*

```
We're going with Direction [X], with these changes: [your notes].

Now produce two more mock-ups in this direction, mobile 390×844, to test it on harder screens:

A) Dashboard for Jess, light mode, top to bottom:
   - Caution banner (not red): "About $53 short before payday. Options if money's tight →"
   - SmartScore card: 472, Steadying, "Down 17 since 11/09" (neutral styling), link "See what's shaping it".
   - "Next thing to do" card: "Pay off Nimble before taking new credit" — "It's the quickest way to lift Current borrowing." Button "See how".
   - Pay cycle card: "Pay cycle 17/09 – 30/09 · 5 days to payday", "$1,832 spent", "$2,483 paid in (plus a $300 pay advance, due back 30/09)", "$367 due before payday: Telstra $52 (26/09), Beforepay $315 (30/09)".
   - Next bill: "Fri 26/09 · Telstra · $52 · predicted".
   - Six-month spending bars (Apr–Sep): $4,529 · $6,361 · $4,989 · $5,385 · $5,257 · $4,821 (Sep to 25/09).
   - Bottom tab bar.

B) The same dashboard in dark mode.

Then list any changes to the direction the harder screens forced.
```

---

## Prompt 3 — Design tokens (the most important deliverable)

```
Turn the chosen direction into design tokens. Return ONE JSON code block that follows EXACTLY this schema (same keys, same nesting; replace values only). Save as design/tokens.json.

[PASTE THE FULL CONTENTS OF design/tokens.template.json HERE]

Rules:
- Every colour in both light and dark.
- stage colours: single-hue progression, never red→green.
- category colours: 16 distinct identity colours; gambling must be a neutral slate/grey.
- No "danger" colour for financial states; "destructive" is for delete/disconnect buttons only.
- After the JSON, give a contrast table (Markdown) for every text/background pair you expect to be used: text on bg, textMuted on surface, onAccent on accent, positive/caution/info on their soft backgrounds, category colours as icon fills on surface2. Show ratio and AA pass/fail. Fix any fails before you answer.
```

---

## Prompt 4 — Logo, app icon, wordmark

```
Design the Tippla wordmark and app icon in the chosen direction. Deliver:
1. An image showing wordmark, icon, and both on light and dark.
2. SVG code (single code block each): tippla-wordmark.svg, tippla-icon.svg (1024×1024 artboard, safe for iOS/Android masks), tippla-icon-mono.svg.
SVG rules: viewBox set, no embedded raster, no external fonts (convert text to paths or build letterforms from shapes), fills use currentColor where sensible. Keep paths simple. It must not look like a bank, a lender, or a crypto token.
```

---

## Prompt 5 — Icon set

```
Use Lucide icons (lucide.dev) for UI icons to keep consistency. Give me a table (Markdown) mapping each need to a Lucide icon name:
UI: home, score, spending, loans, support, notifications, search, filter, sort, chevron, close, info, calendar, settings, account, bank, lock, eye, edit, check, plus, external link.
Categories (must be neutral and non-judgemental): housing, groceries, food & dining, transport, bills & utilities, subscriptions, entertainment, alcohol, gambling (use a stacked-layers style icon, never dice or slot machine), health, shopping, loan repayments, buy now pay later, pay advances, cash withdrawals, bank fees, income, Centrelink (same visual weight as income).
Where Lucide has no good fit, supply a custom SVG in the same 24×24, 2px stroke, round-cap style, in a code block. Save as design/icons.md (+ design/icons/*.svg).
```

---

## Prompt 6 — Component sheet

```
Produce component specs for Claude Code. For EACH component below give: (a) an image showing all states in light and dark, and (b) a Markdown spec table: anatomy, sizes, padding/gaps (use token names from tokens.json, e.g. space[4], radius.md), typography token per text element, colour token per element per state, interaction notes.

Components:
1. ScoreRing — sizes hero/medium/small; states: normal, loading, null ("Not enough history yet"), override (no score).
2. StageScale — Building / Steadying / Healthy / Thriving with the current position and next-stage distance.
3. FactorTile — normal, strongest factor, null.
4. PayCycleHero — normal (money left) and short-before-payday (caution) states.
5. InsightCard with pager ("1 of 3") and InsightSheet (blocks: What's happening · What it would change · If you want them · actions incl. "Not relevant to me").
6. CategoryRow — collapsed, expanded (merchants), with budget bar, with insight chip, lifestyle tag.
7. Donut — default and one slice selected (others dimmed), centre label.
8. TransactionRow — posted, pending, recategorised.
9. BottomSheet — with drag handle, scrim; desktop drawer equivalent.
10. SegmentedControl, Chip (period chips), FilterChip (dismissible).
11. CalendarCell — confirmed spend dots, predicted bill (outlined), payday marker, balance below $0 (hatched neutral, not red).
12. LoanCard — collapsed/expanded, "estimated" labels.
13. OfferCard — objective, comparable: lender, amount, term, comparison rate, fees, repayment per fortnight, total cost, "Why you matched". No urgency devices.
14. RecommendationCard.
15. Buttons (primary, secondary, tertiary, destructive; sizes; hover/focus/disabled/loading), text input, currency input, checkbox, toggle, radio.
16. Toast, inline alert (info, caution), EmptyState (6 variants: no bank data, no offers, no transactions in range, no subscriptions, no recommendations, no search results), Skeleton.
17. Bottom tab bar and desktop sidebar (Hardship support always visible).

Save specs as design/components.md and images in design/components/.
```

---

## Prompt 7 — Hero screens

```
Using the tokens and components, produce these mobile screens (390×844), each in light and dark. Use the data exactly as given. Save as design/screens/<name>-<theme>.png and describe any new patterns in design/screens.md.

1. score-reveal (Jess): see Prompt 1 data.
2. score-reveal-thinfile (Priya): no number. "We need a bit more history to work out your SmartScore — usually 90 days. We'll calculate it automatically." Then "What we can already see": pay cycle 24/09 – 07/10, pay of about $1,960 every second Thursday, 45 days of history so far.
3. dashboard (Jess): see Prompt 2 data.
4. smartscore (Jess): ScoreRing 472 Steadying; trend 521 → 515 → 506 → 498 → 489 → 472 (fortnightly, last 11/09 → 25/09); top three factors: Current borrowing 2.9, Gambling & alcohol spending 3.2, Money left over 3.4; other factors: Payments on time 5.6, Spending mix 5.0, Cash use 6.1, Payment track record 6.8, Income stability 7.4. Show one specific strength as a fact: "Income stability is your strongest factor at 7.4."
5. spending-overview (Jess): period chips; pay cycle hero; insight card "1 of 3": "How gambling affects your SmartScore — Lenders look at gambling transactions when they review bank statements." Donut + category rows for this pay cycle: Rent & housing $820 · Loan repayments $290 · Gambling $200 · Transport $115 · Food & dining $112 · Groceries $82 · Bills & utilities $82 · Cash withdrawals $59 · Buy now, pay later $45 · Shopping $21. Gambling row looks like every other row.
6. spending-sheet (Jess): the gambling InsightSheet open over the spending screen. Copy: "Lenders look at gambling transactions when they review bank statements. Over the last 90 days, gambling deposits averaged 16.5% of your income. Your Gambling & alcohol spending factor is 3.2 / 10." Block "If you want them": "Tools some people find useful: a gambling block on your bank card, BetStop (the national self-exclusion register), and free, confidential support through Gambling Help Online." Actions: "See how your score is worked out", "View support options", "Not now".
7. loans (Jess): Overview tab. Nimble (small loan) ~$610 left, $96 per fortnight; Cash Train (small loan) ~$450 left, $74 per fortnight; Right Road Finance (medium loan) ~$2,140 left, $120 per fortnight; Afterpay $45 per fortnight; Zip Pay $40 per month; Beforepay pay advance $300, due back 30/09. All balances labelled "estimated from your transactions". Debt repayments are about 21% of income.
8. offers (Marcus): one offer — Harbour Lending (sample): $2,000 over 52 weeks, comparison rate 21.9%, $150 establishment fee, $88.46 per fortnight, $2,300 total repayable. Why you matched: income steady for 6 months; no failed payments in 90 days; one fewer open loan than 3 months ago. Buttons "View details", "Not interested". Calm, comparable, no countdown.
9. hardship: "If money's tight right now, these are real options." Cards: ask your lender for a hardship arrangement (with a message template), free financial counselling through the National Debt Helpline, pause or downgrade Tippla, gambling support options. Should feel like relief, not a back office.
10. calendar (Jess): fortnight view 17/09 – 30/09, payday Thu 17/09 and next Thu 01/10 marked, predicted bills Fri 26/09 Telstra $52 and Tue 30/09 Beforepay $315 (outlined dots), days below $0 shown with a neutral hatched balance bar.
```

---

## Prompt 8 — Empty states, illustration and motion

```
1. Decide whether Tippla uses illustration at all. If yes, define a restrained style (no wellness squiggles, no people-shaking-hands) and draw the six empty states as simple SVGs (code blocks, 160×120 viewBox, using currentColor + at most one token colour). If no, show typographic empty states instead.
2. Motion notes (Markdown table): sheet open/close, tab change, donut selection, list expand, number change on score refresh, toast. Give duration (use motion tokens), easing, and the reduced-motion alternative for each.
3. One "delight" moment: where (if anywhere) should the customer feel actively good? Propose one, restrained, that fits someone in financial difficulty (for example, the first refresh where a loan disappears). Describe it and its reduced-motion version.
Save as design/illustration-and-motion.md and design/empty-states/*.svg.
```

---

## Prompt 9 — Handoff check

```
Give me a handoff manifest (Markdown) listing every file you produced with its path under design/ and what it's for. Then self-review against the hard rules in Prompt 0 and list anything that breaks them (red used for money states, rankings, green for spending increases, gambling highlighted, US spelling, contrast fails, missing dark variants). Fix anything you find and re-output only the corrected files.
```

---

## Expected `design/` folder after Astra

```
design/
  tokens.json                 ← Prompt 3 (required)
  logo/tippla-wordmark.svg, tippla-icon.svg, tippla-icon-mono.svg
  icons.md, icons/*.svg
  components.md, components/*.png
  screens.md, screens/*-light.png, screens/*-dark.png
  illustration-and-motion.md, empty-states/*.svg
  MANIFEST.md                 ← Prompt 9
```
