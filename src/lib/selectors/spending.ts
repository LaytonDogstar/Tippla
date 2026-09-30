import type { CategoryId, PersonaData } from "@/lib/api/types";
import { categoryNames, categoryTypes } from "@/content/en-AU";
import { sumMoney } from "@/lib/format/money";
import { lastCycles, previousOf, type Period } from "./periods";
import { debitsIn, type CategoryOverrides } from "./transactions";

export type SpendCategory = Exclude<CategoryId, "income" | "transfer">;
export type SpendFilter = "all" | "essentials" | "lifestyle";

export interface CategoryRow {
  category: SpendCategory;
  name: string;
  type: "essential" | "lifestyle";
  total: number;
  count: number;
  /** Share of the period's total spend, 0–1. */
  share: number;
  previousTotal: number;
  change: number; // total − previousTotal
}

export function totalSpent(d: PersonaData, p: Period, overrides?: CategoryOverrides): number {
  return sumMoney(debitsIn(d, p, overrides).map((t) => -t.amount));
}

export function categoryTotals(d: PersonaData, p: Period, overrides?: CategoryOverrides, filter: SpendFilter = "all"): CategoryRow[] {
  const sum = (per: Period) => {
    const m = new Map<SpendCategory, number[]>();
    for (const t of debitsIn(d, per, overrides)) {
      const c = t.category as SpendCategory;
      m.set(c, [...(m.get(c) ?? []), -t.amount]);
    }
    return m;
  };
  const now = sum(p);
  const prev = sum(previousOf(d, p));
  const total = sumMoney([...now.values()].flat());
  const rows: CategoryRow[] = [...now.entries()].map(([category, amounts]) => {
    const t = sumMoney(amounts);
    const pt = sumMoney(prev.get(category) ?? []);
    return {
      category, name: categoryNames[category], type: categoryTypes[category],
      total: t, count: amounts.length, share: total ? t / total : 0, previousTotal: pt, change: sumMoney([t, -pt]),
    };
  });
  return rows
    .filter((r) => filter === "all" || (filter === "essentials" ? r.type === "essential" : r.type === "lifestyle"))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name));
}

export interface MerchantRow { merchant: string; total: number; count: number; transactionIds: string[] }

export function merchantsIn(d: PersonaData, p: Period, category: SpendCategory, overrides?: CategoryOverrides): MerchantRow[] {
  const m = new Map<string, MerchantRow>();
  for (const t of debitsIn(d, p, overrides).filter((x) => x.category === category)) {
    const r = m.get(t.merchant) ?? { merchant: t.merchant, total: 0, count: 0, transactionIds: [] };
    r.total = sumMoney([r.total, -t.amount]);
    r.count += 1;
    r.transactionIds.push(t.id);
    m.set(t.merchant, r);
  }
  return [...m.values()].sort((a, b) => b.total - a.total);
}

/** Spend per pay cycle for the last `n` cycles, oldest first (category sparkline). null = no data yet, never $0. */
export function categorySparkline(d: PersonaData, category: SpendCategory, n = 6, overrides?: CategoryOverrides): (number | null)[] {
  return lastCycles(d, n).map((p) =>
    p.basedOnDays === 0 ? null : sumMoney(debitsIn(d, p, overrides).filter((t) => t.category === category).map((t) => -t.amount)),
  );
}
