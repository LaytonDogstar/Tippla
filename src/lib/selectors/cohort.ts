// P4 Spending comparison. "You vs your last 3 pay cycles" is real data; the cohort is SAMPLE LOGIC (Q6):
// synthetic ranges until a real cohort source and minimum cohort size are agreed. Never percentiles, never
// rankings; gambling, alcohol and borrowing are never compared.
import type { PersonaData } from "@/lib/api/types";
import { categoryNames } from "@/content/en-AU";
import { sumMoney } from "@/lib/format/money";
import { currentCycle, cycleBefore, type Period, type SpendData } from "./periods";
import { averagePerCycle, type SpendCategory } from "./spending";
import { debitsIn, type CategoryOverrides } from "./transactions";
import { monthlyIncome } from "./income";

export interface HistoryRow {
  category: SpendCategory;
  name: string;
  thisCycle: number;
  /** Oldest first. */
  cycles: { start: string; total: number }[];
  average: number;
}

/** This pay cycle so far against each of the last 3 full pay cycles and their average. */
export function compareWithHistory(d: SpendData, overrides?: CategoryOverrides) {
  const now = currentCycle(d);
  const past: Period[] = [3, 2, 1].map((n) => cycleBefore(d, n)).filter((c) => !c.limitedByHistory);
  const sumBy = (p: Period) => {
    const m = new Map<SpendCategory, number[]>();
    for (const t of debitsIn(d, p, overrides)) m.set(t.category as SpendCategory, [...(m.get(t.category as SpendCategory) ?? []), -t.amount]);
    return new Map([...m].map(([k, v]) => [k, sumMoney(v)]));
  };
  const nowBy = sumBy(now);
  const pastBy = past.map((p) => ({ start: p.start, by: sumBy(p) }));
  const cats = new Set<SpendCategory>([...nowBy.keys(), ...pastBy.flatMap((p) => [...p.by.keys()])]);
  const rows: HistoryRow[] = [...cats].map((category) => {
    const cycles = pastBy.map((p) => ({ start: p.start, total: p.by.get(category) ?? 0 }));
    const average = cycles.length ? Math.round((cycles.reduce((a, c) => a + c.total, 0) / cycles.length) * 100) / 100 : 0;
    return { category, name: categoryNames[category], thisCycle: nowBy.get(category) ?? 0, cycles, average };
  }).sort((a, b) => b.average - a.average || b.thisCycle - a.thisCycle || a.name.localeCompare(b.name));
  return { rows, daysSoFar: now.basedOnDays, hasHistory: past.length > 0 };
}

/** Categories compared with the cohort. Gambling, alcohol and borrowing are excluded by design. */
export const COHORT_CATEGORIES: SpendCategory[] = ["housing", "groceries", "food", "transport", "bills", "shopping", "health", "entertainment", "subscriptions"];

/** SAMPLE (Q6): low / middle / high of the typical range, per pay cycle, for about $4,500 a month income. */
const SAMPLE_BASE: Record<string, [number, number, number]> = {
  housing: [700, 900, 1100], groceries: [160, 220, 300], food: [90, 160, 260], transport: [80, 140, 220], bills: [100, 150, 210],
  shopping: [50, 120, 220], health: [20, 50, 110], entertainment: [30, 70, 130], subscriptions: [15, 35, 60],
};

const STATES: Record<string, string> = {
  NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia", SA: "South Australia", TAS: "Tasmania", ACT: "the ACT", NT: "the Northern Territory",
};

function ageBand(age: number): string {
  if (age < 25) return "18–24";
  if (age < 35) return "25–34";
  if (age < 45) return "35–44";
  if (age < 55) return "45–54";
  return "55 and over";
}

export interface CohortRow { category: SpendCategory; name: string; you: number | null; low: number; middle: number; high: number }

export function sampleCohort(d: PersonaData, overrides?: CategoryOverrides) {
  const income = monthlyIncome(d).amount;
  const lower = Math.max(0, Math.floor(income / 1000) * 1000);
  const scale = Math.min(1.6, Math.max(0.6, income / 4500));
  const r10 = (n: number) => Math.round((n * scale) / 10) * 10;
  const rows: CohortRow[] = COHORT_CATEGORIES.map((category) => {
    const [l, m, h] = SAMPLE_BASE[category]!;
    return { category, name: categoryNames[category], you: averagePerCycle(d, category, 3, overrides), low: r10(l), middle: r10(m), high: r10(h) };
  });
  return {
    sample: true as const,
    ageBand: ageBand(d.profile.age),
    incomeBand: { from: lower, to: lower + 1000 },
    region: STATES[d.profile.state] ?? d.profile.state,
    rows,
  };
}
