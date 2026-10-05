# 10 · Open questions (stub, don't invent)

Where a question affects behaviour, implement the **default** shown, isolate it behind a config or clearly named module, and show a "Sample logic" tag in dev mode.

| # | Question | Owner | Default in the build |
|---|---|---|---|
| Q1 | Use bureau data in the TaleFin Score (Privacy Act Part IIIA implications for marketing/lender matching)? | Legal | Bank-statement only |
| Q2 | Factor definitions, main drivers and weights (esp. PRODUCTIVE_SPEND) | TaleFin | Drivers as listed in `05_smartscore.md`; top-three = lowest actionable |
| Q3 | Can we project score impact ("do X → +N points")? Weights or a simulation endpoint? | TaleFin | Point estimates shown, always labelled "Estimate" (approved 05/10, including presentation mode): score-change attribution and the /score projection use `SAMPLE_FACTOR_WEIGHTS` and `PROJECTION_LIFTS` in `config/flags.ts`; switch off with `SHOW_SCORE_PROJECTIONS_DEFAULT` |
| Q4 | Stage band boundaries | Product | 0–449 / 450–599 / 600–749 / 750–1,000 in `config/stages.ts` |
| Q5 | Is there a gambling returns/net metric? | TaleFin | Show gross "gambling deposits" |
| Q6 | Peer cohort data source and minimum cohort size | Product/Data | Synthetic ranges in `selectors/cohort.ts`, labelled "Sample cohort data" |
| Q7 | Loan rate and remaining term for the repayment calculator | Product | Customer-entered, prefilled estimates |
| Q8 | Does using hardship options affect SmartScore or lender matching? | Legal/TaleFin | Copy placeholder; confirm before production |
| Q9 | Standard vs Pro feature split | Commercial | Pro: faster refresh, longer history, extra calculator scenarios |
| Q10 | Refresh cadence, cost per bank pull, and ongoing consent/credential mechanism | TaleFin/Commercial | Fortnightly mock refresh |
| Q11 | Which LENDER_ONLY / NEVER_DISPLAY fields may go in a lender package | Legal | None of NEVER_DISPLAY; LENDER_ONLY only with consent |
| Q12 | Transaction schema and category coverage | TaleFin | **Transactions can be extracted (confirmed 30/09).** Category id lists known (`scripts/talefin_catalogue.json`). Still to see: the transaction schema, and how much spend lands in "Other Debit" |
| Q13 | Where consents are captured (FF form vs Tippla onboarding) | Legal/Product | Tippla onboarding, unticked |
| Q15 | Loop thresholds (05/10): safe-to-spend buffer, notification daily cap, shortfall notice window, value-tally confirmation windows and default failed-payment fee | Product | $50 buffer; 2 a day; 5 days; 3-day grace after an expected charge; the customer's last dishonour fee, else $15 (`config/flags.ts`, `selectors/tally.ts`) |
| Q14 | Licensing position for offers/referrals, and effect of subscription fees / Pro "priority matching" | Legal | Offers informational; no "priority matching" copy |
| Q15 | Visual direction and brand tokens | Design (Astra) | Neutral placeholder tokens in `design/tokens.template.json` until Astra delivers |
| Q16 | Can income types that imply circumstances (Child Support, WorkCover) be named to the customer? | Legal | Show the money as "Other regular income", never the label |
| Q17 | History length per pull | TaleFin/Commercial | **Decided 30/09: 180 days.** Mock already has 180 days; six-month chart stays |
| Q18 | Transaction-level data | TaleFin | **Confirmed 30/09: transactions can be extracted.** Per-lender figures (repayments, dishonours, balances) come from transactions only. `transactions.json` models the feed; `…FromSummary` selectors remain as a fallback |
| Q19 | Timezone | Product | **Decided 30/09: AEST** for all dates and times, including the Score's `SCORED_DATETIME` |
| Q20 | Transfers between the customer's own accounts | Product | TaleFin can't flag them conclusively (30/09). Tippla matches a debit and a same-amount credit on two connected accounts within 2 days (`selectors/transfers.ts`); onboarding encourages connecting every account; unmatched transfer-looking items ask "Is this one of your accounts?" |
