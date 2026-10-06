// Q9 (Standard vs Pro split) and pricing are open. SAMPLE LOGIC: placeholder prices and Pro extras so the
// subscription screens work end to end. Both tiers get the complete core product.
export type PlanId = "standard" | "pro";

export const PLANS: Record<PlanId, { name: string; pricePerMonth: number; extras: string[] }> = {
  standard: { name: "Standard", pricePerMonth: 9.99, extras: [] },
  pro: { name: "Pro", pricePerMonth: 14.99, extras: ["Bank data refreshed weekly instead of fortnightly", "12 months of history", "Extra repayment calculator scenarios"] },
};

/** Pausing skips one monthly charge (sample policy, Q9). */
export const PAUSE_MONTHS = 1;

// ---- Billing on payday (retention pack spec 03, flag payday_billing_v1). SAMPLE LOGIC (Q25). ----
/** Pay cycles in a year, for the per-pay-cycle price (monthly × 12 ÷ 26). */
export const CYCLES_PER_YEAR = 26;
/** Never retry a failed Tippla payment more than this, and never before the next pay lands. */
export const MAX_BILLING_RETRIES = 2;
/** A charge is moved if it would take the forecast balance below this before the next pay (the member's buffer, spec 07, once built). */
export const BILLING_FLOOR = 0;
