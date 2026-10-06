// "Is it working?": the last six pay cycles side by side, positive streaks, the SmartScore trend with the
// things the customer did in the app marked on it, and the value tally. Nothing ranks the customer against
// anyone else, and nothing counts a streak that ended.
import type { PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import type { ISODate } from "@/lib/format/dates";
import { cycleFacts, streak, type CycleFacts } from "./payCycleLoop";
import { cycleBefore } from "./periods";
import { valueTally } from "./tally";
import type { CategoryOverrides } from "./transactions";

export type StreakKind = "no_advance" | "no_failed_payment" | "money_left";
export interface Streak { kind: StreakKind; cycles: number }
export interface ActionMark { date: ISODate; kind: "cancelled_subscription" | "skip_advance" | "acted_on_bill"; label?: string }

/** Streaks worth celebrating: 2 or more completed pay cycles in a row. Shorter ones aren't mentioned. */
export function positiveStreaks(d: PersonaData, edits?: CategoryOverrides): Streak[] {
  const all: Streak[] = [
    { kind: "no_advance", cycles: streak(d, (f) => f.advances.count === 0, edits) },
    { kind: "no_failed_payment", cycles: streak(d, (f) => f.fees.count === 0, edits) },
    { kind: "money_left", cycles: streak(d, (f) => (f.endBalance ?? -1) >= 0, edits) },
  ];
  return all.filter((s) => s.cycles >= 2).sort((a, b) => b.cycles - a.cycles);
}

/** Completed pay cycles, oldest first (up to `n`, only those fully inside the data). */
export function cycleHistory(d: PersonaData, edits?: CategoryOverrides, n = 6): CycleFacts[] {
  const out: CycleFacts[] = [];
  for (let i = n; i >= 1; i--) {
    const c = cycleBefore(d, i);
    if (!c.limitedByHistory) out.push(cycleFacts(d, c, edits));
  }
  return out;
}

/** In-app actions, for marking on the score trend. */
export function actionMarks(a: AccountState): ActionMark[] {
  const marks: ActionMark[] = (a.actions ?? []).map((x) => ({ date: x.at.slice(0, 10), kind: x.type, label: x.key }));
  for (const [id, st] of Object.entries(a.feed ?? {})) {
    const m = /^bill_over_balance:(.+):\d{4}-\d{2}-\d{2}$/.exec(id);
    if (m && st.status === "done") marks.push({ date: st.at.slice(0, 10), kind: "acted_on_bill", label: m[1] });
  }
  return marks.sort((x, y) => x.date.localeCompare(y.date));
}

export function progress(d: PersonaData, a: AccountState = {}, edits?: CategoryOverrides) {
  return {
    cycles: cycleHistory(d, edits),
    streaks: positiveStreaks(d, edits),
    score: d.scoreHistory.map((h) => ({ date: h.scored_date, score: h.score })),
    marks: actionMarks(a),
    tally: valueTally(d, a),
  };
}
