// Spec 07 plans: a few steps over 2–4 pay cycles, linked to the member's goal (spec 04) and band. Steps are
// checked from the transactions where possible (pay advances, failed payments, money left, gambling), with
// "Mark as done" for the rest. A step that doesn't happen this pay cycle simply carries over. Pure.
import type { PersonaData } from "@/lib/api/types";
import type { AccountState, FocusGoalType, PlanType } from "@/lib/account/state";
import { PLAN_ADVANCE_STEPS } from "@/config/flags";
import { planCopy as t } from "@/content/plans";
import { formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import type { ISODate } from "@/lib/format/dates";
import { gamblingInsight } from "./gambling";
import { cycleFacts, type CycleFacts } from "./payCycleLoop";
import { currentCycle, cycleBefore } from "./periods";
import { factors, scoreState } from "./score";
import { payAdvanceRun } from "./loans";
import { inPeriod, posted } from "./transactions";

type Ctx = { d: PersonaData; a: AccountState; start: ISODate };
type StepDef =
  | { kind: "now"; label: string; ok: (c: Ctx) => boolean }
  | { kind: "manual"; label: string; link?: string }
  | { kind: "cycle"; label: string; ok: (f: CycleFacts, c: Ctx) => boolean; soFar?: (c: Ctx) => string };

const advancesSince = (c: Ctx) => {
  const cyc = currentCycle(c.d);
  const from = c.start > cyc.start ? c.start : cyc.start;
  return sumMoney(inPeriod(posted(c.d.transactions), { ...cyc, start: from }).filter((x) => x.category === "wage_advance" && x.amount > 0).map((x) => x.amount));
};
const gamblingIn = (d: PersonaData, f: CycleFacts) => sumMoney(inPeriod(posted(d.transactions), f.cycle).filter((x) => x.category === "gambling" && x.amount < 0).map((x) => -x.amount));

const PLANS: Record<PlanType, StepDef[]> = {
  off_advances: PLAN_ADVANCE_STEPS.map((max) => ({
    kind: "cycle" as const, label: t.steps.advance(formatWhole(max)),
    ok: (f: CycleFacts) => f.advances.total <= max,
    soFar: (c: Ctx) => t.soFarAdvance(formatWhole(advancesSince(c)), formatWhole(max)),
  })),
  reach_payday: [
    { kind: "now", label: t.steps.buffer, ok: (c) => c.a.buffer !== undefined && c.a.buffer > 0 },
    { kind: "manual", label: t.steps.underSts },
    { kind: "cycle", label: t.steps.endPositive, ok: (f) => (f.endBalance ?? -1) >= 0 },
  ],
  cut_bills: [
    { kind: "manual", label: t.steps.reviewSubs, link: "/subscriptions" },
    { kind: "manual", label: t.steps.decideSubs, link: "/subscriptions" },
    { kind: "manual", label: t.steps.checkBills, link: "/savings#bills-h" },
  ],
  pay_on_time: [
    { kind: "now", label: t.steps.reminders, ok: (c) => !c.a.notify?.paused },
    { kind: "cycle", label: t.steps.noDishonour, ok: (f) => f.fees.count === 0 },
    { kind: "cycle", label: t.steps.twoClean, ok: (f) => f.fees.count === 0 },
  ],
  gambling_less: [
    { kind: "now", label: t.steps.limit, ok: (c) => c.a.plan?.limit !== undefined },
    { kind: "manual", label: t.steps.block, link: "/hardship" },
    { kind: "cycle", label: t.steps.underLimit, ok: (f, c) => gamblingIn(c.d, f) <= (c.a.plan?.limit ?? 0) },
  ],
};

export interface PlanStep { label: string; kind: StepDef["kind"]; status: "done" | "current" | "upcoming"; doneOn: ISODate | null; soFar: string | null; link?: string }
export interface PlanProgress { type: PlanType; title: string; factor: string; startedAt: ISODate; explicit: boolean; steps: PlanStep[]; current: number | null; completed: boolean }

/** Completed pay cycles that ended after `from`, oldest first. */
function cyclesAfter(d: PersonaData, from: ISODate): CycleFacts[] {
  const out: CycleFacts[] = [];
  for (let i = 12; i >= 1; i--) {
    const c = cycleBefore(d, i);
    // The pay cycle the plan started in counts only from the start date (what happened before isn't judged).
    if (!c.limitedByHistory && c.end >= from) out.push(cycleFacts(d, c.start < from ? { ...c, start: from } : c));
  }
  return out;
}

export function planProgress(d: PersonaData, a: AccountState, type: PlanType, startedAt: ISODate, explicit = true): PlanProgress {
  const defs = PLANS[type];
  const ctx: Ctx = { d, a: { ...a, plan: a.plan ?? { type, startedAt } }, start: startedAt };
  const cycles = cyclesAfter(d, startedAt);
  let pointer = 0; // next completed cycle a cycle step can use
  let blocked = false;
  const steps: PlanStep[] = defs.map((s, i) => {
    let doneOn: ISODate | null = null;
    if (!blocked) {
      if (s.kind === "now" && s.ok(ctx)) doneOn = a.plan?.manual?.[String(i)] ?? startedAt;
      if (s.kind === "manual" && a.plan?.type === type && a.plan.manual?.[String(i)]) doneOn = a.plan.manual[String(i)]!;
      if (s.kind === "cycle") {
        while (pointer < cycles.length && !s.ok(cycles[pointer]!, ctx)) pointer++;
        if (pointer < cycles.length) { doneOn = cycles[pointer]!.cycle.end; pointer++; }
      }
    }
    const status: PlanStep["status"] = doneOn ? "done" : blocked ? "upcoming" : "current";
    if (!doneOn) blocked = true;
    return { label: s.label, kind: s.kind, status, doneOn, soFar: status === "current" && s.kind === "cycle" && s.soFar ? s.soFar(ctx) : null, ...(s.kind === "manual" && s.link ? { link: s.link } : {}) };
  });
  const current = steps.findIndex((s) => s.status === "current");
  return { type, title: t.titles[type], factor: t.factor[type], startedAt, explicit, steps, current: current < 0 ? null : current, completed: current < 0 };
}

/** The plan for the member's goal (spec 04), or for their band when they haven't picked one. */
export function suggestedPlan(d: PersonaData, goal?: FocusGoalType): PlanType | null {
  const advances = !!payAdvanceRun(d);
  if (goal === "off_advances") return "off_advances";
  if (goal === "reach_payday" || goal === "build_buffer") return "reach_payday";
  if (goal === "cut_bills") return "cut_bills";
  if (goal === "gambling_less") return "gambling_less";
  if (goal === "lift_score") {
    const low = factors(d).filter((f) => f.value !== null && f.actionable).sort((x, y) => x.value! - y.value!)[0]?.key;
    return low === "LOAN_AMOUNT_AND_TYPE" && advances ? "off_advances" : low === "MISSED_PAYMENT" ? "pay_on_time" : "reach_payday";
  }
  const s = scoreState(d);
  if (s.kind !== "scored") return "reach_payday";
  if (s.stage.stage.id === "building") return "reach_payday";
  if (s.stage.stage.id === "steadying") return advances ? "off_advances" : "cut_bills";
  return null; // Healthy and Thriving: "What's next" instead
}

/** Plans on offer, by band (spec 07 §4); gambling only when detected, opt-in, last. */
export function availablePlans(d: PersonaData): PlanType[] {
  const s = scoreState(d);
  const band = s.kind === "scored" ? s.stage.stage.id : "building";
  const list: PlanType[] = band === "building" ? ["reach_payday", "pay_on_time"] : ["off_advances", "reach_payday", "cut_bills", "pay_on_time"];
  return gamblingInsight(d) ? [...list, "gambling_less"] : list;
}

/** The member's active plan: their own, or the suggested one (counted from when they set their goal). */
export function activePlan(d: PersonaData, a: AccountState, goal?: { type: FocusGoalType; startedAt: string }): PlanProgress | null {
  if (a.plan) return planProgress(d, a, a.plan.type, a.plan.startedAt, true);
  const type = suggestedPlan(d, goal?.type);
  return type ? planProgress(d, a, type, goal?.startedAt ?? d.asOf, false) : null;
}

/** Plans about borrowing less: while one is active, lender offers would work against it. */
export const DEBT_REDUCTION_PLANS: readonly PlanType[] = ["off_advances"];

/**
 * UX round 2, 2.2: the one rule for showing lender offers (the Offers nav item, the link on Borrowing and the
 * offers themselves). Change it here. Off while the member has an active debt-reduction plan, or has said
 * they're finding things hard right now. (Offers also pause when short before payday or at Building: offerPause.)
 */
export function shouldShowLenderOffers(d: PersonaData, a: AccountState, goal?: { type: FocusGoalType; startedAt: string }): boolean {
  if (a.hardshipSelfSelected) return false;
  const plan = activePlan(d, a, goal);
  return !(plan && DEBT_REDUCTION_PLANS.includes(plan.type));
}

/** Name shown outside the plan page: never the gambling plan's name. */
export const publicPlanTitle = (p: PlanProgress) => (p.type === "gambling_less" ? t.privateTitle : p.title);
