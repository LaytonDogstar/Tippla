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

/** SAMPLE LOGIC: kept aside before working out "safe to spend today", so a surprise cost doesn't tip under. */
export const SAFE_TO_SPEND_BUFFER = 0;

/**
 * Q3 SAMPLE LOGIC: how much one factor is assumed to lift (of 10) if the customer acts on a recommendation
 * for the next two refreshes. Points then come from SAMPLE_FACTOR_WEIGHTS. Labelled "Estimate".
 */
export const PROJECTION_LIFTS: Record<string, { factor: keyof typeof SAMPLE_FACTOR_WEIGHTS; lift: number }> = {
  "pay-advance": { factor: "LOAN_AMOUNT_AND_TYPE", lift: 1.0 },
  "money-left": { factor: "DISPOSABLE_INCOME", lift: 0.3 },
  gambling: { factor: "ADVERSE_SPEND", lift: 0.5 },
  "failed-payments": { factor: "MISSED_PAYMENT", lift: 0.5 },
  subscriptions: { factor: "DISPOSABLE_INCOME", lift: 0.1 },
  cash: { factor: "CASH_SPEND", lift: 0.3 },
  payoff: { factor: "LOAN_AMOUNT_AND_TYPE", lift: 0.5 },
};
/** Score refreshes come fortnightly; a projection looks two refreshes ahead. */
export const PROJECTION_REFRESHES = 2;

/** SAMPLE LOGIC (value tally): a failed-payment fee, if the customer's own history has none to go by. */
export const DEFAULT_DISHONOUR_FEE = 15;

/** SAMPLE LOGIC: most notifications sent to the phone per day; the rest wait in the inbox. Customer can change it. */
export const NOTIFY_CAP_DEFAULT = 2;
/** Shortfall notifications only when the balance is forecast to go under within this many days. */
export const SHORTFALL_NOTIFY_DAYS = 5;

/** SAMPLE LOGIC (Q22): a goal builds up evenly, pay cycle by pay cycle, from $0 to the amount by its date. */
export const GOAL_PRESETS = [100, 200, 500] as const;
/** Shortest goal, in pay cycles, so the per-cycle step stays achievable. */
export const GOAL_MIN_CYCLES = 2;

/** Spec 05 forecast accuracy (Q31): show "within $20 on 9 of the last 10 days" only at 8+ of 10; ask what
 *  happened when yesterday's forecast missed by more than $100 or 30%. */
export const FORECAST_ACCURACY = { within: 20, of: 10, showMin: 8, missDollars: 100, missShare: 0.3 } as const;
/** Spec 05 connection health: stale after 48 h without new data, safe to spend paused after 72 h, consent
 *  reminders 14 and 3 days before it ends and on the day. */
export const CONNECTION = { staleHours: 48, pauseHours: 72, expiringDays: 14, reminderDays: [14, 3, 0] } as const;

/** Spec 07 plans (Q37, sample logic): the pay-advance steps, one per pay cycle. */
export const PLAN_ADVANCE_STEPS = [150, 75, 0] as const;
/** Spec 07 buffer growth suggestions; the last step is one pay cycle of bills. */
export const BUFFER_STEPS = [50, 100, 250] as const;
/** Streak milestones that get a card (spec 07). */
export const STREAK_MILESTONES = [2, 4, 6] as const;
