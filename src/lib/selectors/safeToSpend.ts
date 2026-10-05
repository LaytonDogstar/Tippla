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
}

export function safeToSpend(d: PersonaData, buffer = SAFE_TO_SPEND_BUFFER): SafeToSpend {
  const payday = d.derived.pay_cycle.next_payday;
  const forecastDate = addDays(payday, -1);
  const days = Math.max(1, daysBetween(d.asOf, payday));
  const balance = currentBalance(d);
  const bills = d.derived.upcoming_bills.filter((b) => b.date > d.asOf && b.date < payday).map((b) => ({ date: b.date, merchant: b.merchant, amount: b.expected_amount }));
  const incomeTotal = sumMoney(upcomingIncome(d, forecastDate).filter((i) => i.date > d.asOf && i.date < payday).map((i) => i.amount));
  const billsTotal = sumMoney(bills.map((b) => b.amount));
  const forecast = forecastDate > d.asOf ? projectedBalances(d, forecastDate).at(-1)?.balance ?? balance : balance;
  const spare = forecast - buffer;
  return {
    perDay: spare > 0 ? Math.floor(spare / days) : 0,
    balance, bills, billsTotal, incomeTotal, forecast, forecastDate, buffer, days, payday,
    nothingSpare: spare <= 0,
  };
}
