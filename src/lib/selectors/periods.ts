import type { PersonaData } from "@/lib/api/types";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { periodLabels } from "@/content/en-AU";

export type PeriodId = keyof typeof periodLabels;
export const PERIOD_IDS: PeriodId[] = ["this_cycle", "last_cycle", "3_months", "12_months"];

export interface Period {
  id: PeriodId | "cycle";
  label: string;
  start: ISODate;
  end: ISODate;
  /** Days of data actually covered (priya has 45 days, so "3 months" is based on 45). */
  basedOnDays: number;
  /** True when the period asked for is longer than the data available. */
  limitedByHistory: boolean;
}

function make(d: PersonaData, id: Period["id"], label: string, start: ISODate, end: ISODate): Period {
  const clippedStart = start < d.profile.data_from ? d.profile.data_from : start;
  const dataEnd = end > d.asOf ? d.asOf : end;
  return {
    id, label, start: clippedStart, end,
    basedOnDays: Math.max(0, daysBetween(clippedStart, dataEnd) + 1),
    limitedByHistory: clippedStart !== start,
  };
}

/** The fortnightly pay cycle containing the data date (derived.json → pay_cycle). */
export const currentCycle = (d: PersonaData): Period =>
  make(d, "this_cycle", periodLabels.this_cycle, d.derived.pay_cycle.start, d.derived.pay_cycle.end);

/** The pay cycle `n` cycles before the current one (n = 1 → last pay cycle). */
export function cycleBefore(d: PersonaData, n: number): Period {
  const start = addDays(d.derived.pay_cycle.start, -14 * n);
  return make(d, n === 1 ? "last_cycle" : "cycle", n === 1 ? periodLabels.last_cycle : `${n} pay cycles ago`, start, addDays(start, 13));
}

/** Rolling window ending on the data date. */
export const rolling = (d: PersonaData, id: "3_months" | "12_months", days: number): Period =>
  make(d, id, periodLabels[id], addDays(d.asOf, -(days - 1)), d.asOf);

export function period(d: PersonaData, id: PeriodId): Period {
  switch (id) {
    case "this_cycle": return currentCycle(d);
    case "last_cycle": return cycleBefore(d, 1);
    case "3_months": return rolling(d, "3_months", 90);
    case "12_months": return rolling(d, "12_months", 365);
  }
}

/** The period before `p` of the same length, for "change vs last period". */
export function previousOf(d: PersonaData, p: Period): Period {
  if (p.id === "this_cycle") return cycleBefore(d, 1);
  if (p.id === "last_cycle") return cycleBefore(d, 2);
  const len = daysBetween(p.start, p.end) + 1;
  const end = addDays(p.start, -1);
  return make(d, "cycle", "Previous period", addDays(end, -(len - 1)), end);
}

/** Last `n` pay cycles, oldest first, ending with the current one (sparklines). */
export const lastCycles = (d: PersonaData, n: number): Period[] =>
  Array.from({ length: n }, (_, i) => (n - 1 - i === 0 ? currentCycle(d) : cycleBefore(d, n - 1 - i)));
