// Spending v5 (09/10/2026): one selector behind Spending and Today. The panel rules (status line, "over" tile,
// detail line), merchant grouping, the budget amount, the same-day comparison and the shared settings.
import { describe, expect, it } from "vitest";
import {
  budgetAmount, budgetSuggestions, currentCycle, FIXED_COSTS, lenderFacts, merchantGroups, MOSTLY_SHARE, panelDetail, panelStatus,
  period, REPAYMENTS, spendingView, totalSpent, usualByDay, usualCycles, usualSpend, USUAL_CYCLES,
} from "@/lib/selectors";
import type { Transaction } from "@/lib/api/types";
import { addDays } from "@/lib/format";
import { all, load } from "./helpers";

describe("status line and the 'Spent so far' tile", () => {
  it("over the usual full cycle", () => {
    expect(panelStatus(220, 200, 128)).toEqual({ kind: "over_cycle", amount: 20 });
  });
  it("ahead of usual by now by more than 20% and $20", () => {
    expect(panelStatus(160, 200, 128)).toEqual({ kind: "ahead", amount: 32 }); // 32 > max(25.6, 20)
    expect(panelStatus(150, 200, 128)).toEqual({ kind: "about" }); // 22 < 25.6
    expect(panelStatus(40, 100, 15)).toEqual({ kind: "ahead", amount: 25 }); // 25 > max(3, 20)
    expect(panelStatus(30, 100, 15)).toEqual({ kind: "about" }); // 15 < 20
  });
  it("usual by day n is the usual full cycle pro rata", () => {
    expect(usualByDay(185, 9, 14)).toBe(118.93);
  });
  it("Jess: the over tile follows the status", async () => {
    const d = await load("jess");
    const v = spendingView(d, currentCycle(d));
    for (const r of v.groups.flatMap((g) => g.rows)) expect(r.over, r.category).toBe(!!r.status && r.status.kind !== "about");
  });
});

describe("detail line", () => {
  const m = (merchant: string, total: number, pending = false) => ({ merchant, pending, count: 1, total, tx: [] });
  it("the change only when it passes the colour threshold", () => {
    expect(panelDetail("food", 112, 13, 99, []).change).toBeNull();
    expect(panelDetail("transport", 115, 115, 0, []).change).toBe(115);
  });
  it(`'Mostly' when there's more than one merchant and the top one is at least ${MOSTLY_SHARE * 100}%`, () => {
    expect(panelDetail("gambling", 200, null, null, [m("TAB", 110), m("Sportsbet", 90)]).mostly).toEqual({ merchant: "TAB", total: 110 });
    expect(panelDetail("food", 100, null, null, [m("A", 40), m("B", 35), m("C", 25)]).mostly).toBeNull();
    expect(panelDetail("bills", 82, null, null, [m("Origin", 82)]).mostly).toBeNull(); // one merchant
  });
  it("nothing when neither applies", () => {
    expect(panelDetail("food", 100, 5, 95, [m("B", 50), m("A", 40), m("C", 10)])).toEqual({ change: null, mostly: { merchant: "B", total: 50 } }); // exactly half counts
    expect(panelDetail("food", 100, 5, 95, [m("A", 40), m("B", 40), m("C", 20)])).toEqual({ change: null, mostly: null });
  });
});

describe("merchant grouping", () => {
  it("pending kept apart from posted for the same merchant, and listed last", () => {
    const t = (id: string, merchant: string, amount: number, status: "posted" | "pending", date = "2026-09-20") =>
      ({ id, merchant, amount, status, date, category: "groceries" }) as unknown as Transaction;
    const g = merchantGroups([t("1", "Woolworths", -23.4, "pending"), t("2", "Aldi", -82.09, "posted"), t("3", "Woolworths", -50, "posted"), t("4", "Woolworths", -10, "posted", "2026-09-21")]);
    expect(g.map((x) => [x.merchant, x.pending, x.count, x.total])).toEqual([["Aldi", false, 1, 82.09], ["Woolworths", false, 2, 60], ["Woolworths", true, 1, 23.4]]);
  });
});

describe("budget amount", () => {
  it("matches Budget ideas for every suggested category (Jess: Food & dining $150)", async () => {
    const d = await load("jess");
    const v = spendingView(d, currentCycle(d));
    const s = budgetSuggestions(d, {});
    for (const r of v.groups.flatMap((g) => g.rows)) {
      const sug = s.find((x) => x.category === r.category);
      if (sug) expect(r.budget, r.category).toEqual({ amount: sug.suggested, from: "suggestion" });
    }
    expect(v.groups.flatMap((g) => g.rows).find((r) => r.category === "food")!.budget).toEqual({ amount: 150, from: "suggestion" });
  });
  it("no suggestion: the usual full cycle rounded to $10", () => {
    expect(budgetAmount("transport", [], 113.7)).toEqual({ amount: 110, from: "usual" });
    expect(budgetAmount("transport", [], 115)).toEqual({ amount: 120, from: "usual" });
    expect(budgetAmount("transport", [], null)).toBeNull();
  });
});

describe("same day of the cycle", () => {
  it("every category's 'previous' is the same number of days into the last cycle", async () => {
    const d = await load("jess");
    const cur = currentCycle(d);
    const v = spendingView(d, cur);
    const prevStart = addDays(cur.start, -14);
    const same = { id: "cycle" as const, label: "", start: prevStart, end: addDays(prevStart, v.day - 1), basedOnDays: v.day, limitedByHistory: false };
    expect(v.day).toBe(9);
    const total = totalSpent(d, same);
    const parts = v.groups.flatMap((g) => g.rows).reduce((n, r) => n + (r.previous ?? 0), 0);
    expect(parts).toBeLessThanOrEqual(total + 0.01);
    // Headline: everyday spending only (rent and repayments landing on other days don't swing it). Fees are
    // everyday spending now (fixed = rent), so last cycle's $15 of fees is in the comparison: −$39.
    expect(v.everyday.total + v.fixed.total + v.repayments.total).toBeCloseTo(v.total, 2);
    expect(Math.round(v.everyday.total)).toBe(677);
    expect(Math.round(v.everyday.change!)).toBe(-39);
  });
  it("no previous cycle: no comparison anywhere (never zeros)", async () => {
    const d = await load("priya");
    const late = { ...d, profile: { ...d.profile, data_from: "2026-09-20" } };
    const v = spendingView(late, currentCycle(late));
    expect(v.everyday.change).toBeNull();
    for (const r of v.groups.flatMap((g) => g.rows)) {
      expect(r.change).toBeNull();
      expect(r.detail.change).toBeNull();
    }
  });
});

describe("settings and structure", () => {
  it(`usual = the last ${USUAL_CYCLES} complete cycles; fewer when that's all there is`, async () => {
    const jess = await load("jess");
    expect(usualCycles(jess)).toHaveLength(3);
    expect(Math.round(usualSpend(jess)!.amount)).toBe(2601);
    for (const d of await all()) expect(usualCycles(d).every((c) => !c.limitedByHistory)).toBe(true);
  });
  it("fixed is rent; repayments are loans, BNPL and pay advances; every other category is listed, none as Other", async () => {
    for (const d of await all()) {
      const v = spendingView(d, currentCycle(d));
      expect(v.fixed.categories.every((c) => FIXED_COSTS.includes(c.category))).toBe(true);
      expect(v.repayments.categories.every((c) => REPAYMENTS.includes(c.category))).toBe(true);
      const listed = v.groups.flatMap((g) => g.rows).length + v.fixed.categories.length + v.repayments.categories.length;
      expect(listed).toBe(v.categoryCount);
      for (const g of v.groups) expect(g.rows.map((r) => r.total)).toEqual([...g.rows.map((r) => r.total)].sort((a, b) => b - a));
    }
  });
  it("Jess: pending $212.40 isn't in spent; pay advance $300; lenders 3, pay advances 1, gambling deposits 2", async () => {
    const d = await load("jess");
    const v = spendingView(d, currentCycle(d));
    expect(v.pending).toBe(212.4);
    expect(v.payAdvances).toBe(300);
    expect(lenderFacts(d, currentCycle(d))).toEqual({ lenders: 3, payAdvances: 1, gamblingDeposits: 2 });
    expect(lenderFacts(d, currentCycle(d), {}, { hideGambling: true }).gamblingDeposits).toBeNull();
  });
  it("other periods compare with the previous period of the same length", async () => {
    const d = await load("marcus");
    const v = spendingView(d, period(d, "last_cycle"));
    expect(v.kind).toBe("period");
    expect(v.day).toBe(14);
  });
});
