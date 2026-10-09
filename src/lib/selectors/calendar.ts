import type { PersonaData, Transaction, UpcomingBill } from "@/lib/api/types";
import { addDays, daysBetween, weekday, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { dailyBalances, projectedBalances } from "./balance";
import { currentCycle } from "./periods";
import { upcomingIncome, type ExpectedIncome } from "./income";
import { applyOverrides, isCredit, isDebit, isIncome, posted, type CategoryOverrides } from "./transactions";
import { FIXED_COMMITMENTS } from "./budgets";
import { changeTone } from "./today";
import type { SpendCategory } from "./spending";

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
  /** Everyday spending that day (fixed commitments left out), and whether it was well above a typical day's
   * (the same CHANGE_THRESHOLD as Spending: over 20% and over $50 more). Only those days get a mark (09/10/2026). */
  everydaySpend: number;
  highSpend: boolean;
  /** Income received that day (wages, Centrelink). Pay advances are not income. */
  paidIn: number;
  /** The same income, by payer (the timeline names it). */
  income: { payer: string; amount: number }[];
  /** Other money in that day (pay advances, refunds): not income, but it moves the balance. */
  otherIn: { payer: string; amount: number }[];
  predictedBills: UpcomingBill[];
  /** Income expected on a future day (wages, Centrelink, other regular income), typical amounts. */
  predictedIncome: ExpectedIncome[];
  /** End-of-day balance: actual up to today, predicted after. null if unknown (never guessed). */
  balance: number | null;
  balancePredicted: boolean;
  belowZero: boolean;
}

/** A typical day's everyday spending: the last 90 days of posted debits (fixed commitments left out), per day. */
export function typicalDailySpend(d: PersonaData, overrides?: CategoryOverrides): number {
  const from = addDays(d.asOf, -89) < d.profile.data_from ? d.profile.data_from : addDays(d.asOf, -89);
  const days = daysBetween(from, d.asOf) + 1;
  const tx = posted(applyOverrides(d.transactions, overrides)).filter((t) => t.date >= from && t.date <= d.asOf && isDebit(t) && !FIXED_COMMITMENTS.includes(t.category as SpendCategory));
  return days > 0 ? sumMoney(tx.map((t) => -t.amount)) / days : 0;
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
  const typical = typicalDailySpend(d, overrides);
  return dates.map((date) => {
    const spend = tx.filter((t) => t.date === date && isDebit(t));
    const income = tx.filter((t) => t.date === date && isIncome(t));
    const isFuture = date > d.asOf;
    const balance = isFuture ? predicted.get(date) ?? null : actual.get(date) ?? null;
    const predictedIncome = expected.filter((i) => i.date === date);
    const everyday = sumMoney(spend.filter((t) => !FIXED_COMMITMENTS.includes(t.category as SpendCategory)).map((t) => -t.amount));
    return {
      date, weekday: weekday(date), isToday: date === d.asOf, isFuture,
      isPayday: paydays.has(date) || predictedIncome.length > 0,
      outside: outside?.(date) || undefined,
      confirmedSpend: sumMoney(spend.map((t) => -t.amount)),
      confirmedCount: spend.length,
      everydaySpend: everyday,
      highSpend: everyday > 0 && changeTone(everyday - typical, typical) === "up",
      paidIn: sumMoney(income.map((t) => t.amount)),
      income: income.map((t) => ({ payer: t.merchant, amount: t.amount })),
      otherIn: tx.filter((t) => t.date === date && isCredit(t) && !isIncome(t)).map((t) => ({ payer: t.merchant, amount: t.amount })),
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

// ---- Headline and timeline (08/10/2026): the answer first, then every money event in date order ------------

export type CalendarHeadline =
  /** The forecast goes below $0: how short, when, and how long before the next payday. */
  | { kind: "short"; date: ISODate; amount: number; payday: ISODate | null; daysBefore: number | null; bills: number; billCount: number }
  /** Never below $0: the lowest point and the payday it lasts until. */
  | { kind: "covered"; date: ISODate; balance: number; payday: ISODate | null; bills: number; billCount: number }
  /** A view that's all in the past: its lowest point and where it ended. */
  | { kind: "past"; date: ISODate; balance: number; closing: number; spent: number; count: number }
  | { kind: "none" };

const lowestOf = (list: CalendarDay[]) => list.reduce((lo, d) => (d.balance! < lo.balance! ? d : lo), list[0]!);

/**
 * The view's answer, from the same day figures as the chart, grid and timeline. Forecast days are today and after.
 * `followingPayday` is the payday just after the view (a fortnight ends the day before one).
 */
export function calendarHeadline(days: CalendarDay[], asOf: ISODate, followingPayday: ISODate | null = null): CalendarHeadline {
  const inView = days.filter((d) => !d.outside && d.balance !== null);
  if (!inView.length) return { kind: "none" };
  const ahead = inView.filter((d) => d.date >= asOf);
  if (!ahead.length) {
    const low = lowestOf(inView);
    const all = days.filter((d) => !d.outside);
    return { kind: "past", date: low.date, balance: low.balance!, closing: inView.at(-1)!.balance!,
      spent: sumMoney(all.map((d) => d.confirmedSpend)), count: all.reduce((n, d) => n + d.confirmedCount, 0) };
  }
  const low = lowestOf(ahead);
  const payday = days.find((d) => !d.outside && d.date > low.date && d.predictedIncome.length > 0)?.date ?? followingPayday;
  const due = days.filter((d) => !d.outside && d.date >= asOf && (!payday || d.date < payday)).flatMap((d) => d.predictedBills);
  const bills = sumMoney(due.map((b) => b.expected_amount));
  if (low.balance! < 0) {
    return { kind: "short", date: low.date, amount: -low.balance!, payday, daysBefore: payday ? daysBetween(low.date, payday) : null, bills, billCount: due.length };
  }
  return { kind: "covered", date: low.date, balance: low.balance!, payday, bills, billCount: due.length };
}

export interface TimelineEvent {
  key: string;
  kind: "income" | "credit" | "bill" | "spending" | "balance";
  label: string;
  /** Signed: money in positive, money out negative. 0 for a balance-only row. */
  amount: number;
  predicted: boolean;
  /** Spending rows: how many transactions they add up. */
  count?: number;
}
export interface TimelineDay {
  date: ISODate;
  isToday: boolean;
  events: TimelineEvent[];
  /** End-of-day balance, shown once on the day's last line. */
  balance: number | null;
  balancePredicted: boolean;
  belowZero: boolean;
  isLowest: boolean;
}

/**
 * Every money event in the view, grouped by day: confirmed pay and spending (one line per day) up to today, then
 * expected pay and predicted bills. Days with nothing happening are left out. `forecastEnds` is the first day the
 * forecast doesn't reach, so the view can say so instead of showing blanks.
 */
export function calendarTimeline(days: CalendarDay[], asOf: ISODate, lowest: ISODate | null): { days: TimelineDay[]; forecastEnds: ISODate | null } {
  const out: TimelineDay[] = [];
  for (const d of days) {
    if (d.outside || (d.balance === null && d.date > asOf)) continue;
    const events: TimelineEvent[] = d.date <= asOf
      ? [
          ...d.income.map((i, n) => ({ key: `in-${n}`, kind: "income" as const, label: i.payer, amount: i.amount, predicted: false })),
          ...d.otherIn.map((i, n) => ({ key: `cr-${n}`, kind: "credit" as const, label: i.payer, amount: i.amount, predicted: false })),
          ...(d.confirmedCount ? [{ key: "spend", kind: "spending" as const, label: "", amount: -d.confirmedSpend, predicted: false, count: d.confirmedCount }] : []),
        ]
      : [
          ...d.predictedIncome.map((i) => ({ key: `in-${i.payer}`, kind: "income" as const, label: i.payer, amount: i.amount, predicted: true })),
          ...[...d.predictedBills].sort((a, b) => b.expected_amount - a.expected_amount)
            .map((b) => ({ key: `bill-${b.merchant}`, kind: "bill" as const, label: b.merchant, amount: -b.expected_amount, predicted: true })),
        ];
    const isLowest = d.date === lowest;
    if (!events.length && !isLowest) continue;
    if (!events.length) events.push({ key: "bal", kind: "balance", label: "", amount: 0, predicted: d.balancePredicted });
    out.push({ date: d.date, isToday: d.isToday, events, balance: d.balance, balancePredicted: d.balancePredicted, belowZero: d.belowZero, isLowest });
  }
  const gap = days.find((d) => !d.outside && d.date > asOf && d.balance === null);
  return { days: out, forecastEnds: gap?.date ?? null };
}
