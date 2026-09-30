**TIPPLA**

Consumer Portal

*Design Brief*

*Fresh visual exploration for a financial health platform*

*Built on Talefin bank statement data, surfaced to Australian customers*

Prepared by: Layton Brooks

For: Tippla design partner

Date: June 2026

**The brief, at a glance**

*If you only read one page of this brief, this is it.*

|                       |                                                                                                                                                                                                           |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Product**           | Tippla — an Australian financial health subscription platform serving customers who have been declined for a small-amount credit loan.                                                                    |
| **Surface to design** | The consumer portal — the post-activation customer experience. Roughly 14 screens including onboarding, the financial health dashboard, spending insights, loans and credit detail, and supporting flows. |
| **Approach**          | Fresh visual exploration. The existing prototypes are functional reference only — they prove the information architecture works, not the visual direction.                                                |
| **Deliverable**       | Figma file containing all screens + a reusable component library + a documented design system.                                                                                                            |
| **The hard part**     | Designing for people in financial difficulty without being patronising, alarming, or saccharine. This is the most important creative challenge in the brief.                                              |
| **Constraints**       | Information architecture and feature scope are fixed (see Section 7). Brand visual is fully open — palette, typography, tone, illustration style are all yours to explore.                                |

*"Most financial dashboards make winners feel like winners. Tippla needs
to make people who feel like they're losing see themselves as people who
are getting things back on track. That's the creative job."*

**1. What Tippla is**

Tippla is a subscription-based financial health platform aimed at
Australian consumers who have just been declined for a small-amount
credit loan. Its purpose is twofold: help the customer improve their
financial position, and — when their profile improves enough — surface
them to lenders who can offer credit they would have been declined for
the first time around.

Customers arrive via one pathway today: they applied for a loan with
Friendly Finance, were declined, and were shown an interstitial offering
them activation of a Tippla account at low or no cost. The interstitial
converts the decline into an opportunity, not a dead end.

Once activated, the customer connects their bank account via Talefin
(Australia's leading bank statement data aggregator). Tippla then
analyses 139 metrics from their statement data and surfaces a Financial
Health Score (called the SmartScore), nine sub-scores covering different
dimensions of their financial life, spending insights, loan and credit
detail, savings opportunities, and — over time — matched loan offers
from partner lenders.

**1.1 The commercial model**

Tippla earns three ways:

- Monthly subscription — Standard \$1.99/mo, Pro \$4.99/mo.

- CPL (cost-per-lead) — lenders pay to access a matched customer
  profile.

- CPA (cost-per-acquisition) — additional payment when a lender funds a
  loan.

**1.2 The strategic position**

Tippla is not a budgeting app, a credit score app, or a banking app. It
is closest in spirit to a financial coaching service that happens to
have a credit-matching marketplace bolted to it. The customer should
feel they are being helped, not sold to. Lender offers should feel
earned, not pushed.

*Tippla is what Friendly Finance becomes when it stops just saying "no"
and starts saying "not yet — let us help you get to yes."*

**2. Who you're designing for**

Tippla's customer is not the customer most fintech apps are designed
for. Understanding the difference is the foundation of getting this
design right.

**2.1 The customer profile**

|                       |                                                                                                                                                                                                                     |
|-----------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Age**               | 25–45, with a long tail to 55.                                                                                                                                                                                      |
| **Income**            | \$40k–\$80k household income, often with irregular or shift-based earning patterns. Many are paid fortnightly. A meaningful minority receive Centrelink supplements.                                                |
| **Financial context** | Has at least one active loan (often payday or wage-advance), some BNPL exposure, and was just declined for \$2,000–\$3,000 of additional credit. Living close to the line. Not destitute — managing — but stressed. |
| **Device**            | Mobile-first. The portal is most likely opened on a phone, often outside business hours, often after a financial event (pay day, an unexpected bill, a declined transaction).                                       |
| **Tech comfort**      | Comfortable with banking apps, Afterpay, social platforms. Not technical. Reads quickly, scrolls fast, mistrusts walls of text.                                                                                     |
| **Emotional state**   | Arrives at Tippla freshly declined. Carrying some combination of frustration, embarrassment, urgency, and resignation. Often skeptical of yet another financial service.                                            |

**2.2 The customer's emotional journey**

This is the single most important diagram in the brief. Every screen
sits somewhere on this arc, and the design must answer the right
emotional question for the stage the customer is in.

<img src="media/9f0f57dc81cad91eaf59efc0ea679dc1f24e8fb2.png"
style="width:6.25in;height:3.125in" />

*Figure 1 — The emotional journey from decline to validated outcome.*

**2.3 What this customer does NOT want**

- To be congratulated for opening the app. They don't feel like they've
  achieved anything.

- To be told they're doing great when they're not.

- To be told they're doing badly when they already know.

- To be lectured about budgeting, savings, or "making good choices."

- To see confetti, balloons, or any visual celebration that doesn't
  match their mood.

- To be tracked, scored, and ranked against people doing better than
  them.

- To click through a polished marketing surface and find a cold
  dashboard underneath.

**2.4 What this customer DOES want**

- To understand, in plain language, why they were declined.

- To see what specifically would need to change for that decline to
  flip.

- To feel like the platform is on their side, not the lender's.

- To make progress they can see, week to week.

- To be treated like an adult who is in a difficult moment, not a
  problem that needs solving.

- To not feel watched, judged, or filed in a category.

**3. The core design challenge**

If the design only succeeds at one thing, it should be this: the
customer should close the app feeling more in control of their financial
life than when they opened it. Whatever it took to deliver that — the
visual choices, the copy, the data hierarchy, the absence of features as
much as the presence — is the right design.

**3.1 The tightropes**

This design lives between five tensions. Getting any one of them wrong
is enough to lose the customer.

|                              |                              |                                                                     |
|------------------------------|------------------------------|---------------------------------------------------------------------|
| **Pole A (too far)**         | **Pole B (too far)**         | **The middle**                                                      |
| Clinical / cold              | Wellness-app saccharine      | Warm, factual, dignified.                                           |
| Doom-mongering               | Cheerful denial              | Acknowledges difficulty without dwelling.                           |
| Lender's lobby (push offers) | Anti-credit moralising       | Offers presented when appropriate, framed as the customer's choice. |
| Treats customer as fragile   | Treats customer as a problem | Treats customer as a capable adult in a difficult moment.           |
| Premium / aspirational       | Cheap / utilitarian          | Trustworthy and craft-led, without being aspirational about money.  |

**3.2 Specific design problems to solve**

**How do you show a low SmartScore without it feeling like a
punishment?**

The score is the central object in the product. Most customers will
arrive with a score in the 350–550 range out of 1,000. The temptation is
to colour it red, surround it with warnings, and offer a recovery plan.
That would be wrong. The score is information. The presentation should
be informational. The path to improvement should be the dominant visual,
not the current value.

**How do you explain a decline reason without making the customer feel
judged?**

Talefin will surface decline factors — high DTI, recent loan activity,
gambling spend, irregular income, low daily balance, etc. Some of these
are sensitive. "Your gambling spend was 4% of income last quarter" is a
true statement; it is also a thing that, badly presented, would make
many customers close the app and never return. Plain, factual,
non-judgmental presentation is the requirement. No icons of slot
machines. No red borders. No "areas of concern."

**How do you present a lender offer without the page feeling like a
sales channel?**

When a customer is matched to a lender, that's a real event with real
money attached. The design needs to make this feel like an outcome they
earned, not an interruption they didn't ask for. Notification design,
placement within the IA, the offer card itself — all carry weight here.

**How do you make the Hardship pathway not feel like a dead end?**

Some customers, even with Tippla's help, will end up in worse positions.
The Hardship surface is the right place for them to go. It should not
feel like the back office of the product — it should feel like an
entirely reasonable and well-supported path. This is a real test of
whether the platform actually has the customer's interests at heart.

**How do you keep the data view honest without overwhelming?**

Talefin returns 139 metrics. The portal already surfaces 30+ of them.
The design challenge isn't "show all the data" — it's "show the four or
five things this customer should look at this week, and let them drill
in if they want."

**4. Brand direction**

The name Tippla is fixed. Beyond that, almost everything is open. The
existing prototypes used Tippla green (#00B67A) and a dark theme; the
FF-decline interstitial used teal (#028090) and serif headlines. These
are unrelated colour stories that grew up at different times. Neither is
sacred.

*Brief: take Tippla's brand to a place that would make sense to someone
seeing it for the first time, without prior context about what fintech
is "supposed" to look like.*

**4.1 Brand position statements (working)**

*These are not final brand copy — they're directional. The designer
should feel free to challenge them.*

- **Promise:** We help Australians get back to credit-ready.

- **Tone:** Warm, factual, dignified, no-bullshit. Speaks like a friend
  who happens to know finance.

- **Personality:** Calm, capable, honest. Not chirpy. Not stern. Not
  corporate.

- **What it isn't:** A bank. A coach. A credit score app. A budgeting
  tool.

**4.2 Visual territories worth exploring**

Four directions that would each be defensible. The designer is welcome
to bring a fifth.

**Direction A — Calm restorative**

Sage, soft teal, muted aubergine, warm whites. Generous whitespace.
Editorial typography. Closer in spirit to Headspace or YNAB than to most
fintech. The mood is rest, not action. Risk: too soft, may not feel like
a financial tool.

**Direction B — Confident forward**

A single bold brand colour (not green, not blue) — burnt sienna, dusty
rose, or saturated mustard would all be possibilities. Strong sans-serif
type. Confident layouts. Closer to Monzo or N26 in spirit, but warmer.
Risk: lender-side associations if the colour reads too retail-finance.

**Direction C — Quiet premium**

Off-black, ivory, one accent. High-craft typography. Treats the customer
as deserving of premium care. The luxury watch repair, not the
high-street pharmacy. Risk: feels misaligned with the customer's
financial reality.

**Direction D — Considered editorial**

Type-led, almost magazine-like. Plenty of room. Big confident numbers.
Sparse colour. Influenced more by The Browser, the Financial Times'
weekend supplement, or Stripe than by app design. Risk: less immediately
legible as an app.

**4.3 Anti-references — what to avoid**

|                          |                                                                                                                |
|--------------------------|----------------------------------------------------------------------------------------------------------------|
| **Don't**                | **Why**                                                                                                        |
| Payday-lender aesthetic  | Red, yellow, urgency banners, big approval stamps. Predatory. Customer will recognise it instantly and bounce. |
| Corporate bank aesthetic | Navy, gold, stock photography of professionals shaking hands. Cold and exclusionary.                           |
| Crypto-bro maximalism    | Neon gradients, glassmorphism, dark mode by default, performative graphs. Wrong audience, wrong message.       |
| Wellness app cuddliness  | Pastel illustrations of yoga, hand-drawn squiggles, confetti animations. Patronising for this audience.        |
| Default fintech green    | "Money is green" — too generic, too tied to retail banking. We can do better.                                  |

**4.4 References worth studying**

- **Monzo (UK)** — warmth without sacrificing financial credibility.

- **Cleo (UK)** — judgement-free voice, though we want less cheek than
  Cleo.

- **YNAB (US)** — methodical, calm, respects the user's intelligence.

- **Up Bank (AU)** — Australian context, friendly without being
  childish.

- **Wise (formerly TransferWise)** — clarity at scale, very confident
  typography.

- **Headspace** — calm and dignified, even when the subject matter is
  heavy.

**5. Australian context**

Tippla is built for Australian customers. The design needs to feel
native to them, not transplanted from the US or UK. A few specifics:

- Pay cycles are typically fortnightly, not weekly or monthly. The
  expense calendar should default to a fortnightly view, not monthly.

- Centrelink (the federal welfare payment system) is a real income
  source for a portion of the customer base. Showing Centrelink income
  should feel as legitimate as showing wages — no asterisks, no
  different treatment.

- Currency is AUD throughout. Use the \$ symbol freely; "A\$" is
  unnecessary in a domestic product.

- BNPL is mainstream here. Afterpay, Zip, Latitude are common. Detecting
  and surfacing BNPL exposure should be matter-of-fact.

- Spelling is Australian English. "Behaviour," "organisation,"
  "recognise." Lock this into your style guide.

- Date format DD/MM/YYYY. Time in 24h or AM/PM is fine; AEST/AEDT
  awareness if surfacing absolute times.

- Phone format: 04XX XXX XXX for mobile.

**6. Sitemap**

The full list of screens to design. Everything below needs at minimum:
desktop, tablet, mobile. Light/dark mode treatment is part of the scope
(see Section 9).

<img src="media/216c7f3bc74b5b6638f450d3dea96b9a161c8d46.png"
style="width:6.25in;height:4.375in" />

*Figure 2 — Sitemap showing onboarding, in-product navigation, account
surfaces, and global components.*

**7. Screens — design intent for each**

*For each screen below: what it's for, who's on it, and the design
problem to solve. Use this to brief yourself on intent before opening
Figma.*

**7.1 Onboarding flow**

**Account creation**

First touch after the customer clicks through from the interstitial.
Email and phone capture, password setup. Should feel like an opening,
not a form. Two fields is plenty.

**Consents**

Three consent tick-boxes: FF data sharing, bank data via Talefin, lender
matching. Plain language explanations. The lender matching consent is
optional — the customer can use Tippla without it. Don't bury that fact.

**Bank connection**

Hand-off to Talefin. The customer leaves Tippla and returns. The Tippla
pages on either side of the Talefin window need to make this feel safe,
not jarring. Particularly important: returning customers after Talefin
completes.

**Analysing**

The loading state while Tippla processes the Talefin payload. Real time:
30–90 seconds. The temptation is to fill this with motion and
reassurance. Resist. Show three or four things the platform is doing in
plain language. Let them feel watched in a good way.

**First score reveal**

Moment of truth. The customer sees their SmartScore for the first time.
Most will see a number lower than they expected. The design needs to
handle that gently — context, not just a number. "Your SmartScore is
472. Here's what that means and what you can do about it."

**7.2 Overview**

**Dashboard**

The home screen of the product. Customer lands here every time they open
the app. Needs to surface: SmartScore + trend, next bill or due date,
one specific recommended action, and any urgent state (declined offer,
score change, hardship trigger). It should NOT be a fire-hose of data.
The dashboard's job is to point them to the next two clicks.

**Financial Health Score**

The deep-dive on the SmartScore. The score itself plus nine sub-scores
covering income stability, expense management, debt load, credit
utilisation, savings buffer, payment behaviour, gambling exposure,
irregular income, and DTI. Each sub-score should be drillable into
specifics. The hierarchy here matters — most customers will never look
beyond the top three sub-scores, so those need to be obvious.

**7.3 Financial Insights**

**Spending Habits**

Multi-tab drill-down. Categories (food, transport, entertainment, etc),
merchants, trends over time. The data is rich; the design should make it
feel like a story, not a spreadsheet.

**Spending Comparison**

Two comparisons: customer vs their own past behaviour, customer vs
comparable peer cohorts (age band, income band, postcode region). The
peer comparison is sensitive. "You spend 23% more than your peers on
takeaways" can feel either useful or judgemental depending entirely on
how it's framed.

**Expense Calendar**

Visual calendar of upcoming bills, expected expenses, and recurring
spend. Default view: fortnightly. The customer should be able to see the
next pay-day-to-pay-day window at a glance.

**Subscriptions**

Detected recurring payments. The portal flags subs the customer might
have forgotten about. Honest framing — no fake urgency around "saving
them money," just clarity about what they're paying for.

**Savings Opportunities**

Specific actions the customer could take to improve their score or
position. Each should be a concrete, achievable suggestion with a clear
projected impact. "Reducing your average overdraft fees would lift your
Expense Management sub-score from 530 to 590." Numbers ground the
suggestion.

**7.4 Loans & Credit**

**Loan Offers**

Matched offers from partner lenders. This is the page that monetises the
platform — and it's the page that most easily becomes a sales surface.
The customer should feel they could ignore this page entirely and the
product would still serve them. Offer cards should be objective,
comparable, and never urgency-driven.

**Loans & Credit (4-tab drill-down)**

Overview: current loans, total outstanding, DTI ratio. History: past
payments. Upcoming: next 30/60/90 days. Other Credit: BNPL, wage
advance, credit cards. This is the most data-dense surface in the
product. Discipline required.

**Early Repayment Calculator**

Customer plays with a slider, sees the impact of paying more on their
existing loan(s). Educational tool, not a sales tool. Output should be
specific dollars and weeks, not generic encouragement.

**7.5 Support**

**Hardship Support**

For customers in genuine financial difficulty. Should NOT be hidden
away. Surfaces support pathways including formal hardship arrangements
with lenders, financial counselling (National Debt Helpline), and
Tippla's own subscription pause/downgrade. The design test: does a
customer reading this page feel embarrassed to be here, or relieved?

**Help / FAQ**

Self-serve answers. Search-led. Should anticipate the questions a
stressed customer would ask, not the questions a product manager would
think to write FAQ entries for.

**7.6 Account**

**Profile & Settings**

Standard account management. Notification preferences, communication
channel preferences (email, SMS, push), language.

**Subscription & Billing**

Plan tier, billing history, plan change, cancellation. Cancellation
should be one click. No dark patterns.

**Consent management**

Customer can view, modify, or withdraw every consent given. APP 6
compliance lives partly here. The lender-matching consent is the most
operationally important — withdrawing it pauses lender matching with the
customer's data.

**7.7 Global / cross-cutting**

**Notification centre**

Score changes, new offers, bill reminders, lender match notifications,
subscription events. Inbox-style, prioritised.

**Modals / drawers**

Inline drill-downs for transaction detail, loan detail, lender detail,
recommendation detail. These should feel like quiet expansions, not
interrupting overlays.

**8. Component library requirements**

The Figma file should ship with a documented component library. Not
exhaustive — focused on the components that recur. The minimum:

**8.1 Foundational**

|                        |                                                                                                                                     |
|------------------------|-------------------------------------------------------------------------------------------------------------------------------------|
| **Component**          | **Notes**                                                                                                                           |
| **Type ramp**          | Full type scale from display (H0) to caption. Line heights, weights, letter spacing.                                                |
| **Colour tokens**      | Primary, secondary, semantic (success/warning/danger/info), neutrals. Light and dark mode equivalents. Documented for dev hand-off. |
| **Spacing scale**      | 4/8/12/16/24/32/48/64 or similar. Used consistently throughout.                                                                     |
| **Elevation / shadow** | Three levels max. Light-mode and dark-mode variants.                                                                                |
| **Iconography**        | Curated icon set. Tabler, Heroicons, or custom. Pick one family and commit.                                                         |

**8.2 UI components**

- Buttons — primary, secondary, tertiary, destructive, with sizes and
  states (hover, focus, disabled, loading).

- Form fields — text, number, currency, date, select, multi-select,
  search. Validation states.

- Toggles, checkboxes, radios.

- Cards — generic, loan card, offer card, recommendation card,
  transaction card.

- Tables — with sort, filter, pagination.

- Tabs — used heavily in the drill-down pages.

- Modals and drawers — full size, side, bottom-sheet (for mobile).

- Toasts and inline alerts.

- Empty states — at least 6 distinct: no bank data yet, no offers yet,
  no transactions in range, no subscriptions detected, no
  recommendations, search returns nothing.

- Loading states — skeleton screens preferred over spinners for content
  areas.

**8.3 Domain-specific components**

- **SmartScore ring —** the hero component of the product. The score
  from 0–1,000 in a ring with a trend indicator. Multiple sizes (hero on
  dashboard, small on header).

- **Sub-score tile —** displays one of the 9 sub-scores. Includes the
  score, trend, and an expandable detail panel.

- **Trend chart —** the SmartScore over time. Probably the most-viewed
  chart in the product.

- **Loan detail card —** expandable card showing principal, balance,
  rate, repayment schedule, next payment due.

- **Offer card —** matched lender offer. The hardest single card to get
  right in the product (see Section 3.2).

- **Recommendation card —** a single suggested action, with projected
  impact. Should feel like advice from a knowledgeable friend.

- **Bill / expense calendar cell —** single date cell with one or more
  events. Indicator for confirmed vs predicted spend.

- **Subscription line item —** merchant logo, amount, cadence, last
  charged, action (manage/cancel/keep).

**9. States and edge cases**

The product is judged in its edge cases as much as its happy path. The
Figma file should explicitly include the following states for every
relevant screen:

**9.1 User states**

- Brand new — bank connected but no analysis yet.

- Active — typical case, has data, has a score, has recommendations.

- Improving — score and sub-scores trending up.

- Declining — score and sub-scores trending down. This is when the
  platform earns or loses trust.

- Matched — has a live lender offer.

- In hardship — flagged for hardship pathway.

- Lapsed subscription — has access to limited surfaces only, prompted to
  reactivate.

**9.2 Data states**

- Bank connection broken — Talefin link expired or revoked.

- Insufficient transaction history — fewer than 60 days of data.

- Anomalous data — large one-off transactions distorting metrics.

- Multi-account customer — more than one bank account connected.

**9.3 Mode considerations**

- Light and dark mode — both designed, both production-grade, not one as
  an afterthought.

- Reduced motion — for accessibility settings.

- Large text — Australian accessibility standards expect dynamic type up
  to ~200%.

**9.4 Mobile-specific**

The customer is on a phone. Treat mobile as the primary canvas, not the
responsive afterthought. Specific considerations:

- Thumb-zone navigation — primary actions reachable from the bottom
  third of the screen.

- Bottom sheet drawers — preferred over side drawers on mobile.

- Single-column layouts — don't try to fit two columns of data
  side-by-side on a phone.

- Pull-to-refresh on data-driven screens.

- Tap targets minimum 44pt × 44pt.

**10. Deliverables and process**

**10.1 What we expect back**

|                             |                                                                                                                                                                             |
|-----------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Deliverable**             | **Detail**                                                                                                                                                                  |
| **Figma file — screens**    | All screens listed in Section 7, in all states listed in Section 9, in light and dark mode, in desktop / tablet / mobile breakpoints. Organised into pages by surface area. |
| **Figma file — components** | All components listed in Section 8, built as Figma components with variants and properties exposed for handoff.                                                             |
| **Design system document**  | Short PDF or Figma page covering: type ramp, colour tokens, spacing, motion principles, voice and tone, brand do's/don'ts.                                                  |
| **Clickable prototype**     | At least the primary user journey — onboarding through to score reveal, dashboard, one drill-down, one offer interaction. Used for stakeholder review and user testing.     |
| **Annotated handoff**       | Critical interactions documented in Figma comments — particularly anything where motion, sequencing, or state-change behaviour is non-obvious.                              |

**10.2 Suggested process**

*Open to adjustment based on the designer's preferred working style.
This is a sensible default, not a contract.*

|        |                             |                                                                                                                                            |
|--------|-----------------------------|--------------------------------------------------------------------------------------------------------------------------------------------|
| **Wk** | **Phase**                   | **Output**                                                                                                                                 |
| 1      | Discovery                   | Read brief, study prototypes, study Talefin spec, walk through emotional journey. End-of-week debrief and questions back to us.            |
| 2–3    | Visual exploration          | Three or four divergent visual directions. Mood, palette, type, two or three hero screens per direction. Review meeting. Pick a direction. |
| 4–6    | Design system + key screens | Build the design system. Design dashboard, SmartScore page, one drill-down end-to-end. Review and refine.                                  |
| 7–8    | Screen production           | Roll the system through every remaining screen and state. Weekly review checkpoints.                                                       |
| 9      | Refinement + handoff        | Polish pass, prototype linking, annotation, design system documentation, walkthrough with the dev team.                                    |

**10.3 Review cadence**

- Weekly review meeting with Layton. 45 minutes.

- Asynchronous feedback via Figma comments between meetings.

- Hard gate at end of week 3 (visual direction sign-off) — beyond this
  point we don't reopen palette or type.

- Hard gate at end of week 6 (design system + 3 hero screens sign-off) —
  beyond this point we don't reopen the system.

**11. Reference materials provided**

Alongside this brief, the designer will receive:

|                                      |                                                                                                                                                                                               |
|--------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **Artefact**                         | **Purpose for the designer**                                                                                                                                                                  |
| **Tippla_Portal_Prototype.html**     | The current consumer portal, vanilla HTML. Functional reference — proves the information architecture works. Visual treatment to be replaced. Open it in a browser, click through everything. |
| **tippla_interstitial.html**         | The FF-decline activation page. The customer's first touch. Not in scope for redesign but worth understanding as the entry point.                                                             |
| **Tippla product spec sheet (v2.0)** | Developer-facing document mapping every UI element to a Talefin AM-series metric. Useful for understanding what data drives what visual.                                                      |
| **Tippla Master Brief**              | Strategic context, commercial model, customer journey. Background reading.                                                                                                                    |
| **Database Architecture v0.1**       | How the data flows behind the portal. The designer doesn't need to internalise this — but skimming it makes it clear what data the portal can and can't show, and when.                       |
| **Sample Talefin payload**           | Real bank statement JSON (anonymised). Useful for designing with realistic data shapes rather than placeholder "Lorem \$1,234."                                                               |

**12. Open questions**

*Things we want the designer to think about and have a point of view on.
We don't have firm answers; if we did, we wouldn't be hiring a
designer.*

|        |                                                                                                                                                                                                      |
|--------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **\#** | **Question**                                                                                                                                                                                         |
| **1**  | Is the SmartScore the right hero, or is the hero actually a single "next thing to do" recommendation? The current prototype leads with the score. We're not sure we'd land there again from scratch. |
| **2**  | How should declining metrics be visualised? Most fintech defaults to red and arrows-down. Is there a more humane vocabulary for "this got worse"?                                                    |
| **3**  | Should the consumer portal use any illustration at all, or is it strictly typographic and data-driven? If illustration, what style — and how do we keep it from sliding into wellness-app territory? |
| **4**  | Is there a single moment in the journey where the customer should feel actively delighted, not just calmed? If so, where, and what does it look like?                                                |
| **5**  | How do we visually distinguish Standard (\$1.99) from Pro (\$4.99) without making Standard feel deliberately crippled? The free or low-cost tier should still feel like a complete product.          |
| **6**  | What's the right relationship between Tippla and the partner lender brands when they appear in the offer flow? Do we surface lender brand visibly, or whitelabel?                                    |
| **7**  | If we expanded to other markets later (UK, NZ), is anything in your design language locking us into Australia in ways that would be expensive to undo?                                               |

**13. One last thing**

The single hardest part of this brief is also the most important: the
customer arrives in a difficult moment, and the design needs to meet
them there. Not with sympathy that feels performative. Not with optimism
that feels naïve. Not with data that feels cold.

With craft. With respect. With the assumption that they are capable,
intelligent adults who are temporarily in a position they don't want to
be in — and that the platform's job is to help them get out of it, with
their dignity intact.

If the design achieves that, everything else follows.

*Get this right, and Tippla becomes the financial product Australians in
difficulty trust enough to actually use. That's the prize.*

*— End of brief —*
