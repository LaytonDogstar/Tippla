// Feature flags and open-question defaults (docs/10_open_questions.md).

/**
 * Q3: score-point estimates (change attribution "−9 points", projections "~490 by 23/10") use placeholder
 * weights until TaleFin confirms them. Approved for presentation (05/10/2026), always labelled "Estimate".
 */
export const SHOW_SCORE_PROJECTIONS_DEFAULT = true;

/**
 * Q3 SAMPLE LOGIC: estimated SmartScore points per 1.0 change in each factor (of 10). Only used to split a
 * real score change across the factors that moved; the parts are scaled to add up to the actual change.
 */
export const SAMPLE_FACTOR_WEIGHTS = {
  INCOME: 12, DISPOSABLE_INCOME: 15, LOAN_AMOUNT_AND_TYPE: 18, MISSED_PAYMENT: 16, RELIABLE_PAYMENT_HISTORY: 10,
  CASH_SPEND: 8, PRODUCTIVE_SPEND: 8, ADVERSE_SPEND: 12, GOVERNMENT_RELIANCE: 6,
} as const;

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
