// The pay-cycle loop: a check-in the morning pay lands, and a recap of the cycle that just ended.
// Streaks only ever celebrate (no "you broke your streak"). Offers are never part of either.
import type { CategoryId, PersonaData } from "@/lib/api/types";
import { addDays, type ISODate } from "@/lib/format/dates";
import { sumMoney } from "@/lib/format/money";
import { dailyBalances } from "./balance";
import { currentCycle, cycleBefore, type Period } from "./periods";
import { safeToSpend, type SafeToSpend } from "./safeToSpend";
import { categoryTotals } from "./spending";
import { inPeriod, isIncome, posted, type CategoryOverrides } from "./transactions";

export interface PaydayCheckIn {
  income: { payer: string; amount: number }[];
  incomeTotal: number;
  cycle: Period;
  bills: { date: ISODate; merchant: string; amount: number; category: CategoryId }[];
  billsTotal: number;
  repaymentsTotal: number;
  advance: { provider: string; amount: number; date: ISODate } | null;
  safe: SafeToSpend;
}

const REPAYMENT: CategoryId[] = ["loan_repayment", "bnpl", "wage_advance"];

/** Shown when regular income (wages or Centrelink) landed today, on the first day of a new pay cycle. */
export function paydayCheckIn(d: PersonaData): PaydayCheckIn | null {
  const cycle = currentCycle(d);
  const today = posted(d.transactions).filter((t) => t.date === d.asOf && isIncome(t) && (t.subcategory === "wages" || t.subcategory === "centrelink"));
  if (!today.length || cycle.start > d.asOf || addDays(cycle.start, 1) < d.asOf) return null;
  const bills = d.derived.upcoming_bills
    .filter((b) => b.date > d.asOf && b.date < d.derived.pay_cycle.next_payday)
    .map((b) => ({ date: b.date, merchant: b.merchant, amount: b.expected_amount, category: b.category }));
  const adv = bills.find((b) => b.category === "wage_advance");
  return {
    income: today.map((t) => ({ payer: t.merchant, amount: t.amount })),
    incomeTotal: sumMoney(today.map((t) => t.amount)),
    cycle,
    bills,
    billsTotal: sumMoney(bills.map((b) => b.amount)),
    repaymentsTotal: sumMoney(bills.filter((b) => REPAYMENT.includes(b.category)).map((b) => b.amount)),
    advance: adv ? { provider: adv.merchant, amount: adv.amount, date: adv.date } : null,
    safe: safeToSpend(d),
  };
}

export interface CycleRecap {
  cycle: Period;
  spent: number;
  paidIn: number;
  advances: { count: number; total: number };
  /** Completed pay cycles in a row, ending with this one, without a new pay advance (0 if it had one). */
  noAdvanceStreak: number;
  score: { from: number; to: number } | null;
  fees: { count: number; total: number };
  endBalance: number | null;
  /** Biggest category changes vs the cycle before (never gambling or alcohol: those stay opt-in). */
  changes: { category: CategoryId; name: string; change: number }[];
}

const QUIET: CategoryId[] = ["gambling", "alcohol"];

function advancesIn(d: PersonaData, p: Period) {
  const a = inPeriod(posted(d.transactions), p).filter((t) => t.category === "wage_advance" && t.amount > 0);
  return { count: a.length, total: sumMoney(a.map((t) => t.amount)) };
}

/** The pay cycle that has just ended (offered on payday, alongside the check-in). */
export function cycleRecap(d: PersonaData, edits?: CategoryOverrides): CycleRecap | null {
  const last = cycleBefore(d, 1);
  if (last.limitedByHistory) return null;
  const tx = inPeriod(posted(d.transactions), last);
  const advances = advancesIn(d, last);
  let streak = 0;
  for (let n = 1; n <= 26; n++) {
    const c = cycleBefore(d, n);
    if (c.limitedByHistory || advancesIn(d, c).count > 0) break;
    streak++;
  }
  const scored = d.scoreHistory.filter((h) => h.scored_date >= last.start && h.scored_date <= last.end).at(-1);
  const before = scored ? [...d.scoreHistory].reverse().find((h) => h.scored_date < scored.scored_date) : undefined;
  const fees = tx.filter((t) => t.subcategory === "dishonour");
  const changes = categoryTotals(d, last, edits)
    .filter((r) => !QUIET.includes(r.category) && r.previousTotal > 0 && Math.abs(r.change) >= 20)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
    .slice(0, 3)
    .map((r) => ({ category: r.category, name: r.name, change: r.change }));
  return {
    cycle: last,
    spent: sumMoney(categoryTotals(d, last, edits).map((r) => r.total)),
    paidIn: sumMoney(tx.filter(isIncome).map((t) => t.amount)),
    advances,
    noAdvanceStreak: streak,
    score: scored && before ? { from: before.score, to: scored.score } : null,
    fees: { count: fees.length, total: sumMoney(fees.map((t) => -t.amount)) },
    endBalance: dailyBalances(d).find((b) => b.date === last.end)?.balance ?? null,
    changes,
  };
}
