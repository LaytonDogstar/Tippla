// Calendar (month first, 09/10/2026; reference: tippla-calendar-mockup.dc.html). One list of days, from the first
// day of data to the end of the forecast, each with its end-of-day balance (actual up to today, forecast after) and
// its items: posted and pending transactions up to today, predicted bills and expected pay after. Pending items are
// listed but never counted: not in money in or out, not in "Out $X", not in any balance. The month grid, the stats,
// the banner and the detail panel all read these days, so every figure agrees.
import type { PersonaData } from "@/lib/api/types";
import { categoryNames } from "@/content/en-AU";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { currentBalance, dailyBalances, projectedBalances } from "./balance";
import { forecastHorizon } from "./calendar";
import { upcomingIncome } from "./income";
import { currentCycle } from "./periods";
import { applyOverrides, type CategoryOverrides } from "./transactions";

/** Which chip an item gets in a day cell (none = no chip; it's still listed in the panel). */
export type ItemKind = "pay" | "advance" | "bill" | "other";
export interface CalItem {
  id: string;
  name: string;
  /** What it is, in words: the category, or "Pay advance" / "Pay advance repayment". */
  label: string;
  /** Signed: money in positive, money out negative. */
  amount: number;
  kind: ItemKind;
  status: "posted" | "pending" | "predicted";
}
export interface CalDay {
  date: ISODate;
  isToday: boolean;
  isFuture: boolean;
  /** End-of-day balance: actual up to today, forecast after; null where there's neither (never guessed). */
  balance: number | null;
  items: CalItem[];
  /** Posted money in and out that day (pending left out). On forecast days: expected pay and predicted bills. */
  moneyIn: number;
  moneyOut: number;
  /** Pending spending that day: listed, not counted. */
  pending: number;
  /** Everyday spending: posted debits, leaving out rent, loan repayments, bills, BNPL and pay-advance repayments. */
  everyday: number;
}

/** Not everyday spending (the banner's average): commitments that would be paid anyway. */
export const NOT_EVERYDAY = ["housing", "loan_repayment", "bills", "bnpl", "wage_advance", "transfer"] as const;
const BILL_KINDS = ["housing", "loan_repayment", "bills", "bnpl"];

const kindOf = (category: string): ItemKind =>
  category === "income" ? "pay" : category === "wage_advance" ? "advance" : BILL_KINDS.includes(category) ? "bill" : "other";
const labelOf = (category: string, amount: number) =>
  category === "wage_advance" ? (amount > 0 ? "Pay advance" : "Pay advance repayment") : category === "income" ? "Pay" : categoryNames[category as keyof typeof categoryNames] ?? category;

/** Every day from the first day of data to the end of the forecast. */
export function calendarDays(d: PersonaData, overrides?: CategoryOverrides): CalDay[] {
  const horizon = forecastHorizon(d);
  const actual = new Map(dailyBalances(d).map((p) => [p.date, p.balance]));
  actual.set(d.asOf, actual.get(d.asOf) ?? currentBalance(d));
  const forecast = new Map(projectedBalances(d, horizon).map((p) => [p.date, p.balance]));
  const incomes = upcomingIncome(d, horizon);
  const tx = applyOverrides(d.transactions, overrides);
  const byDate = new Map<ISODate, CalItem[]>();
  const push = (date: ISODate, item: CalItem) => byDate.set(date, [...(byDate.get(date) ?? []), item]);
  for (const t of tx) {
    if (t.date > d.asOf) continue;
    push(t.date, { id: t.id, name: t.merchant, label: labelOf(t.category, t.amount), amount: t.amount, kind: kindOf(t.category), status: t.status === "pending" ? "pending" : "posted" });
  }
  for (const i of incomes) push(i.date, { id: `in:${i.date}:${i.payer}`, name: i.payer, label: "Pay", amount: i.amount, kind: "pay", status: "predicted" });
  for (const b of d.derived.upcoming_bills) {
    if (b.date <= d.asOf || b.date > horizon) continue;
    push(b.date, { id: `bill:${b.date}:${b.merchant}`, name: b.merchant, label: labelOf(b.category, -b.expected_amount), amount: -b.expected_amount, kind: kindOf(b.category), status: "predicted" });
  }
  const out: CalDay[] = [];
  for (let date = d.profile.data_from; date <= horizon; date = addDays(date, 1)) {
    const items = (byDate.get(date) ?? []).sort((a, b) => order(a) - order(b) || a.amount - b.amount);
    const counted = items.filter((i) => i.status !== "pending");
    const isFuture = date > d.asOf;
    out.push({
      date, isToday: date === d.asOf, isFuture,
      balance: isFuture ? forecast.get(date) ?? null : actual.get(date) ?? null,
      items,
      moneyIn: sumMoney(counted.filter((i) => i.amount > 0).map((i) => i.amount)),
      moneyOut: sumMoney(counted.filter((i) => i.amount < 0).map((i) => -i.amount)),
      pending: sumMoney(items.filter((i) => i.status === "pending").map((i) => -i.amount)),
      everyday: sumMoney(tx.filter((t) => t.date === date && t.status === "posted" && t.amount < 0 && !(NOT_EVERYDAY as readonly string[]).includes(t.category)).map((t) => -t.amount)),
    });
  }
  return out;
}
// Pay first, then advances, then bills, then the rest (pending after posted).
const order = (i: CalItem) => ({ pay: 0, advance: 1, bill: 2, other: 3 })[i.kind] + (i.status === "pending" ? 4 : 0);

// ---- The month grid ------------------------------------------------------------------------------------------

export const monthKey = (date: ISODate) => date.slice(0, 7);
export const shiftMonth = (m: string, n: number) => {
  const [y, mo] = m.split("-").map(Number) as [number, number];
  const t = y * 12 + (mo - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}`;
};
const mondayIndex = (date: ISODate) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

/** A month in Monday-to-Sunday weeks. Cells outside the month are null (muted, not interactive), with their date. */
export function monthGrid(month: string): { date: ISODate; inMonth: boolean }[] {
  const first = `${month}-01`;
  const last = addDays(`${shiftMonth(month, 1)}-01`, -1);
  const start = addDays(first, -mondayIndex(first));
  const end = addDays(last, 6 - mondayIndex(last));
  const out: { date: ISODate; inMonth: boolean }[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) out.push({ date, inMonth: date >= first && date <= last });
  return out;
}

/** Months you can step through: the first month of data to the month the forecast ends in. */
export const monthRange = (days: CalDay[]) => ({ min: monthKey(days[0]!.date), max: monthKey(days.at(-1)!.date) });

/** The lowest forecast day (after today); null if there's no forecast. */
export function lowestForecast(days: CalDay[]): CalDay | null {
  return days.filter((x) => x.isFuture && x.balance !== null).reduce<CalDay | null>((lo, x) => (!lo || x.balance! < lo.balance! ? x : lo), null);
}

// ---- Now: the banner and the four stats ------------------------------------------------------------------------

export interface CalendarNow {
  balanceToday: number | null;
  lowest: { date: ISODate; balance: number; dayBeforePayday: boolean } | null;
  /** Predicted bills from tomorrow to the end of this pay cycle (before payday). */
  bills: { total: number; payees: string[] };
  /** Days with an end-of-day balance below $0, from the 1st of this month to today, and how many days that is. */
  belowZero: { days: number; of: number };
  /** Average everyday spending a day this month so far (whole dollars). */
  everydayPerDay: number;
  /** Shown only when a forecast day goes below $0. */
  short: { date: ISODate; amount: number } | null;
}

export function calendarNow(d: PersonaData, days: CalDay[]): CalendarNow {
  const today = days.find((x) => x.isToday) ?? null;
  const low = lowestForecast(days);
  const nextPayday = d.derived.pay_cycle.next_payday;
  const due = days.filter((x) => x.isFuture && x.date < nextPayday).flatMap((x) => x.items.filter((i) => i.status === "predicted" && i.amount < 0));
  const monthStart = `${monthKey(d.asOf)}-01`;
  const soFar = days.filter((x) => x.date >= monthStart && x.date <= d.asOf);
  return {
    balanceToday: today?.balance ?? null,
    lowest: low ? { date: low.date, balance: low.balance!, dayBeforePayday: addDays(low.date, 1) === nextPayday } : null,
    bills: { total: sumMoney(due.map((i) => -i.amount)), payees: [...new Set(due.map((i) => i.name))] },
    belowZero: { days: soFar.filter((x) => x.balance !== null && x.balance < 0).length, of: soFar.length },
    everydayPerDay: everydayAverage(days, monthStart, d.asOf),
    short: low && low.balance! < 0 ? { date: low.date, amount: -low.balance! } : null,
  };
}

/** Average everyday spending a day from `from` to `to` (days with data only), whole dollars. */
export function everydayAverage(days: CalDay[], from: ISODate, to: ISODate): number {
  const sel = days.filter((x) => x.date >= from && x.date <= to);
  return sel.length ? Math.round(sumMoney(sel.map((x) => x.everyday)) / sel.length) : 0;
}

/** The pay cycle we're in and the one before, from the detected paydays. */
export function payCycleRanges(d: PersonaData): { last: [ISODate, ISODate]; this: [ISODate, ISODate] } {
  const c = currentCycle(d);
  const len = daysBetween(c.start, c.end) + 1;
  return { this: [c.start, c.end], last: [addDays(c.start, -len), addDays(c.start, -1)] };
}

// ---- A selected day or range -----------------------------------------------------------------------------------

export interface RangeSummary {
  from: ISODate; to: ISODate; days: number;
  /** End-of-day balance the day before; null before the first day of data. */
  opening: number | null;
  moneyIn: number;
  moneyOut: number;
  closing: number | null;
  closingIsForecast: boolean;
  lowest: { date: ISODate; balance: number } | null;
  /** The first forecast day in the range, if it reaches past today. */
  forecastFrom: ISODate | null;
  pending: number;
}

export function rangeSummary(days: CalDay[], a: ISODate, b: ISODate): RangeSummary {
  const [from, to] = a <= b ? [a, b] : [b, a];
  const sel = days.filter((x) => x.date >= from && x.date <= to);
  const before = days.find((x) => x.date === addDays(from, -1));
  const last = sel.at(-1);
  const withBalance = sel.filter((x) => x.balance !== null);
  const low = withBalance.reduce<CalDay | null>((lo, x) => (!lo || x.balance! < lo.balance! ? x : lo), null);
  return {
    from, to, days: daysBetween(from, to) + 1,
    opening: before?.balance ?? null,
    moneyIn: sumMoney(sel.map((x) => x.moneyIn)),
    moneyOut: sumMoney(sel.map((x) => x.moneyOut)),
    closing: last?.balance ?? null,
    closingIsForecast: !!last?.isFuture,
    lowest: low ? { date: low.date, balance: low.balance! } : null,
    forecastFrom: sel.find((x) => x.isFuture)?.date ?? null,
    pending: sumMoney(sel.map((x) => x.pending)),
  };
}
