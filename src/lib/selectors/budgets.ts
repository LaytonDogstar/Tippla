import { categoryNames, categoryTypes } from "@/content/en-AU";
import { sumMoney } from "@/lib/format/money";
import type { Budgets } from "./edits";
import type { Period, SpendData } from "./periods";
import { averagePerCycle, categoryTotals, type SpendCategory } from "./spending";
import type { CategoryOverrides } from "./transactions";

/**
 * Fixed commitments: rent, loan and pay-advance repayments, buy now pay later instalments and bank fees. A budget
 * can't change what's owed, so none is offered for them (UX round 2, 1.7); everything else is discretionary.
 */
export const FIXED_COMMITMENTS: readonly SpendCategory[] = ["housing", "loan_repayment", "bnpl", "wage_advance", "fees"];
export const budgetable = (c: SpendCategory) => !FIXED_COMMITMENTS.includes(c);

export interface BudgetRow {
  category: SpendCategory;
  name: string;
  spent: number;
  /** null = no budget set. */
  budget: number | null;
  /** budget − spent (negative = over). null without a budget. */
  remaining: number | null;
  /** spent / budget, uncapped. null without a budget or with a $0 budget. */
  ratio: number | null;
}

/**
 * Budget vs spent per category for a pay cycle. Budgeted categories first (in spend order), then the rest.
 * The summary only covers budgeted categories, and every one of them is listed (no "3 of 6" without the 6).
 */
export function budgetView(d: SpendData, cycle: Period, budgets: Budgets, overrides?: CategoryOverrides) {
  const totals = new Map(categoryTotals(d, cycle, overrides).map((r) => [r.category, r.total]));
  const cats = new Set<SpendCategory>([...totals.keys(), ...(Object.keys(budgets) as SpendCategory[])]);
  const rows: BudgetRow[] = [...cats].filter((c) => c in categoryTypes).map((category) => {
    const spent = totals.get(category) ?? 0;
    const budget = budgets[category] ?? null;
    return {
      category, name: categoryNames[category], spent, budget,
      remaining: budget === null ? null : sumMoney([budget, -spent]),
      ratio: budget ? spent / budget : null,
    };
  });
  const byAmount = (a: BudgetRow, b: BudgetRow) => b.spent - a.spent || a.name.localeCompare(b.name);
  const budgeted = rows.filter((r) => r.budget !== null).sort(byAmount);
  const other = rows.filter((r) => r.budget === null && budgetable(r.category)).sort(byAmount);
  return {
    budgeted,
    other,
    totalBudget: sumMoney(budgeted.map((r) => r.budget ?? 0)),
    totalSpent: sumMoney(budgeted.map((r) => r.spent)),
  };
}

/**
 * UX round 2, 6.4: up to three suggested budgets when none are set, from the last three pay cycles. Discretionary
 * categories only (no fixed commitments), and never gambling or alcohol: Tippla doesn't push a target on those.
 * The suggestion is about 15% under the average, rounded down to $10 (at least $10).
 */
export interface BudgetSuggestion { category: SpendCategory; name: string; average: number; suggested: number }
/** About 15% under the usual (3-cycle) average, in tens, never under $10: Budget ideas and the Spending panels. */
export const suggestedBudget = (average: number) => Math.max(10, Math.floor((average * 0.85) / 10) * 10);

export function budgetSuggestions(d: SpendData, budgets: Budgets, overrides?: CategoryOverrides, max = 3): BudgetSuggestion[] {
  const NOT_SUGGESTED: SpendCategory[] = ["gambling", "alcohol"];
  return (Object.keys(categoryTypes) as SpendCategory[])
    .filter((c) => budgetable(c) && categoryTypes[c] === "lifestyle" && !NOT_SUGGESTED.includes(c) && budgets[c] === undefined)
    .map((c) => ({ c, avg: averagePerCycle(d, c, 3, overrides) }))
    .filter((x): x is { c: SpendCategory; avg: number } => x.avg !== null && x.avg >= 20)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, max)
    .map(({ c, avg }) => ({ category: c, name: categoryNames[c], average: Math.round(avg), suggested: suggestedBudget(avg) }));
}

/**
 * Budget ideas on Spending (buttons brief, 09/10/2026): the suggestions, with any amount the member typed in place
 * of the suggested one and the ones they said "Not now" to left out. `justSet` keeps a row in place (as its "Budget
 * set" confirmation) for the few seconds after Set, although the category now has a budget. Empty = hide the card.
 */
export interface BudgetIdea extends BudgetSuggestion { justSet: boolean }
export function budgetIdeas(d: SpendData, budgets: Budgets, overrides: CategoryOverrides | undefined, opts: {
  amounts?: Partial<Record<SpendCategory, number>>; dismissed?: Iterable<string>; justSet?: Iterable<SpendCategory>;
} = {}): BudgetIdea[] {
  const dismissed = new Set(opts.dismissed ?? []);
  const justSet = new Set(opts.justSet ?? []);
  const without = Object.fromEntries(Object.entries(budgets).filter(([c]) => !justSet.has(c as SpendCategory))) as Budgets;
  return budgetSuggestions(d, without, overrides)
    .filter((x) => !dismissed.has(x.category))
    .map((x) => ({ ...x, suggested: justSet.has(x.category) ? budgets[x.category] ?? x.suggested : opts.amounts?.[x.category] ?? x.suggested, justSet: justSet.has(x.category) }));
}

/** A typed budget amount: whole dollars, $1 to $99,999 ("$60", "60", "1,200"). null when it isn't one. */
export function parseBudgetAmount(raw: string): number | null {
  const s = raw.replace(/[$,\s]/g, "");
  if (!/^\d{1,5}$/.test(s)) return null;
  const n = Number(s);
  return n >= 1 ? n : null;
}
