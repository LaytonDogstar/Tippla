// Today page (redesign 07/10/2026): presentation-only figures, all derived from the existing selectors.
// Nothing here changes a calculation: it picks the hero state, groups what's already computed, and lines up
// the next two weeks. Pure and unit tested (tests/today.test.ts).
import type { CategoryId, PersonaData, UpcomingBill } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { addDays, daysBetween, sumMoney, type ISODate } from "@/lib/format";
import type { FeedItem, FeedType } from "@/lib/feed/types";
import type { PayCycleSummary } from "./payCycle";
import type { SafeToSpend } from "./safeToSpend";
import type { CategoryRow, SpendCategory } from "./spending";
import { categoryTotals, totalSpent } from "./spending";
import { lastCycles, type Period, type SpendData } from "./periods";
import type { CategoryOverrides } from "./transactions";
import { upcomingIncome } from "./income";
import { billing } from "./account";

// ---- Hero -------------------------------------------------------------------------------------------------

export type HeroState = "short" | "tight" | "onTrack";

/**
 * Short: bills due before payday are more than the balance (payCycleSummary.isShort).
 * Tight: bills are covered, but safe to spend leaves nothing spare (under $1 a day) before payday.
 * On track: something to spend each day until payday.
 */
export function heroState(pc: PayCycleSummary, safe: Pick<SafeToSpend, "nothingSpare" | "perDay">): HeroState {
  if (pc.isShort) return "short";
  return safe.nothingSpare || safe.perDay < 1 ? "tight" : "onTrack";
}

/** One segment per day of the pay cycle: past, today, or still to come. */
export function cycleDays(pc: PayCycleSummary, asOf: ISODate): ("past" | "today" | "future")[] {
  const total = Math.max(1, daysBetween(pc.cycle.start, pc.cycle.end) + 1);
  const today = daysBetween(pc.cycle.start, asOf);
  return Array.from({ length: total }, (_, i) => (i < today ? "past" : i === today ? "today" : "future"));
}

/** Balance against what's due before payday: the covered part, and the short part or what's left. */
export function dueCoverage(pc: PayCycleSummary): { covered: number; short: number; left: number; coveredShare: number } {
  const due = pc.dueTotal;
  const covered = Math.min(Math.max(pc.balance, 0), due);
  return {
    covered: sumMoney([covered]),
    short: pc.isShort ? sumMoney([due, -Math.max(pc.balance, 0)]) : 0,
    left: pc.isShort ? 0 : sumMoney([pc.balance, -due]),
    coveredShare: due > 0 ? covered / due : 1,
  };
}

// ---- Needs a look ------------------------------------------------------------------------------------------

export type Tone = "negative" | "caution" | "info";

/** Status colour from the item's existing urgency: act today / soon → negative, this week → caution, else info. */
export const feedTone = (item: Pick<FeedItem, "urgency">): Tone => (item.urgency >= 4 ? "negative" : item.urgency === 3 ? "caution" : "info");

/** Money shown on a row: what's at stake, when it's at least a dollar's worth of something specific. */
export function feedAmount(item: Pick<FeedItem, "type" | "amountAtStake">): { amount: number; negative: boolean } | null {
  const NO_AMOUNT: FeedType[] = ["score_change", "entitlements_check", "bank_reconnect", "hardship_followup"];
  if (NO_AMOUNT.includes(item.type) || item.amountAtStake < 1) return null;
  return { amount: item.amountAtStake, negative: item.type === "shortfall" };
}

// ---- Coming up ---------------------------------------------------------------------------------------------

export interface ComingUpItem {
  date: ISODate;
  kind: "bill" | "payAdvance" | "income" | "tippla";
  name: string;
  amount: number;
  /** For the row's icon (the category icon set used in the transaction list, UX round 2, 3.6). */
  category?: CategoryId;
  /** Predicted bill, expected income, or a Tippla payment that can be paused. */
  qualifier: "predicted" | "confirmed" | "expected" | "estimated" | "pausable";
}

/** Money in and out over the next `days` days (default 14), in date order. */
export function comingUp(d: PersonaData, a: AccountState = {}, days = 14): ComingUpItem[] {
  const until = addDays(d.asOf, days);
  const bills = d.derived.upcoming_bills.filter((b: UpcomingBill) => b.date > d.asOf && b.date <= until).map((b): ComingUpItem => (b.membership
    ? { date: b.date, kind: "tippla", name: "Tippla", amount: b.expected_amount, qualifier: "pausable" }
    : { date: b.date, kind: b.category === "wage_advance" ? "payAdvance" : "bill", name: b.merchant, amount: b.expected_amount, category: b.category, qualifier: b.confidence }));
  const income = upcomingIncome(d, until).filter((i) => i.date > d.asOf).map((i): ComingUpItem => ({
    date: i.date, kind: "income", name: i.payer, amount: i.amount, qualifier: i.exact ? "expected" : "estimated",
  }));
  // Tippla's charge is in the forecast once loaded (withMembershipCharge); raw data still gets it from billing.
  const inForecast = d.derived.upcoming_bills.some((x) => x.membership);
  const b = billing(d, a);
  const tippla: ComingUpItem[] = !inForecast && b.status === "active" && b.nextCharge && b.nextCharge > d.asOf && b.nextCharge <= until
    ? [{ date: b.nextCharge, kind: "tippla", name: "Tippla", amount: b.price, qualifier: "pausable" }] : [];
  const order = { income: 0, payAdvance: 1, bill: 2, tippla: 3 } as const;
  return [...bills, ...income, ...tippla].sort((x, y) => x.date.localeCompare(y.date) || order[x.kind] - order[y.kind]);
}

export interface ComingUpRow extends ComingUpItem {
  /** Balance after this payment (or pay), in date order: the same arithmetic as the Calendar's forecast, so the
   * last row of each day equals that day's end-of-day balance there. */
  left: number;
  /** The first payment that takes the balance below $0. */
  takesBelowZero: boolean;
}

export interface ComingUpBlocks {
  asOf: ISODate;
  /** Today's balance: where the running balances start. */
  balanceNow: number;
  payday: ISODate;
  before: ComingUpRow[];
  /** Balance left the day before payday (negative: short). */
  leftBeforePayday: number;
  /** Pay landing on payday (one row per payer). */
  paydayRows: ComingUpRow[];
  after: ComingUpRow[];
  afterSummary: { bills: number; left: number; lastDate: ISODate } | null;
}

/**
 * Coming up around payday (Today, 09/10/2026): before payday (from today's balance), payday, and after payday,
 * each row with what's left after it. Built from comingUp(), whose bills and pay are the forecast's own.
 */
export function comingUpBlocks(d: PersonaData, items: ComingUpItem[], balanceNow: number): ComingUpBlocks {
  const payday = d.derived.pay_cycle.next_payday;
  let bal = balanceNow, crossed = balanceNow < 0;
  const rows = items.map((it): ComingUpRow => {
    bal = sumMoney([bal, it.kind === "income" ? it.amount : -it.amount]);
    const takesBelowZero = !crossed && bal < 0;
    if (bal < 0) crossed = true; else crossed = false;
    return { ...it, left: bal, takesBelowZero };
  });
  const before = rows.filter((r) => r.date < payday);
  const paydayRows = rows.filter((r) => r.date === payday && r.kind === "income");
  const after = rows.filter((r) => r.date > payday || (r.date === payday && r.kind !== "income"));
  const lastAfter = after.at(-1);
  return {
    asOf: d.asOf, balanceNow, payday, before,
    leftBeforePayday: before.length ? before.at(-1)!.left : balanceNow,
    paydayRows, after,
    afterSummary: lastAfter ? { bills: after.filter((r) => r.kind !== "income").length, left: lastAfter.left, lastDate: lastAfter.date } : null,
  };
}

/** Two-letter initials for a merchant avatar ("Telstra" → "TE", "Qld Housing Rent" → "QH"). */
export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

// ---- Spending ----------------------------------------------------------------------------------------------
// Same time frame and categories as the Spending page (UX round 2, 1.1): pay cycles, and the one category list
// (content/en-AU categoryNames). Nothing is regrouped under other names.

export interface CycleBar {
  start: ISODate; end: ISODate;
  /** null = before the data starts (never shown as $0). */
  total: number | null;
  /** The current pay cycle: only part-way through. */
  current: boolean;
  /** Starts before the data does, so it's only a part cycle: left out of the average. */
  partialHistory: boolean;
}

/** Total spent in each of the last `n` pay cycles, oldest first, ending with the current one. */
export function cycleSpending(d: SpendData, overrides: CategoryOverrides = {}, n = 6): CycleBar[] {
  return lastCycles(d, n).map((p, i, all) => ({
    start: addDays(p.end, -13), end: p.end,
    total: p.basedOnDays === 0 ? null : totalSpent(d, p, overrides),
    current: i === all.length - 1,
    partialHistory: p.limitedByHistory,
  }));
}

/** The average of the complete pay cycles before the current one (null when there are none). */
export function cycleAverage(bars: CycleBar[]): { average: number; cycles: number } | null {
  const done = bars.filter((b) => !b.current && !b.partialHistory && b.total !== null).map((b) => b.total as number);
  if (!done.length) return null;
  return { average: Math.round(done.reduce((s, v) => s + v, 0) / done.length), cycles: done.length };
}

// ---- Spending so far: this pay cycle against the same point of the last one (Today, 09/10/2026) ------------

/** A change is worth colouring when it's over 20% of last cycle's figure and over $50. Tune here. */
export const CHANGE_THRESHOLD = { pct: 0.2, min: 50 } as const;

export type ChangeTone = "up" | "down" | "neutral";
/** Soft red for a notable rise, soft green for a notable fall, grey for anything smaller. */
export function changeTone(change: number, previous: number): ChangeTone {
  const big = Math.abs(change) > Math.max(CHANGE_THRESHOLD.min, Math.abs(previous) * CHANGE_THRESHOLD.pct);
  return !big ? "neutral" : change > 0 ? "up" : "down";
}

export interface TopCategories {
  items: { category: SpendCategory; total: number; share: number }[];
  /** Everything after the top `n`, with the categories in it (tappable: opens the full list). */
  other: { total: number; share: number; categories: SpendCategory[] } | null;
}

/**
 * The biggest `n` categories, then the rest as Other. With gambling insights turned off (spec 01), gambling is
 * never named here: it counts in Other. Items and Other always add up to the categories' total.
 */
export function topCategories(rows: CategoryRow[], opts: { hideGambling?: boolean; n?: number } = {}): TopCategories {
  const all = sumMoney(rows.map((r) => r.total));
  const named = rows.filter((r) => r.total > 0 && !(opts.hideGambling && r.category === "gambling")).sort((a, b) => b.total - a.total);
  const top = named.slice(0, opts.n ?? 5);
  const rest = rows.filter((r) => r.total > 0 && !top.includes(r));
  const restTotal = sumMoney(rest.map((r) => r.total));
  return {
    items: top.map((r) => ({ category: r.category, total: r.total, share: all ? r.total / all : 0 })),
    other: restTotal > 0 ? { total: restTotal, share: all ? restTotal / all : 0, categories: rest.map((r) => r.category) } : null,
  };
}
