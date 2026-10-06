# 11 — Compliance Checkpoints and Questions for Counsel

This isn't legal advice. It lists where the build touches regulated areas so the team can get the right review **before** release. Claude Code: when a workstream hits a gate, build to the stated limit, then stop and flag it in your summary.

## Gates

| Gate | Applies to | Build limit before sign-off | Question for counsel |
|---|---|---|---|
| **G1: Credit assistance / licensing** | Offers, refinancing step (07), assistant borrowing answers (08), any lender comparison | Prototype behind a flag; no partner integrations; no production exposure | Does the feature constitute credit assistance or require an ACL or credit representative authorisation under the National Consumer Credit Protection Act? What are the responsible lending and conflicted remuneration implications? |
| **G2: Financial product advice** | Assistant (08), plans (07), bill switching (06) | General-information wording only; disclaimers drafted | Is any output personal advice? Is the general advice warning wording adequate? |
| **G3: CDR and privacy** | Corrections data reuse (05), entitlements answers (06), assistant logs (08), analytics (09), credit file (07) | Data minimisation; consent copy drafted; no new data uses in production | Are the new uses within existing CDR consents and the Privacy Act / APPs? Is new consent needed? What retention periods apply? Do sensitive inferences (gambling) need extra handling? |
| **G4: Referrals and commercial arrangements** | Bill switching (06), credit file (07), refinancing (07) | Neutral, non-commercial links only | Do referral fees need disclosure? Are there conflicts with the member-outcome positioning? |
| **G5: Marketing and communications** | Notifications and lifecycle email (10), value tally claims (02) | Conservative claims; Spam Act compliance | Are the "saved you $X" claims substantiated enough under the Australian Consumer Law? Is the notification and email consent compliant? |
| **G6: Vulnerable consumers** | All, especially hardship, gambling and the assistant | Guardrails in 00-context enforced and tested | Does the design meet ASIC expectations for consumers experiencing vulnerability? Is the hardship pathway adequate? |
| **G7: Billing practices** | Billing alignment (03) | Build freely; review copy | Are the deferral, retry and pause flows fair and clearly disclosed? |

## Always-on product rules (enforced in code and tests)

1. Offers are never shown in the feed, notifications, check-ins, recaps or proactive assistant suggestions.
2. Offers are never shown to members with a forecast shortfall, an active hardship engagement this cycle, or in the Building band. (Confirm this threshold with counsel.)
3. The hardship pathway is always reachable within 1 tap when a shortfall is forecast.
4. No sensitive categories in notification text or email subjects.
5. All projections and estimates are labelled as estimates.

Add automated tests for rules 1–4 and include them in CI.

## Release checklist per workstream

- [ ] Gate(s) identified and status recorded.
- [ ] Copy reviewed against the guardrails and disclaimers.
- [ ] Privacy impact noted (new data, new uses, retention).
- [ ] Analytics guardrail metrics configured.
- [ ] Sign-off recorded (name and date) for any gated feature before the production flag is turned on.
