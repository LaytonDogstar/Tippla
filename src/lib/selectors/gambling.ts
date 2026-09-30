import type { ArrayMetricValue, PercentMetricValue, PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { fullMonths } from "./monthly";

/**
 * Numbers for the gambling insight (docs/02 template). Amounts are gross DEPOSITS (Q5): label them so.
 * Never uses inferred gambling (AM2015).
 */
export function gamblingInsight(d: PersonaData) {
  const deposits = metric<ArrayMetricValue>(d.bankStatement, "AM2005");
  const v90 = deposits["90"];
  if (!v90 || v90.count === 0) return null;
  const months = fullMonths(d, deposits.monthly_values ?? {});
  const first = months[0], last = months.at(-1);
  return {
    pctOfIncome90: metric<PercentMetricValue>(d.bankStatement, "AM2023")["90"],
    deposits90: v90.sum_amount,
    factor: d.score?.breakdown.ADVERSE_SPEND ?? null,
    /** First vs last FULL calendar month (the current month is partial). Only when it went up. */
    trend: first && last && first.month !== last.month && last.sum_amount > first.sum_amount
      ? { from: { month: first.month, amount: first.sum_amount }, to: { month: last.month, amount: last.sum_amount } }
      : null,
  };
}
