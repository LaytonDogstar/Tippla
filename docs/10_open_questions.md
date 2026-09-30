# 10 · Open questions (stub, don't invent)

Where a question affects behaviour, implement the **default** shown, isolate it behind a config or clearly named module, and show a "Sample logic" tag in dev mode.

| # | Question | Owner | Default in the build |
|---|---|---|---|
| Q1 | Use bureau data in the TaleFin Score (Privacy Act Part IIIA implications for marketing/lender matching)? | Legal | Bank-statement only |
| Q2 | Factor definitions, main drivers and weights (esp. PRODUCTIVE_SPEND) | TaleFin | Drivers as listed in `05_smartscore.md`; top-three = lowest actionable |
| Q3 | Can we project score impact ("do X → +N points")? Weights or a simulation endpoint? | TaleFin | Dollar impacts only; score projections behind `SHOW_SCORE_PROJECTIONS` (off in presentation) |
| Q4 | Stage band boundaries | Product | 0–449 / 450–599 / 600–749 / 750–1,000 in `config/stages.ts` |
| Q5 | Is there a gambling returns/net metric? | TaleFin | Show gross "gambling deposits" |
| Q6 | Peer cohort data source and minimum cohort size | Product/Data | Synthetic ranges in `selectors/cohort.ts`, labelled "Sample cohort data" |
| Q7 | Loan rate and remaining term for the repayment calculator | Product | Customer-entered, prefilled estimates |
| Q8 | Does using hardship options affect SmartScore or lender matching? | Legal/TaleFin | Copy placeholder; confirm before production |
| Q9 | Standard vs Pro feature split | Commercial | Pro: faster refresh, longer history, extra calculator scenarios |
| Q10 | Refresh cadence, cost per bank pull, and ongoing consent/credential mechanism | TaleFin/Commercial | Fortnightly mock refresh |
| Q11 | Which LENDER_ONLY / NEVER_DISPLAY fields may go in a lender package | Legal | None of NEVER_DISPLAY; LENDER_ONLY only with consent |
| Q12 | Transaction schema and full AM2151 category id list | TaleFin | Tippla taxonomy in `mock-data` (ids 23, 35 confirmed; others placeholders) |
| Q13 | Where consents are captured (FF form vs Tippla onboarding) | Legal/Product | Tippla onboarding, unticked |
| Q14 | Licensing position for offers/referrals, and effect of subscription fees / Pro "priority matching" | Legal | Offers informational; no "priority matching" copy |
| Q15 | Visual direction and brand tokens | Design (Astra) | Neutral placeholder tokens in `design/tokens.template.json` until Astra delivers |
