import type { PersonaData } from "@/lib/api/types";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { periodLabels } from "@/content/en-AU";
import { monthLabel } from "@/content/spending";

/** The slice of persona data the spending selectors need. Small enough to send to the client. */
export type SpendData = Pick<PersonaData, "transactions" | "asOf" | "derived"> & { profile: Pick<PersonaData["profile"], "data_from"> };

export type PeriodId = keyof typeof periodLabels;
export const PERIOD_IDS: PeriodId[] = ["this_cycle", "last_cycle", "3_months", "12_months"];

export interface Period {
  id: PeriodId | "cycle" | "month";
  /** For month periods: "2026-05". */
  month?: string;
  label: string;
  start: ISODate;
  end: ISODate;
  /** Days of data actually covered (priya has 45 days, so "3 months" is based on 45). */
  basedOnDays: number;
  /** True when the period asked for is longer than the data available. */
  limitedByHistory: boolean;
}

function make(d: SpendData, id: Period["id"], label: string, start: ISODate, end: ISODate): Period {
  const clippedStart = start < d.profile.data_from ? d.profile.data_from : start;
  const dataEnd = end > d.asOf ? d.asOf : end;
  return {
    id, label, start: clippedStart, end,
    basedOnDays: Math.max(0, daysBetween(clippedStart, dataEnd) + 1),
    limitedByHistory: clippedStart !== start,
  };
}

/** The fortnightly pay cycle containing the data date (derived.json → pay_cycle). */
export const currentCycle = (d: SpendData): Period =>
  make(d, "this_cycle", periodLabels.this_cycle, d.derived.pay_cycle.start, d.derived.pay_cycle.end);

/** The pay cycle `n` cycles before the current one (n = 1 → last pay cycle). */
export function cycleBefore(d: SpendData, n: number): Period {
  const start = addDays(d.derived.pay_cycle.start, -14 * n);
  return make(d, n === 1 ? "last_cycle" : "cycle", n === 1 ? periodLabels.last_cycle : `${n} pay cycles ago`, start, addDays(start, 13));
}

/** Rolling window ending on the data date. */
export const rolling = (d: SpendData, id: "3_months" | "12_months", days: number): Period =>
  make(d, id, periodLabels[id], addDays(d.asOf, -(days - 1)), d.asOf);

/** A calendar month (from the dashboard's six-month chart). The current month runs to the data date. */
export function monthPeriod(d: SpendData, month: string): Period {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const start = `${month}-01`;
  const end = addDays(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`, -1);
  return { ...make(d, "month", monthLabel(month), start, end), month };
}

const isMonthKey = (v: string | undefined): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);

/** Period from URL params: ?period=last_cycle or ?month=2026-05. Unknown or future values fall back. */
export function resolvePeriod(d: SpendData, params: { period?: string; month?: string }): Period {
  if (isMonthKey(params.month) && params.month <= d.asOf.slice(0, 7) && params.month >= d.profile.data_from.slice(0, 7)) return monthPeriod(d, params.month);
  return period(d, (PERIOD_IDS as string[]).includes(params.period ?? "") ? (params.period as PeriodId) : "this_cycle");
}

export function period(d: SpendData, id: PeriodId): Period {
  switch (id) {
    case "this_cycle": return currentCycle(d);
    case "last_cycle": return cycleBefore(d, 1);
    case "3_months": return rolling(d, "3_months", 90);
    case "12_months": return rolling(d, "12_months", 365);
  }
}

/** The period before `p` of the same length, for "change vs last period". */
export function previousOf(d: SpendData, p: Period): Period {
  if (p.id === "this_cycle") return cycleBefore(d, 1);
  if (p.id === "last_cycle") return cycleBefore(d, 2);
  if (p.id === "month" && p.month) {
    const [y, m] = p.month.split("-").map(Number) as [number, number];
    const prev = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, "0")}`;
    return { ...monthPeriod(d, prev), label: "Previous month" };
  }
  const len = daysBetween(p.start, p.end) + 1;
  const end = addDays(p.start, -1);
  return make(d, "cycle", "Previous period", addDays(end, -(len - 1)), end);
}

/** Last `n` pay cycles, oldest first, ending with the current one (sparklines). */
export const lastCycles = (d: SpendData, n: number): Period[] =>
  Array.from({ length: n }, (_, i) => (n - 1 - i === 0 ? currentCycle(d) : cycleBefore(d, n - 1 - i)));
