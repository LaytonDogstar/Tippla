// Spec 04: the first insight ("aha") shown straight after the bank data loads, and how the member's goal
// shapes the plan, the check-in and the recap. Pure, from the persona data (single source of truth).
import type { FactorKey, PersonaData } from "@/lib/api/types";
import type { FocusGoal, FocusGoalType } from "@/lib/account/state";
import { addDays, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { gamblingInsight } from "./gambling";
import { payPattern } from "./income";
import { billsBeforePayday, payCycleSummary } from "./payCycle";
import type { Recommendation } from "./recommendations";
import { factors, scoreState } from "./score";
import { subscriptions } from "./subscriptions";
import { posted } from "./transactions";
import { goalCopy } from "@/content/firstValue";

/** Q29 (sample logic): this many subscriptions makes them the first insight. */
export const AHA_SUBSCRIPTIONS_MIN = 3;
/** Pay advance fees are counted over this many days. */
export const AHA_FEE_DAYS = 90;
/** Factors never used for the positive fallback (sensitive, or not something we praise). */
const NOT_PRAISED: FactorKey[] = ["ADVERSE_SPEND", "PRODUCTIVE_SPEND", "GOVERNMENT_RELIANCE"];

export type AhaType = "shortfall" | "subscriptions" | "advance_fees" | "positive";
export type Aha =
  | { type: "shortfall"; short: number; balance: number; due: number; payday: ISODate; bills: { merchant: string; date: ISODate; amount: number }[] }
  | { type: "subscriptions"; perYear: number; rows: { merchant: string; perYear: number }[] }
  | { type: "advance_fees"; total: number; provider: string; fees: { date: ISODate; amount: number }[] }
  | { type: "positive"; factor: { key: FactorKey; name: string; value: number; explains: string } | null; pay: { weekday: string; amount: number } | null };

/** Pay advance fees in the last 90 days: each repayment minus the advance it repaid. */
export function advanceFees(d: PersonaData): { provider: string; fees: { date: ISODate; amount: number }[]; total: number } | null {
  const since = addDays(d.asOf, -(AHA_FEE_DAYS - 1));
  const tx = posted(d.transactions).filter((t) => t.category === "wage_advance").sort((a, b) => a.date.localeCompare(b.date));
  const fees: { date: ISODate; amount: number; provider: string }[] = [];
  for (const r of tx.filter((t) => t.amount < 0 && t.date >= since)) {
    const credit = [...tx].reverse().find((t) => t.amount > 0 && t.merchant === r.merchant && t.date <= r.date);
    const fee = credit ? sumMoney([-r.amount, -credit.amount]) : 0;
    if (fee > 0) fees.push({ date: r.date, amount: fee, provider: r.merchant });
  }
  if (!fees.length) return null;
  return { provider: fees.at(-1)!.provider, fees: fees.map(({ date, amount }) => ({ date, amount })), total: sumMoney(fees.map((f) => f.amount)) };
}

/** Candidates in the spec 04 priority order (the first one is shown). */
export function ahaCandidates(d: PersonaData): Aha[] {
  const out: Aha[] = [];
  const pc = payCycleSummary(d);
  if (pc.isShort) {
    const bills = billsBeforePayday(d).map((b) => ({ merchant: b.merchant, date: b.date, amount: b.expected_amount }));
    out.push({ type: "shortfall", short: -pc.leftAfterBills, balance: sumMoney([pc.leftAfterBills, ...bills.map((b) => b.amount)]), due: sumMoney(bills.map((b) => b.amount)), payday: d.derived.pay_cycle.next_payday, bills });
  }
  const subs = subscriptions(d);
  if (subs.rows.length >= AHA_SUBSCRIPTIONS_MIN) out.push({ type: "subscriptions", perYear: subs.totalPerYear, rows: subs.rows.map((r) => ({ merchant: r.merchant, perYear: r.perYear })) });
  const fees = advanceFees(d);
  if (fees) out.push({ type: "advance_fees", ...fees });
  const best = factors(d).filter((f) => f.value !== null && !NOT_PRAISED.includes(f.key)).sort((a, b) => b.value! - a.value!)[0];
  const p = payPattern(d);
  out.push({
    type: "positive",
    factor: best ? { key: best.key, name: best.name, value: best.value!, explains: best.explains } : null,
    pay: !best && p.everyDays === 14 && p.weekday ? { weekday: p.weekday, amount: p.typicalAmount } : null,
  });
  return out;
}

export const firstInsight = (d: PersonaData): Aha => ahaCandidates(d)[0]!;

/** The goal options to offer: gambling only when gambling transactions are detected (never preselected). */
export function goalOptions(d: PersonaData): FocusGoalType[] {
  const base: FocusGoalType[] = ["reach_payday", "off_advances", "lift_score", "cut_bills", "build_buffer"];
  return gamblingInsight(d) ? [...base, "gambling_less"] : base;
}

/** The SmartScore goal's wording: to the next stage when there's a score, "build" when there isn't. */
export function liftScoreTarget(d: PersonaData): string | null | "build" {
  const s = scoreState(d);
  if (s.kind !== "scored") return "build";
  return s.stage.next?.name ?? null;
}

/** Plan steps each goal brings to the front, in order. "lift_score" keeps the score-impact order. */
const GOAL_STEPS: Record<FocusGoalType, (id: string) => number> = {
  reach_payday: (id) => ["money-left", "subscriptions", "failed-payments"].indexOf(id),
  off_advances: (id) => (id === "pay-advance" ? 0 : id.startsWith("pay-off-") ? 1 : -1),
  lift_score: () => -1,
  cut_bills: (id) => ["subscriptions", "money-left"].indexOf(id),
  build_buffer: (id) => ["money-left", "subscriptions"].indexOf(id),
  gambling_less: (id) => (id === "gambling" ? 0 : -1),
};

/**
 * "Your plan" in the goal's order (spec 04 → 07): matching steps first, the rest as before. When short before
 * payday, no-cost steps still lead (docs/04), so a goal never puts a costly step first.
 */
export function orderForGoal(recs: Recommendation[], goal: FocusGoal | FocusGoalType | undefined, short = false): Recommendation[] {
  const type = typeof goal === "string" ? goal : goal?.type;
  if (!type) return recs;
  const rank = (r: Recommendation) => { const i = GOAL_STEPS[type](r.id); return i < 0 ? 99 : i; };
  return recs.map((r, i) => ({ r, i }))
    .sort((a, b) => (short ? Number(b.r.noCost) - Number(a.r.noCost) : 0) || rank(a.r) - rank(b.r) || a.i - b.i)
    .map((x) => x.r);
}

/** True on the member's first payday after onboarding (spec 04: the enhanced check-in). */
export function isFirstPayday(d: PersonaData, onboardedAt: string | undefined): boolean {
  if (!onboardedAt || onboardedAt > d.asOf) return false;
  // The main pay: wages if there are any, otherwise Centrelink (Marcus's Centrelink days aren't his payday).
  const income = posted(d.transactions).filter((t) => t.amount > 0 && (t.subcategory === "wages" || t.subcategory === "centrelink"));
  const main = income.some((t) => t.subcategory === "wages") ? "wages" : "centrelink";
  const paydays = income.filter((t) => t.subcategory === main && t.date > onboardedAt).map((t) => t.date);
  return paydays.length > 0 && paydays.every((p) => p === d.asOf);
}

/** The goal's label as the member saw it when choosing (the SmartScore one names the next stage). */
export function goalLabel(d: PersonaData, type: FocusGoalType): string {
  if (type !== "lift_score") return goalCopy.options[type];
  const t = liftScoreTarget(d);
  return t === "build" ? goalCopy.build : t ? goalCopy.liftTo(t) : goalCopy.options.lift_score;
}

/** Which recap line the goal puts first (spec 04 → 02). Gambling stays out of the recap whatever the goal. */
export function recapLead(type: FocusGoalType | undefined): "balance" | "advances" | "score" | null {
  if (type === "reach_payday" || type === "build_buffer") return "balance";
  if (type === "off_advances") return "advances";
  if (type === "lift_score") return "score";
  return null;
}
