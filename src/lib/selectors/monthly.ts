import type { ArrayMetricValue, PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";

export interface MonthBar {
  month: string; // 2026-09
  total: number | null; // null = before the data starts (never show as $0)
  partial: boolean; // current month, data only to the data date
}

/** Six-month spending bars from AM2004 monthly_values, oldest first. */
export function sixMonthSpending(d: PersonaData): MonthBar[] {
  const mv = metric<ArrayMetricValue>(d.bankStatement, "AM2004").monthly_values ?? {};
  const dataFromMonth = d.profile.data_from.slice(0, 7);
  const asOfMonth = d.asOf.slice(0, 7);
  return ["5", "4", "3", "2", "1", "0"].flatMap((k) => {
    const v = mv[k];
    if (!v) return [];
    const before = v.month < dataFromMonth;
    return [{ month: v.month, total: before ? null : v.sum_amount, partial: v.month === asOfMonth }];
  });
}

/** Full calendar months of data for a monthly metric: excludes the partial first and current months. */
export function fullMonths(d: PersonaData, values: Record<string, { month: string; sum_amount: number }>) {
  const first = d.profile.data_from;
  const firstFull = first.endsWith("-01") ? first.slice(0, 7) : nextMonth(first.slice(0, 7));
  const asOfMonth = d.asOf.slice(0, 7);
  return Object.values(values)
    .filter((v) => v.month >= firstFull && v.month < asOfMonth)
    .sort((a, b) => a.month.localeCompare(b.month));
}

function nextMonth(m: string): string {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  return mo === 12 ? `${y + 1}-01` : `${y}-${String(mo + 1).padStart(2, "0")}`;
}
