// Hardship mode (journeys brief A2, 12/10/2026; flag hardship_mode_v1, needs compliance sign-off). Today offers the
// "I'm finding things hard right now" switch once, when strong signals are present. SAMPLE LOGIC: the thresholds
// below are the brief's; how many signals together count as "strong" is our assumption (HARDSHIP_MIN_SIGNALS).
import type { PersonaData } from "@/lib/api/types";
import { calendarDays } from "./calendarMonth";
import { repayments } from "./figures";
import { payAdvanceRun } from "./loans";
import { gamblingCard, moneyWent } from "./moneyPlan";
import { currentCycle, cycleBefore } from "./periods";
import type { CategoryOverrides } from "./transactions";

export const HARDSHIP_BELOW_ZERO_DAYS = 5;
export const HARDSHIP_MIN_LENDERS = 3;
/** Sample logic: two or more of the four signals together. */
export const HARDSHIP_MIN_SIGNALS = 2;

export type HardshipSignal = "below_zero" | "recurring_advances" | "lenders" | "gambling";

export function hardshipSignals(d: PersonaData, overrides?: CategoryOverrides): { signals: HardshipSignal[]; strong: boolean; belowZeroDays: number; lenders: number } {
  const now = currentCycle(d);
  // Below $0 on more than 5 days in a cycle: this cycle so far, or the whole of the last one.
  const days = calendarDays(d, overrides).filter((x) => !x.isFuture && x.balance !== null);
  const below = (from: string, to: string) => days.filter((x) => x.date >= from && x.date <= to && x.balance! < 0).length;
  const last = cycleBefore(d, 1);
  const belowZeroDays = Math.max(below(now.start, now.end), last.limitedByHistory ? 0 : below(last.start, last.end));
  const run = payAdvanceRun(d);
  const r = repayments(d, overrides);
  const lenders = r.count - r.advanceProviders;
  const gambling = !last.limitedByHistory && gamblingCard(d, moneyWent(d, last, overrides), overrides) !== null;
  const signals: HardshipSignal[] = [
    ...(belowZeroDays > HARDSHIP_BELOW_ZERO_DAYS ? ["below_zero" as const] : []),
    ...(run && run.count >= 2 ? ["recurring_advances" as const] : []),
    ...(lenders >= HARDSHIP_MIN_LENDERS ? ["lenders" as const] : []),
    ...(gambling ? ["gambling" as const] : []),
  ];
  return { signals, strong: signals.length >= HARDSHIP_MIN_SIGNALS, belowZeroDays, lenders };
}
