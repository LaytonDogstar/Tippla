import type { ArrayMetricValue, PersonaData } from "@/lib/api/types";
import { internalMetric, metric } from "@/lib/dataUse";
import { posted, type CategoryOverrides } from "./transactions";

export interface MonthBar {
  month: string; // 2026-09
  total: number | null; // null = before the data starts (never show as $0)
  partial: boolean; // current month, data only to the data date
}

/**
 * Six-month spending bars, oldest first: AM2004 (all debits) minus AM2047 (credits from the customer's
 * own accounts), because money moved between their own accounts shows up as a debit on one side.
 * Months before the history starts (AM2035) are null — never drawn as $0. A standard 90-day TaleFin
 * pull only fills three of the six bars (Q17: ask for 180 days).
 */
export function sixMonthSpending(d: PersonaData, overrides: CategoryOverrides = {}): MonthBar[] {
  // Customer edits to or from "transfer" move money in or out of spending; other edits only move categories.
  const editDelta = new Map<string, number>();
  for (const t of posted(d.transactions)) {
    const to = overrides[t.id];
    if (!to || t.amount >= 0 || (to === "transfer") === (t.category === "transfer")) continue;
    const m = t.date.slice(0, 7);
    editDelta.set(m, (editDelta.get(m) ?? 0) + (to === "transfer" ? t.amount : -t.amount));
  }
  const debits = metric<ArrayMetricValue>(d.bankStatement, "AM2004").monthly_values ?? {};
  const internal = internalMetric<ArrayMetricValue>(d.bankStatement, "AM2047").monthly_values ?? {};
  const firstMonth = metric<string>(d.bankStatement, "AM2035").slice(0, 7);
  const asOfMonth = d.asOf.slice(0, 7);
  return ["5", "4", "3", "2", "1", "0"].flatMap((k) => {
    const v = debits[k];
    if (!v) return [];
    const transfers = Object.values(internal).find((x) => x.month === v.month)?.sum_amount ?? 0;
    const total = v.month < firstMonth ? null : Math.max(0, Math.round((v.sum_amount - transfers + (editDelta.get(v.month) ?? 0)) * 100) / 100);
    return [{ month: v.month, total, partial: v.month === asOfMonth }];
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
