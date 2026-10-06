import type { FactorKey } from "@/lib/api/types";

export const FACTOR_SLUGS: Record<Exclude<FactorKey, "GOVERNMENT_RELIANCE">, string> = {
  LOAN_AMOUNT_AND_TYPE: "current-borrowing",
  ADVERSE_SPEND: "gambling-and-alcohol",
  DISPOSABLE_INCOME: "money-left-over",
  MISSED_PAYMENT: "payments-on-time",
  PRODUCTIVE_SPEND: "spending-mix",
  CASH_SPEND: "cash-use",
  RELIABLE_PAYMENT_HISTORY: "payment-track-record",
  INCOME: "income-stability",
};
export const factorFromSlug = (slug: string) =>
  (Object.entries(FACTOR_SLUGS).find(([, s]) => s === slug)?.[0] ?? null) as Exclude<FactorKey, "GOVERNMENT_RELIANCE"> | null;
