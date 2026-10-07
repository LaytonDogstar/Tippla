// Today page (redesign 07/10/2026): presentation-only figures, all derived from the existing selectors.
// Nothing here changes a calculation: it picks the hero state, groups what's already computed, and lines up
// the next two weeks. Pure and unit tested (tests/today.test.ts).
import type { PersonaData, UpcomingBill } from "@/lib/api/types";
import type { AccountState } from "@/lib/account/state";
import { addDays, daysBetween, sumMoney, type ISODate } from "@/lib/format";
import type { FeedItem, FeedType } from "@/lib/feed/types";
import type { PayCycleSummary } from "./payCycle";
import type { SafeToSpend } from "./safeToSpend";
import type { MonthBar } from "./monthly";
import type { CategoryRow } from "./spending";
import { upcomingIncome } from "./income";
import { billing } from "./account";

// ---- Hero -------------------------------------------------------------------------------------------------

export type HeroState = "short" | "tight" | "onTrack";

/**
 * Short: bills due before payday are more than the balance (payCycleSummary.isShort).
 * Tight: bills are covered, but the safe-to-spend forecast leaves nothing spare before payday.
 * On track: something spare each day until payday.
 */
export function heroState(pc: PayCycleSummary, safe: Pick<SafeToSpend, "nothingSpare">): HeroState {
  if (pc.isShort) return "short";
  return safe.nothingSpare ? "tight" : "onTrack";
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
  /** Predicted bill, expected income, or a Tippla payment that can be paused. */
  qualifier: "predicted" | "confirmed" | "expected" | "estimated" | "pausable";
}

/** Money in and out over the next `days` days (default 14), in date order. */
export function comingUp(d: PersonaData, a: AccountState = {}, days = 14): ComingUpItem[] {
  const until = addDays(d.asOf, days);
  const bills = d.derived.upcoming_bills.filter((b: UpcomingBill) => b.date > d.asOf && b.date <= until).map((b): ComingUpItem => ({
    date: b.date, kind: b.category === "wage_advance" ? "payAdvance" : "bill", name: b.merchant, amount: b.expected_amount, qualifier: b.confidence,
  }));
  const income = upcomingIncome(d, until).filter((i) => i.date > d.asOf).map((i): ComingUpItem => ({
    date: i.date, kind: "income", name: i.payer, amount: i.amount, qualifier: i.exact ? "expected" : "estimated",
  }));
  const b = billing(d, a);
  const tippla: ComingUpItem[] = b.status === "active" && b.nextCharge && b.nextCharge > d.asOf && b.nextCharge <= until
    ? [{ date: b.nextCharge, kind: "tippla", name: "Tippla", amount: b.price, qualifier: "pausable" }] : [];
  const order = { income: 0, payAdvance: 1, bill: 2, tippla: 3 } as const;
  return [...bills, ...income, ...tippla].sort((x, y) => x.date.localeCompare(y.date) || order[x.kind] - order[y.kind]);
}

/** Two-letter initials for a merchant avatar ("Telstra" → "TE", "Qld Housing Rent" → "QH"). */
export function initials(name: string): string {
  const words = name.replace(/[^A-Za-z0-9 ]/g, " ").trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0]![0]! + words[1]![0]!).toUpperCase();
  return (words[0] ?? "?").slice(0, 2).toUpperCase();
}

// ---- Spending ----------------------------------------------------------------------------------------------

export type SpendGroup = "bills" | "groceries" | "shopping" | "eatingOut" | "transport" | "gambling" | "other";
const GROUP_OF: Partial<Record<string, SpendGroup>> = {
  housing: "bills", bills: "bills", subscriptions: "bills", groceries: "groceries", shopping: "shopping",
  food: "eatingOut", transport: "transport", gambling: "gambling",
};
export const SPEND_GROUPS: SpendGroup[] = ["bills", "groceries", "shopping", "eatingOut", "transport", "gambling", "other"];

/**
 * Category totals in the seven Today groups (everything else is Other). With gambling insights turned off,
 * gambling counts in Other. The groups always add up to the categories' total.
 */
export function spendGroups(rows: CategoryRow[], opts: { hideGambling?: boolean } = {}): { group: SpendGroup; total: number; share: number }[] {
  const totals = new Map<SpendGroup, number[]>();
  for (const r of rows) {
    let g = GROUP_OF[r.category] ?? "other";
    if (g === "gambling" && opts.hideGambling) g = "other";
    totals.set(g, [...(totals.get(g) ?? []), r.total]);
  }
  const all = sumMoney(rows.map((r) => r.total));
  return SPEND_GROUPS.filter((g) => totals.has(g)).map((g) => {
    const total = sumMoney(totals.get(g)!);
    return { group: g, total, share: all ? total / all : 0 };
  }).filter((g) => g.total > 0)
    // Largest first, Other always last.
    .sort((a, b) => (a.group === "other" ? 1 : b.group === "other" ? -1 : b.total - a.total));
}

/** The average of the complete months before the current one (null when there are none). */
export function monthAverage(bars: MonthBar[]): { average: number; months: number } | null {
  const done = bars.filter((b) => !b.partial && b.total !== null).map((b) => b.total as number);
  if (!done.length) return null;
  return { average: Math.round(done.reduce((s, v) => s + v, 0) / done.length), months: done.length };
}
