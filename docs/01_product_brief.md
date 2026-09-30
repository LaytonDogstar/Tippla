# 01 · Product brief (condensed)

Source: *Tippla Consumer Portal Design Brief* (Layton, June 2026), updated with decisions from the September 2026 design review.

## The product

Tippla is a subscription financial-health platform for Australian consumers who have just been **declined for a small-amount credit loan** by Friendly Finance (FF). The decline screen offers Tippla activation at low or no cost. After activation, the customer connects their bank through **TaleFin**; Tippla analyses the statement data (139 metrics) and the **TaleFin Score**, and shows:

- a **SmartScore** (0–1,000) with nine factors (see `05_smartscore.md`)
- spending insights framed around their fortnightly pay cycle
- loans and credit detail (SACC, MACC, AOCC, BNPL, pay advances)
- specific, achievable actions with projected impact
- over time, matched **loan offers** from partner lenders (only with the optional lender-matching consent)

**Revenue:** Standard $1.99/month, Pro $4.99/month; lenders pay CPL for a matched profile and CPA when a loan funds.

**Position:** not a budgeting app, credit score app or bank. Closest to a financial coach with a credit marketplace attached. Tippla is what FF becomes when it stops saying "no" and starts saying "not yet — here's how to get to yes."

## The customer

| | |
|---|---|
| Age | 25–45, long tail to 55 |
| Income | $40k–$80k household; often shift-based and irregular; **usually paid fortnightly**; a meaningful minority receive Centrelink |
| Finances | At least one active loan (often SACC or pay advance), some BNPL, just declined for $2,000–$3,000. Managing, but stressed. |
| Device | Phone, often outside business hours, often straight after a money event (payday, a bill, a declined card) |
| Tech | Comfortable with banking apps and Afterpay. Reads fast, scrolls fast, distrusts walls of text. |
| Mood on arrival | Some mix of frustration, embarrassment, urgency and resignation. Sceptical of yet another financial service. |

**They don't want:** congratulations for opening the app; being told they're doing great when they're not, or badly when they already know; lectures about budgeting or "good choices"; confetti; being ranked against people doing better; a polished front with a cold dashboard behind it.

**They do want:** to understand in plain language why they were declined; to see what would need to change for the answer to flip; to feel Tippla is on their side, not the lender's; visible progress week to week; to be treated as a capable adult in a hard moment; not to feel watched or labelled.

## The one test

> The customer should close the app feeling more in control of their money than when they opened it.

## The five tightropes

| Too far one way | Too far the other | Aim for |
|---|---|---|
| Clinical, cold | Wellness-app saccharine | Warm, factual, dignified |
| Doom | Cheerful denial | Acknowledge difficulty without dwelling |
| Pushing offers | Anti-credit moralising | Offers when appropriate, framed as the customer's choice |
| Treats them as fragile | Treats them as a problem | A capable adult in a difficult moment |
| Aspirational luxury | Cheap and utilitarian | Trustworthy, crafted, not aspirational about money |

## Hard design problems (and the decisions taken)

1. **A low score must not feel like punishment.** Most customers arrive at 350–550. The *path to the next stage* is the dominant visual, not the number. Stages: Building → Steadying → Healthy → Thriving. No red, no warning colours for a low score.
2. **Decline reasons without judgement.** Plain facts, with the credit reason attached (why lenders care). No "areas of concern", no red borders, no slot-machine icons.
3. **Offers without a sales channel.** The customer could ignore Offers entirely and still get full value. Offers are objective, comparable, never urgent.
4. **Hardship is a real path, not a back office.** It is always one tap away (visible in nav, never cut off) and should make someone feel relieved, not embarrassed.
5. **Honest data without overwhelm.** Show the four or five things to look at this week; let people drill in.

## Australian context

- Fortnightly pay is the default frame. Show the payday-to-payday window.
- Centrelink income is as legitimate as wages: same styling, no asterisks, never presented as something to "improve".
- AUD, `$` only. DD/MM/YYYY. Mobile numbers `04XX XXX XXX`. AEST/AEDT-aware.
- BNPL (Afterpay, Zip, Latitude, Humm) is mainstream: matter-of-fact treatment.
- Australian English: behaviour, organisation, recognise, customise, colour, prioritise.

## Brand

Name fixed: **Tippla**. Visual direction comes from Astra (see `design/ASTRA_PROMPTS.md`). Working brand position: *We help Australians get back to credit-ready.* Tone: warm, factual, dignified, no-nonsense; a friend who happens to know finance. Calm, capable, honest; not chirpy, not stern, not corporate.

Avoid: payday-lender aesthetic (red/yellow urgency, approval stamps); corporate bank (navy/gold, handshake photos); crypto maximalism (neon, glassmorphism, dark-by-default); wellness cuddliness (pastel yoga, squiggles, confetti); default fintech green.
