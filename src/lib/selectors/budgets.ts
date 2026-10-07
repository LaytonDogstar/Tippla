import { categoryNames, categoryTypes } from "@/content/en-AU";
import { sumMoney } from "@/lib/format/money";
import type { Budgets } from "./edits";
import type { Period, SpendData } from "./periods";
import { categoryTotals, type SpendCategory } from "./spending";
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
