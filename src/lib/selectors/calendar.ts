import type { PersonaData, Transaction, UpcomingBill } from "@/lib/api/types";
import { addDays, daysBetween, weekday, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { dailyBalances, projectedBalances } from "./balance";
import { currentCycle } from "./periods";
import { upcomingIncome, type ExpectedIncome } from "./income";
import { applyOverrides, isDebit, isIncome, posted, type CategoryOverrides } from "./transactions";

export interface CalendarDay {
  date: ISODate;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  isPayday: boolean;
  /** Month view: a padding day from the neighbouring month (muted, still selectable). */
  outside?: boolean;
  confirmedSpend: number;
  confirmedCount: number;
  /** Income received that day (wages, Centrelink). Pay advances are not income. */
  paidIn: number;
  predictedBills: UpcomingBill[];
  /** Income expected on a future day (wages, Centrelink, other regular income), typical amounts. */
  predictedIncome: ExpectedIncome[];
  /** End-of-day balance: actual up to today, predicted after. null if unknown (never guessed). */
  balance: number | null;
  balancePredicted: boolean;
  belowZero: boolean;
}

/** Forecasts stop at the end of the next pay cycle: further out there are no predicted bills to show. */
export const forecastHorizon = (d: PersonaData): ISODate => addDays(d.derived.pay_cycle.next_payday, 13);

function buildDays(d: PersonaData, dates: ISODate[], overrides?: CategoryOverrides, outside?: (date: ISODate) => boolean): CalendarDay[] {
  const tx = posted(applyOverrides(d.transactions, overrides));
  const horizon = forecastHorizon(d);
  const actual = new Map(dailyBalances(d).map((p) => [p.date, p.balance]));
  const predicted = new Map(projectedBalances(d, horizon).map((p) => [p.date, p.balance]));
  const paydays = new Set(tx.filter(isIncome).map((t) => t.date));
  const expected = upcomingIncome(d, horizon);
  return dates.map((date) => {
    const spend = tx.filter((t) => t.date === date && isDebit(t));
    const income = tx.filter((t) => t.date === date && isIncome(t));
    const isFuture = date > d.asOf;
    const balance = isFuture ? predicted.get(date) ?? null : actual.get(date) ?? null;
    const predictedIncome = expected.filter((i) => i.date === date);
    return {
      date, weekday: weekday(date), isToday: date === d.asOf, isFuture,
      isPayday: paydays.has(date) || predictedIncome.length > 0,
      outside: outside?.(date) || undefined,
      confirmedSpend: sumMoney(spend.map((t) => -t.amount)),
      confirmedCount: spend.length,
      paidIn: sumMoney(income.map((t) => t.amount)),
      predictedBills: d.derived.upcoming_bills.filter((b) => b.date === date && b.date > d.asOf),
      predictedIncome,
      balance,
      balancePredicted: isFuture && balance !== null,
      belowZero: balance !== null && balance < 0,
    };
  });
}

const range = (start: ISODate, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i));

/** Fortnights you can step through: from the one holding the first day of data to the next pay cycle. */
export function fortnightBounds(d: PersonaData): { min: number; max: number } {
  const start = currentCycle(d).start;
  return { min: -Math.floor(daysBetween(d.profile.data_from, start) / 14), max: 1 };
}

/** A payday-to-payday fortnight (two rows of seven). offset 0 = current pay cycle, −1 = the one before. */
export function fortnight(d: PersonaData, offset = 0, overrides?: CategoryOverrides): {
  days: CalendarDay[]; start: ISODate; end: ISODate; offset: number; nextPayday: ISODate; nextIncome: ExpectedIncome[];
} {
  const { min, max } = fortnightBounds(d);
  const o = Math.max(min, Math.min(max, Math.trunc(offset) || 0));
  const start = addDays(currentCycle(d).start, 14 * o);
  const end = addDays(start, 13);
  const days = buildDays(d, range(start, 14), overrides);
  // Incomes just after this fortnight, for the "next payday" edge marker (not a fifteenth cell).
  const nextIncome = upcomingIncome(d, addDays(end, 7)).filter((i) => i.date > end);
  return { days, start, end, offset: o, nextPayday: addDays(end, 1), nextIncome };
}

export const isMonthKey = (v: string | undefined): v is string => !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  const t = y * 12 + (mo - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};

export function monthBounds(d: PersonaData): { min: string; max: string } {
  return { min: d.profile.data_from.slice(0, 7), max: forecastHorizon(d).slice(0, 7) };
}

/** A calendar month in full weeks, starting on the pay-cycle weekday so the columns match the fortnight. */
export function monthCalendar(d: PersonaData, month: string, overrides?: CategoryOverrides) {
  const { min, max } = monthBounds(d);
  const m = isMonthKey(month) ? (month < min ? min : month > max ? max : month) : d.asOf.slice(0, 7);
  const first = `${m}-01`;
  const last = addDays(`${shiftMonth(m, 1)}-01`, -1);
  const lead = (daysBetween(currentCycle(d).start, first) % 7 + 7) % 7;
  const gridStart = addDays(first, -lead);
  const total = Math.ceil((lead + daysBetween(first, last) + 1) / 7) * 7;
  const days = buildDays(d, range(gridStart, total), overrides, (date) => date < first || date > last);
  return { month: m, days, prev: m > min ? shiftMonth(m, -1) : null, next: m < max ? shiftMonth(m, 1) : null };
}

/** Totals for a selected run of days (inclusive). Confirmed and predicted are kept apart. */
export function rangeTotals(days: CalendarDay[], from: ISODate, to: ISODate) {
  const [a, b] = from <= to ? [from, to] : [to, from];
  const sel = days.filter((x) => x.date >= a && x.date <= b && !x.outside);
  return {
    from: a, to: b, days: daysBetween(a, b) + 1,
    spent: sumMoney(sel.map((x) => x.confirmedSpend)),
    paidIn: sumMoney(sel.map((x) => x.paidIn)),
    bills: sumMoney(sel.flatMap((x) => x.predictedBills.map((p) => p.expected_amount))),
    expectedIncome: sumMoney(sel.flatMap((x) => x.predictedIncome.map((p) => p.amount))),
  };
}

/** A day's posted and pending transactions (the day sheet). */
export function dayTransactions(d: PersonaData, date: ISODate, overrides?: CategoryOverrides): Transaction[] {
  return applyOverrides(d.transactions, overrides).filter((t) => t.date === date).sort((a, b) => a.amount - b.amount);
}
