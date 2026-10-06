// Spec 08 "Ask Tippla": the deterministic functions the assistant may call. They read Tippla's own computed
// data through the selectors (single source of truth); the model never computes a balance itself. Every
// figure is returned already formatted ("$53", "01/10"), so the number check can match the answer against
// exactly what the tools said. There is deliberately no offers or lender-matching tool.
import type { CategoryId, PersonaData } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { NDH, LIFELINE } from "@/config/services";
import { categoryNames } from "@/content/en-AU";
import { addDays, daysBetween, formatDayMonth, formatShortDay, type ISODate } from "@/lib/format/dates";
import { formatDollars, formatWhole } from "@/lib/format";
import { sumMoney } from "@/lib/format/money";
import { projectFor } from "@/lib/scoring/estimate";
import {
  activePlan, billsBeforePayday, currentCycle, cycleBefore, payCycleSummary, projectedBalances, publicPlanTitle, recommendations,
  safeToSpendFor, scoreAttribution, scoreState, subscriptions,
} from "@/lib/selectors";
import { debitsIn } from "@/lib/selectors/transactions";
import { PROGRAMS } from "@/data/directories";

export interface ToolCtx { d: PersonaData; a: AccountState }
export type ToolName =
  | "get_safe_to_spend" | "get_forecast" | "simulate_spend" | "get_bills" | "get_subscriptions" | "get_spending"
  | "get_score" | "get_score_attribution" | "simulate_score" | "get_plan" | "get_hardship_options";

const money = (n: number) => (n < 0 ? `-${formatWhole(-n)}` : formatWhole(n));
const SPEND_CATEGORIES: CategoryId[] = ["housing", "groceries", "food", "transport", "bills", "subscriptions", "entertainment", "alcohol", "gambling", "health", "shopping", "loan_repayment", "bnpl", "wage_advance", "cash", "fees"];

/** Route each tool's answer links to (spec 08: "with a link to the relevant screen"). */
export const TOOL_ROUTES: Record<ToolName, { href: string; label: string }> = {
  get_safe_to_spend: { href: "/", label: "See safe to spend" },
  get_forecast: { href: "/calendar", label: "See your calendar" },
  simulate_spend: { href: "/calendar", label: "See what's due" },
  get_bills: { href: "/calendar", label: "See your bills" },
  get_subscriptions: { href: "/subscriptions", label: "See subscriptions" },
  get_spending: { href: "/spending", label: "See spending" },
  get_score: { href: "/score", label: "See your SmartScore" },
  get_score_attribution: { href: "/score", label: "See what changed" },
  simulate_score: { href: "/savings", label: "See your plan" },
  get_plan: { href: "/savings", label: "See your plan" },
  get_hardship_options: { href: "/hardship", label: "Options if money's tight" },
};

/** The next date for a weekday name, or an ISO date, from the data date. */
export function resolveDate(d: PersonaData, when?: string | null): ISODate {
  if (!when) return d.asOf;
  if (/^\d{4}-\d{2}-\d{2}$/.test(when)) return when;
  const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const w = when.toLowerCase();
  if (w === "today") return d.asOf;
  if (w === "tomorrow") return addDays(d.asOf, 1);
  const i = days.findIndex((x) => w.startsWith(x.slice(0, 3)));
  if (i < 0) return d.asOf;
  const today = new Date(`${d.asOf}T00:00:00Z`).getUTCDay();
  return addDays(d.asOf, ((i - today + 7) % 7) || 7);
}

export function runTool(name: ToolName, input: Record<string, unknown>, { d, a }: ToolCtx): Record<string, unknown> {
  const pc = payCycleSummary(d);
  const payday = d.derived.pay_cycle.next_payday;
  switch (name) {
    case "get_safe_to_spend": {
      const s = safeToSpendFor(d, a);
      return { per_day: s.nothingSpare ? "$0" : formatWhole(s.perDay), nothing_spare: s.nothingSpare, days_to_payday: s.days, payday: formatDayMonth(payday), buffer: formatWhole(s.buffer), estimate: true };
    }
    case "get_forecast": {
      const date = resolveDate(d, input.date as string);
      const point = projectedBalances(d, date > d.asOf ? date : addDays(d.asOf, 1)).at(-1);
      return { date: formatDayMonth(date), forecast_balance: point ? money(point.balance) : money(pc.balance), left_after_bills_before_payday: money(pc.leftAfterBills), short_before_payday: pc.isShort ? formatWhole(-pc.leftAfterBills) : null, payday: formatDayMonth(payday), estimate: true };
    }
    case "simulate_spend": {
      const amount = Math.max(0, Number(input.amount) || 0);
      const date = resolveDate(d, input.date as string);
      const before = date < payday;
      const after = sumMoney([pc.leftAfterBills, -amount]);
      return {
        amount: formatWhole(amount), date: formatDayMonth(date), before_payday: before, payday: formatDayMonth(payday),
        left_after_bills_now: money(pc.leftAfterBills), short_now: pc.isShort ? formatWhole(-pc.leftAfterBills) : null,
        left_after_bills_if_spent: before ? money(after) : null, short_if_spent: before && after < 0 ? formatWhole(-after) : null,
        affordable_before_payday: before ? after >= 0 : null, estimate: true,
      };
    }
    case "get_bills": {
      const days = Math.min(60, Math.max(1, Number(input.days) || 14));
      const until = addDays(d.asOf, days);
      const bills = d.derived.upcoming_bills.filter((b) => b.date > d.asOf && b.date <= until);
      return { bills: bills.map((b) => ({ merchant: b.merchant, date: formatShortDay(b.date), amount: formatDollars(b.expected_amount), predicted: b.confidence === "predicted" })), total: formatDollars(sumMoney(bills.map((b) => b.expected_amount))), due_before_payday: formatWhole(sumMoney(billsBeforePayday(d).map((b) => b.expected_amount))) };
    }
    case "get_subscriptions": {
      const s = subscriptions(d);
      return { count: s.rows.length, items: s.rows.map((r) => ({ merchant: r.merchant, monthly: formatDollars(r.amount), next_charge: formatShortDay(r.nextCharge) })), per_year: formatWhole(s.totalPerYear), per_pay_cycle: formatWhole(s.totalPerPayCycle) };
    }
    case "get_spending": {
      const raw = String(input.category ?? "").toLowerCase();
      const category = (SPEND_CATEGORIES as string[]).includes(raw) ? (raw as CategoryId) : raw === "takeaway" || raw === "eating_out" ? "food" : null;
      if (!category) return { error: "unknown_category", categories: SPEND_CATEGORIES };
      if ((category === "gambling" || category === "alcohol") && a.hideGambling) return { hidden: true };
      const range = input.range === "last_cycle" ? cycleBefore(d, 1) : input.range === "last_90_days" ? { ...currentCycle(d), start: addDays(d.asOf, -89), end: d.asOf } : currentCycle(d);
      const tx = debitsIn(d, range).filter((t) => t.category === category);
      return { category: categoryNames[category], range: `${formatDayMonth(range.start)} to ${formatDayMonth(range.end > d.asOf ? d.asOf : range.end)}`, total: formatWhole(sumMoney(tx.map((t) => -t.amount))), count: tx.length };
    }
    case "get_score": {
      const s = scoreState(d);
      if (s.kind !== "scored") return { score: null, reason: s.kind === "override" && s.override === "thin_file" ? `not enough history yet; expected around ${s.estimatedReadyDate ? formatDayMonth(s.estimatedReadyDate) : "later"}` : "not available" };
      const h = d.scoreHistory, prev = h.at(-2);
      return { score: s.score, stage: s.stage.name, points_to_next_stage: s.stage.next?.pointsToGo ?? null, next_stage: s.stage.next?.name ?? null, previous: prev?.score ?? null, change: prev ? s.score - prev.score : null, updated: h.at(-1) ? formatDayMonth(h.at(-1)!.scored_date) : null };
    }
    case "get_score_attribution": {
      const at = scoreAttribution(d, { hideGambling: a.hideGambling });
      return at ? { from: at.from.score, to: at.to.score, change: at.delta, since: formatDayMonth(at.from.date), parts: at.parts.map((p) => ({ factor: p.name, points: p.points })), estimate: true } : { available: false };
    }
    case "simulate_score": {
      const action = String(input.action ?? "");
      const p = projectFor(d, action);
      return p ? { action, from: p.from, about: p.to, by: formatDayMonth(p.by), estimate: true } : { available: false, actions: recommendations(d).map((r) => r.id) };
    }
    case "get_plan": {
      const p = activePlan(d, a);
      if (!p) return { plan: null };
      const step = p.current !== null ? p.steps[p.current]! : null;
      return { plan: publicPlanTitle(p), step: step ? `${p.current! + 1} of ${p.steps.length}` : "complete", current_step: p.type === "gambling_less" ? null : step?.label ?? null, this_cycle: step?.soFar ?? null };
    }
    case "get_hardship_options": {
      return {
        options: [
          { name: "Hardship support in Tippla", href: "/hardship" },
          { name: NDH.name, phone: NDH.phoneDisplay, hours: NDH.hours, url: NDH.url },
          { name: "No-interest loans (NILS)", url: PROGRAMS.nils.url },
          { name: "Pause or downgrade Tippla", href: "/account/subscription" },
        ],
        crisis: { name: LIFELINE.name, phone: LIFELINE.phoneDisplay },
        days_to_payday: daysBetween(d.asOf, payday),
      };
    }
  }
}

/** Tool definitions for the model (strict schemas). */
export const TOOL_DEFS = [
  { name: "get_safe_to_spend", description: "Safe to spend per day until payday (an estimate), days to payday, payday date, buffer.", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } },
  { name: "get_forecast", description: "Forecast balance on a date, and whether the member is short before payday. date: ISO date, weekday name, 'today' or 'tomorrow'.", input_schema: { type: "object", properties: { date: { type: "string" } }, required: ["date"], additionalProperties: false } },
  { name: "simulate_spend", description: "What spending an amount on a date would do to money left after bills before payday.", input_schema: { type: "object", properties: { amount: { type: "number" }, date: { type: "string" } }, required: ["amount", "date"], additionalProperties: false } },
  { name: "get_bills", description: "Predicted bills in the next N days (1 to 60), with the total due before payday.", input_schema: { type: "object", properties: { days: { type: "integer" } }, required: ["days"], additionalProperties: false } },
  { name: "get_subscriptions", description: "Detected subscriptions with monthly amounts and next charge dates.", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } },
  { name: "get_spending", description: "Total spent in a category over a range. category: one of housing, groceries, food (takeaway and eating out), transport, bills, subscriptions, entertainment, alcohol, gambling, health, shopping, loan_repayment, bnpl, wage_advance, cash, fees.", input_schema: { type: "object", properties: { category: { type: "string" }, range: { type: "string", enum: ["this_cycle", "last_cycle", "last_90_days"] } }, required: ["category", "range"], additionalProperties: false } },
  { name: "get_score", description: "The member's SmartScore, stage, points to the next stage and change since the previous refresh.", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } },
  { name: "get_score_attribution", description: "What moved the SmartScore since the previous refresh, factor by factor (an estimate).", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } },
  { name: "simulate_score", description: "Estimated SmartScore if the member acts on one step. action: a step id such as pay-advance, money-left, failed-payments, subscriptions, cash.", input_schema: { type: "object", properties: { action: { type: "string" } }, required: ["action"], additionalProperties: false } },
  { name: "get_plan", description: "The member's current plan and step.", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } },
  { name: "get_hardship_options", description: "Hardship and support options: Tippla's hardship page, the National Debt Helpline, no-interest loans, pausing Tippla, crisis support.", input_schema: { type: "object", properties: {}, required: [], additionalProperties: false } },
] as const;
