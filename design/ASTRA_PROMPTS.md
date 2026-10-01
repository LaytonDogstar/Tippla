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
   - First action card: "Skip the next pay advance if you can" — "You've taken a $300 Beforepay advance every fortnight since 27/08. Each costs $15 and comes out the day before payday."
   - Ring note: the ring shows progress from 450 to 600, so at 472 it is only about 15% filled. Design for that: this near-empty ring is the most common case, and it must still read as "on the path", not "failing".
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
   - Data as of Fri 25/09. "Updated Fri 25/09, 9:14am".
   - Gentle hardship banner (not red, not an alert): "Money tight right now? There are options →" (opens Hardship support).
   - SmartScore card: 472, Steadying, "Down 17 since 11/09" (neutral styling), link "See what's shaping it".
   - "Next thing to do" card: "Skip the next pay advance if you can" — "Fewer pay advances is one of the ways to lift Current borrowing." Button "See how".
   - Pay cycle card, in its short-before-payday (caution, not red) state:
     - Headline: "About $53 short before payday" (balance $314 − $367 due before payday).
     - "Pay cycle 17/09 – 30/09 · 6 days to payday (Thu 01/10)".
     - "$1,832 spent" · "$2,483 paid in" (wages only) · "Plus a $300 pay advance (not income): $315 due back 30/09 ($300 + $15 fee)".
     - "$367 due before payday: Telstra $52 (Sat 26/09), Beforepay $315 (Wed 30/09)".
     - Two links: "See what's due" (calendar) and "Options if money's tight" (hardship).
   - Next bill: "Sat 26/09 · Telstra · $52 · predicted".
   - Six-month spending bars (Apr–Sep): $4,529 · $6,361 · $4,989 · $5,385 · $5,257 · $4,821 (Sep to 25/09).
   - Bottom tab bar.

B) The same dashboard in dark mode.

Then list any changes to the direction the harder screens forced.
```

---

## Prompt 3 — Design tokens (the most important deliverable)

```
Turn the chosen direction into design tokens. Return ONE JSON code block that follows EXACTLY this schema (same keys, same nesting; replace values only). Save as design/tokens.json.

The values in the template are neutral placeholders (they happen to be purple). They are NOT a direction: replace every value with the chosen direction's, including the stage colours.

[PASTE THE FULL CONTENTS OF design/tokens.template.json HERE]

Rules:
- Every colour in both light and dark.
- stage colours: single-hue progression, never red→green. Every stage colour, including Building and Steadying, must reach at least 3:1 against surface and surface2 (it's a graphic, WCAG 1.4.11). Jess is in Steadying, so the second stage cannot be a pale tint.
- category colours: 19 identity colours (16 spending, income, centrelink, uncategorised); gambling must be a neutral slate/grey. Income and centrelink must look like equals (same lightness and saturation, different hue is fine).
- The neutral-family categories (loan_repayment, gambling, fees, bnpl, wage_advance, cash) can stay muted, but must be distinguishable from each other next to each other in a donut. Jess's donut puts loan repayments, gambling and BNPL side by side.
- Every category colour must reach 3:1 as an icon fill on surface2 in both themes.
- chart tokens: ringTrack (empty part of the score ring), hatch (below-$0 balance pattern colour), predicted (outline for predicted bills), below-zero must stay neutral.
- No "danger" colour for financial states; "destructive" is for delete/disconnect buttons only.
- After the JSON, give a contrast table (Markdown) for every text/background pair you expect to be used: text on bg, textMuted on surface, onAccent on accent, positive/caution/info on their soft backgrounds, category colours as icon fills on surface2, stage colours on surface and surface2. Show ratio and AA pass/fail. Fix any fails before you answer.
```

*Don't rely on Astra's contrast table: model-computed ratios are often wrong. Claude Code re-checks `tokens.json` with a script before building.*

---

## Prompt 4 — Logo, app icon, wordmark

```
Design the Tippla wordmark and app icon in the chosen direction. Deliver:
1. An image showing wordmark, icon, and both on light and dark.
2. SVG code (single code block each): tippla-wordmark.svg, tippla-icon.svg (1024×1024 artboard, safe for iOS/Android masks), tippla-icon-mono.svg.
SVG rules: viewBox set, no embedded raster, no external fonts (convert text to paths or build letterforms from shapes), fills use currentColor where sensible. Keep paths simple. It must not look like a bank, a lender, or a crypto token.
3. Name the Google Font (and weight) the wordmark is based on, and any letter modifications, so the wordmark can be rebuilt precisely in Figma or Inkscape if the SVG letterforms come out rough.
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

*Too big for one reply. Paste the prompt with the full list once, then ask for the components in batches: "Do 1–4 now", then 5–8, 9–12, 13–17. Every third batch or so, re-paste the HARD RULES from Prompt 0 — long threads drift.*

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
11. CalendarCell — confirmed spend dots, predicted bill (outlined), payday marker, confirmed balance below $0 (hatched neutral, not red), predicted balance below $0 (hatched neutral, outlined/lighter to show it's a forecast), "next payday" edge marker when payday falls just outside the visible range.
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

*Run in batches of two or three screens per reply (e.g. 1–3, 4–6, 7–9, 10–12, 13–14), and re-paste the HARD RULES from Prompt 0 every couple of batches. Image generators garble small text and numbers: treat the PNGs as visual reference and check every figure against this prompt. If Astra can, also ask for each screen as a single self-contained HTML file using the tokens (`design/screens/<name>.html`) — text stays exact and Claude Code can build straight from it.*

```
Using the tokens and components, produce these mobile screens (390×844), each in light and dark, unless the item says otherwise. Use the data exactly as given. Save as design/screens/<name>-<theme>.png and describe any new patterns in design/screens.md. All data is as of Fri 25/09/2026.

1. score-reveal (Jess): see Prompt 1 data.
2. score-reveal-thinfile (Priya): no number. "We need a bit more history to work out your SmartScore — usually 90 days. We'll calculate it automatically." "We expect to have enough history around 10/11/2026." Then "What we can already see": pay cycle 24/09 – 07/10, pay of about $1,960 every second Thursday, 45 days of history so far.
3. dashboard (Jess): see Prompt 2 data.
4. dashboard-improving (Marcus): no banner except "You have 1 new offer →" (he has lender matching on). SmartScore card: 612, Healthy (600–749), "Up 11 since 11/09" (neutral styling — the same treatment as Jess's drop, not celebratory), next stage Thriving at 750, 138 points to go. "Next thing to do": "Money left over is your lowest factor at 5.9" — "Keeping more of each pay left after bills is one of the ways to lift it." Button "See how". Pay cycle card: "Pay cycle 23/09 – 06/10 · 12 days to payday (Wed 07/10)", "$301 spent", "$1,747 paid in" (Centrelink $412 on Wed 23/09 and wages $1,335 on Thu 24/09 — shown as two equal income lines, same styling), "$663 due before payday: Qld Housing Rent $560 (Sat 26/09), Telstra $52 (Sat 26/09), Afterpay $32 (Thu 01/10), Netflix $18.99 (Tue 06/10)", "About $1,700 left after bills". Next bill: "Sat 26/09 · Qld Housing Rent · $560 · predicted". Six-month spending bars (Apr–Sep): $3,526 · $3,094 · $3,373 · $3,979 · $4,433 · $2,249 (Sep to 25/09). Spending going up (Jul, Aug) must not be green.
5. smartscore (Jess): ScoreRing 472 Steadying; trend 521 → 515 → 506 → 498 → 489 → 472 (fortnightly, 17/07 → 25/09); top three factors: Current borrowing 2.9, Gambling & alcohol spending 3.2, Money left over 3.4; other factors: Payments on time 5.6, Spending mix 5.0, Cash use 6.1, Payment track record 6.8, Income stability 7.4. Show one specific strength as a fact: "Income stability is your strongest factor at 7.4."
6. factor-sheet (Jess): Current borrowing factor detail as a bottom sheet over the SmartScore screen. "Current borrowing · 2.9 / 10". What it measures: "How many loans and credit products you have, and what kind." What's driving it: "2 small loans open (Nimble, Cash Train), about $1,060 left in total, estimated" · "1 medium loan open (Right Road Finance), about $2,140 left, estimated" · "A Beforepay pay advance every fortnight since 27/08". What lifts it: "Fewer open loans — paying one off, or not taking a new one." Related: "Skip the next pay advance if you can". "Updated Fri 25/09, 9:14am".
7. spending-overview (Jess): period chips; pay cycle hero; insight card "1 of 3": "How gambling affects your SmartScore — Lenders look at gambling transactions when they review bank statements." Donut + category rows for this pay cycle (rows are rounded; the total is $1,832): Rent & housing $820 · Loan repayments $290 · Gambling $200 · Transport $115 · Food & dining $112 · Bills & utilities $82 · Groceries $82 · Cash withdrawals $59 · Buy now, pay later $45 · Shopping $21 · Subscriptions $4. Gambling row looks like every other row.
8. spending-sheet (Jess): the gambling InsightSheet open over the spending screen. Copy: "Lenders look at gambling transactions when they review bank statements. Over the last 90 days, gambling deposits averaged 16.5% of your income. Your Gambling & alcohol spending factor is 3.2 / 10." Block "If you want them": "Tools some people find useful: a gambling block on your bank card, BetStop (the national self-exclusion register), and free, confidential support through Gambling Help Online." Actions: "See how your score is worked out", "View support options", "Not now".
9. loans (Jess): Overview tab. Nimble (small loan) ~$610 left, $96 per fortnight; Cash Train (small loan) ~$450 left, $74 per fortnight; Right Road Finance (medium loan) ~$2,140 left, $120 per fortnight; Afterpay $45 per fortnight; Zip Pay $40 per month; Beforepay pay advance: $300 received 24/09, $315 due back Wed 30/09 ($300 + $15 fee). All balances labelled "estimated from your transactions". Debt repayments are about 21% of income.
10. offers (Marcus): one offer — Harbour Lending (sample): $2,500 over 78 weeks, comparison rate 21.9%, $150 establishment fee (included in the repayments), $75.47 per fortnight, $2,943.33 total repayable. Why you matched: income steady for 6 months; no failed payments in 90 days; one fewer open loan than 3 months ago. Buttons "View details", "Not interested". Calm, comparable, no countdown.
11. hardship: "If money's tight right now, these are real options." Cards: ask your lender for a hardship arrangement (with a message template), free financial counselling through the National Debt Helpline, pause or downgrade Tippla, gambling support options. Should feel like relief, not a back office.
12. calendar (Jess): fortnight view Thu 17/09 – Wed 30/09 (two rows of seven, Thu–Wed). Payday marker on Thu 17/09; "Next payday Thu 01/10" as an edge marker just after the last cell. Today is Fri 25/09: days before it show confirmed spend (solid dots), days after it show predicted bills only (outlined dots): Sat 26/09 Telstra $52, Wed 30/09 Beforepay $315. End-of-day balance bars: 25/09 $314; predicted 26/09–29/09 $262; predicted 30/09 −$53 — the only below-$0 day, shown with the neutral hatched bar in its "predicted" style. No confirmed day in this fortnight is below $0.
13. consents (onboarding): three separate, unticked checkboxes, each with a two-line plain explanation and a "What this means" expander: (1) "Share my Friendly Finance application with Tippla" — Required. (2) "Let Tippla read my bank data through TaleFin" — Required. (3) "Let Tippla show my profile to partner lenders when I might qualify" — "Optional. Tippla works fully without this. You can turn it on or off any time." Continue button, disabled until 1 and 2 are ticked. The optional consent must look genuinely optional: same weight as the others, not pre-selected, no persuasion copy. Light mode only is fine.
14. dashboard-desktop (Jess): the Prompt 2 dashboard at 1440×900, light mode only. Left sidebar (260 px) grouped: Home · Score (SmartScore, Ways to lift your score) · Spending (Spending, Calendar, Subscriptions) · Loans (Loans & credit, Offers) · Support (Hardship support, Help). "Hardship support" visible without scrolling. Sheets become right-side drawers (420 px).
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
Give me a handoff manifest (Markdown) listing every file you produced with its path under design/ and what it's for. Then self-review against the hard rules in Prompt 0 and list anything that breaks them (red used for money states, rankings, green for spending increases, gambling highlighted, US spelling, contrast fails, missing dark variants, any figure, date or weekday that differs from the data in Prompts 1, 2 and 7). Fix anything you find and re-output only the corrected files.
```

---

## Prompt 10 — Corrections after the first handoff (01/10/2026)

```
Thanks — the handoff is strong and the tokens pass our automated checks. Please make these corrections, then re-output only the changed files and add them to MANIFEST.md.

1. MARCUS DASHBOARD USES OLD DATA. Screens 04 (dashboard-improving, -pay-cycle, -due, light and dark) and screens.md use the earlier pay cycle. The current data is:
   - "Pay cycle 23/09 – 06/10 · 12 days to payday (Wed 07/10)"
   - "$301 spent" · "$1,747 paid in"
   - Paid in is two equal income lines, identical styling: "Centrelink $412 · Wed 23/09" and "Southside Logistics $1,335 · Thu 24/09"
   - "$663 due before payday": Qld Housing Rent $560 (Sat 26/09), Telstra $52 (Sat 26/09), Afterpay $32 (Thu 01/10), Netflix $18.99 (Tue 06/10) — unchanged
   - "About $1,700 left after bills" — unchanged. His balance is $2,363 if you need it ($2,363 − $663 = $1,700).
   - Coming in next: "Centrelink $412 · Wed 07/10" and "Southside Logistics about $1,350 · Thu 08/10"

2. JESS'S PAID IN DOES NOT INCLUDE THE ADVANCE. My wording "Includes a $300 pay advance" was ambiguous — sorry. $2,483 is wages only. The $300 Beforepay advance is separate and is not income. Replace the line everywhere (dashboard pay-cycle continuation, due sheet, loans notes, screens.md fixtures) with:
   "Plus a $300 pay advance (not income): $315 due back 30/09 ($300 + $15 fee)"
   Remove the note that the 21% debt figure is "not calculated from the $2,483 paid-in total, which includes a pay advance".

3. DARK-MODE HOUSING AND BNPL ARE ALMOST IDENTICAL (#91ACFF vs #8AAAFF). Separate them clearly (keep 3:1 on surface and surface2). Our checker also notes these are close but acceptable: transport/income, entertainment/centrelink, gambling/uncategorised.

4. THE NINTH FACTOR IS INTENTIONALLY HIDDEN. Jess has nine factors; the ninth (government payments in income) is never shown as a tile or scored item, so customers on Centrelink are never told to "improve" it. Showing eight is correct. Please change the manifest note from "missing source data" to "by design", and add one line under "How your score works": "Your score also looks at the mix of wages and government payments in your income."

5. COMPARISON RATE IS VERIFIED. 21.9% p.a. matches the repayment schedule ($2,500, 39 fortnightly repayments of $75.47). Show it as "21.9% p.a. comparison rate"; drop the caveat. Label the $443.33 line "Total cost of borrowing $443 (includes the $150 fee)".

6. GAMBLING SHEET "WHAT IT WOULD CHANGE". There is copy for this block: "Keeping gambling lower over the next 90 days is one of the ways to lift this factor." Please add it to screen 08 (light and dark).
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
