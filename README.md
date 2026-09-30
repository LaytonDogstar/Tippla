# Tippla build pack

Everything needed for **Astra (ChatGPT)** to produce the design system and for **Claude Code** to build a fully working, mock-data model of the Tippla consumer portal.

## How to use it

1. **Design first (Astra).** Open `design/ASTRA_PROMPTS.md` and run Prompts 0–9 in one ChatGPT conversation. Prompt 2 is where you pick a direction. Save what Astra returns into `design/` using the filenames it's asked for (`tokens.json` is the one that matters most).
2. **Build (Claude Code).** Put this whole folder at the root of a new repo. Start Claude Code there and paste the kick-off prompt from `docs/11_build_plan.md`. Claude Code reads `CLAUDE.md` automatically.
   - You don't have to wait for Astra: Claude Code can start with `design/tokens.template.json` and swap in `tokens.json` later.
3. **Review per phase.** The build plan stops after each phase for review, with screenshots for all three personas.

## What's in here

| Path | What it is |
|---|---|
| `CLAUDE.md` | Instructions Claude Code follows: stack, non-negotiables, reading order, definition of done |
| `docs/01–11` | Product brief, copy rules, IA, every screen, SmartScore, TaleFin data mapping, interaction patterns, guardrails, states, open questions, build plan |
| `mock-data/` | Three fictional personas (jess, marcus, priya) with transactions, TaleFin-shaped bank statement analysis, TaleFin Score, score history, offers, consents. All numbers are computed from the transactions, so every screen reconciles |
| `scripts/generate_mock_data.py` | Regenerates the fixtures (edit personas here, never the JSON) |
| `design/ASTRA_PROMPTS.md` | The Astra prompt set, with exact sample data for mock-ups |
| `design/tokens.template.json` | Token schema Astra must fill; placeholder values so the build can start |
| `reference/` | Interactive spending prototype, original design brief, TaleFin Score V2 quick start, original product spec summary, review findings |

## Before you share it

- Figures, people, employers and lenders in the fixtures are fictional. Score impacts are illustrative until TaleFin confirms weights (`docs/10_open_questions.md` Q3).
- The pack contains Tippla's commercial model and open legal questions. Share it with Claude Code and your design partner only, not publicly.
- Guardrails in `docs/08_compliance_guardrails.md` are product rules for the build, not legal advice. Items marked Q need counsel sign-off before production.
