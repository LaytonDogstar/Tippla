// Q9 (Standard vs Pro split) and pricing are open. SAMPLE LOGIC: placeholder prices and Pro extras so the
// subscription screens work end to end. Both tiers get the complete core product.
export type PlanId = "standard" | "pro";

export const PLANS: Record<PlanId, { name: string; pricePerMonth: number; extras: string[] }> = {
  standard: { name: "Standard", pricePerMonth: 9.99, extras: [] },
  pro: { name: "Pro", pricePerMonth: 14.99, extras: ["Bank data refreshed weekly instead of fortnightly", "12 months of history", "Extra repayment calculator scenarios"] },
};

/** Pausing skips one monthly charge (sample policy, Q9). */
export const PAUSE_MONTHS = 1;
