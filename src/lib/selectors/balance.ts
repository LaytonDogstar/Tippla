import type { PersonaData } from "@/lib/api/types";
import { metric } from "@/lib/dataUse";
import { addDays, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { upcomingIncome } from "./income";

export const currentBalance = (d: PersonaData): number =>
  sumMoney((d.bankStatement.profiles[0]?.accounts ?? []).map((a) => a.available));

export interface BalancePoint { date: ISODate; balance: number; predicted: boolean }

/** End-of-day balances (AM2019). */
export const dailyBalances = (d: PersonaData): BalancePoint[] =>
  metric<{ date: string; balance: number }[]>(d.bankStatement, "AM2019").map((p) => ({ ...p, predicted: false }));

/** Days below $0 in the last 90 days (AM2177) — a plain fact, neutral styling. */
export const daysOverdrawn90 = (d: PersonaData): number =>
  metric<{ "90": { account_balance_overdrawn: number } }>(d.bankStatement, "AM2177")["90"].account_balance_overdrawn;

/** Lowest end-of-day balance in the last 90 days (AM2161). */
export const lowestBalance90 = (d: PersonaData): number =>
  metric<{ "90": { min_amount: number } }>(d.bankStatement, "AM2161")["90"].min_amount;

/**
 * Forecast end-of-day balance from the day after the data date to `until`: predicted bills out, expected
 * income in (typical amounts). No guess at everyday spending. Label these "predicted".
 */
export function projectedBalances(d: PersonaData, until: ISODate): BalancePoint[] {
  const incomes = upcomingIncome(d, until);
  const out: BalancePoint[] = [];
  let bal = currentBalance(d);
  for (let day = addDays(d.asOf, 1); day <= until; day = addDays(day, 1)) {
    const bills = d.derived.upcoming_bills.filter((b) => b.date === day).map((b) => -b.expected_amount);
    const pay = incomes.filter((i) => i.date === day).map((i) => i.amount);
    bal = sumMoney([bal, ...bills, ...pay]);
    out.push({ date: day, balance: bal, predicted: true });
  }
  return out;
}
