import type { CategoryId, PersonaData } from "@/lib/api/types";
import { addDays, type ISODate } from "@/lib/format/dates";
import { currentBalance, projectedBalances } from "@/lib/selectors/balance";
import type { FeedSection } from "../types";

/** Forecast end-of-day balance for a date (today = the actual balance). */
export function forecastOn(d: PersonaData, date: ISODate): number {
  if (date <= d.asOf) return currentBalance(d);
  return projectedBalances(d, date).find((p) => p.date === date)?.balance ?? currentBalance(d);
}
/** Balance going into a day: the previous day's end-of-day forecast. */
export const balanceBefore = (d: PersonaData, date: ISODate) => forecastOn(d, addDays(date, -1));

const BORROWING: CategoryId[] = ["loan_repayment", "bnpl", "wage_advance"];
export const sectionFor = (c: CategoryId): FeedSection => (BORROWING.includes(c) ? "borrowing" : "money");

/** Never surfaced in the feed: gambling and alcohol stay as the gentle, opt-in insight on Spending. */
export const QUIET_CATEGORIES: CategoryId[] = ["gambling", "alcohol"];
