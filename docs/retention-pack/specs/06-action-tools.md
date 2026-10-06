# 06 — Action Tools: Help Members Do Things, Not Just Read Advice

Feature flags: `hardship_autofill_v1`, `cancel_helper_v1`, `bill_switch_v1` (gated), `entitlements_v1`

## Goal

Every recommendation should come with a tool that gets it done. Each completed action is a concrete win and feeds the value tally (spec 02).

## 1. Hardship letter autofill

- Extends the existing "Ask your lender for a hardship arrangement" template on `/hardship`.
- Pre-fill from detected data: lender name, the repayment amount and date (e.g. Beforepay $315, Wed 30/09), and the member's name. Ask the member to confirm or edit each detail.
- Guided questions (each optional): what's changed (job loss, reduced hours, illness, family change, other), how long they expect it to last, and what they can afford to pay. The letter is assembled in plain English.
- Output options: copy to clipboard, open in an email draft, or download as PDF. **Tippla never sends on the member's behalf without explicit confirmation.**
- Include the lender's hardship contact details where known (maintain a `lender_directory` table: name, hardship email/phone/URL, last verified date).
- Note that under Australian credit law, lenders must consider hardship requests. Keep this as general information, reviewed by counsel (spec 11).
- After it's used, follow up next cycle: "Did you hear back from Beforepay?" (yes, agreed / yes, declined / not yet). If declined, point to the National Debt Helpline.

Events: `hardship_letter_started`, `hardship_letter_completed {output}`, `hardship_followup_answered {outcome}`.

## 2. Subscription cancellation helper

- On each detected subscription: a "How to cancel" guide per merchant (maintain a `merchant_cancel_guides` table: steps, deep link, notes, last verified date). Fall back to generic steps.
- "Remind me before next charge": schedule a reminder 2 days before the expected charge.
- After the member taps "I've cancelled", watch for the next expected charge. If none appears, confirm and log a value event. If one appears, raise a feed card: "Apple iCloud charged again — cancellation may not have gone through."
- "Usage check" prompt for subscriptions over $10 a month: "Still using this?" (yes / no → cancel guide).

Events: `cancel_guide_opened {merchant}`, `cancel_marked {merchant}`, `cancel_confirmed {merchant, monthly_cents}`, `cancel_failed_detected`.

## 3. Bill switching pointers (telco and energy) [compliance-gated]

- Detect telco, internet and energy bills (e.g. Telstra $52). Compare against general market benchmarks for similar usage tiers where data is available.
- Show neutral, general information: "Plans with similar data allowances start from around $X — compare on the government Energy Made Easy site / a comparison service."
- **Gate:** any commercial referral arrangement, or naming specific providers as recommended, requires compliance sign-off (spec 11). Build v1 with neutral, non-commercial links only.
- If the member reports switching, log the monthly saving as a value event (self-reported, labelled as such).

Events: `bill_switch_prompt_shown {category}`, `bill_switch_link_opened`, `bill_switch_reported {monthly_saving_cents}`.

## 4. Entitlements check

- A short, optional questionnaire (household, dependants, work status, studying, renting, concession cards held) that gives general pointers to support they *may* be eligible for: government payments, rent assistance, concession discounts on energy and transport, state-based energy rebates, and no-interest loan schemes (e.g. NILS) as an alternative to pay advances.
- Link out to the official sources (Services Australia's Payment and Service Finder, state concession pages, Good Shepherd NILS). Tippla doesn't determine eligibility.
- Clearly labelled general information. Answers are stored only if the member agrees, and are used only to tailor pointers.
- Surface it in the feed (`ruleId: entitlements_check`, urgency 2) once, when the member is in Building or Steadying or has a recurring shortfall.

Events: `entitlements_started`, `entitlements_completed`, `entitlement_link_opened {program}`.

## Data

- `lender_directory`, `merchant_cancel_guides`, `value_events` (shared with spec 02), `member_actions(member_id, action_type, entity, status, created_at)`.
- Build an admin screen or seed script to maintain the directories, with a "last verified" date. Flag entries older than 6 months.

## Acceptance criteria

- Jess can generate a hardship letter to Beforepay pre-filled with $315 due 30/09.
- Marking iCloud cancelled, then simulating no charge on 20/10, adds a value event of $4.49 a month.
- The entitlements check links only to official sources.
