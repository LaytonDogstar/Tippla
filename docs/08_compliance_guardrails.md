# 08 · Compliance and data guardrails (for the build)

These are product guardrails for the model build, drawn from the brief and the September review. They are **not legal advice**; items marked (Q) need confirmation from Tippla's counsel before production.

## Consent

- Three separate, unticked consents; lender matching is optional and the product works fully without it.
- Record for each: timestamp, consent text version, channel. Show all in Account → Consents with withdraw/grant.
- Withdrawing lender matching immediately hides Offers and stops any lender package generation (mock: flag).
- Consents are captured in Tippla onboarding, not pre-ticked on the FF form. (Q13: the project dashboard describes capture on the FF application; confirm the final flow.)

## Privacy

- Collect and display the minimum. Account numbers masked to last 4; `Consumer.FULL_NAME` and `profiles[].full_name` not displayed.
- `NEVER_DISPLAY` fields (see `06_data_mapping.md`) never reach components: enforce with a typed allowlist and a test that renders every screen for every persona and asserts none of those values/labels appear.
- No sensitive values in analytics events, logs or URLs. Mock analytics logger must redact.
- Help and Account pages link to the Privacy Policy and explain who sees the data, in plain language (APP 1/5 notice-style copy placeholder).
- Financial counsellor use (AM2092) must never count against the customer in any Tippla surface; the Hardship page recommends counselling.

## Credit reporting

- Use bank-statement data only for the SmartScore (no bureau reference) until counsel confirms Part IIIA implications (Q1).

## Offers and credit

- Offers are informational, comparable, never urgent, never "pre-approved". Show comparison rate and total cost. (Q14: confirm licensing position for showing offers / referring, and whether subscription fees or Pro "priority matching" affect it.)
- No "Apply now" countdowns or scarcity copy.

## Gambling and vulnerability

- Neutral, factual presentation (see copy doc). Support offered as options.
- Hardship pathway always visible and never penalised in the product.

## Billing

- Cancellation in one tap with one confirmation. No retention offers inside the cancel flow (a single optional "Pause instead" option is allowed).

## Accessibility

- WCAG 2.2 AA both themes, 44 px targets, dynamic type to 200%, focus visible, reduced motion, screen-reader labels for charts (text summaries).
