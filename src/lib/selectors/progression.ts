// Spec 07 progression: streak milestones, buffer growth, savings goals, the "You've reached Healthy" moment,
// "What's next" by band, and who the gated cheaper-credit check could ever be shown to. Pure.
import type { PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { BUFFER_STEPS, STREAK_MILESTONES } from "@/config/flags";
import { STAGES, type StageId } from "@/config/stages";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { payCycleSummary } from "./payCycle";
import { positiveStreaks, type Streak } from "./progress";
import { scoreState } from "./score";
import { valueTally } from "./tally";

const stageOf = (score: number): StageId => STAGES.find((s) => score >= s.min && score <= s.max)!.id;
const ORDER: StageId[] = ["building", "steadying", "healthy", "thriving"];

/** Streaks that just reached 2, 4 or 6 pay cycles get a card (no points, no badges). */
export const streakMilestones = (d: PersonaData): Streak[] => positiveStreaks(d).filter((s) => (STREAK_MILESTONES as readonly number[]).includes(s.cycles));

/** One pay cycle of bills: the predicted bills in the next 14 days. */
export const cycleOfBills = (d: PersonaData): number =>
  Math.round(sumMoney(d.derived.upcoming_bills.filter((b) => b.date > d.asOf && b.date <= addDays(d.asOf, 14)).map((b) => b.expected_amount)));

/** Buffer growth path: $50 → $100 → $250 → one pay cycle of bills. The next step above the current buffer. */
export function nextBufferStep(d: PersonaData, current = 0): number | null {
  const steps = [...BUFFER_STEPS, cycleOfBills(d)].filter((v, i, a) => a.indexOf(v) === i).sort((x, y) => x - y);
  return steps.find((s) => s > current) ?? null;
}

/** "Move $X to your buffer?" when the pay cycle finished with money left: the next step, or what's there. */
export function surplusSuggestion(d: PersonaData, endBalance: number | null, current = 0): number | null {
  if (endBalance === null || endBalance < 20) return null;
  const next = nextBufferStep(d, current);
  if (next && endBalance >= next - current) return next - current;
  return Math.floor(endBalance / 10) * 10;
}

export type SavingsGoal = NonNullable<AccountState["savingsGoals"]>[number];
export interface GoalStatus { goal: SavingsGoal; saved: number | null; percent: number | null; perCycle: number; reached: boolean; cyclesLeft: number }

/** How many savings goals each band can run (spec 07 §4: Healthy one, Thriving several). */
export function savingsGoalLimit(d: PersonaData): number {
  const s = scoreState(d);
  return s.kind !== "scored" ? 0 : s.stage.stage.id === "thriving" ? 3 : s.stage.stage.id === "healthy" ? 1 : 0;
}

/** Progress from the linked savings account's balance; the amount to put aside each remaining pay cycle. */
export function savingsGoalStatus(d: PersonaData, g: SavingsGoal): GoalStatus {
  const acct = g.accountId !== undefined ? d.bankStatement.profiles.flatMap((p) => p.accounts).find((a) => a.id === g.accountId) : undefined;
  const saved = acct ? Math.max(0, Math.min(g.target, acct.balance)) : null;
  const cyclesLeft = Math.max(1, Math.ceil(daysBetween(d.asOf, g.by) / 14));
  const left = Math.max(0, g.target - (saved ?? 0));
  return { goal: g, saved, percent: saved === null ? null : Math.round((saved / g.target) * 100), perCycle: Math.ceil(left / cyclesLeft), reached: saved !== null && saved >= g.target, cyclesLeft };
}

export interface StageMoment { stage: StageId; from: number; to: number; cycles: number; feesAvoided: number }

/**
 * "You've reached Healthy" (or Thriving): once, when the latest or previous refresh crossed into the stage.
 * The journey runs from the first score in the history (one refresh per pay cycle).
 */
export function stageMoment(d: PersonaData, a: AccountState = {}): StageMoment | null {
  const s = scoreState(d);
  if (s.kind !== "scored") return null;
  const stage = s.stage.stage.id;
  if (ORDER.indexOf(stage) < ORDER.indexOf("healthy") || a.bandsSeen?.includes(stage)) return null;
  const h = d.scoreHistory;
  const crossed = h.findIndex((x, i) => i > 0 && ORDER.indexOf(stageOf(x.score)) >= ORDER.indexOf(stage) && ORDER.indexOf(stageOf(h[i - 1]!.score)) < ORDER.indexOf(stage));
  if (crossed < 0 || crossed < h.length - 2) return null;
  return { stage, from: h[0]!.score, to: s.score, cycles: h.length - 1, feesAvoided: valueTally(d, a).total };
}

export type NextOption = "plans" | "emergency" | "goals" | "multi" | "review" | "creditFile" | "refinance";
/** "What's next" for each band (spec 07 §4). Gated ones are prototypes behind their flags. */
export function whatsNext(stage: StageId): NextOption[] {
  if (stage === "thriving") return ["multi", "review", "refinance", "emergency"];
  if (stage === "healthy") return ["emergency", "goals", "creditFile"];
  return ["plans", "emergency"];
}

/**
 * Who the cheaper-credit check (gate G1) could ever be shown to: Healthy or Thriving, nothing short before
 * payday, and no use of hardship tools in the last 3 pay cycles (42 days).
 */
export function refinanceEligible(d: PersonaData, a: AccountState = {}): boolean {
  const s = scoreState(d);
  if (s.kind !== "scored" || ORDER.indexOf(s.stage.stage.id) < ORDER.indexOf("healthy")) return false;
  if (payCycleSummary(d).isShort || a.hardshipSelfSelected) return false;
  const since: ISODate = addDays(d.asOf, -42);
  const recent = [a.hardshipVisitedAt, ...(a.hardshipLetters ?? []).map((l) => l.at)].some((x) => x && x >= since);
  return !recent;
}
