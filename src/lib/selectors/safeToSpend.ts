// "Safe to spend today" = (forecast balance at payday − buffer) ÷ days until payday. The forecast is the
// balance now, minus predicted bills, plus expected income, up to the day before payday. Everyday spending
// is what the daily figure is for. Never negative: when bills take everything it says so plainly.
import type { PersonaData } from "@/lib/api/types";
import { SAFE_TO_SPEND_BUFFER } from "@/config/flags";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { currentBalance, projectedBalances } from "./balance";
import { upcomingIncome } from "./income";

export interface SafeToSpend {
  perDay: number;
  balance: number;
  bills: { date: ISODate; merchant: string; amount: number }[];
  billsTotal: number;
  incomeTotal: number;
  /** Forecast end-of-day balance the day before payday. */
  forecast: number;
  forecastDate: ISODate;
  buffer: number;
  days: number;
  payday: ISODate;
  /** True when the forecast doesn't clear the buffer: nothing spare before payday. */
  nothingSpare: boolean;
  /** Set aside this pay cycle for the customer's goal (0 when there's no goal or it's on hold). */
  goal: number;
  /** The goal would leave nothing to spend, so it waits this pay cycle (bills and everyday spending first). */
  goalOnHold: boolean;
  /** No regular payday found: the figure covers the next 7 days instead (spec 02). */
  sevenDayMode: boolean;
  /** Income is irregular, so the payday is an estimate (labelled as such). */
  paydayEstimated: boolean;
}

/** Below this income-stability factor (/10), the payday is shown as estimated. SAMPLE LOGIC. */
export const STABLE_INCOME_MIN = 5;

/** `goal` is this pay cycle's goal target (selectors/goal.ts → goalPlan().thisCycle). */
export function safeToSpend(d: PersonaData, opts: { buffer?: number; goal?: number } = {}): SafeToSpend {
  const buffer = opts.buffer ?? SAFE_TO_SPEND_BUFFER;
  // No payday detected: work over the next 7 days instead.
  const sevenDayMode = !d.derived.pay_cycle?.next_payday;
  const payday = sevenDayMode ? addDays(d.asOf, 7) : d.derived.pay_cycle.next_payday;
  const stability = d.score?.breakdown?.INCOME ?? null;
  const forecastDate = addDays(payday, -1);
  const days = Math.max(1, daysBetween(d.asOf, payday));
  const balance = currentBalance(d);
  const bills = d.derived.upcoming_bills.filter((b) => b.date > d.asOf && b.date < payday).map((b) => ({ date: b.date, merchant: b.merchant, amount: b.expected_amount }));
  const incomeTotal = sumMoney(upcomingIncome(d, forecastDate).filter((i) => i.date > d.asOf && i.date < payday).map((i) => i.amount));
  const billsTotal = sumMoney(bills.map((b) => b.amount));
  const forecast = forecastDate > d.asOf ? projectedBalances(d, forecastDate).at(-1)?.balance ?? balance : balance;
  const spare = forecast - buffer;
  const wanted = Math.max(0, opts.goal ?? 0);
  // A goal never takes the daily figure to $0: if it would, it waits until a pay cycle with room.
  const goalOnHold = wanted > 0 && spare - wanted <= 0;
  const goal = goalOnHold ? 0 : wanted;
  return {
    perDay: spare - goal > 0 ? Math.floor((spare - goal) / days) : 0,
    balance, bills, billsTotal, incomeTotal, forecast, forecastDate, buffer, days, payday,
    nothingSpare: spare <= 0, goal, goalOnHold, sevenDayMode,
    paydayEstimated: !sevenDayMode && stability !== null && stability < STABLE_INCOME_MIN,
  };
}
