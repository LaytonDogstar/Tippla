// One plan (decided 14/10/2026): $4.99 a month, everything included. The fixtures still carry a legacy "standard" or
// "pro" tier from the generator; both map to the same plan, so nothing in the app differs by tier.
export type PlanId = "standard" | "pro";

const TIPPLA = { name: "Tippla", pricePerMonth: 4.99, extras: [] as string[] };
export const PLANS: Record<PlanId, { name: string; pricePerMonth: number; extras: string[] }> = { standard: TIPPLA, pro: TIPPLA };
/** The one price, for the marketing site and anywhere else that states it. */
export const PRICE_PER_MONTH = TIPPLA.pricePerMonth;

/** Pausing skips one monthly charge (sample policy, Q9). */
export const PAUSE_MONTHS = 1;

// ---- Billing on payday (retention pack spec 03, flag payday_billing_v1). SAMPLE LOGIC (Q25). ----
/** Pay cycles in a year, for the per-pay-cycle price (monthly × 12 ÷ 26). */
export const CYCLES_PER_YEAR = 26;
/** Never retry a failed Tippla payment more than this, and never before the next pay lands. */
export const MAX_BILLING_RETRIES = 2;
/** A charge is moved if it would take the forecast balance below this before the next pay (the member's buffer, spec 07, once built). */
export const BILLING_FLOOR = 0;
