// A buffer goal: "have $200 left the day before payday by 15/12". It builds up evenly across the pay
// cycles until the date (Q22 sample logic), and the progress is the money actually left the day before the
// most recent payday. Never a fail state: a missed step simply carries on the next pay cycle.
import type { PersonaData } from "@/lib/api/types";
import type { Goal } from "@/lib/account/state";
import { GOAL_MIN_CYCLES } from "@/config/flags";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { cycleFacts } from "./payCycleLoop";
import { cycleBefore } from "./periods";

export interface GoalPlan {
  amount: number;
  by: ISODate;
  /** Pay cycles from the one the goal was set in to the one containing `by`. */
  cyclesTotal: number;
  /** Which of those the current pay cycle is (1-based, capped at cyclesTotal). */
  cycleNumber: number;
  /** Aim for this much left the day before this coming payday. */
  thisCycle: number;
  /** Money left the day before the most recent payday since the goal was set (null until one has passed). */
  latest: { date: ISODate; amount: number } | null;
  /** 0–100, from `latest`. */
  percent: number;
  reached: boolean;
  /** The goal date has passed. */
  ended: boolean;
}

/** Index of the pay cycle containing `date`, counting from the current one (0). */
const cycleIndex = (d: PersonaData, date: ISODate) => Math.floor(daysBetween(d.derived.pay_cycle.start, date) / 14);

export function goalPlan(d: PersonaData, goal: Goal | undefined): GoalPlan | null {
  if (!goal) return null;
  const first = cycleIndex(d, goal.setAt);
  const last = Math.max(first + GOAL_MIN_CYCLES - 1, cycleIndex(d, goal.by));
  const cyclesTotal = last - first + 1;
  const cycleNumber = Math.min(cyclesTotal, Math.max(1, -first + 1));
  const ended = d.asOf > goal.by;
  // Once the date has passed nothing more is set aside until the customer sets a new goal.
  const thisCycle = ended ? 0 : Math.round((goal.amount * cycleNumber) / cyclesTotal);
  // The most recent completed pay cycle that ended after the goal was set.
  const prev = cycleBefore(d, 1);
  const f = prev.end >= goal.setAt && !prev.limitedByHistory ? cycleFacts(d, prev) : null;
  const latest = f && f.endBalance !== null ? { date: prev.end, amount: f.endBalance } : null;
  const percent = latest ? Math.max(0, Math.min(100, Math.round((latest.amount / goal.amount) * 100))) : 0;
  return {
    amount: goal.amount, by: goal.by, cyclesTotal, cycleNumber, thisCycle, latest, percent,
    reached: !!latest && latest.amount >= goal.amount,
    ended,
  };
}

/**
 * Goal dates offered when setting one: the day before each of the next eight paydays (from two pay cycles
 * out), with how many pay cycles the goal would build over. The fourth (about ten weeks) is the default.
 */
export function goalDateOptions(d: PersonaData): { by: ISODate; payday: ISODate; cycles: number }[] {
  const next = d.derived.pay_cycle.next_payday;
  return Array.from({ length: 8 }, (_, k) => {
    const payday = addDays(next, 14 * (k + GOAL_MIN_CYCLES - 1));
    return { by: addDays(payday, -1), payday, cycles: k + GOAL_MIN_CYCLES };
  });
}
export const DEFAULT_GOAL_OPTION = 3;
