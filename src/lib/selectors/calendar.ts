import type { PersonaData, UpcomingBill } from "@/lib/api/types";
import { addDays, weekday, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { dailyBalances, projectedBalances } from "./balance";
import { currentCycle } from "./periods";
import { upcomingIncome, type ExpectedIncome } from "./income";
import { isDebit, isIncome, posted } from "./transactions";

export interface CalendarDay {
  date: ISODate;
  weekday: string;
  isToday: boolean;
  isFuture: boolean;
  isPayday: boolean;
  confirmedSpend: number;
  confirmedCount: number;
  predictedBills: UpcomingBill[];
  /** Income expected on a future day (wages, Centrelink, other regular income), typical amounts. */
  predictedIncome: ExpectedIncome[];
  /** End-of-day balance: actual up to today, predicted after. null if unknown. */
  balance: number | null;
  balancePredicted: boolean;
  belowZero: boolean;
}

/** The current fortnight, payday to payday (two rows of seven). */
export function fortnight(d: PersonaData): { days: CalendarDay[]; nextPayday: ISODate; nextIncome: ExpectedIncome[] } {
  const cycle = currentCycle(d);
  const tx = posted(d.transactions);
  const actual = new Map(dailyBalances(d).map((p) => [p.date, p.balance]));
  const predicted = new Map(projectedBalances(d, cycle.end).map((p) => [p.date, p.balance]));
  const paydays = new Set(tx.filter(isIncome).map((t) => t.date));
  const expected = upcomingIncome(d, cycle.end);
  const days: CalendarDay[] = [];
  for (let i = 0; i < 14; i++) {
    const date = addDays(cycle.start, i);
    const spend = tx.filter((t) => t.date === date && isDebit(t));
    const isFuture = date > d.asOf;
    const balance = isFuture ? predicted.get(date) ?? null : actual.get(date) ?? null;
    days.push({
      date, weekday: weekday(date), isToday: date === d.asOf, isFuture,
      isPayday: paydays.has(date) || expected.some((i) => i.date === date),
      confirmedSpend: sumMoney(spend.map((t) => -t.amount)),
      confirmedCount: spend.length,
      predictedBills: d.derived.upcoming_bills.filter((b) => b.date === date && b.date > d.asOf),
      predictedIncome: expected.filter((i) => i.date === date),
      balance,
      balancePredicted: isFuture && balance !== null,
      belowZero: balance !== null && balance < 0,
    });
  }
  // Incomes just after the fortnight, for the "next payday" edge marker.
  const nextIncome = upcomingIncome(d, addDays(cycle.end, 7)).filter((i) => i.date > cycle.end);
  return { days, nextPayday: d.derived.pay_cycle.next_payday, nextIncome };
}
