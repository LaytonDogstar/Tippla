// Your money plan (12/10/2026; reference: tippla-money-plan-mockup.dc.html). Every figure comes from the
// transactions, the recurring payments and the pay cycle (cycleBefore / currentCycle, from the detected pay dates):
// where the last full pay cycle's money went (six groups, pending left out), the lenders and BNPL providers found in
// recurring payments (amount per pay cycle, frequency normalised), the shortfall before payday and what it would take
// to halve or skip the next advance, this cycle against the last one, and the smaller wins.
import type { CategoryId, PersonaData } from "@/lib/api/types";
import { GAMBLING_CARD_MIN_PER_CYCLE } from "@/config/flags";
import { addDays, daysBetween, type ISODate } from "@/lib/format/dates";
import { cents, sumMoney } from "@/lib/format/money";
import { calendarDays, type CalDay } from "./calendarMonth";
import { currentCycle, cycleBefore, type Period } from "./periods";
import { billSwitchCandidates, subscriptions } from "./subscriptions";
import { applyOverrides, posted, type CategoryOverrides } from "./transactions";

// ---- Where your money went ---------------------------------------------------------------------------------------

export type SpendGroup = "rent" | "everyday" | "gambling" | "loans" | "advance" | "bills";
export const SPEND_GROUPS: SpendGroup[] = ["rent", "everyday", "gambling", "loans", "advance", "bills"];
/** Which group each spending category belongs to. Transfers between your own accounts aren't spending. */
export const GROUP_OF: Partial<Record<CategoryId, SpendGroup>> = {
  housing: "rent",
  food: "everyday", groceries: "everyday", transport: "everyday", shopping: "everyday", health: "everyday", alcohol: "everyday", entertainment: "everyday", cash: "everyday",
  gambling: "gambling",
  loan_repayment: "loans", bnpl: "loans",
  wage_advance: "advance",
  bills: "bills", subscriptions: "bills", fees: "bills",
};

export interface MoneyWent {
  cycle: Period;
  /** Income (wages, Centrelink). Pay advances are money in, but not pay. */
  paid: number;
  spent: number;
  /** paid − spent: negative = spent more than you were paid. */
  net: number;
  groups: { group: SpendGroup; total: number; shareOfPay: number; merchants: string[] }[];
  /** Pay advances received in the cycle (how a gap was covered). */
  advances: { date: ISODate; amount: number; provider: string }[];
  /** Debt, pay advances and gambling, as a share of pay. */
  heavyShare: number;
  /** Where pay ran out along the bar (0–1), when spending was more than pay. */
  payRanOutAt: number | null;
}

export function moneyWent(d: PersonaData, cycle: Period, overrides?: CategoryOverrides): MoneyWent {
  const tx = posted(applyOverrides(d.transactions, overrides)).filter((t) => t.date >= cycle.start && t.date <= cycle.end);
  const paid = sumMoney(tx.filter((t) => t.category === "income" && t.amount > 0).map((t) => t.amount));
  const debits = tx.filter((t) => t.amount < 0 && GROUP_OF[t.category]);
  const spent = sumMoney(debits.map((t) => -t.amount));
  const groups = SPEND_GROUPS.map((group) => {
    const list = debits.filter((t) => GROUP_OF[t.category] === group);
    const total = sumMoney(list.map((t) => -t.amount));
    return { group, total, shareOfPay: paid ? total / paid : 0, merchants: [...new Set(list.map((t) => t.merchant))] };
  }).filter((g) => g.total > 0);
  const heavy = sumMoney(groups.filter((g) => g.group === "gambling" || g.group === "loans" || g.group === "advance").map((g) => g.total));
  return {
    cycle, paid, spent, net: sumMoney([paid, -spent]), groups,
    advances: tx.filter((t) => t.category === "wage_advance" && t.amount > 0).map((t) => ({ date: t.date, amount: t.amount, provider: t.merchant })),
    heavyShare: paid ? heavy / paid : 0,
    payRanOutAt: spent > paid && spent > 0 ? paid / spent : null,
  };
}

// ---- Repayments ------------------------------------------------------------------------------------------------------

export type LenderKind = "loan" | "bnpl" | "advance";
export type Frequency = "weekly" | "fortnightly" | "monthly" | "irregular";
export interface Lender {
  provider: string; kind: LenderKind; frequency: Frequency;
  /** The usual amount each payment. */
  amount: number;
  /** Normalised to one pay cycle (fortnightly = as is, monthly × 12 ÷ 26, weekly × 2). */
  perCycle: number;
  lastPaid: ISODate;
  /** Pay advances: the fee taken with each one (repayment − advance). */
  fee: number | null;
}
/** How recently a repayment must have gone out to count as still active. */
export const LENDER_ACTIVE_DAYS = 40;

const frequencyOf = (gap: number | null): Frequency =>
  gap === null ? "irregular" : gap <= 9 ? "weekly" : gap <= 18 ? "fortnightly" : gap <= 35 ? "monthly" : "irregular";
const PER_CYCLE: Record<Frequency, number> = { weekly: 2, fortnightly: 1, monthly: 12 / 26, irregular: 1 };

/** Lenders and BNPL providers from recurring outgoing payments (pay-advance repayments included), biggest first. */
export function lenders(d: PersonaData, overrides?: CategoryOverrides): Lender[] {
  const tx = posted(applyOverrides(d.transactions, overrides));
  const kindOf = (c: CategoryId): LenderKind | null => (c === "loan_repayment" ? "loan" : c === "bnpl" ? "bnpl" : c === "wage_advance" ? "advance" : null);
  const by = new Map<string, { kind: LenderKind; pays: { date: ISODate; amount: number }[] }>();
  for (const t of tx) {
    const kind = kindOf(t.category);
    if (!kind || t.amount >= 0) continue;
    const e = by.get(t.merchant) ?? { kind, pays: [] };
    e.pays.push({ date: t.date, amount: -t.amount });
    by.set(t.merchant, e);
  }
  const out: Lender[] = [];
  for (const [provider, { kind, pays }] of by) {
    const p = pays.sort((a, b) => a.date.localeCompare(b.date));
    const last = p.at(-1)!;
    if (daysBetween(last.date, d.asOf) > LENDER_ACTIVE_DAYS) continue;
    const gaps = p.slice(1).map((x, i) => daysBetween(p[i]!.date, x.date)).sort((a, b) => a - b);
    const frequency = kind === "advance" ? "fortnightly" : frequencyOf(gaps.length ? gaps[Math.floor(gaps.length / 2)]! : null);
    const credit = kind === "advance" ? tx.filter((t) => t.merchant === provider && t.amount > 0).at(-1)?.amount ?? null : null;
    out.push({ provider, kind, frequency, amount: last.amount, perCycle: cents(last.amount * PER_CYCLE[frequency]), lastPaid: last.date, fee: credit !== null ? cents(last.amount - credit) : null });
  }
  return out.sort((a, b) => b.perCycle - a.perCycle || a.provider.localeCompare(b.provider));
}

// ---- Shortfall and what it would take ------------------------------------------------------------------------------

/**
 * How short the member ran before payday in a cycle: the gap when they spent more than they were paid, else the
 * lowest end-of-day balance before the first pay-advance credit if that went below $0. 0 when neither.
 */
export function shortfallIn(w: MoneyWent, days: CalDay[]): number {
  if (w.net < 0) return -w.net;
  const until = w.advances[0]?.date ?? w.cycle.end;
  const low = Math.min(0, ...days.filter((x) => x.date >= w.cycle.start && x.date < until && x.balance !== null).map((x) => x.balance!));
  return low < 0 ? -low : 0;
}

/**
 * What it would take to halve or skip the next advance: to halve it, the shortfall less half the usual advance; to
 * skip it, the whole shortfall (never more than the advance). Rounded to $10. null without a usual advance.
 */
export function whatItWouldTake(shortfall: number, usualAdvance: number | null): { low: number; high: number } | null {
  if (!usualAdvance || shortfall <= 0) return null;
  const r10 = (n: number) => Math.round(n / 10) * 10;
  const high = Math.min(shortfall, usualAdvance);
  return { low: r10(Math.max(0, high - usualAdvance / 2)), high: r10(high) };
}

// ---- This cycle against the last one -----------------------------------------------------------------------------

export interface ProgressRow { key: "lowest" | "gambling" | "advances" | "loans"; last: number; now: number; nowForecast?: boolean; change: number }
export function cycleProgress(d: PersonaData, overrides?: CategoryOverrides): { last: Period; now: Period; asOf: ISODate; rows: ProgressRow[] } {
  const last = cycleBefore(d, 1), now = currentCycle(d);
  const days = calendarDays(d, overrides);
  const tx = posted(applyOverrides(d.transactions, overrides));
  const sum = (p: Period, f: (t: (typeof tx)[number]) => boolean) => sumMoney(tx.filter((t) => t.date >= p.start && t.date <= p.end && f(t)).map((t) => Math.abs(t.amount)));
  const lowest = (p: Period) => days.filter((x) => x.date >= p.start && x.date <= p.end && x.balance !== null).reduce<CalDay | null>((lo, x) => (!lo || x.balance! < lo.balance! ? x : lo), null);
  const lo = lowest(last), ln = lowest(now);
  const row = (key: ProgressRow["key"], a: number, b: number, extra: Partial<ProgressRow> = {}): ProgressRow => ({ key, last: a, now: b, change: sumMoney([b, -a]), ...extra });
  const g = (t: { category: CategoryId; amount: number }) => t.category === "gambling" && t.amount < 0;
  const adv = (t: { category: CategoryId; amount: number }) => t.category === "wage_advance" && t.amount > 0;
  const loan = (t: { category: CategoryId; amount: number }) => (t.category === "loan_repayment" || t.category === "bnpl") && t.amount < 0;
  return {
    last, now, asOf: d.asOf,
    rows: [
      row("lowest", lo?.balance ?? 0, ln?.balance ?? 0, { nowForecast: !!ln?.isFuture }),
      row("gambling", sum(last, g), sum(now, g)),
      row("advances", sum(last, adv), sum(now, adv)),
      row("loans", sum(last, loan), sum(now, loan)),
    ],
  };
}

// ---- Gambling card -------------------------------------------------------------------------------------------------

export function gamblingCard(d: PersonaData, w: MoneyWent, overrides?: CategoryOverrides): { total: number; shareOfPay: number; operators: string[]; thisCycle: number } | null {
  const g = w.groups.find((x) => x.group === "gambling");
  if (!g || g.total < GAMBLING_CARD_MIN_PER_CYCLE) return null;
  const now = currentCycle(d);
  const thisCycle = sumMoney(posted(applyOverrides(d.transactions, overrides)).filter((t) => t.date >= now.start && t.date <= now.end && t.category === "gambling" && t.amount < 0).map((t) => -t.amount));
  return { total: g.total, shareOfPay: g.shareOfPay, operators: [...g.merchants].sort(), thisCycle };
}

// ---- Smaller wins --------------------------------------------------------------------------------------------------

export type WinId = "subscriptions" | "failed_debits" | "phone" | "energy";
export interface Win { id: WinId; names?: string[]; amount?: number; count?: number; lastDate?: ISODate; fees?: number; merchant?: string; monthly?: number; saving: number | null }

/** Smaller wins with what each could save a pay cycle (null = varies). */
export function smallerWins(d: PersonaData, cycleDays = 14): Win[] {
  const out: Win[] = [];
  const subs = subscriptions(d);
  if (subs.rows.length) out.push({ id: "subscriptions", names: subs.rows.map((r) => r.merchant), amount: subs.totalPerPayCycle, saving: Math.round(subs.totalPerPayCycle) });
  const from = addDays(d.asOf, -89);
  const fails = posted(d.transactions).filter((t) => t.date >= from && t.date <= d.asOf && t.category === "fees" && t.subcategory === "dishonour").sort((a, b) => a.date.localeCompare(b.date));
  if (fails.length) {
    const fees = sumMoney(fails.map((t) => -t.amount));
    out.push({ id: "failed_debits", count: fails.length, lastDate: fails.at(-1)!.date, fees, saving: Math.round((fees / 90) * cycleDays) });
  }
  // Phone, then energy (the brief's order), the biggest bill of each.
  const bills = billSwitchCandidates(d);
  const phone = bills.find((b) => b.category === "telco"), energy = bills.find((b) => b.category === "energy");
  if (phone) out.push({ id: "phone", merchant: phone.merchant, monthly: phone.monthly, saving: null });
  if (energy) out.push({ id: "energy", merchant: energy.merchant, monthly: energy.monthly, saving: null });
  return out;
}
