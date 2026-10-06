// Phase 4: recategorising, budgets, periods, search, calendar, subscriptions, comparison.
import { describe, expect, it } from "vitest";
import { sumMoney } from "@/lib/format/money";
import {
  budgetView, categoryTotals, compareWithHistory, COHORT_CATEGORIES, currentCycle, fortnight, gamblingInsight, monthCalendar,
  monthPeriod, parseEdits, payCycleSummary, rangeTotals, resolvePeriod, sampleCohort, searchTransactions, serialiseEdits,
  sixMonthSpending, spendingFeed, spendingInsights, subscriptions, totalSpent, debitsIn,
} from "@/lib/selectors";
import { all, load } from "./helpers";

describe("recategorising", async () => {
  const jess = await load("jess");
  const cycle = currentCycle(jess);
  const tx = debitsIn(jess, cycle).find((t) => t.category === "food")!;

  it("moves money between categories; every view still reconciles", () => {
    const edits = { [tx.id]: "groceries" as const };
    const before = categoryTotals(jess, cycle), after = categoryTotals(jess, cycle, edits);
    const get = (rows: typeof before, c: string) => rows.find((r) => r.category === c)?.total ?? 0;
    expect(get(after, "food")).toBe(sumMoney([get(before, "food"), tx.amount]));
    expect(get(after, "groceries")).toBe(sumMoney([get(before, "groceries"), -tx.amount]));
    expect(sumMoney(after.map((r) => r.total))).toBe(totalSpent(jess, cycle, edits));
    expect(totalSpent(jess, cycle, edits)).toBe(totalSpent(jess, cycle));
    expect(payCycleSummary(jess, edits).spent).toBe(totalSpent(jess, cycle, edits));
  });

  it("marking a transaction as a transfer takes it out of spent on Spending, Home and the six-month chart", () => {
    const edits = { [tx.id]: "transfer" as const };
    expect(totalSpent(jess, cycle, edits)).toBe(sumMoney([totalSpent(jess, cycle), tx.amount]));
    expect(payCycleSummary(jess, edits).spent).toBe(totalSpent(jess, cycle, edits));
    const m = tx.date.slice(0, 7);
    const bar = (e: Record<string, "transfer">) => sixMonthSpending(jess, e).find((b) => b.month === m)!.total!;
    expect(bar(edits)).toBe(sumMoney([bar({}), tx.amount]));
  });

  it("budgets use the same totals as the category rows", () => {
    const edits = { [tx.id]: "groceries" as const };
    const v = budgetView(jess, cycle, { food: 200, groceries: 100 }, edits);
    const rows = categoryTotals(jess, cycle, edits);
    for (const b of v.budgeted) {
      expect(b.spent).toBe(rows.find((r) => r.category === b.category)?.total ?? 0);
      expect(b.remaining).toBe(sumMoney([b.budget!, -b.spent]));
    }
    expect(v.totalBudget).toBe(300);
    expect(v.totalSpent).toBe(sumMoney(v.budgeted.map((b) => b.spent)));
    expect(v.other.every((r) => r.budget === null)).toBe(true);
  });

  it("the edits cookie ignores anything it can't trust, including moving money into income", () => {
    expect(parseEdits("not json", "jess")).toEqual({});
    expect(parseEdits(encodeURIComponent(JSON.stringify({ jess: { a: "income", b: "groceries", c: 5 } })), "jess")).toEqual({ b: "groceries" });
    const raw = serialiseEdits(undefined, "jess", { x: "food" });
    expect(parseEdits(serialiseEdits(raw, "marcus", { y: "bills" }), "jess")).toEqual({ x: "food" });
  });
});

describe("periods and search", async () => {
  const jess = await load("jess");
  it("month periods come from the dashboard chart; bad or future months fall back to this pay cycle", () => {
    const may = monthPeriod(jess, "2026-05");
    expect([may.start, may.end, may.label]).toEqual(["2026-05-01", "2026-05-31", "May 2026"]);
    expect(resolvePeriod(jess, { month: "2026-05" }).id).toBe("month");
    expect(resolvePeriod(jess, { month: "2027-01" }).id).toBe("this_cycle");
    expect(resolvePeriod(jess, { period: "nope" }).id).toBe("this_cycle");
    expect(resolvePeriod(jess, { period: "3_months" }).id).toBe("3_months");
  });

  it("search finds merchants and amounts", () => {
    const t = jess.transactions.find((x) => x.amount === -18.99)!;
    expect(searchTransactions(jess.transactions, "18.99").map((x) => x.id)).toContain(t.id);
    expect(searchTransactions(jess.transactions, "$18.99").map((x) => x.id)).toContain(t.id);
    expect(searchTransactions(jess.transactions, "netflix").every((x) => /netflix/i.test(x.merchant + x.description))).toBe(true);
  });

  it("a category feed holds exactly the posted debits the row counts, plus pending ones", () => {
    const cycle = currentCycle(jess);
    const row = categoryTotals(jess, cycle).find((r) => r.category === "food")!;
    const feed = spendingFeed(jess, cycle, {}, { category: "food" });
    expect(sumMoney(feed.filter((t) => t.status === "posted").map((t) => -t.amount))).toBe(row.total);
  });
});

describe("calendar", async () => {
  const personas = await all();
  for (const d of personas) {
    it(`${d.id}: fortnight range totals match the pay cycle's spent`, () => {
      const f = fortnight(d);
      expect(f.days).toHaveLength(14);
      expect(f.start).toBe(currentCycle(d).start);
      const r = rangeTotals(f.days, f.start, f.end);
      expect(r.spent).toBe(totalSpent(d, currentCycle(d)));
      expect(r.days).toBe(14);
    });

    it(`${d.id}: month grids are whole weeks in pay-cycle column order, and unknown balances stay null`, () => {
      const m = monthCalendar(d, d.asOf.slice(0, 7));
      expect(m.days.length % 7).toBe(0);
      expect(m.days[0]!.weekday).toBe(fortnight(d).days[0]!.weekday);
      for (const day of m.days) if (day.date < d.profile.data_from) expect(day.balance).toBeNull();
    });
  }

  it("stepping back a fortnight is bounded by the data", async () => {
    const priya = personas.find((p) => p.id === "priya")!;
    const far = fortnight(priya, -99);
    expect(far.end >= priya.profile.data_from).toBe(true);
    expect(fortnight(priya, 99).offset).toBe(1);
  });
});

describe("subscriptions, insights, comparison", async () => {
  const [jess, marcus, priya] = await Promise.all([load("jess"), load("marcus"), load("priya")]);

  it("next charge is after the data date and the reminder is before it", () => {
    for (const r of subscriptions(jess).rows) {
      expect(r.nextCharge > jess.asOf).toBe(true);
      expect(r.remindOn < r.nextCharge && r.remindOn > jess.asOf).toBe(true);
    }
    expect(subscriptions(jess).rows.map((r) => r.merchant)).toContain("Apple iCloud");
  });

  it("Jess's spending insights lead with gambling, and every insight points at a category that's on screen", () => {
    const cycle = currentCycle(jess);
    const items = spendingInsights(jess, cycle, {}, gamblingInsight(jess));
    expect(items[0]?.id).toBe("gambling");
    const cats = categoryTotals(jess, cycle).map((r) => r.category);
    for (const i of items) expect(cats).toContain(i.category);
    expect(spendingInsights(priya, currentCycle(priya), {}, gamblingInsight(priya)).some((i) => i.id === "gambling")).toBe(false);
  });

  it("the cohort is sample data, never includes gambling, alcohol or borrowing", () => {
    const c = sampleCohort(marcus);
    expect(c.sample).toBe(true);
    for (const r of c.rows) expect(["gambling", "alcohol", "loan_repayment", "bnpl", "wage_advance", "cash"]).not.toContain(r.category);
    expect(c.rows.map((r) => r.category)).toEqual(COHORT_CATEGORIES);
    for (const r of c.rows) expect(r.low <= r.middle && r.middle <= r.high).toBe(true);
  });

  it("history comparison averages the last 3 full pay cycles", () => {
    const h = compareWithHistory(jess);
    for (const r of h.rows) expect(r.average).toBeCloseTo(r.cycles.reduce((a, c) => a + c.total, 0) / r.cycles.length, 2);
    expect(h.rows[0]!.cycles).toHaveLength(3);
  });
});
