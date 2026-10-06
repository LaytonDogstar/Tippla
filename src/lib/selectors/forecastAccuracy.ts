// Spec 05 forecast accuracy (Q31, sample logic). Tippla's end-of-day balance forecast for a day D, made h days
// earlier on day S = D − h: the balance on S, plus the recurring payments and income due in (S, D] (bills,
// subscriptions, repayments and pay, as Tippla predicts them), minus everyday spending at the member's
// usual daily rate over the 28 days before S. Backtested against TaleFin's end-of-day balances (AM2019), so
// accuracy is there from day one; stored snapshots (forecast_snapshots) take over as real days pass.
import type { PersonaData } from "@/lib/api/types";
import { FORECAST_ACCURACY } from "@/config/flags";
import { addDays, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { currentBalance, dailyBalances } from "./balance";
import { upcomingIncome } from "./income";
import { posted } from "./transactions";

export const HORIZONS = [1, 3, 7, 14] as const;
const USUAL_DAYS = 28;

const known = (t: { is_recurring: boolean; category: string }) => t.is_recurring || t.category === "income";

/** Everyday (non-recurring, non-income) spending per day over the 28 days before `before`. */
function usualDailySpend(d: PersonaData, before: ISODate): number {
  const from = addDays(before, -USUAL_DAYS);
  const out = posted(d.transactions).filter((t) => t.date > from && t.date <= before && t.amount < 0 && !known(t) && t.category !== "transfer");
  return sumMoney(out.map((t) => -t.amount)) / USUAL_DAYS;
}

export interface ForecastPoint { madeOn: ISODate; forDate: ISODate; horizon: number; predicted: number; actual: number; error: number }

/** The forecast for `forDate` made `horizon` days before, with the actual balance; null without balances. */
export function backtestPoint(d: PersonaData, forDate: ISODate, horizon: number): ForecastPoint | null {
  const bal = new Map(dailyBalances(d).map((p) => [p.date, p.balance]));
  const madeOn = addDays(forDate, -horizon);
  const start = bal.get(madeOn), actual = bal.get(forDate);
  if (start === undefined || actual === undefined || forDate > d.asOf) return null;
  const flows = posted(d.transactions).filter((t) => t.date > madeOn && t.date <= forDate && known(t)).map((t) => t.amount);
  const predicted = Math.round((start + sumMoney(flows) - usualDailySpend(d, madeOn) * horizon) * 100) / 100;
  return { madeOn, forDate, horizon, predicted, actual, error: Math.round((predicted - actual) * 100) / 100 };
}

/** The last `days` completed days' forecasts at one horizon, newest first. */
export function backtest(d: PersonaData, horizon: number, days = 30): ForecastPoint[] {
  return Array.from({ length: days }, (_, i) => backtestPoint(d, addDays(d.asOf, -1 - i), horizon)).filter((p): p is ForecastPoint => !!p);
}

export interface Accuracy {
  /** Within $X on N of the last M days (1-day forecasts). */
  hits: number; of: number; within: number;
  /** Shown to the member only when accurate enough (FORECAST_ACCURACY.showMin of the last `of`). */
  show: boolean;
  /** Yesterday's forecast was badly wrong: ask what happened (spec 05). */
  miss: ForecastPoint | null;
  /** Mean absolute error by horizon (internal dashboard). */
  mae: Record<number, number | null>;
}

export const isBadMiss = (p: ForecastPoint) =>
  Math.abs(p.error) > FORECAST_ACCURACY.missDollars || (Math.abs(p.actual) >= 1 && Math.abs(p.error) / Math.abs(p.actual) > FORECAST_ACCURACY.missShare);

export function forecastAccuracy(d: PersonaData): Accuracy {
  const { within, of, showMin } = FORECAST_ACCURACY;
  const last = backtest(d, 1, of);
  const hits = last.filter((p) => Math.abs(p.error) <= within).length;
  const y = last[0] && last[0].forDate === addDays(d.asOf, -1) ? last[0] : null;
  const mae = Object.fromEntries(HORIZONS.map((h) => {
    const pts = backtest(d, h, 30);
    return [h, pts.length ? Math.round(pts.reduce((a, p) => a + Math.abs(p.error), 0) / pts.length) : null];
  }));
  return { hits, of: last.length, within, show: last.length >= of && hits >= showMin, miss: y && isBadMiss(y) ? y : null, mae };
}

/** Today's forecast for `horizon` days ahead, by the same rule (stored daily as a snapshot). */
export function forecastAhead(d: PersonaData, horizon: number): { forDate: ISODate; predicted: number } {
  const forDate = addDays(d.asOf, horizon);
  const start = dailyBalances(d).find((p) => p.date === d.asOf)?.balance ?? currentBalance(d);
  const bills = d.derived.upcoming_bills.filter((b) => b.date > d.asOf && b.date <= forDate).map((b) => -b.expected_amount);
  const pay = upcomingIncome(d, forDate).filter((i) => i.date > d.asOf).map((i) => i.amount);
  return { forDate, predicted: Math.round((start + sumMoney([...bills, ...pay]) - usualDailySpend(d, d.asOf) * horizon) * 100) / 100 };
}
