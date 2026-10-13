// Pay cycles, "Money left the day before payday" (13/10/2026; reference: tippla-pay-cycles-mockup.dc.html, the chart,
// stats and "Each pay cycle" list only). The headline and context line are generated from the same pay-cycle facts the
// page already shows (cycleFacts, currentCycleForecast), so they always agree with the numbers.
import type { PersonaData } from "@/lib/api/types";
import type { ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { payAdvanceRun } from "./loans";
import { moneyWent, type SpendGroup } from "./moneyPlan";
import type { CycleFacts } from "./payCycleLoop";
import { cycleBefore, currentCycle, type Period } from "./periods";
import type { CurrentCycleForecast } from "./progress";
import { applyOverrides, inPeriod, isIncome, posted, type CategoryOverrides } from "./transactions";

// ---- Headline and context ---------------------------------------------------------------------------------------

export type TrendHeadline =
  | { kind: "allBelow"; n: number; forecastBelow: boolean }
  | { kind: "allAbove"; n: number }
  | { kind: "mixed"; below: number; of: number };

/**
 * From the completed cycles (oldest first): the run of cycles ending most recently, if it is 2 or more long
 * ("your last 4 pay cycles all ended below $0"), else how many of them ended below $0.
 */
export function trendHeadline(balances: number[], forecast: number | null): TrendHeadline {
  const below = (v: number) => v < 0;
  const last = balances.at(-1);
  let run = 0;
  if (last !== undefined) for (let i = balances.length - 1; i >= 0 && below(balances[i]!) === below(last); i--) run++;
  if (last !== undefined && run >= 2 && below(last)) return { kind: "allBelow", n: run, forecastBelow: forecast !== null && forecast < 0 };
  if (last !== undefined && run >= 2) return { kind: "allAbove", n: run };
  return { kind: "mixed", below: balances.filter(below).length, of: balances.length };
}

/** "early", "mid" or "late" in a month, for the context line ("late July"). */
export function partOfMonth(date: ISODate): { part: "early" | "mid" | "late"; month: number } {
  const day = Number(date.slice(8, 10));
  return { part: day <= 10 ? "early" : day <= 20 ? "mid" : "late", month: Number(date.slice(5, 7)) };
}

export type TrendContext =
  /** Money left until `until`, then below $0 every cycle since. */
  | { kind: "turnedBelow"; until: ISODate; little: boolean; advancesFrom: ISODate | null }
  /** Below $0 in every cycle we can see. */
  | { kind: "alwaysBelow"; advancesFrom: ISODate | null }
  /** Below $0 until `until`, money left every cycle since. */
  | { kind: "turnedAbove"; until: ISODate }
  | { kind: "alwaysAbove"; advancesFrom: ISODate | null }
  | { kind: "mixed"; advancesFrom: ISODate | null };

/** When the pattern changed (the end of the last cycle before the current run) and when pay advances began. */
export function trendContext(cycles: { end: ISODate; balance: number }[], advancesFrom: ISODate | null): TrendContext | null {
  const last = cycles.at(-1);
  if (!last) return null;
  const isBelow = last.balance < 0;
  let i = cycles.length - 1;
  while (i >= 0 && cycles[i]!.balance < 0 === isBelow) i--;
  const before = i >= 0 ? cycles[i]! : null;
  const run = cycles.length - 1 - i;
  if (run < 2) return { kind: "mixed", advancesFrom };
  if (isBelow) return before ? { kind: "turnedBelow", until: before.end, little: before.balance < 150, advancesFrom } : { kind: "alwaysBelow", advancesFrom };
  return before ? { kind: "turnedAbove", until: before.end } : { kind: "alwaysAbove", advancesFrom };
}

// ---- Stats ----------------------------------------------------------------------------------------------------------

export interface TrendStats {
  below: { count: number; of: number; plusForecast: boolean };
  /** Every pay advance since the first one we can see; fees at the provider's usual fee per advance. */
  advances: { total: number; count: number; fees: number | null; since: ISODate; toRepay: number } | null;
  /** Bank fees (failed payments) in the completed cycles, and which cycles they fell in. */
  fees: { count: number; cycles: { start: ISODate; end: ISODate }[] };
}

export function trendStats(d: PersonaData, history: CycleFacts[], forecast: number | null): TrendStats {
  const tx = posted(d.transactions);
  const credits = tx.filter((t) => t.category === "wage_advance" && t.amount > 0).sort((a, b) => a.date.localeCompare(b.date));
  const repaid = tx.filter((t) => t.category === "wage_advance" && t.amount < 0 && credits.length > 0 && t.date >= credits[0]!.date).length;
  const fee = payAdvanceRun(d)?.fee ?? null;
  const withFees = history.filter((c) => c.fees.count > 0);
  return {
    below: { count: history.filter((c) => (c.endBalance ?? 0) < 0).length, of: history.length, plusForecast: forecast !== null && forecast < 0 },
    advances: credits.length ? {
      total: sumMoney(credits.map((t) => t.amount)), count: credits.length, since: credits[0]!.date,
      fees: fee !== null ? sumMoney(credits.map(() => fee)) : null, toRepay: Math.max(0, credits.length - repaid),
    } : null,
    fees: { count: sumMoney(withFees.map((c) => c.fees.count)), cycles: withFees.map((c) => ({ start: c.cycle.start, end: c.cycle.end })) },
  };
}

// ---- Chart ----------------------------------------------------------------------------------------------------------

export interface TrendBar { start: ISODate; end: ISODate; value: number; forecast: boolean; advance: boolean; fee: boolean; height: number }

/**
 * One scale for both directions: each bar's height is |value| / (biggest above + biggest below), and the area above
 * the $0 line takes `above` of the chart (so the tallest positive bar fills it exactly, as does the deepest negative).
 */
export function trendBars(cols: Omit<TrendBar, "height">[]): { bars: TrendBar[]; above: number } {
  const maxUp = Math.max(0, ...cols.map((c) => c.value));
  const maxDown = Math.max(0, ...cols.map((c) => -c.value));
  const span = maxUp + maxDown || 1;
  return { bars: cols.map((c) => ({ ...c, height: Math.abs(c.value) / span })), above: maxUp / span };
}

// ---- Breakdown for one cycle (money in and money out on one scale) -------------------------------------------------

export interface CycleBreakdown {
  /** Pay by source (each employer or Centrelink), then any pay advances received. */
  moneyIn: { label: string; amount: number; kind: "pay" | "centrelink" | "advance" }[];
  moneyOut: { group: SpendGroup; amount: number; merchants: string[] }[];
  paid: number; inTotal: number; spent: number;
  /** Pay advances received in the cycle: how a gap was covered. */
  advances: { date: ISODate; amount: number; provider: string }[];
  /** The larger of money in and money out: both bars share it. */
  scale: number;
  /** spent − paid: positive = over your pay by that much; negative = that much left. */
  over: number;
}

const OUT_ORDER: SpendGroup[] = ["rent", "everyday", "gambling", "loans", "advance", "bills"];

export function cycleBreakdown(d: PersonaData, cycle: Period, overrides?: CategoryOverrides): CycleBreakdown {
  const w = moneyWent(d, cycle, overrides);
  const tx = inPeriod(posted(applyOverrides(d.transactions, overrides)), cycle);
  const sources = new Map<string, number>();
  for (const t of tx.filter((x) => isIncome(x) && x.category === "income" && x.amount > 0)) sources.set(t.merchant, sumMoney([sources.get(t.merchant) ?? 0, t.amount]));
  const moneyIn: CycleBreakdown["moneyIn"] = [...sources].sort((a, b) => b[1] - a[1])
    .map(([label, amount]) => ({ label, amount, kind: /centrelink/i.test(label) ? "centrelink" as const : "pay" as const }));
  for (const a of w.advances) moneyIn.push({ label: a.provider, amount: a.amount, kind: "advance" });
  const inTotal = sumMoney(moneyIn.map((m) => m.amount));
  const byGroup = new Map(w.groups.map((g) => [g.group, g]));
  const moneyOut = OUT_ORDER.map((g) => byGroup.get(g)).filter((g): g is NonNullable<typeof g> => !!g && g.total > 0)
    .map((g) => ({ group: g.group, amount: g.total, merchants: g.merchants }));
  return { moneyIn, moneyOut, paid: w.paid, inTotal, spent: w.spent, advances: w.advances, scale: Math.max(inTotal, w.spent, 1), over: sumMoney([w.spent, -w.paid]) };
}

// ---- The whole section ------------------------------------------------------------------------------------------------

export interface PayCyclesTrend {
  headline: TrendHeadline;
  context: TrendContext | null;
  stats: TrendStats;
  bars: TrendBar[];
  above: number;
  /** Completed cycles, newest first, with how many cycles ago each was (for Spending's ?cycle=). */
  rows: { start: ISODate; end: ISODate; ago: number; balance: number; advances: number; fees: number; breakdown: CycleBreakdown }[];
  current: { start: ISODate; end: ISODate; advances: { date: ISODate; amount: number }[]; fees: number } | null;
}

export function payCyclesTrend(d: PersonaData, history: CycleFacts[], current: CurrentCycleForecast | null, edits?: CategoryOverrides): PayCyclesTrend {
  const balances = history.map((c) => c.endBalance ?? 0);
  const forecast = current?.withEveryday ?? null;
  const firstAdvance = posted(d.transactions).filter((t) => t.category === "wage_advance" && t.amount > 0).map((t) => t.date).sort()[0] ?? null;
  const now = currentCycle(d);
  const nowTx = inPeriod(posted(d.transactions), { start: now.start, end: d.asOf } as Period);
  const nowAdvances = nowTx.filter((t) => t.category === "wage_advance" && t.amount > 0).map((t) => ({ date: t.date, amount: t.amount }));
  const nowFees = nowTx.filter((t) => t.subcategory === "dishonour").length;
  const cols = history.map((c) => ({ start: c.cycle.start, end: c.cycle.end, value: c.endBalance ?? 0, forecast: false, advance: c.advances.count > 0, fee: c.fees.count > 0 }));
  if (current) cols.push({ start: current.cycle.start, end: current.cycle.end, value: current.withEveryday, forecast: true, advance: nowAdvances.length > 0, fee: nowFees > 0 });
  const { bars, above } = trendBars(cols);
  const agoOf = (start: ISODate) => Math.round((Date.parse(now.start) - Date.parse(start)) / (14 * 86_400_000));
  return {
    headline: trendHeadline(balances, forecast),
    context: trendContext(history.map((c) => ({ end: c.cycle.end, balance: c.endBalance ?? 0 })), firstAdvance),
    stats: trendStats(d, history, forecast),
    bars, above,
    rows: [...history].reverse().map((c) => ({
      start: c.cycle.start, end: c.cycle.end, ago: agoOf(c.cycle.start), balance: c.endBalance ?? 0,
      advances: c.advances.count, fees: c.fees.count, breakdown: cycleBreakdown(d, cycleBefore(d, agoOf(c.cycle.start)), edits),
    })),
    current: current ? { start: current.cycle.start, end: current.cycle.end, advances: nowAdvances, fees: nowFees } : null,
  };
}
