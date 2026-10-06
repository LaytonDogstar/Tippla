# Tippla Retention & Guidance Pack

A build pack for Claude Code. It turns Tippla from a financial snapshot into a guided loop: it tells members what needs attention, helps them act, shows that their effort is working, and gives them a reason to come back every pay cycle.

## How to use this pack (Claude Code: read this first)

1. Read `00-context.md` in full. It holds the product context, principles, guardrails and conventions that apply to every workstream.
2. Read `ROADMAP.md` for the sequence, dependencies and priorities.
3. Work **one workstream at a time**, in roadmap order, using the spec in `specs/`.
4. For each workstream:
   - Explore the relevant parts of the codebase first.
   - Write a short implementation plan (files to touch, new modules, data model changes, migrations, risks, open questions) and **stop for approval before writing code**.
   - Build behind a feature flag named in the spec.
   - Extend the demo persona (Jess Taylor) so every new screen and rule has realistic data.
   - Add the tests and analytics events listed in the spec.
   - Finish with a summary: what changed, what's still "Sample logic", known gaps, and any open questions from the spec you resolved or couldn't resolve.
5. Some workstreams have **compliance gates** (see `specs/11-compliance-checkpoints.md`). Build what the gate allows, then stop and flag. Don't ship gated features to production.

## Contents

| File | What it covers | Priority |
|---|---|---|
| `00-context.md` | Product, current state, problem, principles, guardrails, conventions | Read first |
| `ROADMAP.md` | Sequencing, dependencies, phases | Read second |
| `specs/01-attention-feed-and-navigation.md` | "Needs a look" feed, score explanations, nav consolidation, status line | P0 |
| `specs/02-pay-cycle-loop.md` | Safe to spend, payday check-in, end-of-cycle recap, projections, value tally | P0 |
| `specs/03-billing-alignment.md` | Align Tippla's own subscription charge to the member's payday | P0 (quick win) |
| `specs/04-onboarding-first-value.md` | First-session "aha", goal selection, time-to-value | P0 |
| `specs/05-data-trust.md` | User corrections, forecast accuracy, bank connection health | P1 |
| `specs/06-action-tools.md` | Hardship letter autofill, bill switching, cancellation helper, entitlements check | P1 |
| `specs/07-progression-beyond-healthy.md` | Buffer building, savings goals, credit file, graduation path | P1 (design now) |
| `specs/08-ask-tippla-assistant.md` | Conversational "can I afford it?" assistant over the member's data | P2 (gated) |
| `specs/09-analytics-and-experimentation.md` | North-star metric, event taxonomy, cohorts, A/B framework | P0 (foundation) |
| `specs/10-platform-pwa-and-notifications.md` | PWA/native decision, push infrastructure, notification policy | P0 (foundation) |
| `specs/11-compliance-checkpoints.md` | Gates and questions for counsel before release | Applies throughout |

## Kick-off prompt

Paste this into Claude Code with the pack in the repo (for example at `/docs/retention-pack/`):

```
Read docs/retention-pack/README.md, then 00-context.md and ROADMAP.md.
Explore the codebase and give me:
(1) a summary of the stack, data model and how forecasts, SmartScore, subscriptions, loans and notifications work today;
(2) any conflicts between the pack and the current architecture;
(3) an implementation plan for the first roadmap item.
Don't write code until I approve the plan.
```
