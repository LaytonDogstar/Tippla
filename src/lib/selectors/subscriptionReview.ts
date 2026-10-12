// Subscriptions redesign (12/10/2026): the review queue, the pay-cycle groups, the summary boxes, the streaming
// insight and what cancelling the ones you don't use would save. Pure: the page passes the detected subscriptions
// (subscriptions()), the member's answers and the pay cycle.
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { cents, sumMoney } from "@/lib/format/money";
import { isVideoStreaming } from "@/data/streaming";

export interface SubRow { merchant: string; amount: number; nextCharge: ISODate; perPayCycle: number; perYear: number }
/** "keep" = still using, "drop" = not using, "later" = not sure (asked again later). No entry = not answered. */
export type Answer = "keep" | "drop" | "later";
export type Answers = Record<string, Answer | undefined>;
export type Status = "using" | "notUsing" | "toCheck";

export const statusOf = (a: Answer | undefined): Status => (a === "keep" ? "using" : a === "drop" ? "notUsing" : "toCheck");

/** Pay cycles a year from the cycle length (14 days → 26). */
export const cyclesPerYear = (cycleDays: number) => Math.round(365 / Math.max(1, cycleDays));
/** A monthly charge spread across pay cycles. */
export const perCycle = (monthly: number, cycleDays = 14) => cents((monthly * 12) / cyclesPerYear(cycleDays));

/** Who to ask next: unanswered ones only (not "keep", "drop" or "later"); streaming first, then by next charge. */
export function reviewQueue<T extends SubRow>(rows: T[], answers: Answers): T[] {
  return rows.filter((r) => !answers[r.merchant])
    .sort((a, b) => Number(isVideoStreaming(b.merchant)) - Number(isVideoStreaming(a.merchant)) || a.nextCharge.localeCompare(b.nextCharge) || a.merchant.localeCompare(b.merchant));
}

/** Checked = answered "keep" or "drop" ("Not sure" is still to check). */
export function checkedCounts(rows: SubRow[], answers: Answers) {
  const n = (s: Status) => rows.filter((r) => statusOf(answers[r.merchant]) === s).length;
  return { total: rows.length, using: n("using"), notUsing: n("notUsing"), checked: n("using") + n("notUsing"), later: rows.filter((r) => answers[r.merchant] === "later").length, toCheck: n("toCheck") };
}

export interface CycleGroup<T extends SubRow = SubRow> { kind: "beforePayday" | "next" | "following"; from: ISODate; to: ISODate | null; rows: T[]; total: number }
/**
 * Every subscription by next charge, in pay-cycle groups: before payday (today to the day before), the next cycle
 * (payday and the cycle after it, so one due on payday is in the next cycle), and everything after.
 */
export function cycleGroups<T extends SubRow>(rows: T[], asOf: ISODate, nextPayday: ISODate, cycleDays = 14): CycleGroup<T>[] {
  const sorted = [...rows].sort((a, b) => a.nextCharge.localeCompare(b.nextCharge) || a.merchant.localeCompare(b.merchant));
  const following = addDays(nextPayday, cycleDays);
  const g = (kind: CycleGroup["kind"], from: ISODate, to: ISODate | null, list: T[]): CycleGroup<T> => ({ kind, from, to, rows: list, total: sumMoney(list.map((r) => r.amount)) });
  return [
    g("beforePayday", asOf, addDays(nextPayday, -1), sorted.filter((r) => r.nextCharge < nextPayday)),
    g("next", nextPayday, addDays(following, -1), sorted.filter((r) => r.nextCharge >= nextPayday && r.nextCharge < following)),
    g("following", following, null, sorted.filter((r) => r.nextCharge >= following)),
  ].filter((x) => x.kind !== "following" || x.rows.length > 0);
}

/** The next charge, and whether it comes before or after payday (on payday counts as after: the pay is in). */
export function nextCharge<T extends SubRow>(rows: T[], nextPayday: ISODate): (T & { afterPayday: boolean }) | null {
  const first = [...rows].sort((a, b) => a.nextCharge.localeCompare(b.nextCharge) || b.amount - a.amount)[0];
  return first ? { ...first, afterPayday: first.nextCharge >= nextPayday } : null;
}

/** Two or more video streaming services: the insight strip. null otherwise. */
export function streamingInsight(rows: SubRow[]): { names: string[]; monthly: number; yearly: number } | null {
  const s = rows.filter((r) => isVideoStreaming(r.merchant)).sort((a, b) => b.amount - a.amount || a.merchant.localeCompare(b.merchant));
  if (s.length < 2) return null;
  const monthly = sumMoney(s.map((r) => r.amount));
  return { names: s.map((r) => r.merchant), monthly, yearly: cents(monthly * 12) };
}

/** What cancelling the ones marked "Not using" would save (leaving out any already cancelled). null when none. */
export function couldSave<T extends SubRow>(rows: T[], answers: Answers, cancelled: Set<string> = new Set(), cycleDays = 14) {
  const list = rows.filter((r) => answers[r.merchant] === "drop" && !cancelled.has(r.merchant)).sort((a, b) => a.nextCharge.localeCompare(b.nextCharge));
  if (!list.length) return null;
  const monthly = sumMoney(list.map((r) => r.amount));
  return { rows: list, monthly, yearly: cents(monthly * 12), perCycle: perCycle(monthly, cycleDays) };
}

export const cycleLength = (start: ISODate, end: ISODate) => daysBetween(start, end) + 1;
