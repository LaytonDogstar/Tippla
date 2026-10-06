// Insights for the Spending screen: one at a time ("1 of n"), each tied to the category it talks about so
// the same insight shows as a chip on that category row. Every number comes from the period's transactions,
// except gambling, which uses TaleFin's gross gambling deposits (Q5) and is only shown when that exists.
import { insightCopy } from "@/content/insights";
import { categoryNames, copy } from "@/content/en-AU";
import { spending as s } from "@/content/spending";
import { formatFactor, formatPercent, formatWhole } from "@/lib/format";
import type { Period, SpendData } from "./periods";
import { categoryTotals, merchantsIn, type SpendCategory } from "./spending";
import { subscriptions } from "./subscriptions";
import type { CategoryOverrides } from "./transactions";

export interface SpendingInsight {
  id: "gambling" | "food" | "subscriptions";
  category: SpendCategory;
  context: string;
  title: string;
  summary: string;
  happening: string;
  wouldChange?: string;
  ifYouWant?: string;
  /** Short label for the chip on the category row. */
  chip: string;
}

export interface GamblingFacts { pctOfIncome90: number; factor: number | null }

export function spendingInsights(d: SpendData, p: Period, overrides: CategoryOverrides = {}, gambling: GamblingFacts | null = null): SpendingInsight[] {
  const rows = categoryTotals(d, p, overrides);
  const out: SpendingInsight[] = [];
  const isCycle = p.id === "this_cycle";

  // Gambling first when it's there: it is the one that moves the score most (docs/02 template, neutral).
  if (gambling && rows.some((r) => r.category === "gambling")) {
    const g = insightCopy.gambling(formatPercent(gambling.pctOfIncome90), gambling.factor === null ? null : formatFactor(gambling.factor));
    out.push({ id: "gambling", category: "gambling", context: s.insightsContext, title: g.title, summary: g.summary, happening: g.happening, wouldChange: g.wouldChange, ifYouWant: g.ifYouWant, chip: copy.gambling.title });
  }

  // The biggest single merchant in Food & dining: a plain fact plus a budget option (docs/02 rewrite table).
  const food = rows.find((r) => r.category === "food");
  const top = food ? merchantsIn(d, p, "food", overrides)[0] : undefined;
  if (food && top && top.count >= 3) {
    const f = s.insights.food(top.merchant, formatWhole(top.total), top.count);
    const when = p.id === "last_cycle" ? s.when.last_cycle : p.id === "month" ? s.when.month(p.label) : s.when.rolling(p.label);
    const other = s.insights.foodPeriod(top.merchant, formatWhole(top.total), top.count, when);
    const title = isCycle ? f.title : other.title;
    const summary = isCycle ? f.summary : other.summary;
    out.push({
      id: "food", category: "food", context: s.insightsContext, title, summary,
      happening: isCycle ? f.happening(categoryNames.food, formatWhole(food.total)) : summary,
      wouldChange: f.wouldChange, chip: title,
    });
  }

  const subs = subscriptions(d, overrides);
  if (subs.rows.length >= 2 && rows.some((r) => r.category === "subscriptions")) {
    const c = s.insights.subscriptions(subs.rows.length, formatWhole(subs.totalPerPayCycle), formatWhole(subs.totalPerYear));
    out.push({ id: "subscriptions", category: "subscriptions", context: s.insightsContext, title: c.title, summary: c.summary, happening: c.happening, wouldChange: c.wouldChange, chip: c.title });
  }
  return out;
}
