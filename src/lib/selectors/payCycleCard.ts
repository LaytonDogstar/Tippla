// The "last pay cycle" card on Money plan (13/10/2026; reference: tippla-pay-cycle-option3.html): where the pay went,
// as a waffle of squares (about 1% of pay each), two groups of categories, and the share debt, pay advances and
// gambling took. Every figure comes from moneyWent(), so the card and the rest of Money plan agree.
import { sumMoney } from "@/lib/format/money";
import type { MoneyWent, SpendGroup } from "./moneyPlan";

/** The card's grouping, in display order. Add a category here (and a style in the card) to show it. */
export const PAY_CYCLE_GROUPS: { id: "essentials" | "debt"; items: SpendGroup[] }[] = [
  { id: "essentials", items: ["rent", "everyday", "bills"] },
  { id: "debt", items: ["gambling", "loans", "advance"] },
];
export type PayCycleGroupId = (typeof PAY_CYCLE_GROUPS)[number]["id"];

/**
 * Largest-remainder rounding: split `total` whole squares across `amounts` in proportion, so the counts add up to
 * exactly `total`. Each amount gets its floor; the squares left go to the biggest remainders, ties to the earlier one.
 */
export function largestRemainder(amounts: number[], total: number): number[] {
  const sum = amounts.reduce((s, a) => s + Math.max(0, a), 0);
  if (sum <= 0 || total <= 0) return amounts.map(() => 0);
  const quotas = amounts.map((a) => (Math.max(0, a) / sum) * total);
  const counts = quotas.map(Math.floor);
  let left = total - counts.reduce((s, c) => s + c, 0);
  const order = quotas.map((q, i) => ({ i, r: q - Math.floor(q) })).sort((a, b) => b.r - a.r || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    counts[i]! += 1;
    left -= 1;
  }
  return counts;
}

/** How many squares the waffle has: one per 1% of pay spent (so 111 when spending was 111% of pay). */
export const waffleTotal = (spent: number, paid: number) => (paid > 0 ? Math.round((spent / paid) * 100) : 0);

export interface PayCycleItem { group: SpendGroup; total: number; shareOfPay: number; merchants: string[]; squares: number }
export interface PayCycleCard {
  paid: number; spent: number; net: number;
  /** Squares in the waffle (spent as a whole % of pay); the first 100 are the pay itself. */
  squares: number;
  groups: { id: PayCycleGroupId; total: number; shareOfPay: number; items: PayCycleItem[] }[];
  /** Debt, pay advances and gambling together; null when there was none. */
  heavy: { total: number; shareOfPay: number } | null;
  advance: MoneyWent["advances"][number] | null;
}

export function payCycleCard(w: MoneyWent): PayCycleCard {
  const byGroup = new Map(w.groups.map((g) => [g.group, g]));
  const ordered = PAY_CYCLE_GROUPS.flatMap((g) => g.items).map((id) => byGroup.get(id)).filter((g): g is MoneyWent["groups"][number] => !!g && g.total > 0);
  const squares = waffleTotal(w.spent, w.paid);
  const counts = largestRemainder(ordered.map((g) => g.total), squares);
  const items = new Map(ordered.map((g, i) => [g.group, { group: g.group, total: g.total, shareOfPay: g.shareOfPay, merchants: g.merchants, squares: counts[i]! }]));
  const groups = PAY_CYCLE_GROUPS.map((g) => {
    const list = g.items.map((id) => items.get(id)).filter((x): x is PayCycleItem => !!x);
    const total = sumMoney(list.map((x) => x.total));
    return { id: g.id, total, shareOfPay: w.paid ? total / w.paid : 0, items: list };
  }).filter((g) => g.items.length > 0);
  const debt = groups.find((g) => g.id === "debt");
  return {
    paid: w.paid, spent: w.spent, net: w.net, squares, groups,
    heavy: debt ? { total: debt.total, shareOfPay: debt.shareOfPay } : null,
    advance: w.advances[0] ?? null,
  };
}
