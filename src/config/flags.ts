// Feature flags and open-question defaults (docs/10_open_questions.md).

/** Q3: score-point projections are a placeholder heuristic. Off in presentation mode. */
export const SHOW_SCORE_PROJECTIONS_DEFAULT = false;

/** Q2: factors eligible for the "top three" tiles and the "strongest factor" fact. */
export const ACTIONABLE_FACTORS = [
  "DISPOSABLE_INCOME", "LOAN_AMOUNT_AND_TYPE", "MISSED_PAYMENT", "ADVERSE_SPEND", "INCOME", "CASH_SPEND",
] as const;

/** Hardship banner trigger (docs/09): overdrawn on at least this many of the last 90 days… */
export const HARDSHIP_OVERDRAWN_DAYS_90 = 15;
/** …and a dishonour within this many days. */
export const HARDSHIP_DISHONOUR_WITHIN_DAYS = 30;

/** Dashboard banner: a score drop of at least this many points since the last refresh. */
export const SCORE_DROP_BANNER_POINTS = 20;

/** Thin file: TaleFin needs about this many days of history before it scores. */
export const THIN_FILE_DAYS_NEEDED = 90;
