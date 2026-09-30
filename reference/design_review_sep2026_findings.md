# Design review findings (September 2026) — what not to repeat

Summary of the review of the designer's Figma file (Dashboard, Financial Health Score, Spending Habits, Spending Comparison, Expense Calendar; 41 frames). The build must not reproduce these problems.

## Brief alignment
- Dashboard lacked the recommended action, next bill/due date and urgent state.
- Spending Comparison ranked customers (percentiles, "Your Rankings", "top performers/savers").
- Cohort included "Renting" and "Single" — brief allows age band, income band, region only.
- Copy lectured ("meal prep", "cook more", "public transport") and gave unearned praise.
- Sub-scores were inconsistent across three screens and didn't match the model (now: the nine TaleFin factors, `docs/05_smartscore.md`).
- Expense calendar was a monthly history, not a fortnightly forward view.
- Sample persona was an easy "Healthy 642, improving" case; the hard declining case wasn't designed.
- Gauge low end in orange/pink read as warning; "0 · Needs Work" chip.
- Hardship Support was cut off at the bottom of the sidebar.
- Mobile: inconsistent bottom nav, clipped labels, colliding text.
- Visual direction read as a generic SaaS template.

## Data errors (why the build computes everything from fixtures)
- Total debt $5,623 vs loans summing to $6,121; DTI 47% vs 42% on another screen.
- April header vs August spend vs "updated 5 Aug".
- Six-month chart with five $0 months.
- Budget maths wrong (230% for ~130%; $980 of $900 labelled 100%).
- Every breakdown row showing 56% / $2,883.
- Income labelled "based on your credit report accounts" (it's bank data).
- Donut colours not matching category colours; spend increase styled green.
- Logo tile colour changing per page; "logo" placeholder; US spelling ("Customize"); "DTI Ration".

## Interaction gaps
- Static report feel: nothing clickable, dead-end "Explore" links, insights in a separate rail, tables not sortable/filterable/expandable. See `docs/07_interaction_patterns.md` and `reference/spending_interaction_prototype.html`.

## Gambling
- "This is a significant concern", "safe levels", "escalating pattern", "first step", orange highlighted rows, "98th percentile", "Reduce gambling to $0". Replaced by the template in `docs/02_voice_and_copy.md`.
